-- Several cities per player, built from one shared pool of cards: a card stands
-- in one place at a time, so "placeable = owned − placed" keeps counting the
-- player's tiles across all cities. The first city is free; the next one costs
-- (number of cities) × city_price_step Wood, up to max_cities.
--
-- The old city RPCs (no city argument) stay as wrappers acting on the player's
-- first city, so apps from before this migration keep working.

-- ── Tables ────────────────────────────────────────────────────────────────────

alter table public.game_config
  add column city_price_step integer not null default 1000 check (city_price_step >= 0),
  add column max_cities smallint not null default 10 check (max_cities >= 1);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- null: the app shows a default ("<name>'s Town" for the first city, "Town N" after).
  name text check (name is null or char_length(name) between 1 and 24),
  position smallint not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, position)
);
alter table public.cities enable row level security;
create policy "Players read their own cities" on public.cities
  for select to authenticated using (user_id = (select auth.uid()));
-- Live sync: renaming, adding or deleting a city nudges the player's other devices.
create trigger cities_notify_player
  after insert or update or delete on public.cities
  for each row
  execute function private.notify_player_changed();

-- Every existing player gets city 0, and their tiles move into it.
insert into public.cities (user_id, position) select id, 0 from public.profiles;

alter table public.city_tiles add column city_id uuid references public.cities (id) on delete cascade;
-- The backfill would send one realtime nudge per tile: skip them.
alter table public.city_tiles disable trigger city_tiles_notify_player;
update public.city_tiles t set city_id = c.id
from public.cities c
where c.user_id = t.user_id and c.position = 0;
alter table public.city_tiles enable trigger city_tiles_notify_player;
alter table public.city_tiles alter column city_id set not null;
alter table public.city_tiles drop constraint city_tiles_pkey;
alter table public.city_tiles add primary key (city_id, x, y);

-- New players start with city 0.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, balance)
  values (new.id, coalesce((select starting_balance from public.game_config), 3000))
  on conflict (id) do nothing;
  insert into public.cities (user_id, position)
  values (new.id, 0)
  on conflict (user_id, position) do nothing;
  return new;
end;
$$;

-- ── Helpers ───────────────────────────────────────────────────────────────────

-- The caller's city: `p_city_id` if it's theirs, their first city when null.
create function private.require_city(p_uid uuid, p_city_id uuid)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_city uuid;
begin
  if p_city_id is null then
    select id into v_city from public.cities where user_id = p_uid order by position limit 1;
  else
    select id into v_city from public.cities where id = p_city_id and user_id = p_uid;
  end if;
  if v_city is null then
    raise exception 'city_not_found' using errcode = 'P0001';
  end if;
  return v_city;
end;
$$;

-- Every lot covered in one city, with the anchor of the object covering it.
create function private.city_covered_lots(p_city_id uuid)
returns table (x integer, y integer, ax integer, ay integer)
language sql
stable
set search_path = ''
as $$
  select t.x + c.dx, t.y + c.dy, t.x, t.y
  from public.city_tiles t
  cross join lateral private.item_cells(t.item_id) c
  where t.city_id = p_city_id;
$$;

