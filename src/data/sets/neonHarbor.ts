import type { CardSet } from './types';

export type NeonHarborId =
  | 'boardwalk-planks'
  | 'quay-stones'
  | 'sandy-strip'
  | 'neon-lamp'
  | 'cargo-crates'
  | 'noodle-stand'
  | 'boathouse'
  | 'fish-market'
  | 'neon-diner'
  | 'retro-arcade'
  | 'cargo-crane'
  | 'harbor-lighthouse'
  | 'ferris-wheel';

export const neonHarbor: CardSet = {
  id: 'neon-harbor',
  name: 'Neon Harbor',
  tagline: 'Series 2 · The Docks',
  wrapper: {
    gradient: ['#7C6BFF', '#3B3F9E', '#141B4D'],
    skyline: '#0B1030',
    skylineFar: '#262C6E',
    window: '#6EF3FF',
    ink: '#FFFFFF',
    sun: '#FF8AD8',
  },
  items: [
    // Commons: the waterfront's walkable ground, plus a couple of dockside props.
    {
      id: 'boardwalk-planks',
      name: 'Boardwalk Planks',
      rarity: 'common',
      kind: 'path',
      flavor: 'Every plank creaks a different note.',
      shape: ['#'],
      tilesPerCard: 4,
      walkable: true,
    },
    {
      id: 'quay-stones',
      name: 'Quay Stones',
      rarity: 'common',
      kind: 'path',
      flavor: 'Keep behind the yellow line, please.',
      shape: ['#'],
      tilesPerCard: 4,
      walkable: true,
    },
    {
      id: 'sandy-strip',
      name: 'Sandy Strip',
      rarity: 'common',
      kind: 'path',
      flavor: 'Shoes off, shells in your pocket.',
      shape: ['#'],
      tilesPerCard: 2,
      walkable: true,
    },
    {
      id: 'neon-lamp',
      name: 'Neon Lamp',
      rarity: 'common',
      kind: 'prop',
      flavor: 'Hums pink and glows cyan all night.',
      shape: ['#'],
    },
    {
      id: 'cargo-crates',
      name: 'Cargo Crates',
      rarity: 'common',
      kind: 'prop',
      flavor: 'Nobody remembers ordering them.',
      shape: ['#'],
    },
    {
      id: 'noodle-stand',
      name: 'Noodle Stand',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'One bowl, extra chilli, after midnight.',
      shape: ['#'],
    },
    {
      id: 'boathouse',
      name: 'Boathouse',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'The rowing club meets at dawn. Mostly.',
      shape: ['#', '#'],
    },
    {
      id: 'fish-market',
      name: 'Fish Market',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'Fresh off the boat, loud as a gull.',
      shape: ['##'],
    },
    {
      id: 'neon-diner',
      name: 'Neon Diner',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'Chrome stools, bottomless milkshakes.',
      // Wraps the other way from the Corner Café: the notch is front-left.
      shape: ['##', '.#'],
    },
    {
      id: 'retro-arcade',
      name: 'Retro Arcade',
      rarity: 'rare',
      kind: 'building',
      flavor: 'High score: the harbourmaster, since 1987.',
      shape: ['###'],
    },
    {
      id: 'cargo-crane',
      name: 'Cargo Crane',
      rarity: 'rare',
      kind: 'building',
      flavor: 'Lifts a container like a teacup.',
      shape: ['##', '##'],
    },
    {
      id: 'harbor-lighthouse',
      name: 'Harbor Lighthouse',
      rarity: 'epic',
      kind: 'building',
      flavor: 'Sweeps the bay, winks at the ferris wheel.',
      shape: ['#'],
    },
    {
      id: 'ferris-wheel',
      name: 'Ferris Wheel',
      rarity: 'legendary',
      kind: 'building',
      flavor: 'From the top you can see your whole town.',
      shape: ['##', '##', '##'],
    },
  ],
};
