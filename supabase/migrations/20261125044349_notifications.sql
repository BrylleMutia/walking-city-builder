-- In-app notifications (the bell on Home). Rows are written only by the server
-- (security-definer functions and triggers); players read their own and mark
-- them read through mark_notifications_read(). The first one is a welcome with
-- a short walkthrough, created with the player's account (the first anonymous
-- sign-in). The app renders known kinds richly and falls back to title/body,
-- so a new kind can ship from the server alone.

-- ── Table ─────────────────────────────────────────────────────────────────────

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind ~ '^[a-z0-9_]{1,32}$'),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_created on public.notifications (user_id, created_at desc);
-- One welcome per player (keeps the trigger and the backfill idempotent).
create unique index notifications_one_welcome on public.notifications (user_id) where kind = 'welcome';

alter table public.notifications enable row level security;
create policy "Players read their own notifications" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete, truncate on public.notifications from anon, authenticated;

-- ── Welcome ───────────────────────────────────────────────────────────────────

create function private.add_welcome_notification(p_uid uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, title, body)
  values (
    p_uid,
    'welcome',
    'Welcome to Stridewood!',
    'Here’s how your town grows: walk to find Wood, buy booster packs in the Shop, open them, then build your town with the cards.'
  )
  on conflict do nothing;
$$;
revoke all on function private.add_welcome_notification(uuid) from public, anon, authenticated;

-- Existing players get one too (before the live trigger exists: no nudges).
select private.add_welcome_notification(id) from public.profiles;

-- New players: profile, city 0 and the welcome.
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
  perform private.add_welcome_notification(new.id);
  return new;
end;
$$;

-- ── Live sync ─────────────────────────────────────────────────────────────────

create trigger notifications_notify_player
  after insert or update on public.notifications
  for each row
  execute function private.notify_player_changed();

-- ── Mark read ─────────────────────────────────────────────────────────────────

-- Marks the caller's listed notifications read; other players' ids and rows
-- already read are ignored. Returns how many changed.
create function public.mark_notifications_read(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_count integer;
begin
  update public.notifications
  set read_at = now()
  where user_id = v_uid and id = any (coalesce(p_ids, '{}')) and read_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- ── State ─────────────────────────────────────────────────────────────────────

-- Same as multi_city, plus the newest 50 notifications (same signature: the
-- grants stay).
create or replace function public.get_my_state(p_since date default null, p_city_id uuid default null)
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
    ), '{}'::jsonb),
    'notifications', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', n.id, 'kind', n.kind, 'title', n.title, 'body', n.body,
          'created_at', n.created_at, 'read_at', n.read_at
        )
        order by n.created_at desc
      )
      from (
        select * from public.notifications
        where user_id = (select auth.uid())
        order by created_at desc
        limit 50
      ) n
    ), '[]'::jsonb)
  );
$$;
