import type { ItemId } from '../../data/sets/cozyDowntown';
import { DIR } from '../../state/gameLogic';
import { ball, box, floor, ground, type Shape } from './iso';

/**
 * Path tiles (streets, sidewalks, lawns) are flat pieces that change shape with
 * their walkable neighbours: `mask` holds DIR bits (N = y-1, E = x+1, S = y+1,
 * W = x-1). Tiles use the same 4×4 footprint as buildings.
 *
 * A city can hold over a hundred path tiles, so every variant merges its
 * same-coloured pieces into one path per colour to keep draw calls low.
 */

export type PathId = Extract<ItemId, 'cobblestone-street' | 'brick-sidewalk' | 'pocket-lawn'>;

export const PATH_IDS: readonly PathId[] = ['cobblestone-street', 'brick-sidewalk', 'pocket-lawn'];

/** Shape shown on cards and in the inventory, where there are no neighbours. */
export const DEFAULT_MASK: Record<PathId, number> = {
  'cobblestone-street': DIR.E | DIR.W, // a straight stretch reads as "street"
  'brick-sidewalk': 0,
  'pocket-lawn': 0,
};

const has = (mask: number, bit: number) => (mask & bit) !== 0;

/** Merges shapes of the same colour into one path, keeping first-seen order. */
function merge(shapes: Shape[]): Shape[] {
  const byColor = new Map<string, string>();
  for (const s of shapes) byColor.set(s.color, (byColor.get(s.color) ?? '') + s.d + ' ');
  return [...byColor].map(([color, d]) => ({ color, d }));
}

type Rect = [x: number, y: number, w: number, d: number];

/** Cobblestone street: pale pavement margins with a cobbled carriageway that
 * runs to every connected edge. */
function street(mask: number): Shape[] {
  const road: Rect[] = [[1, 1, 2, 2]];
  if (has(mask, DIR.N)) road.push([1, 0, 2, 1]);
  if (has(mask, DIR.S)) road.push([1, 3, 2, 1]);
  if (has(mask, DIR.E)) road.push([3, 1, 1, 2]);
  if (has(mask, DIR.W)) road.push([0, 1, 1, 2]);

  const base: Shape[] = [];
  const stones: Shape[] = [];
  for (const [x, y, w, d] of road) {
    base.push(...floor(x, y, 0.002, w, d, '#8C8377'));
    // Cobbles: a checker of slightly lighter stones, half a unit each.
    for (let i = 0; i < w * 2; i++) {
      for (let j = 0; j < d * 2; j++) {
        const cx = x + i * 0.5;
        const cy = y + j * 0.5;
        if ((Math.round(cx * 2) + Math.round(cy * 2)) % 2 === 0) {
          stones.push(...floor(cx + 0.06, cy + 0.06, 0.004, 0.38, 0.38, '#A1978A'));
        }
      }
    }
  }
  // Kerb lines where the carriageway meets the pavement.
  const kerbs: Shape[] = [];
  const kerb = '#B5AC9E';
  if (!has(mask, DIR.N)) kerbs.push(...floor(1, 0.9, 0.003, 2, 0.1, kerb));
  if (!has(mask, DIR.S)) kerbs.push(...floor(1, 3, 0.003, 2, 0.1, kerb));
  if (!has(mask, DIR.E)) kerbs.push(...floor(3, 1, 0.003, 0.1, 2, kerb));
  if (!has(mask, DIR.W)) kerbs.push(...floor(0.9, 1, 0.003, 0.1, 2, kerb));

  return [...ground('#D9D2C4'), ...merge(base), ...merge(stones), ...merge(kerbs)];
}

/** Brick sidewalk: running-bond bricks across the whole tile, with a raised
 * kerb on any edge that doesn't continue into another path. */
