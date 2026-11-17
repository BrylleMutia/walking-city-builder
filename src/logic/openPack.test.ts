import { CARDS_PER_PACK, FOIL_CHANCE, RARITY_ORDER, RARITY_WEIGHTS, rarityTier } from '../data/rarity';
import { cozyDowntown } from '../data/sets/cozyDowntown';
import { rarityFlags, rollPack } from './openPack';

/** Small deterministic PRNG so the distribution test never flakes. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('set data', () => {
  it('has 13 items and at least one per rarity', () => {
    expect(cozyDowntown.items).toHaveLength(13);
    for (const r of RARITY_ORDER) {
      expect(cozyDowntown.items.some((i) => i.rarity === r)).toBe(true);
    }
  });

  it('has weights that sum to 1 and decrease with rarity', () => {
    const w = RARITY_ORDER.map((r) => RARITY_WEIGHTS[r]);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    for (let i = 1; i < w.length; i++) expect(w[i]).toBeLessThan(w[i - 1]);
    expect(RARITY_WEIGHTS.legendary).toBe(0.02);
    expect(FOIL_CHANCE).toBe(0.1);
  });
});

describe('rollPack', () => {
  it('returns 5 cards sorted from lowest to highest rarity', () => {
    const rng = mulberry32(7);
    for (let n = 0; n < 500; n++) {
      const pack = rollPack(cozyDowntown, rng);
      expect(pack).toHaveLength(CARDS_PER_PACK);
      expect(new Set(pack.map((c) => c.uid)).size).toBe(CARDS_PER_PACK);
      for (let i = 1; i < pack.length; i++) {
        expect(rarityTier(pack[i].rarity)).toBeGreaterThanOrEqual(rarityTier(pack[i - 1].rarity));
      }
      for (const c of pack) expect(c.item.rarity).toBe(c.rarity);
    }
  });

  it('matches the configured rarity and foil odds', () => {
    const rng = mulberry32(12345);
    const packs = 100_000;
    const counts: Record<string, number> = {};
    let foils = 0;
    for (let n = 0; n < packs; n++) {
      for (const c of rollPack(cozyDowntown, rng)) {
        counts[c.rarity] = (counts[c.rarity] ?? 0) + 1;
        if (c.foil) foils++;
      }
    }
    const total = packs * CARDS_PER_PACK;
    for (const r of RARITY_ORDER) {
      expect(Math.abs(counts[r] / total - RARITY_WEIGHTS[r])).toBeLessThan(0.005);
    }
    expect(Math.abs(foils / total - FOIL_CHANCE)).toBeLessThan(0.005);
  });

  it('honours the testing overrides', () => {
    const rng = mulberry32(99);
    for (let n = 0; n < 200; n++) {
      const pack = rollPack(cozyDowntown, rng, { forceLegendary: true, forceFoil: true });
      expect(pack).toHaveLength(CARDS_PER_PACK);
      expect(pack[pack.length - 1].rarity).toBe('legendary');
      expect(pack.every((c) => c.foil)).toBe(true);
      expect(rarityFlags(pack)[4]).toBe(true);
    }
  });
});
