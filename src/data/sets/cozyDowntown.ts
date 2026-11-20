import type { CardSet } from './types';

export type CozyDowntownId =
  | 'cobblestone-street'
  | 'brick-sidewalk'
  | 'pocket-lawn'
  | 'lamp-post'
  | 'park-bench'
  | 'brick-townhouse'
  | 'corner-cafe'
  | 'bakery'
  | 'flower-kiosk'
  | 'fountain-plaza'
  | 'bookshop'
  | 'clock-tower'
  | 'grand-theater';

export const cozyDowntown: CardSet = {
  id: 'cozy-downtown',
  name: 'Cozy Downtown',
  tagline: 'Series 1 · Main Street',
  wrapper: {
    gradient: ['#FFC65C', '#F0855A', '#1F8A82'],
    skyline: '#12474A',
    skylineFar: '#2C6F6C',
    window: '#FFE08A',
    ink: '#3A1D0F',
    sun: '#FFF1C2',
  },
  items: [
    // Commons are mostly the city's walkable infrastructure, plus a couple of props.
    {
      id: 'cobblestone-street',
      name: 'Cobblestone Street',
      rarity: 'common',
      kind: 'path',
      flavor: 'Every stone polished by a thousand strolls.',
      shape: ['#'],
      tilesPerCard: 4,
      walkable: true,
    },
    {
      id: 'brick-sidewalk',
      name: 'Brick Sidewalk',
      rarity: 'common',
      kind: 'path',
      flavor: 'Mind the one wobbly brick.',
      shape: ['#'],
      tilesPerCard: 4,
      walkable: true,
    },
    {
      id: 'pocket-lawn',
      name: 'Pocket Lawn',
      rarity: 'common',
      kind: 'path',
      flavor: 'A patch of green for a lunchtime sit.',
      shape: ['#'],
      tilesPerCard: 2,
      walkable: true,
    },
    {
      id: 'lamp-post',
      name: 'Lamp Post',
      rarity: 'common',
      kind: 'prop',
      flavor: 'Flickers on at dusk, right on time.',
      shape: ['#'],
    },
    {
      id: 'park-bench',
      name: 'Park Bench',
      rarity: 'common',
      kind: 'prop',
      flavor: 'Best seat in town after a long walk.',
      shape: ['#'],
    },
    {
      id: 'brick-townhouse',
      name: 'Brick Townhouse',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'Three floors, one very steep staircase.',
      shape: ['#', '#'],
    },
    {
      id: 'corner-cafe',
      name: 'Corner Café',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'The espresso machine never sleeps.',
      shape: ['##', '#.'],
    },
    {
      id: 'bakery',
      name: 'Bakery',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'Follow the smell of warm bread.',
      shape: ['##'],
    },
    {
      id: 'flower-kiosk',
      name: 'Flower Kiosk',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'Fresh tulips every Tuesday.',
      shape: ['#'],
    },
    {
      id: 'fountain-plaza',
      name: 'Fountain Plaza',
      rarity: 'rare',
      kind: 'building',
      flavor: 'Toss a coin, make a wish.',
      shape: ['##', '##'],
    },
    {
      id: 'bookshop',
      name: 'Bookshop',
      rarity: 'rare',
      kind: 'building',
      flavor: 'Smells like rain and old paper.',
      shape: ['##'],
    },
    {
      id: 'clock-tower',
      name: 'Clock Tower',
      rarity: 'epic',
      kind: 'building',
      flavor: 'The whole street sets its watch by it.',
      shape: ['#'],
    },
    {
      id: 'grand-theater',
      name: 'Grand Theater',
      rarity: 'legendary',
      kind: 'building',
      flavor: 'Tonight only: standing ovations.',
      shape: ['###', '###'],
    },
  ],
};
