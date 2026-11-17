-- Walking Pack City: core schema.
-- Catalog tables are public read-only. Player tables are readable only by their
-- owner and are never written directly by clients: every change goes through the
-- security-definer game functions (next migration), which enforce the rules.

-- ── Catalog ──────────────────────────────────────────────────────────────────

create table public.game_config (
  id boolean primary key default true check (id),           -- single row
  cards_per_pack smallint not null default 5 check (cards_per_pack between 1 and 20),
  foil_chance numeric(5, 4) not null default 0.10 check (foil_chance between 0 and 1),
  starting_balance integer not null default 3000 check (starting_balance >= 0),
  max_daily_steps integer not null default 60000 check (max_daily_steps > 0),
  grid_size smallint not null default 12 check (grid_size between 1 and 64)
);
comment on table public.game_config is 'Global game tunables (single row).';

create table public.rarities (
  id text primary key,
  tier smallint not null unique,                              -- 0 = common … 4 = legendary
  weight numeric(6, 5) not null check (weight > 0 and weight <= 1)
);
comment on table public.rarities is 'Per-card roll chance for each rarity (weights sum to 1).';

create table public.card_sets (
  id text primary key,
  name text not null,
  tagline text not null default '',
  price integer not null check (price >= 0),                 -- Steps per booster pack
  is_active boolean not null default false,                  -- false = "coming soon"
  sort_order smallint not null default 0
);

create table public.items (
  id text primary key,                                       -- matches the app's ItemId
  set_id text not null references public.card_sets (id) on delete cascade,
  name text not null,
  rarity text not null references public.rarities (id),
  kind text not null check (kind in ('path', 'prop', 'building')),
  tiles_per_card smallint not null default 1 check (tiles_per_card between 1 and 20),
  walkable boolean not null default false
);
create index items_set_rarity_idx on public.items (set_id, rarity);

-- ── Players ──────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Walker' check (char_length(display_name) between 1 and 32),
  step_goal integer not null default 8000 check (step_goal between 1000 and 30000),
  balance integer not null default 0 check (balance >= 0),   -- spendable Steps
  lifetime_steps bigint not null default 0 check (lifetime_steps >= 0),
  packs_opened integer not null default 0 check (packs_opened >= 0),
  is_tester boolean not null default false,                  -- unlocks forced pack rolls; set by hand
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_steps (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,                                         -- the player's local calendar day
  steps integer not null default 0 check (steps >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table public.pack_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  set_id text not null references public.card_sets (id),
  cost integer not null check (cost >= 0),
  created_at timestamptz not null default now()
);
create index pack_openings_user_idx on public.pack_openings (user_id, created_at desc);
create index pack_openings_set_idx on public.pack_openings (set_id);

create table public.pack_cards (
  opening_id uuid not null references public.pack_openings (id) on delete cascade,
  position smallint not null check (position >= 0),          -- 0 = top of the stack (lowest rarity)
  item_id text not null references public.items (id),
  rarity text not null references public.rarities (id),
  foil boolean not null default false,
  primary key (opening_id, position)
);
create index pack_cards_item_idx on public.pack_cards (item_id);
create index pack_cards_rarity_idx on public.pack_cards (rarity);

create table public.inventory (
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_id text not null references public.items (id),
  quantity integer not null default 0 check (quantity >= 0), -- placeable copies (tiles for paths)
  foil_cards integer not null default 0 check (foil_cards >= 0),
  primary key (user_id, item_id)
);
create index inventory_item_idx on public.inventory (item_id);

create table public.city_tiles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  x smallint not null check (x between 0 and 63),
  y smallint not null check (y between 0 and 63),
  item_id text not null references public.items (id),
  placed_at timestamptz not null default now(),
  primary key (user_id, x, y)
);
create index city_tiles_item_idx on public.city_tiles (item_id);
create index city_tiles_user_item_idx on public.city_tiles (user_id, item_id);

-- ── Row level security ───────────────────────────────────────────────────────

alter table public.game_config enable row level security;
alter table public.rarities enable row level security;
alter table public.card_sets enable row level security;
alter table public.items enable row level security;
alter table public.profiles enable row level security;
alter table public.daily_steps enable row level security;
alter table public.pack_openings enable row level security;
alter table public.pack_cards enable row level security;
alter table public.inventory enable row level security;
alter table public.city_tiles enable row level security;

create policy "Catalog is public" on public.game_config for select to anon, authenticated using (true);
create policy "Catalog is public" on public.rarities for select to anon, authenticated using (true);
create policy "Catalog is public" on public.card_sets for select to anon, authenticated using (true);
create policy "Catalog is public" on public.items for select to anon, authenticated using (true);

create policy "Players read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "Players read their own steps" on public.daily_steps
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Players read their own pack history" on public.pack_openings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Players read cards from their own packs" on public.pack_cards
  for select to authenticated using (
    exists (
      select 1 from public.pack_openings o
      where o.id = pack_cards.opening_id and o.user_id = (select auth.uid())
    )
  );
create policy "Players read their own inventory" on public.inventory
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Players read their own city" on public.city_tiles
  for select to authenticated using (user_id = (select auth.uid()));

-- No insert/update/delete policies on player tables: writes only via game functions.
revoke insert, update, delete, truncate on
  public.game_config, public.rarities, public.card_sets, public.items,
  public.profiles, public.daily_steps, public.pack_openings, public.pack_cards,
  public.inventory, public.city_tiles
from anon, authenticated;

-- ── New player bootstrap ─────────────────────────────────────────────────────

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, balance)
  values (new.id, coalesce((select starting_balance from public.game_config), 3000))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger daily_steps_touch before update on public.daily_steps
  for each row execute function public.touch_updated_at();
