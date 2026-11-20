-- Series 2: Neon Harbor goes on sale. Mirrors src/data/sets/neonHarbor.ts: item
-- ids, rarities, tiles_per_card, walkable and cells must stay identical.

insert into public.items (id, set_id, name, rarity, kind, tiles_per_card, walkable, cells) values
  ('boardwalk-planks',  'neon-harbor', 'Boardwalk Planks',  'common',    'path',     4, true,  '[[0,0]]'),
  ('quay-stones',       'neon-harbor', 'Quay Stones',       'common',    'path',     4, true,  '[[0,0]]'),
  ('sandy-strip',       'neon-harbor', 'Sandy Strip',       'common',    'path',     2, true,  '[[0,0]]'),
  ('neon-lamp',         'neon-harbor', 'Neon Lamp',         'common',    'prop',     1, false, '[[0,0]]'),
  ('cargo-crates',      'neon-harbor', 'Cargo Crates',      'common',    'prop',     1, false, '[[0,0]]'),
  ('noodle-stand',      'neon-harbor', 'Noodle Stand',      'uncommon',  'building', 1, false, '[[0,0]]'),
  ('boathouse',         'neon-harbor', 'Boathouse',         'uncommon',  'building', 1, false, '[[0,0],[0,1]]'),
  ('fish-market',       'neon-harbor', 'Fish Market',       'uncommon',  'building', 1, false, '[[0,0],[1,0]]'),
  ('neon-diner',        'neon-harbor', 'Neon Diner',        'uncommon',  'building', 1, false, '[[0,0],[1,0],[1,1]]'),
  ('retro-arcade',      'neon-harbor', 'Retro Arcade',      'rare',      'building', 1, false, '[[0,0],[1,0],[2,0]]'),
  ('cargo-crane',       'neon-harbor', 'Cargo Crane',       'rare',      'building', 1, false, '[[0,0],[1,0],[0,1],[1,1]]'),
  ('harbor-lighthouse', 'neon-harbor', 'Harbor Lighthouse', 'epic',      'building', 1, false, '[[0,0]]'),
  ('ferris-wheel',      'neon-harbor', 'Ferris Wheel',      'legendary', 'building', 1, false, '[[0,0],[1,0],[0,1],[1,1],[0,2],[1,2]]');

-- On sale at 300 Wood (the price was set when Wood replaced Steps).
update public.card_sets set is_active = true, price = 300 where id = 'neon-harbor';
