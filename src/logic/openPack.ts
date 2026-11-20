import {
  CARDS_PER_PACK,
  FOIL_CHANCE,
  RARITY_ORDER,
  RARITY_WEIGHTS,
  rarityTier,
  type Rarity,
} from '../data/rarity';
import type { CardSet, ItemDef } from '../data/sets/types';

export interface PackCard {
  /** Unique within the pack; stable React key. */
  uid: string;
  item: ItemDef;
  rarity: Rarity;
  foil: boolean;
}

export interface RollOptions {
  /** Testing aid: force one card to be legendary. */
  forceLegendary?: boolean;
  /** Testing aid: make every card a foil. */
  forceFoil?: boolean;
}

export type Rng = () => number;

/** Weighted pick over RARITY_WEIGHTS using a single uniform sample. */
export function rollRarity(rng: Rng = Math.random): Rarity {
  let r = rng();
  for (const rarity of RARITY_ORDER) {
    r -= RARITY_WEIGHTS[rarity];
    if (r < 0) return rarity;
  }
  // Floating point slack: the weights sum to 1, so only reachable when r ≈ 1.
  return RARITY_ORDER[0];
}

export function rollCard(set: CardSet, rng: Rng = Math.random): Omit<PackCard, 'uid'> {
  let rarity = rollRarity(rng);
  let pool = set.items.filter((i) => i.rarity === rarity);
  // A set might not have an item of every rarity; fall down to the next one.
  while (pool.length === 0 && rarityTier(rarity) > 0) {
    rarity = RARITY_ORDER[rarityTier(rarity) - 1];
    pool = set.items.filter((i) => i.rarity === rarity);
  }
  const item = pool[Math.floor(rng() * pool.length)] ?? set.items[0];
  const foil = rng() < FOIL_CHANCE;
  return { item, rarity: item.rarity, foil };
}

/**
 * Rolls a full pack. Cards come back sorted lowest rarity first, so the top of
 * the stack is the least exciting card and the best pull is revealed last.
 */
export function rollPack(
  set: CardSet,
  rng: Rng = Math.random,
  options: RollOptions = {},
): PackCard[] {
  const cards = Array.from({ length: CARDS_PER_PACK }, () => rollCard(set, rng));

  if (options.forceLegendary && !cards.some((c) => c.rarity === 'legendary')) {
    const legendary = set.items.find((i) => i.rarity === 'legendary');
    if (legendary) cards[0] = { ...cards[0], item: legendary, rarity: 'legendary' };
  }
  if (options.forceFoil) {
    for (const c of cards) c.foil = true;
  }

  return cards
    .map((c, i) => ({ c, i }))
    .sort((a, b) => rarityTier(a.c.rarity) - rarityTier(b.c.rarity) || a.i - b.i)
    .map(({ c }, i) => ({ ...c, uid: `${i}-${c.item.id}` }));
}

/** Which rarities are present in a pack, as flags indexed by rarity tier. */
export function rarityFlags(cards: readonly PackCard[]): boolean[] {
  return RARITY_ORDER.map((r) => cards.some((c) => c.rarity === r));
}
