import { cozyDowntown, type CardSet } from './cozyDowntown';

export interface SetListing {
  id: string;
  name: string;
  tagline: string;
  blurb: string;
  /** Price of one booster pack, in Wood. Must match the server's `card_sets.price`. */
  price: number;
  wrapper: CardSet['wrapper'];
  /** Present only for sets that can actually be opened. */
  set?: CardSet;
}

export const SET_LISTINGS: SetListing[] = [
  {
    id: cozyDowntown.id,
    name: cozyDowntown.name,
    tagline: cozyDowntown.tagline,
    blurb:
      'A warm little main street of cafés and brick townhouses. The rarest packs hold a clock tower and a grand theater.',
    price: 200,
    wrapper: cozyDowntown.wrapper,
    set: cozyDowntown,
  },
  {
    id: 'neon-harbor',
    name: 'Neon Harbor',
    tagline: 'Series 2 · The Docks',
    blurb: 'Lighthouses, arcades and a ferris wheel glowing over the night-time port.',
    price: 1500,
    wrapper: {
      gradient: ['#7C6BFF', '#3B3F9E', '#141B4D'],
      skyline: '#0B1030',
      skylineFar: '#262C6E',
      window: '#6EF3FF',
      ink: '#FFFFFF',
      sun: '#FF8AD8',
    },
  },
  {
    id: 'blossom-gardens',
    name: 'Blossom Gardens',
    tagline: 'Series 3 · Old Town',
    blurb: 'Pagodas, koi ponds and cherry trees for a quieter corner of the city.',
    price: 1500,
    wrapper: {
      gradient: ['#FFD9E4', '#F9A8C0', '#7FC8A9'],
      skyline: '#3F7F68',
      skylineFar: '#69A88F',
      window: '#FFF3C4',
      ink: '#5A2A3C',
      sun: '#FFFFFF',
    },
  },
];

export const getListing = (id: string | undefined) => SET_LISTINGS.find((s) => s.id === id);
