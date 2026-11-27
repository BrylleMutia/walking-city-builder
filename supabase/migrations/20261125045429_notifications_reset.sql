-- A reset player starts over like a new one: the welcome (with its
-- walkthrough) is unread again. Everything else is as in multi_city.
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
  perform private.add_welcome_notification(v_uid);
  update public.notifications set read_at = null
  where user_id = v_uid and kind = 'welcome' and read_at is not null;
  return jsonb_build_object('balance', coalesce(v_start, 3000));
end;
$$;
