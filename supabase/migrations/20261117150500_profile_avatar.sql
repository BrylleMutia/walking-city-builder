-- Player portrait, chosen in onboarding / Profile. The ids live in the app
-- (src/data/avatars.ts); the server only checks the format, so adding a
-- portrait needs no migration. Unknown ids fall back to the default in the app.
alter table public.profiles
  add column avatar_id text not null default 'sprout'
  check (avatar_id ~ '^[a-z0-9-]{1,32}$');

-- update_profile gains p_avatar_id. A new parameter changes the signature, so
-- drop and recreate (create or replace would add an overload). Every
-- parameter stays optional: older app builds that send only name/goal work.
drop function public.update_profile(text, integer);

create function public.update_profile(
  p_display_name text default null,
  p_step_goal integer default null,
  p_avatar_id text default null
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
      step_goal = coalesce(p_step_goal, step_goal),
      avatar_id = coalesce(nullif(btrim(p_avatar_id), ''), avatar_id)
  where id = v_uid
  returning * into v_profile;
  return jsonb_build_object(
    'display_name', v_profile.display_name,
    'step_goal', v_profile.step_goal,
    'avatar_id', v_profile.avatar_id
  );
end;
$$;

revoke execute on function public.update_profile(text, integer, text) from public, anon;
grant execute on function public.update_profile(text, integer, text) to authenticated;

-- get_my_state returns the avatar too (same signature: replace keeps grants).
create or replace function public.get_my_state(p_since date default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
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
    'city', coalesce((
      select jsonb_agg(jsonb_build_object('x', c.x, 'y', c.y, 'item_id', c.item_id) order by c.placed_at)
      from public.city_tiles c where c.user_id = (select auth.uid())
    ), '[]'::jsonb)
  );
$$;
