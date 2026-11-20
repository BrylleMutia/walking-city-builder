-- Series 3: Blossom Gardens goes on sale. Mirrors src/data/sets/blossomGardens.ts:
-- item ids, rarities, tiles_per_card, walkable and cells must stay identical.

insert into public.items (id, set_id, name, rarity, kind, tiles_per_card, walkable, cells) values
  ('stepping-stones',   'blossom-gardens', 'Stepping Stones',   'common',    'path',     4, true,  '[[0,0]]'),
  ('raked-gravel',      'blossom-gardens', 'Raked Gravel',      'common',    'path',     4, true,  '[[0,0]]'),
  ('moss-lawn',         'blossom-gardens', 'Moss Lawn',         'common',    'path',     2, true,  '[[0,0]]'),
  ('stone-lantern',     'blossom-gardens', 'Stone Lantern',     'common',    'prop',     1, false, '[[0,0]]'),
  ('bamboo-grove',      'blossom-gardens', 'Bamboo Grove',      'common',    'prop',     1, false, '[[0,0]]'),
  ('tea-hut',           'blossom-gardens', 'Tea Hut',           'uncommon',  'building', 1, false, '[[0,0]]'),
  ('greenhouse',        'blossom-gardens', 'Greenhouse',        'uncommon',  'building', 1, false, '[[0,0],[0,1]]'),
  ('koi-pond',          'blossom-gardens', 'Koi Pond',          'uncommon',  'building', 1, false, '[[0,0],[1,0]]'),
  ('garden-shop',       'blossom-gardens', 'Garden Shop',       'uncommon',  'building', 1, false, '[[0,0],[0,1],[1,1]]'),
  ('moon-bridge',       'blossom-gardens', 'Moon Bridge',       'rare',      'building', 1, false, '[[0,0],[1,0],[2,0]]'),
  ('wisteria-pavilion', 'blossom-gardens', 'Wisteria Pavilion', 'rare',      'building', 1, false, '[[0,0],[1,0],[0,1],[1,1]]'),
  ('garden-pagoda',     'blossom-gardens', 'Garden Pagoda',     'epic',      'building', 1, false, '[[0,0]]'),
  ('great-cherry-tree', 'blossom-gardens', 'Great Cherry Tree', 'legendary', 'building', 1, false, '[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]');

update public.card_sets set is_active = true, price = 300 where id = 'blossom-gardens';