function sidewalk(mask: number): Shape[] {
  const bricks: Shape[] = [];
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    const y = r * 0.5;
    const offset = r % 2 === 0 ? 0 : 0.5;
    for (let x = -offset; x < 4; x += 1) {
      const x0 = Math.max(0, x) + 0.04;
      const x1 = Math.min(4, x + 1) - 0.04;
      if (x1 - x0 < 0.1) continue;
      const tone = (r * 3 + Math.round(x * 2)) % 3 === 0 ? '#B86F55' : '#C98166';
      bricks.push(...floor(x0, y + 0.04, 0.003, x1 - x0, 0.42, tone));
    }
  }
  const back: Shape[] = [];
  const front: Shape[] = [];
  const kerb = '#B9B3A6';
  if (!has(mask, DIR.N)) back.push(...box(0, 0, 0, 4, 0.22, 0.12, kerb));
  if (!has(mask, DIR.W)) back.push(...box(0, 0, 0, 0.22, 4, 0.12, kerb));
  if (!has(mask, DIR.S)) front.push(...box(0, 3.78, 0, 4, 0.22, 0.12, kerb));
  if (!has(mask, DIR.E)) front.push(...box(3.78, 0, 0, 0.22, 4, 0.12, kerb));
  return [...ground('#E4D3C6'), ...merge(bricks), ...back, ...front];
}

/** Pocket lawn: grass with tufts and flowers, hedged on edges that don't lead
 * anywhere so open sides read as entrances. */
function lawn(mask: number): Shape[] {
  const tufts: Shape[] = [];
  for (const [x, y] of [
    [0.6, 0.7],
    [2.4, 0.5],
    [1.4, 1.8],
    [3.0, 2.2],
    [0.8, 3.0],
    [2.2, 3.1],
  ]) {
    tufts.push(...floor(x, y, 0.003, 0.5, 0.3, '#9AD67A'));
  }
  const back: Shape[] = [];
  const front: Shape[] = [];
  const hedge = '#4C9A55';
  if (!has(mask, DIR.N)) back.push(...box(0.1, 0.1, 0, 3.8, 0.4, 0.45, hedge));
  if (!has(mask, DIR.W)) back.push(...box(0.1, 0.1, 0, 0.4, 3.8, 0.45, hedge));
  const flowers: Shape[] = [
    ...ball(1.2, 1.2, 0.12, 0.14, '#FF7A9C'),
    ...ball(2.9, 1.3, 0.12, 0.14, '#FFD166'),
    ...ball(2.0, 2.6, 0.12, 0.14, '#B58CFF'),
    ...ball(1.0, 2.5, 0.12, 0.12, '#FFFFFF'),
    ...ball(3.0, 3.0, 0.12, 0.12, '#FF7A9C'),
  ];
  if (!has(mask, DIR.S)) front.push(...box(0.1, 3.5, 0, 3.8, 0.4, 0.45, hedge));
  if (!has(mask, DIR.E)) front.push(...box(3.5, 0.1, 0, 0.4, 3.8, 0.45, hedge));
  return [...ground('#8CCB6A'), ...merge(tufts), ...back, ...flowers, ...front];
}

const BUILD: Record<PathId, (mask: number) => Shape[]> = {
  'cobblestone-street': street,
  'brick-sidewalk': sidewalk,
  'pocket-lawn': lawn,
};

/** Tallest point of each path (hedges, kerbs), in tile units. */
export const PATH_HEIGHT: Record<PathId, number> = {
  'cobblestone-street': 0.4,
  'brick-sidewalk': 0.5,
  'pocket-lawn': 0.8,
};

const cache = new Map<string, Shape[]>();

export function isPathId(id: ItemId): id is PathId {
  return (PATH_IDS as readonly ItemId[]).includes(id);
}

/** Memoised shapes for one path variant (16 masks per path type). */
export function getPathShapes(id: PathId, mask: number): Shape[] {
  const key = `${id}:${mask}`;
  let shapes = cache.get(key);
  if (!shapes) {
    shapes = BUILD[id](mask & 15);
    cache.set(key, shapes);
  }
  return shapes;
}
