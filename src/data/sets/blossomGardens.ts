import type { CardSet } from './types';

export type BlossomGardensId =
  | 'stepping-stones'
  | 'raked-gravel'
  | 'moss-lawn'
  | 'stone-lantern'
  | 'bamboo-grove'
  | 'tea-hut'
  | 'greenhouse'
  | 'koi-pond'
  | 'garden-shop'
  | 'moon-bridge'
  | 'wisteria-pavilion'
  | 'garden-pagoda'
  | 'great-cherry-tree';

export const blossomGardens: CardSet = {
  id: 'blossom-gardens',
  name: 'Blossom Gardens',
  tagline: 'Series 3 · Old Town',
  wrapper: {
    gradient: ['#FFD9E4', '#F9A8C0', '#7FC8A9'],
    skyline: '#3F7F68',
    skylineFar: '#69A88F',
    window: '#FFF3C4',
    ink: '#5A2A3C',
    sun: '#FFFFFF',
  },
  items: [
    // Commons: the garden's walkable ground, plus a couple of quiet props.
    {
      id: 'stepping-stones',
      name: 'Stepping Stones',
      rarity: 'common',
      kind: 'path',
      flavor: 'Hop, hop, pause, admire, hop.',
      shape: ['#'],
      tilesPerCard: 4,
      walkable: true,
    },
    {
      id: 'raked-gravel',
      name: 'Raked Gravel',
      rarity: 'common',
      kind: 'path',
      flavor: 'Someone rakes it every morning. Nobody knows who.',
      shape: ['#'],
      tilesPerCard: 4,
      walkable: true,
    },
    {
      id: 'moss-lawn',
      name: 'Moss Lawn',
      rarity: 'common',
      kind: 'path',
      flavor: 'Soft as a pillow, damp as a sponge.',
      shape: ['#'],
      tilesPerCard: 2,
      walkable: true,
    },
    {
      id: 'stone-lantern',
      name: 'Stone Lantern',
      rarity: 'common',
      kind: 'prop',
      flavor: 'Lit by hand at dusk, one candle at a time.',
      shape: ['#'],
    },
    {
      id: 'bamboo-grove',
      name: 'Bamboo Grove',
      rarity: 'common',
      kind: 'prop',
      flavor: 'Rustles a lullaby when the wind is right.',
      shape: ['#'],
    },
    {
      id: 'tea-hut',
      name: 'Tea Hut',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'Room for four, if two sit very still.',
      shape: ['#'],
    },
    {
      id: 'greenhouse',
      name: 'Greenhouse',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'Always June inside, whatever the calendar says.',
      shape: ['#', '#'],
    },
    {
      id: 'koi-pond',
      name: 'Koi Pond',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'Seven koi. They have opinions about bread.',
      shape: ['##'],
    },
    {
      id: 'garden-shop',
      name: 'Garden Shop',
      rarity: 'uncommon',
      kind: 'building',
      flavor: 'Seeds, secateurs and very strong advice.',
      // The third L: the notch is at the back-right, the wing runs along the front.
      shape: ['#.', '##'],
    },
    {
      id: 'moon-bridge',
      name: 'Moon Bridge',
      rarity: 'rare',
      kind: 'building',
      flavor: 'Its reflection completes the circle.',
      shape: ['###'],
    },
    {
      id: 'wisteria-pavilion',
      name: 'Wisteria Pavilion',
      rarity: 'rare',
      kind: 'building',
      flavor: 'Purple rain, the gentle kind.',
      shape: ['##', '##'],
    },
    {
      id: 'garden-pagoda',
      name: 'Garden Pagoda',
      rarity: 'epic',
      kind: 'building',
      flavor: 'Five roofs, one bell, a hundred sparrows.',
      shape: ['#'],
    },
    {
      id: 'great-cherry-tree',
      name: 'Great Cherry Tree',
      rarity: 'legendary',
      kind: 'building',
      flavor: 'Older than the town, and it blooms for everyone.',
      shape: ['###', '###', '###'],
    },
  ],
};
