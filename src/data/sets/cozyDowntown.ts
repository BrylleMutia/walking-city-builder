import type { Rarity } from '../rarity';

export type ItemId =
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

/**
 * - path: ground infrastructure (streets, sidewalks, lawns). Walkable, auto-connects
 *   to neighbouring paths, and comes in bundles of several tiles per card.
 * - prop: small street furniture (lamps, benches).
 * - building: everything with walls.
 */
export type ItemKind = 'path' | 'prop' | 'building';

export interface ItemDef {
  id: ItemId;
  name: string;
  rarity: Rarity;
  kind: ItemKind;
  flavor: string;
  /** Tiles the item will occupy on the isometric city grid (w × d). */
  footprint: [number, number];
  /** City tiles granted per card pulled (bundles for paths). Defaults to 1. */
  tilesPerCard?: number;
  /** Townsfolk can walk on it (future NPCs path along these tiles). */
  walkable?: boolean;
}

export interface CardSet {
  id: string;
  name: string;
  tagline: string;
  /** Wrapper palette, top → bottom. */
  wrapper: {
    gradient: [string, string, string];
    skyline: string;
    skylineFar: string;
    window: string;
    ink: string;
    sun: string;
  };
  items: ItemDef[];
}

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
      footprint: [1, 1],
      tilesPerCard: 4,
      walkable: true,
    },
    {
      id: 'brick-sidewalk',
      name: 'Brick Sidewalk',
      rarity: 'common',
      kind: 'path',
      flavor: 'Mind the one wobbly brick.',
      footprint: [1, 1],
      tilesPerCard: 4,
      walkable: true,
    },
    {
      id: 'pocket-lawn',
      name: 'Pocket Lawn',
      rarity: 'common',
      kind: 'path',
      flavor: 'A patch of green for a lunchtime sit.',
      footprint: [1, 1],
      tilesPerCard: 2,
      walkable: true,
    },
    {
      id: 'lamp-post',
      name: 'Lamp Post',
      rarity: 'common',
      kind: 'prop',
      flavor: 'Flickers on at dusk, right on time.',
      footprint: [1, 1],
    },
    {
      id: 'park-bench',
      name: 'Park Bench',
      rarity: 'common',
      kind: 'prop',
      flavor: 'Best seat in town after a long walk.',
      footprint: [1, 1],
    },
    {
      id: 'brick-townhouse',
      name: 'Brick Townhouse',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'Three floors, one very steep staircase.',
      footprint: [1, 1],
    },
    {
      id: 'corner-cafe',
      name: 'Corner Café',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'The espresso machine never sleeps.',
      footprint: [1, 1],
    },
    {
      id: 'bakery',
      name: 'Bakery',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'Follow the smell of warm bread.',
      footprint: [1, 1],
    },
    {
      id: 'flower-kiosk',
      name: 'Flower Kiosk',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'Fresh tulips every Tuesday.',
      footprint: [1, 1],
    },
    {
      id: 'fountain-plaza',
      name: 'Fountain Plaza',
      rarity: 'rare',
      kind: 'building',
      flavor: 'Toss a coin, make a wish.',
      footprint: [2, 2],
    },
    {
      id: 'bookshop',
      name: 'Bookshop',
      rarity: 'rare',
      kind: 'building',
      flavor: 'Smells like rain and old paper.',
      footprint: [1, 1],
    },
    {
      id: 'clock-tower',
      name: 'Clock Tower',
      rarity: 'epic',
      kind: 'building',
      flavor: 'The whole street sets its watch by it.',
      footprint: [1, 1],
    },
    {
      id: 'grand-theater',
      name: 'Grand Theater',
      rarity: 'legendary',
      kind: 'building',
      flavor: 'Tonight only: standing ovations.',
      footprint: [2, 2],
    },
  ],
};
