-- Items cover several lots in different shapes (e.g. a 3×2 theater, an L-shaped
-- café). A placed object is still one city_tiles row at its anchor lot (the
-- shape's back corner); the lots it covers come from items.cells. Items don't
-- rotate. Must match the app's `shape` masks (src/data/sets/cozyDowntown.ts).

alter table public.items
  add column cells jsonb not null default '[[0,0]]'
    check (jsonb_typeof(cells) = 'array' and jsonb_array_length(cells) between 1 and 16);

comment on column public.items.cells is
  'Lots the item covers, as [[dx,dy],...] from its anchor (+x screen down-right, +y down-left). Must include [0,0].';

update public.items set cells = case id
  when 'brick-townhouse' then '[[0,0],[0,1]]'
  when 'bakery'          then '[[0,0],[1,0]]'
  when 'bookshop'        then '[[0,0],[1,0]]'
  when 'corner-cafe'     then '[[0,0],[1,0],[0,1]]'
  when 'fountain-plaza'  then '[[0,0],[1,0],[0,1],[1,1]]'
  when 'grand-theater'   then '[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]'
  else '[[0,0]]'
end::jsonb;

-- The lots an item covers, relative to its anchor.
create function private.item_cells(p_item_id text)
returns table (dx integer, dy integer)
language sql
stable
set search_path = ''
as $$
  select (c->>0)::integer, (c->>1)::integer
  from public.items i
  cross join lateral jsonb_array_elements(i.cells) c
  where i.id = p_item_id;
$$;

-- Every lot covered by a player's city, with the anchor of the object covering it.
create function private.covered_lots(p_uid uuid)
returns table (x integer, y integer, ax integer, ay integer)
language sql
stable
set search_path = ''
as $$
  select t.x + c.dx, t.y + c.dy, t.x, t.y
  from public.city_tiles t
  cross join lateral private.item_cells(t.item_id) c
  where t.user_id = p_uid;
$$;

-- Why `p_item_id` can't stand anchored at (p_x, p_y): 'out_of_bounds',
-- 'tile_occupied', or null when it fits. Objects anchored at the `p_ignore_*`
-- lots don't count (the ones being moved).
create function private.fit_error(
  p_uid uuid,
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
    join private.covered_lots(p_uid) l on l.x = p_x + c.dx and l.y = p_y + c.dy
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

create or replace function public.place_item(p_item_id text, p_x integer, p_y integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_owned integer;
  v_placed integer;
  v_error text;
begin
  perform 1 from public.profiles where id = v_uid for update;

  select quantity into v_owned from public.inventory
  where user_id = v_uid and item_id = p_item_id;
  select count(*) into v_placed from public.city_tiles
  where user_id = v_uid and item_id = p_item_id;
  if coalesce(v_owned, 0) - v_placed <= 0 then
    raise exception 'none_available' using errcode = 'P0001';
  end if;

  v_error := private.fit_error(v_uid, p_item_id, p_x, p_y);
  if v_error is not null then
    raise exception '%', v_error using errcode = 'P0001';
  end if;

  insert into public.city_tiles (user_id, x, y, item_id)
  values (v_uid, p_x, p_y, p_item_id);

  return jsonb_build_object('x', p_x, 'y', p_y, 'item_id', p_item_id);
end;
$$;

-- Moves the object anchored at (from) so its anchor lands on (to), if it fits
-- there (its own lots don't count). Otherwise, when an object with the same
-- footprint is anchored at (to), the two swap. Same rule as the app's moveItem.
create or replace function public.move_item(p_from_x integer, p_from_y integer, p_to_x integer, p_to_y integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_from public.city_tiles;
  v_to public.city_tiles;
  v_error text;
begin
  if p_from_x = p_to_x and p_from_y = p_to_y then
    raise exception 'same_tile' using errcode = 'P0001';
  end if;

  perform 1 from public.profiles where id = v_uid for update;

  select * into v_from from public.city_tiles
  where user_id = v_uid and x = p_from_x and y = p_from_y;
  if not found then
    raise exception 'tile_empty' using errcode = 'P0001';
  end if;

  v_error := private.fit_error(v_uid, v_from.item_id, p_to_x, p_to_y, array[p_from_x], array[p_from_y]);
  if v_error is null then
    update public.city_tiles set x = p_to_x, y = p_to_y
    where user_id = v_uid and x = p_from_x and y = p_from_y;
    return jsonb_build_object(
      'from', jsonb_build_object('x', p_from_x, 'y', p_from_y, 'item_id', null),
      'to', jsonb_build_object('x', p_to_x, 'y', p_to_y, 'item_id', v_from.item_id),
      'swapped', false
    );
  end if;

  select * into v_to from public.city_tiles
  where user_id = v_uid and x = p_to_x and y = p_to_y;
  if not found or (select cells from public.items where id = v_to.item_id)
               is distinct from (select cells from public.items where id = v_from.item_id) then
    raise exception '%', v_error using errcode = 'P0001';
  end if;

  -- Swap. One UPDATE exchanging the two rows would hit the (user_id, x, y)
  -- primary key mid-statement, so delete both and re-insert them exchanged.
  delete from public.city_tiles
  where user_id = v_uid and ((x = p_from_x and y = p_from_y) or (x = p_to_x and y = p_to_y));
  insert into public.city_tiles (user_id, x, y, item_id, placed_at) values
    (v_uid, p_to_x, p_to_y, v_from.item_id, v_from.placed_at),
    (v_uid, p_from_x, p_from_y, v_to.item_id, v_to.placed_at);

  return jsonb_build_object(
    'from', jsonb_build_object('x', p_from_x, 'y', p_from_y, 'item_id', v_to.item_id),
    'to', jsonb_build_object('x', p_to_x, 'y', p_to_y, 'item_id', v_from.item_id),
    'swapped', true
  );
end;
$$;

-- Towns laid out when everything took one lot: per player, oldest first, take
-- back objects that now overlap an earlier one or hang off the lawn. They
-- return to the inventory (what's placeable = owned − placed).
do $$
declare
  r record;
  v_grid smallint;
begin
  select grid_size into v_grid from public.game_config;
  create temp table kept_lots (user_id uuid, x integer, y integer, primary key (user_id, x, y)) on commit drop;
  for r in select * from public.city_tiles order by user_id, placed_at, y, x loop
    if exists (
      select 1 from private.item_cells(r.item_id) c
      where r.x + c.dx >= v_grid or r.y + c.dy >= v_grid
         or exists (select 1 from kept_lots k
                    where k.user_id = r.user_id and k.x = r.x + c.dx and k.y = r.y + c.dy)
    ) then
      delete from public.city_tiles where user_id = r.user_id and x = r.x and y = r.y;
    else
      insert into kept_lots select r.user_id, r.x + c.dx, r.y + c.dy from private.item_cells(r.item_id) c;
    end if;
  end loop;
end;
$$;