-- Same rule as before (and as the app's `fits`), within one city.
create function private.city_fit_error(
  p_city_id uuid,
  p_item_id text,
  p_x integer,
  p_y integer,
  p_ignore_x integer[] default '{}',
  p_ignore_y integer[] default '{}'
)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_grid smallint;
begin
  select grid_size into v_grid from public.game_config;
  if p_x is null or p_y is null or exists (
    select 1 from private.item_cells(p_item_id) c
    where p_x + c.dx < 0 or p_y + c.dy < 0 or p_x + c.dx >= v_grid or p_y + c.dy >= v_grid
  ) then
    return 'out_of_bounds';
  end if;
  if exists (
    select 1
    from private.item_cells(p_item_id) c
    join private.city_covered_lots(p_city_id) l on l.x = p_x + c.dx and l.y = p_y + c.dy
    where not exists (
      select 1 from unnest(p_ignore_x, p_ignore_y) i(x, y) where i.x = l.ax and i.y = l.ay
    )
  ) then
    return 'tile_occupied';
  end if;
  return null;
end;
$$;

revoke execute on all functions in schema private from public, anon, authenticated;

-- ── City RPCs (with a city) ───────────────────────────────────────────────────

create function public.place_item(p_city_id uuid, p_item_id text, p_x integer, p_y integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_city uuid;
  v_owned integer;
  v_placed integer;
  v_error text;
begin
  perform 1 from public.profiles where id = v_uid for update;
  v_city := private.require_city(v_uid, p_city_id);
  -- Shared pool: what's placed in any of the player's cities is taken.
  select quantity into v_owned from public.inventory
  where user_id = v_uid and item_id = p_item_id;
  select count(*) into v_placed from public.city_tiles
  where user_id = v_uid and item_id = p_item_id;
  if coalesce(v_owned, 0) - v_placed <= 0 then
    raise exception 'none_available' using errcode = 'P0001';
  end if;
  v_error := private.city_fit_error(v_city, p_item_id, p_x, p_y);
  if v_error is not null then
    raise exception '%', v_error using errcode = 'P0001';
  end if;
  insert into public.city_tiles (user_id, city_id, x, y, item_id)
  values (v_uid, v_city, p_x, p_y, p_item_id);
  return jsonb_build_object('city_id', v_city, 'x', p_x, 'y', p_y, 'item_id', p_item_id);
end;
$$;

create function public.remove_item(p_city_id uuid, p_x integer, p_y integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_city uuid := private.require_city(v_uid, p_city_id);
  v_item text;
begin
  delete from public.city_tiles
  where city_id = v_city and x = p_x and y = p_y
  returning item_id into v_item;
  if v_item is null then
    raise exception 'tile_empty' using errcode = 'P0001';
  end if;
  return jsonb_build_object('city_id', v_city, 'x', p_x, 'y', p_y, 'item_id', v_item);
end;
$$;

-- Moves the object anchored at (from) so its anchor lands on (to), if it fits;
-- otherwise swaps it with an object of the same footprint anchored at (to).
create function public.move_item(p_city_id uuid, p_from_x integer, p_from_y integer, p_to_x integer, p_to_y integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_city uuid;
  v_from public.city_tiles;
  v_to public.city_tiles;
  v_error text;
begin
  if p_from_x = p_to_x and p_from_y = p_to_y then
    raise exception 'same_tile' using errcode = 'P0001';
  end if;
  perform 1 from public.profiles where id = v_uid for update;
  v_city := private.require_city(v_uid, p_city_id);
  select * into v_from from public.city_tiles
  where city_id = v_city and x = p_from_x and y = p_from_y;
  if not found then
    raise exception 'tile_empty' using errcode = 'P0001';
  end if;
  v_error := private.city_fit_error(v_city, v_from.item_id, p_to_x, p_to_y, array[p_from_x], array[p_from_y]);
  if v_error is null then
    update public.city_tiles set x = p_to_x, y = p_to_y
    where city_id = v_city and x = p_from_x and y = p_from_y;
    return jsonb_build_object(
      'city_id', v_city,
      'from', jsonb_build_object('x', p_from_x, 'y', p_from_y, 'item_id', null),
      'to', jsonb_build_object('x', p_to_x, 'y', p_to_y, 'item_id', v_from.item_id),
      'swapped', false
    );
  end if;
  select * into v_to from public.city_tiles
  where city_id = v_city and x = p_to_x and y = p_to_y;
  if not found or (select cells from public.items where id = v_to.item_id)
               is distinct from (select cells from public.items where id = v_from.item_id) then
    raise exception '%', v_error using errcode = 'P0001';
  end if;
  -- One UPDATE exchanging the two rows would hit the primary key mid-statement.
  delete from public.city_tiles
  where city_id = v_city and ((x = p_from_x and y = p_from_y) or (x = p_to_x and y = p_to_y));
  insert into public.city_tiles (user_id, city_id, x, y, item_id, placed_at) values
    (v_uid, v_city, p_to_x, p_to_y, v_from.item_id, v_from.placed_at),
    (v_uid, v_city, p_from_x, p_from_y, v_to.item_id, v_to.placed_at);
  return jsonb_build_object(
    'city_id', v_city,
    'from', jsonb_build_object('x', p_from_x, 'y', p_from_y, 'item_id', v_to.item_id),
    'to', jsonb_build_object('x', p_to_x, 'y', p_to_y, 'item_id', v_from.item_id),
    'swapped', true
  );
end;
$$;

-- A new, empty city for (number of cities) × city_price_step Wood.
create function public.create_city(p_name text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_cfg public.game_config;
  v_balance integer;
  v_count integer;
  v_position integer;
  v_price integer;
  v_name text := nullif(btrim(p_name), '');
  v_city uuid;
begin
  select * into v_cfg from public.game_config;
  select balance into v_balance from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_missing' using errcode = 'P0001';
  end if;
  if v_name is not null and char_length(v_name) > 24 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  select count(*), coalesce(max(position), -1) into v_count, v_position
  from public.cities where user_id = v_uid;
  if v_count >= v_cfg.max_cities then
    raise exception 'city_limit' using errcode = 'P0001';
  end if;
  v_price := v_count * v_cfg.city_price_step;
  if v_balance < v_price then
    raise exception 'insufficient_wood' using errcode = 'P0001';
  end if;
  insert into public.cities (user_id, name, position)
  values (v_uid, v_name, v_position + 1)
  returning id into v_city;
  update public.profiles set balance = balance - v_price
  where id = v_uid
  returning balance into v_balance;
  return jsonb_build_object(
    'city', jsonb_build_object('id', v_city, 'name', v_name, 'position', v_position + 1, 'lots', 0),
    'price', v_price,
    'balance', v_balance
  );
end;
$$;

-- An empty name goes back to the default one.
create function public.rename_city(p_city_id uuid, p_name text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_city uuid;
  v_name text := nullif(btrim(p_name), '');
begin
  if p_city_id is null then
    raise exception 'city_not_found' using errcode = 'P0001';
  end if;
  v_city := private.require_city(v_uid, p_city_id);
  if v_name is not null and char_length(v_name) > 24 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  update public.cities set name = v_name where id = v_city;
  return jsonb_build_object('id', v_city, 'name', v_name);
end;
$$;

-- Deletes a city; its buildings go back to the inventory (the tiles cascade
-- away, and placeable = owned − placed). No refund. The last city can't go.
create function public.delete_city(p_city_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_city uuid;
begin
  if p_city_id is null then
    raise exception 'city_not_found' using errcode = 'P0001';
  end if;
  perform 1 from public.profiles where id = v_uid for update;
  v_city := private.require_city(v_uid, p_city_id);
  if (select count(*) from public.cities where user_id = v_uid) <= 1 then
    raise exception 'last_city' using errcode = 'P0001';
  end if;
  delete from public.cities where id = v_city;
  return jsonb_build_object('id', v_city);
end;
$$;

-- One city's tiles (switching cities). Unknown or foreign ids give [].
create function public.get_city(p_city_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('x', c.x, 'y', c.y, 'item_id', c.item_id) order by c.placed_at),
    '[]'::jsonb
  )
  from public.city_tiles c
  where c.city_id = p_city_id and c.user_id = (select auth.uid());
$$;

-- ── Old signatures: act on the player's first city ────────────────────────────

create or replace function public.place_item(p_item_id text, p_x integer, p_y integer)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
begin
  return public.place_item(null::uuid, p_item_id, p_x, p_y);
end;
$$;

create or replace function public.remove_item(p_x integer, p_y integer)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
begin
  return public.remove_item(null::uuid, p_x, p_y);
end;
$$;

create or replace function public.move_item(p_from_x integer, p_from_y integer, p_to_x integer, p_to_y integer)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
begin
  return public.move_item(null::uuid, p_from_x, p_from_y, p_to_x, p_to_y);
end;
$$;

drop function private.fit_error(uuid, text, integer, integer, integer[], integer[]);
drop function private.covered_lots(uuid);

-- ── State and reset ───────────────────────────────────────────────────────────

-- Only the requested city's tiles (the first city when null or not theirs), so
-- the payload doesn't grow with the number of cities. `placed` counts each item
-- across every city, for the shared pool.
drop function public.get_my_state(date);
create function public.get_my_state(p_since date default null, p_city_id uuid default null)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with active as (
    select coalesce(
      (select c.id from public.cities c where c.user_id = (select auth.uid()) and c.id = p_city_id),
      (select c.id from public.cities c where c.user_id = (select auth.uid()) order by c.position limit 1)
    ) as id
  )
  select jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'display_name', p.display_name, 'step_goal', p.step_goal, 'avatar_id', p.avatar_id,
        'balance', p.balance, 'lifetime_steps', p.lifetime_steps, 'packs_opened', p.packs_opened,
        'is_tester', p.is_tester
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
    'cities', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id, 'name', c.name, 'position', c.position,
          'lots', coalesce((
            select sum(jsonb_array_length(it.cells))
            from public.city_tiles t join public.items it on it.id = t.item_id
            where t.city_id = c.id
          ), 0)
        )
        order by c.position
      )
      from public.cities c where c.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'city_id', (select id from active),
    'city', coalesce((
      select jsonb_agg(jsonb_build_object('x', c.x, 'y', c.y, 'item_id', c.item_id) order by c.placed_at)
      from public.city_tiles c
      where c.city_id = (select id from active) and c.user_id = (select auth.uid())
    ), '[]'::jsonb),
    'placed', coalesce((
      select jsonb_object_agg(x.item_id, x.n)
      from (
        select t.item_id, count(*) as n
        from public.city_tiles t where t.user_id = (select auth.uid())
        group by t.item_id
      ) x
    ), '{}'::jsonb)
  );
$$;

-- Reset keeps one empty city (the first) and drops the rest.
create or replace function public.reset_progress()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_start integer;
  v_keep uuid;
begin
  select starting_balance into v_start from public.game_config;
  perform 1 from public.profiles where id = v_uid for update;
  delete from public.city_tiles where user_id = v_uid;
  select id into v_keep from public.cities where user_id = v_uid order by position limit 1;
  delete from public.cities where user_id = v_uid and id is distinct from v_keep;
  if v_keep is null then
    insert into public.cities (user_id, position) values (v_uid, 0);
  else
    update public.cities set name = null where id = v_keep;
  end if;
  delete from public.inventory where user_id = v_uid;
  delete from public.pack_openings where user_id = v_uid;
  delete from public.daily_steps where user_id = v_uid;
  update public.profiles
  set balance = coalesce(v_start, 3000), lifetime_steps = 0, packs_opened = 0
  where id = v_uid;
  return jsonb_build_object('balance', coalesce(v_start, 3000));
end;
$$;

-- ── Permissions ───────────────────────────────────────────────────────────────

revoke execute on function
  public.place_item(uuid, text, integer, integer),
  public.remove_item(uuid, integer, integer),
  public.move_item(uuid, integer, integer, integer, integer),
  public.create_city(text),
  public.rename_city(uuid, text),
  public.delete_city(uuid),
  public.get_city(uuid),
  public.get_my_state(date, uuid)
from public, anon;
grant execute on function
  public.place_item(uuid, text, integer, integer),
  public.remove_item(uuid, integer, integer),
  public.move_item(uuid, integer, integer, integer, integer),
  public.create_city(text),
  public.rename_city(uuid, text),
  public.delete_city(uuid),
  public.get_city(uuid),
  public.get_my_state(date, uuid)
to authenticated;
