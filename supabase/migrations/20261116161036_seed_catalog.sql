-- Catalog data. Mirrors src/data/rarity.ts and src/data/sets/* in the app; item
-- ids must match the app's ItemId values, since the app draws art by id.

insert into public.game_config (id) values (true);

insert into public.rarities (id, tier, weight) values
  ('common', 0, 0.55),
  ('uncommon', 1, 0.27),
  ('rare', 2, 0.12),
  ('epic', 3, 0.04),
  ('legendary', 4, 0.02);

insert into public.card_sets (id, name, tagline, price, is_active, sort_order) values
  ('cozy-downtown', 'Cozy Downtown', 'Series 1 · Main Street', 1000, true, 1),
  ('neon-harbor', 'Neon Harbor', 'Series 2 · The Docks', 1500, false, 2),
  ('blossom-gardens', 'Blossom Gardens', 'Series 3 · Old Town', 1500, false, 3);

insert into public.items (id, set_id, name, rarity, kind, tiles_per_card, walkable) values
  ('cobblestone-street', 'cozy-downtown', 'Cobblestone Street', 'common', 'path', 4, true),
  ('brick-sidewalk', 'cozy-downtown', 'Brick Sidewalk', 'common', 'path', 4, true),
  ('pocket-lawn', 'cozy-downtown', 'Pocket Lawn', 'common', 'path', 2, true),
  ('lamp-post', 'cozy-downtown', 'Lamp Post', 'common', 'prop', 1, false),
  ('park-bench', 'cozy-downtown', 'Park Bench', 'common', 'prop', 1, false),
  ('brick-townhouse', 'cozy-downtown', 'Brick Townhouse', 'uncommon', 'building', 1, false),
  ('corner-cafe', 'cozy-downtown', 'Corner Café', 'uncommon', 'building', 1, false),
  ('bakery', 'cozy-downtown', 'Bakery', 'uncommon', 'building', 1, false),
  ('flower-kiosk', 'cozy-downtown', 'Flower Kiosk', 'uncommon', 'building', 1, false),
  ('fountain-plaza', 'cozy-downtown', 'Fountain Plaza', 'rare', 'building', 1, false),
  ('bookshop', 'cozy-downtown', 'Bookshop', 'rare', 'building', 1, false),
  ('clock-tower', 'cozy-downtown', 'Clock Tower', 'epic', 'building', 1, false),
  ('grand-theater', 'cozy-downtown', 'Grand Theater', 'legendary', 'building', 1, false);
