-- Wood replaces Steps as the currency. Steps stay a walking stat (daily totals,
-- lifetime); each credited step now has a `wood_drop_chance` chance to drop one
-- Wood, and Wood buys packs. `profiles.balance` keeps its name (now Wood).

alter table public.game_config
  add column wood_drop_chance numeric not null default 0.10
    check (wood_drop_chance >= 0 and wood_drop_chance <= 1);

comment on column public.game_config.wood_drop_chance is 'Chance that one credited step drops 1 Wood.';
comment on column public.game_config.starting_balance is 'Wood a new player starts with.';
comment on column public.profiles.balance is 'Spendable Wood.';
comment on column public.card_sets.price is 'Wood per booster pack.';

-- ~2,000 steps per Cozy Downtown pack at a 10% drop chance; new players can buy two.
update public.game_config set starting_balance = 400;
update public.card_sets set price = case id when 'cozy-downtown' then 200 else 300 end;

-- Packs got 5x cheaper in currency (1,000 Steps → 200 Wood): dividing wallets by
-- 5 keeps every player's buying power.
update public.profiles set balance = balance / 5;

-- Reports the player's step total for a local calendar day. Totals only ever go
-- up; every newly credited step rolls for Wood once (re-sending a total can't
-- reroll). Days more than a week old (or more than a day in the future, to allow
-- for time zones) are rejected.
create or replace function public.sync_steps(p_day date, p_steps integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_max integer;
  v_chance numeric;
  v_today date := (now() at time zone 'utc')::date;
  v_new integer;
  v_old integer;
  v_delta integer := 0;
  v_wood integer := 0;
  v_balance integer;
begin
  if p_day is null or p_day > v_today + 1 or p_day < v_today - 7 then
    raise exception 'day_out_of_range' using errcode = 'P0001';
  end if;

  select max_daily_steps, wood_drop_chance into v_max, v_chance from public.game_config;
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
    -- One roll per step (at most max_daily_steps rows): an exact binomial draw.
    select count(*)::integer into v_wood
    from generate_series(1, v_delta)
    where random() < coalesce(v_chance, 0.10);

    update public.daily_steps set steps = v_new where user_id = v_uid and day = p_day;
    update public.profiles
    set balance = balance + v_wood, lifetime_steps = lifetime_steps + v_delta
    where id = v_uid
    returning balance into v_balance;
  else
    select balance into v_balance from public.profiles where id = v_uid;
  end if;

  return jsonb_build_object(
    'day', p_day,
    'steps', greatest(v_old, v_new),
    'credited', v_delta,
    'wood', v_wood,
    'balance', v_balance
  );
end;
$$;

-- Same as before, except the "can't afford it" error now names Wood.
create or replace function public.buy_pack(
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
    raise exception 'insufficient_wood' using errcode = 'P0001';
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
