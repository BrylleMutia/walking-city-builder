import { RARITY_ORDER } from '../rarity';
import { getItem, setOf } from '../items';
import { PLAYABLE_SETS, SET_LISTINGS, setCountLabel, setSummary } from '.';

describe('playable sets', () => {
  it('Cozy Downtown and Neon Harbor can be opened; Blossom Gardens is still coming', () => {
    expect(PLAYABLE_SETS.map((s) => s.id)).toEqual(['cozy-downtown', 'neon-harbor']);
    expect(SET_LISTINGS.find((l) => l.id === 'blossom-gardens')?.set).toBeUndefined();
  });

  it('every set has at least one item of every rarity (the server rolls rarity first)', () => {
    for (const set of PLAYABLE_SETS) {
      for (const r of RARITY_ORDER) expect(set.items.some((i) => i.rarity === r)).toBe(true);
    }
  });

  it('item ids are unique across sets and know their set', () => {
    const ids = PLAYABLE_SETS.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(setOf('ferris-wheel')?.id).toBe('neon-harbor');
    expect(getItem('boardwalk-planks')?.walkable).toBe(true);
  });

  it('follows the set guideline: commons are mostly walkable paths, uncommon and up are buildings', () => {
    for (const set of PLAYABLE_SETS) {
      const commons = set.items.filter((i) => i.rarity === 'common');
      expect(commons.filter((i) => i.kind === 'path' && i.walkable).length).toBeGreaterThanOrEqual(3);
      for (const i of set.items.filter((it) => it.rarity !== 'common')) expect(i.kind).toBe('building');
      // every shape's anchor (row 0, col 0) is covered
      for (const i of set.items) expect(i.shape[0][0]).toBe('#');
    }
  });

  it('sums up a set for the Shop from its own items', () => {
    expect(setSummary(PLAYABLE_SETS[0])).toBe('8 buildings · 3 paths · 2% legendary');
  });

  it('counts sets that are out vs coming soon', () => {
    expect(setCountLabel()).toBe('2 out · 1 soon');
    expect(setCountLabel(SET_LISTINGS.filter((l) => l.set))).toBe('2 sets');
  });

  it('matches the Wood prices on the server', () => {
    expect(SET_LISTINGS.map((l) => [l.id, l.price])).toEqual([
      ['cozy-downtown', 200],
      ['neon-harbor', 300],
      ['blossom-gardens', 300],
    ]);
  });
});
