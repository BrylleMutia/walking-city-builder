-- Move a placed object to another lot, or swap it with the object already there.
-- Used by the City tab's top-down view (drag, or the Move button).

create function public.move_item(p_from_x integer, p_from_y integer, p_to_x integer, p_to_y integer)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_grid smallint;
  v_from public.city_tiles;
  v_to public.city_tiles;
begin
  select grid_size into v_grid from public.game_config;
  if p_to_x is null or p_to_y is null or p_to_x < 0 or p_to_y < 0 or p_to_x >= v_grid or p_to_y >= v_grid then
    raise exception 'out_of_bounds' using errcode = 'P0001';
  end if;
  if p_from_x = p_to_x and p_from_y = p_to_y then
    raise exception 'same_tile' using errcode = 'P0001';
  end if;

  perform 1 from public.profiles where id = v_uid for update;

  select * into v_from from public.city_tiles
  where user_id = v_uid and x = p_from_x and y = p_from_y;
  if not found then
    raise exception 'tile_empty' using errcode = 'P0001';
  end if;

  select * into v_to from public.city_tiles
  where user_id = v_uid and x = p_to_x and y = p_to_y;

  if not found then
    update public.city_tiles set x = p_to_x, y = p_to_y
    where user_id = v_uid and x = p_from_x and y = p_from_y;
    return jsonb_build_object(
      'from', jsonb_build_object('x', p_from_x, 'y', p_from_y, 'item_id', null),
      'to', jsonb_build_object('x', p_to_x, 'y', p_to_y, 'item_id', v_from.item_id),
      'swapped', false
    );
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

revoke execute on function public.move_item(integer, integer, integer, integer) from public, anon;
grant execute on function public.move_item(integer, integer, integer, integer) to authenticated;
