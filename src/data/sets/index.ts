import { cozyDowntown } from './cozyDowntown';
import { neonHarbor } from './neonHarbor';
import { RARITY_WEIGHTS } from '../rarity';
import type { CardSet, ItemKind } from './types';

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
    id: neonHarbor.id,
    name: neonHarbor.name,
    tagline: neonHarbor.tagline,
    blurb:
      'A night-time port of boardwalks and fish stalls, lit by a retro arcade. Lucky pulls bring a lighthouse or a ferris wheel.',
    price: 300,
    wrapper: neonHarbor.wrapper,
    set: neonHarbor,
  },
  {
    id: 'blossom-gardens',
    name: 'Blossom Gardens',
    tagline: 'Series 3 · Old Town',
    blurb: 'Koi ponds and cherry trees for a quieter corner of the city.',
    price: 300,
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

/**
 * "8 buildings · 3 paths · 2% legendary": the Shop's one-line pitch, worked out
 * from the set itself so it can't drift when items change.
 */
export function setSummary(set: CardSet): string {
  const count = (kind: ItemKind) => set.items.filter((i) => i.kind === kind).length;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const legendary = Math.round(RARITY_WEIGHTS.legendary * 100);
  return [plural(count('building'), 'building'), plural(count('path'), 'path'), `${legendary}% legendary`].join(' · ');
}

/** "2 out · 1 soon" for the Shop's section header; just "N sets" once every set is out. */
export function setCountLabel(listings: SetListing[] = SET_LISTINGS): string {
  const out = listings.filter((l) => l.set).length;
  const soon = listings.length - out;
  return soon === 0 ? `${out} sets` : `${out} out · ${soon} soon`;
}

/** Every set that can be opened, in Shop order. Their items make up the whole catalogue. */
export const PLAYABLE_SETS: CardSet[] = SET_LISTINGS.flatMap((l) => (l.set ? [l.set] : []));
