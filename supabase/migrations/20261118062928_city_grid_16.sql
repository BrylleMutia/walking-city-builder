-- City lawn 12×12 → 16×16, with existing towns re-centered.
--
-- place_item reads game_config.grid_size for its bounds check, so this is the
-- only rule change. Every placed tile moves by +2,+2 so old towns sit in the
-- middle of the bigger lawn (2 new lots on every side); the app's cache
-- (CACHE_VERSION 3) applies the same shift.

update public.game_config set grid_size = 16;
alter table public.game_config alter column grid_size set default 16;

-- Two steps so the primary key (user_id, x, y) never collides mid-statement:
-- 0–11 → 40–51 (disjoint from every current tile), then 40–51 → 2–13.
-- city_tiles.x/y allow 0–63. The city_tiles_notify_player row trigger sends
-- "changed" nudges, so online players refresh to the shifted city by themselves.
update public.city_tiles set x = x + 40, y = y + 40;
update public.city_tiles set x = x - 38, y = y - 38;
