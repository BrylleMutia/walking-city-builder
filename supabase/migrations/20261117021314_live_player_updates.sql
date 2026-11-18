-- Live multi-device sync: every change to a player's profile or city sends a
-- tiny "changed" nudge on the private Realtime topic `player:<uid>`. Clients
-- re-fetch get_my_state() on a nudge, so no game data travels over Realtime.
--
-- Broadcast-from-database instead of Postgres Changes: Postgres Changes can't
-- apply RLS to DELETE events, so every subscriber would see other players'
-- removed tiles. Note: realtime.messages is partitioned per day and the
-- partitions are created by the Realtime service once a client has connected.

create or replace function private.notify_player_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  uid text := rec ->> case when tg_table_name = 'profiles' then 'id' else 'user_id' end;
begin
  if uid is not null then
    perform realtime.send(
      jsonb_build_object('table', tg_table_name, 'op', tg_op),
      'changed',
      'player:' || uid,
      true
    );
  end if;
  return null;
end;
$$;

revoke all on function private.notify_player_changed() from public, anon, authenticated;

-- Steps, purchases, goal and reset all update the profile row; place/remove
-- update city tiles. Inventory always changes together with the profile.
create trigger profiles_notify_player
  after update on public.profiles
  for each row
  when (old.* is distinct from new.*)
  execute function private.notify_player_changed();

create trigger city_tiles_notify_player
  after insert or update or delete on public.city_tiles
  for each row
  execute function private.notify_player_changed();

-- Players may only listen to their own topic (and can't send on it: no insert policy).
create policy "Players receive their own updates"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'player:' || (select auth.uid())::text
  );
