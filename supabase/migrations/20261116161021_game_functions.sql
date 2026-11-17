-- Game rules live here. Public functions are the only way clients change player
-- data. Each one resolves the caller from the JWT, locks the player's profile row
-- (so concurrent taps can't double-spend) and validates against game_config.
-- Internal helpers live in `private`, which the Data API doesn't expose.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.require_uid()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  return v_uid;
end;
$$;

-- Rolls one card for a set: pick a rarity by cumulative weight, then a uniformly
-- random item of that rarity. If the set has no item of that rarity, fall back to
-- the next lower tier (same behaviour as the app's original local roll).
create function private.roll_card(p_set_id text, p_force_rarity text default null)
returns table (item_id text, rarity text, tier smallint, tiles smallint)
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_roll numeric := random();
  v_rarity text := p_force_rarity;
  v_tier smallint;
begin
  if v_rarity is null then
    select w.id into v_rarity
    from (
      select r.id, r.tier, sum(r.weight) over (order by r.tier) as cumulative
      from public.rarities r
    ) w
    where w.cumulative > v_roll
    order by w.tier
    limit 1;
    if v_rarity is null then   -- floating-point slack at the very top
      select r.id into v_rarity from public.rarities r order by r.tier limit 1;
    end if;
  end if;

  select r.tier into v_tier from public.rarities r where r.id = v_rarity;

  loop
    return query
      select i.id, i.rarity, r.tier, i.tiles_per_card
      from public.items i
      join public.rarities r on r.id = i.rarity
      where i.set_id = p_set_id and r.tier = v_tier
      order by random()
      limit 1;
    if found then
      return;
    end if;
    v_tier := v_tier - 1;
    if v_tier < 0 then
      raise exception 'set_has_no_items' using errcode = 'P0001';
    end if;
  end loop;
end;
$$;

-- ── Steps ────────────────────────────────────────────────────────────────────

-- Reports the player's step total for a local calendar day. Totals only ever go
-- up; the increase is credited to the wallet. Days more than a week old (or more
-- than a day in the future, to allow for time zones) are rejected.
create function public.sync_steps(p_day date, p_steps integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_max integer;
  v_today date := (now() at time zone 'utc')::date;
  v_new integer;
  v_old integer;
  v_delta integer := 0;
  v_balance integer;
begin
  if p_day is null or p_day > v_today + 1 or p_day < v_today - 7 then
    raise exception 'day_out_of_range' using errcode = 'P0001';
  end if;

  select max_daily_steps into v_max from public.game_config;
  v_new := least(greatest(coalesce(p_steps, 0), 0), coalesce(v_max, 60000));

  -- Lock the profile first: all wallet changes serialise on this row.
  perform 1 from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_missing' using errcode = 'P0001';
  end if;

  insert into public.daily_steps (user_id, day, steps)
  values (v_uid, p_day, 0)
  on conflict (user_id, day) do nothing;

  select steps into v_old from public.daily_steps
  where user_id = v_uid and day = p_day;

  v_delta := greatest(v_new - v_old, 0);

  if v_delta > 0 then
    update public.daily_steps set steps = v_new where user_id = v_uid and day = p_day;
    update public.profiles
    set balance = balance + v_delta, lifetime_steps = lifetime_steps + v_delta
    where id = v_uid
    returning balance into v_balance;
  else
    select balance into v_balance from public.profiles where id = v_uid;
  end if;

  return jsonb_build_object(
    'day', p_day,
    'steps', greatest(v_old, v_new),
    'credited', v_delta,
    'balance', v_balance
  );
end;
$$;

-- ── Packs ────────────────────────────────────────────────────────────────────

-- Buys and rolls one booster pack. Cards come back sorted lowest → highest
-- rarity (position 0 = top of the stack, best card last). The force flags are
-- testing aids and are ignored unless the player's profile has is_tester = true.
create function public.buy_pack(
  p_set_id text,
  p_force_legendary boolean default false,
  p_force_foil boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_cfg public.game_config;
  v_set public.card_sets;
  v_profile public.profiles;
  v_opening uuid;
  v_roll record;
  v_foil boolean;
  v_force text;
  v_balance integer;
begin
  select * into v_cfg from public.game_config;
  select * into v_set from public.card_sets where id = p_set_id;
  if not found or not v_set.is_active then
    raise exception 'set_not_available' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_missing' using errcode = 'P0001';
  end if;
  if v_profile.balance < v_set.price then
    raise exception 'insufficient_steps' using errcode = 'P0001';
  end if;

  insert into public.pack_openings (user_id, set_id, cost)
  values (v_uid, p_set_id, v_set.price)
  returning id into v_opening;

  for i in 1 .. v_cfg.cards_per_pack loop
    v_force := case when i = 1 and p_force_legendary and v_profile.is_tester then 'legendary' end;
    select * into v_roll from private.roll_card(p_set_id, v_force);
    v_foil := random() < v_cfg.foil_chance or (p_force_foil and v_profile.is_tester);

    -- Positions 100+ while rolling; renumbered by rarity below.
    insert into public.pack_cards (opening_id, position, item_id, rarity, foil)
    values (v_opening, 99 + i, v_roll.item_id, v_roll.rarity, v_foil);

    -- Path cards are bundles: one card adds several placeable tiles.
    insert into public.inventory (user_id, item_id, quantity, foil_cards)
    values (v_uid, v_roll.item_id, v_roll.tiles, v_foil::int)
    on conflict (user_id, item_id) do update
      set quantity = public.inventory.quantity + excluded.quantity,
          foil_cards = public.inventory.foil_cards + excluded.foil_cards;
  end loop;

  with ranked as (
    select pc.position as old_position,
           (row_number() over (order by r.tier, pc.position) - 1)::smallint as new_position
    from public.pack_cards pc
    join public.rarities r on r.id = pc.rarity
    where pc.opening_id = v_opening
  )
  update public.pack_cards pc
  set position = ranked.new_position
  from ranked
  where pc.opening_id = v_opening and pc.position = ranked.old_position;

  update public.profiles
  set balance = balance - v_set.price, packs_opened = packs_opened + 1
  where id = v_uid
  returning balance into v_balance;

  return jsonb_build_object(
    'opening_id', v_opening,
    'set_id', p_set_id,
    'balance', v_balance,
    'cards', (
      select jsonb_agg(
        jsonb_build_object('position', pc.position, 'item_id', pc.item_id, 'rarity', pc.rarity, 'foil', pc.foil)
        order by pc.position
      )
      from public.pack_cards pc
      where pc.opening_id = v_opening
    )
  );
end;
$$;

-- ── City ─────────────────────────────────────────────────────────────────────

create function public.place_item(p_item_id text, p_x integer, p_y integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_grid smallint;
  v_owned integer;
  v_placed integer;
begin
  select grid_size into v_grid from public.game_config;
  if p_x is null or p_y is null or p_x < 0 or p_y < 0 or p_x >= v_grid or p_y >= v_grid then
    raise exception 'out_of_bounds' using errcode = 'P0001';
  end if;

  perform 1 from public.profiles where id = v_uid for update;

  select quantity into v_owned from public.inventory
  where user_id = v_uid and item_id = p_item_id;
  select count(*) into v_placed from public.city_tiles
  where user_id = v_uid and item_id = p_item_id;
  if coalesce(v_owned, 0) - v_placed <= 0 then
    raise exception 'none_available' using errcode = 'P0001';
  end if;

  insert into public.city_tiles (user_id, x, y, item_id)
  values (v_uid, p_x, p_y, p_item_id)
  on conflict (user_id, x, y) do nothing;
  if not found then
    raise exception 'tile_occupied' using errcode = 'P0001';
  end if;

  return jsonb_build_object('x', p_x, 'y', p_y, 'item_id', p_item_id);
end;
$$;

create function public.remove_item(p_x integer, p_y integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_item text;
begin
  delete from public.city_tiles
  where user_id = v_uid and x = p_x and y = p_y
  returning item_id into v_item;
  if v_item is null then
    raise exception 'tile_empty' using errcode = 'P0001';
  end if;
  return jsonb_build_object('x', p_x, 'y', p_y, 'item_id', v_item);
end;
$$;

-- ── Profile ──────────────────────────────────────────────────────────────────

create function public.update_profile(
  p_display_name text default null,
  p_step_goal integer default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_profile public.profiles;
begin
  update public.profiles
  set display_name = coalesce(nullif(btrim(p_display_name), ''), display_name),
      step_goal = coalesce(p_step_goal, step_goal)
  where id = v_uid
  returning * into v_profile;
  return jsonb_build_object('display_name', v_profile.display_name, 'step_goal', v_profile.step_goal);
end;
$$;

-- Wipes the caller's own progress back to a new player (the app's
-- Profile → Testing → Reset). Only ever touches the caller's rows.
create function public.reset_progress()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_start integer;
begin
  select starting_balance into v_start from public.game_config;
  perform 1 from public.profiles where id = v_uid for update;
  delete from public.city_tiles where user_id = v_uid;
  delete from public.inventory where user_id = v_uid;
  delete from public.pack_openings where user_id = v_uid;
  delete from public.daily_steps where user_id = v_uid;
  update public.profiles
  set balance = coalesce(v_start, 3000), lifetime_steps = 0, packs_opened = 0
  where id = v_uid;
  return jsonb_build_object('balance', coalesce(v_start, 3000));
end;
$$;

-- Everything the app needs on launch in one round trip. Runs as the caller, so
-- row level security limits it to their own rows.
create function public.get_my_state(p_since date default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'display_name', p.display_name, 'step_goal', p.step_goal, 'balance', p.balance,
        'lifetime_steps', p.lifetime_steps, 'packs_opened', p.packs_opened, 'is_tester', p.is_tester
      )
      from public.profiles p where p.id = (select auth.uid())
    ),
    'steps', coalesce((
      select jsonb_object_agg(d.day, d.steps)
      from public.daily_steps d
      where d.user_id = (select auth.uid())
        and d.day >= coalesce(p_since, (now() at time zone 'utc')::date - 30)
    ), '{}'::jsonb),
    'inventory', coalesce((
      select jsonb_object_agg(i.item_id, jsonb_build_object('count', i.quantity, 'foil', i.foil_cards))
      from public.inventory i where i.user_id = (select auth.uid())
    ), '{}'::jsonb),
    'city', coalesce((
      select jsonb_agg(jsonb_build_object('x', c.x, 'y', c.y, 'item_id', c.item_id) order by c.placed_at)
      from public.city_tiles c where c.user_id = (select auth.uid())
    ), '[]'::jsonb)
  );
$$;

-- ── Permissions ──────────────────────────────────────────────────────────────

revoke execute on all functions in schema private from public, anon, authenticated;

revoke execute on function
  public.sync_steps(date, integer),
  public.buy_pack(text, boolean, boolean),
  public.place_item(text, integer, integer),
  public.remove_item(integer, integer),
  public.update_profile(text, integer),
  public.reset_progress(),
  public.get_my_state(date),
  public.touch_updated_at()
from public, anon;

grant execute on function
  public.sync_steps(date, integer),
  public.buy_pack(text, boolean, boolean),
  public.place_item(text, integer, integer),
  public.remove_item(integer, integer),
  public.update_profile(text, integer),
  public.reset_progress(),
  public.get_my_state(date)
to authenticated;
