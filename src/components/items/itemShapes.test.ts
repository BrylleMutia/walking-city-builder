import { PLAYABLE_SETS } from '../../data/sets';
import { getItemArt } from './itemShapes';

/**
 * Topmost screen y of a shape list, in tile units (y grows downward, the
 * anchor's back corner on the ground is 0). Ellipse arcs (`A rx ry … x y`) can
 * rise ry above their end point, so that's counted too.
 */
function top(d: string): number {
  let min = Infinity;
  const re = /([MLA])([^MLAZ]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const nums = m[2].trim().split(/[\s,]+/).map(Number);
    if (m[1] === 'A') min = Math.min(min, nums[6] - nums[1]);
    else min = Math.min(min, nums[1]);
  }
  return min;
}

describe('item art', () => {
  const items = PLAYABLE_SETS.flatMap((s) => s.items);

  it.each(items.map((i) => [i.id]))('%s: declared height covers the drawing', (id) => {
    const art = getItemArt(id);
    const highest = Math.min(...art.pieces.flatMap((p) => p.shapes.map((s) => top(s.d))));
    // ItemArt reserves `height` above the footprint's back corner; allow a hair of rounding
    expect(-highest).toBeLessThanOrEqual(art.height + 0.05);
  });

  it('every item has a drawing whose pieces cover its footprint', () => {
    for (const item of items) {
      const art = getItemArt(item.id);
      const cells = art.pieces.reduce((n, p) => n + p.rect[2] * p.rect[3], 0);
      const lots = item.shape.join('').split('').filter((c) => c === '#').length;
      expect(cells).toBe(lots);
    }
  });
});
