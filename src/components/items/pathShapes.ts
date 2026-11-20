import type { ItemId } from '../../data/sets/types';
import { DIR } from '../../state/gameLogic';
import { ball, box, cylinder, disc, floor, ground, spot, type Shape } from './iso';

/**
 * Path tiles (streets, sidewalks, lawns) are flat pieces that change shape with
 * their walkable neighbours: `mask` holds DIR bits (N = y-1, E = x+1, S = y+1,
 * W = x-1). Tiles use the same 4×4 footprint as buildings.
 *
 * A city can hold over a hundred path tiles, so every variant merges its
 * same-coloured pieces into one path per colour to keep draw calls low.
 */

export type PathId = Extract<
  ItemId,
  | 'cobblestone-street'
  | 'brick-sidewalk'
  | 'pocket-lawn'
  | 'boardwalk-planks'
  | 'quay-stones'
  | 'sandy-strip'
  | 'stepping-stones'
  | 'raked-gravel'
  | 'moss-lawn'
>;

export const PATH_IDS: readonly PathId[] = [
  'cobblestone-street',
  'brick-sidewalk',
  'pocket-lawn',
  'boardwalk-planks',
  'quay-stones',
  'sandy-strip',
  'stepping-stones',
  'raked-gravel',
  'moss-lawn',
];

/** Shape shown on cards and in the inventory, where there are no neighbours. */
export const DEFAULT_MASK: Record<PathId, number> = {
  'cobblestone-street': DIR.E | DIR.W, // a straight stretch reads as "street"
  'brick-sidewalk': 0,
  'pocket-lawn': 0,
  'boardwalk-planks': DIR.E | DIR.W,
  'quay-stones': 0,
  'sandy-strip': 0,
  'stepping-stones': DIR.N | DIR.S, // a trail of stones reads best running toward the viewer
  'raked-gravel': DIR.E | DIR.W,
  'moss-lawn': 0,
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

/** Boardwalk planks (Neon Harbor): a deck of planks over the water, with posts
 * and a rope rail along edges that don't continue into another path. */
function boardwalk(mask: number): Shape[] {
  const planks: Shape[] = [];
  for (let i = 0; i < 8; i++) {
    const tone = i % 3 === 0 ? '#A9784E' : i % 3 === 1 ? '#B98A5E' : '#B08154';
    planks.push(...floor(i * 0.5 + 0.04, 0, 0.003, 0.42, 4, tone));
  }
  // nail heads where the planks cross the joists
  const nails: Shape[] = [];
  for (let i = 0; i < 8; i++) for (const y of [0.5, 2.0, 3.5]) nails.push(...floor(i * 0.5 + 0.22, y, 0.004, 0.06, 0.06, '#6B4A34'));
  const back: Shape[] = [];
  const front: Shape[] = [];
  const post = '#5E3B26';
  const rope = '#E8D7B0';
  const rail = (out: Shape[], x: number, y: number, alongX: boolean) => {
    const [ex, ey] = alongX ? [3.6, 0] : [0, 3.6];
    out.push(
      ...box(x, y, 0, 0.22, 0.22, 0.6, post),
      ...box(x + ex, y + ey, 0, 0.22, 0.22, 0.6, post),
      ...(alongX ? box(x + 0.1, y + 0.08, 0.42, 3.6, 0.06, 0.06, rope) : box(x + 0.08, y + 0.1, 0.42, 0.06, 3.6, 0.06, rope)),
    );
  };
  if (!has(mask, DIR.N)) rail(back, 0.1, 0.1, true);
  if (!has(mask, DIR.W)) rail(back, 0.1, 0.1, false);
  if (!has(mask, DIR.S)) rail(front, 0.1, 3.68, true);
  if (!has(mask, DIR.E)) rail(front, 3.68, 0.1, false);
  return [...ground('#4F8FB0'), ...floor(0, 0, 0.002, 4, 4, '#6B4A34'), ...merge(planks), ...merge(nails), ...back, ...front];
}

/** Quay stones (Neon Harbor): granite flags with a yellow safety line and a
 * bollard along edges that don't continue into another path. */
function quay(mask: number): Shape[] {
  const flags: Shape[] = [];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const tone = (i * 7 + j * 3) % 4 === 0 ? '#A9B1BB' : (i + j) % 2 === 0 ? '#9AA3AE' : '#A2AAB4';
      flags.push(...floor(i + 0.05, j + 0.05, 0.003, 0.9, 0.9, tone));
    }
  }
  const lines: Shape[] = [];
  const yellow = '#F2C230';
  if (!has(mask, DIR.N)) lines.push(...floor(0, 0.25, 0.004, 4, 0.14, yellow));
  if (!has(mask, DIR.W)) lines.push(...floor(0.25, 0, 0.004, 0.14, 4, yellow));
  if (!has(mask, DIR.S)) lines.push(...floor(0, 3.61, 0.004, 4, 0.14, yellow));
  if (!has(mask, DIR.E)) lines.push(...floor(3.61, 0, 0.004, 0.14, 4, yellow));
  const bollards: Shape[] = [];
  const bollard = (x: number, y: number) =>
    bollards.push(...cylinder(x, y, 0, 0.2, 0.32, '#3B4252'), ...cylinder(x, y, 0.32, 0.27, 0.08, '#4C566A'));
  if (!has(mask, DIR.S)) bollard(2, 3.75);
  if (!has(mask, DIR.E)) bollard(3.75, 2);
  return [...ground('#7E8792'), ...merge(flags), ...merge(lines), ...bollards];
}

/** Sandy strip (Neon Harbor): beach sand with shells and a starfish; edges
 * that don't continue into another path meet the sea with a line of foam. */
function sand(mask: number): Shape[] {
  const ripples: Shape[] = [];
  for (const [x, y, w] of [
    [0.4, 0.6, 1.4],
    [2.2, 1.0, 1.2],
    [0.8, 1.9, 1.6],
    [2.5, 2.6, 1.0],
    [0.5, 3.1, 1.2],
  ]) {
    ripples.push(...floor(x, y, 0.003, w, 0.12, '#F6E8C3'));
  }
  const sea: Shape[] = [];
  const water = '#6FC3E3';
  const foam = '#F4FBFF';
  if (!has(mask, DIR.N)) sea.push(...floor(0, 0, 0.004, 4, 0.45, water), ...floor(0, 0.45, 0.005, 4, 0.1, foam));
  if (!has(mask, DIR.W)) sea.push(...floor(0, 0, 0.004, 0.45, 4, water), ...floor(0.45, 0, 0.005, 0.1, 4, foam));
  if (!has(mask, DIR.S)) sea.push(...floor(0, 3.55, 0.004, 4, 0.45, water), ...floor(0, 3.45, 0.005, 4, 0.1, foam));
  if (!has(mask, DIR.E)) sea.push(...floor(3.55, 0, 0.004, 0.45, 4, water), ...floor(3.45, 0, 0.005, 0.1, 4, foam));
  const bits: Shape[] = [
    ...ball(1.3, 1.4, 0.08, 0.1, '#FFFFFF'),
    ...ball(2.8, 2.0, 0.08, 0.09, '#F7B9C4'),
    ...ball(1.9, 2.9, 0.08, 0.1, '#FFF0D6'),
    // starfish
    ...spot(2.6, 1.4, 0.01, 0.22, 0.07, '#FF8A5C'),
    ...spot(2.6, 1.4, 0.01, 0.07, 0.15, '#FF8A5C'),
  ];
  return [...ground('#EBD49B'), ...merge(ripples), ...merge(sea), ...bits];
}

/** Stepping stones (Blossom Gardens): a trail of flat stones across moss, from
 * the centre to every connected edge; dead ends get a fern so they read as a
 * nook rather than a gap. */
function steppingStones(mask: number): Shape[] {
  const stones: Shape[] = [];
  const rims: Shape[] = [];
  const stone = (x: number, y: number, r: number, tone: string) => {
    rims.push(...disc(x, y, 0.02, r + 0.08, '#8E8A7E'));
    stones.push(...disc(x, y, 0.04, r, tone));
  };
  stone(2, 2, 0.62, '#CFCABD');
  const arms: [bit: number, pts: [number, number][]][] = [
    [DIR.N, [[2.2, 0.85], [1.85, -0.05]]],
    [DIR.S, [[1.8, 3.15], [2.15, 4.05]]],
    [DIR.E, [[3.15, 1.8], [4.05, 2.15]]],
    [DIR.W, [[0.85, 2.2], [-0.05, 1.85]]],
  ];
  for (const [bit, pts] of arms) {
    if (!has(mask, bit)) continue;
    // the stone on the edge is clipped by its neighbour's matching stone, so keep it small
    stone(pts[0][0], pts[0][1], 0.42, '#C4BFB1');
    stone(Math.min(3.75, Math.max(0.25, pts[1][0])), Math.min(3.75, Math.max(0.25, pts[1][1])), 0.26, '#CFCABD');
  }
  const moss: Shape[] = [];
  for (const [x, y] of [
    [0.6, 0.6],
    [3.2, 0.7],
    [0.7, 3.3],
    [3.3, 3.2],
  ]) {
    moss.push(...floor(x - 0.3, y - 0.15, 0.003, 0.6, 0.3, '#7DB86A'));
  }
  const ferns: Shape[] = [];
  if (mask === 0) {
    ferns.push(...ball(0.9, 0.9, 0.3, 0.32, '#3F8F4D'), ...ball(3.1, 3.1, 0.3, 0.3, '#4FA65B'));
  }
  return [...ground('#6FAE5F'), ...merge(moss), ...merge(rims), ...merge(stones), ...ferns];
}

/** Raked gravel (Blossom Gardens): pale gravel raked in lines along the way
 * the path runs; a lone tile or a corner is raked in rings round a rock. */
function rakedGravel(mask: number): Shape[] {
  const lines: Shape[] = [];
  const line = '#D9D3C3';
  const ns = has(mask, DIR.N) || has(mask, DIR.S);
  const ew = has(mask, DIR.E) || has(mask, DIR.W);
  if (ns && !ew) {
    for (let i = 0; i < 7; i++) lines.push(...floor(0.32 + i * 0.5, 0, 0.003, 0.08, 4, line));
  } else if (ew && !ns) {
    for (let i = 0; i < 7; i++) lines.push(...floor(0, 0.32 + i * 0.5, 0.003, 4, 0.08, line));
  }
  const extras: Shape[] = [];
  if (ns === ew) {
    // rings round a rock (lone tile, corner, junction)
    for (const r of [1.7, 1.35, 1.0, 0.65]) {
      extras.push(...disc(2, 2, 0.003, r, line), ...disc(2, 2, 0.004, r - 0.1, '#ECE7DA'));
    }
    extras.push(...ball(2, 2, 0.25, 0.42, '#7E7A70'), ...ball(2.25, 1.85, 0.2, 0.22, '#8E8A7E'));
  }
  const back: Shape[] = [];
  const front: Shape[] = [];
  const edge = '#A49F92';
  if (!has(mask, DIR.N)) back.push(...box(0, 0, 0, 4, 0.16, 0.1, edge));
  if (!has(mask, DIR.W)) back.push(...box(0, 0, 0, 0.16, 4, 0.1, edge));
  if (!has(mask, DIR.S)) front.push(...box(0, 3.84, 0, 4, 0.16, 0.1, edge));
  if (!has(mask, DIR.E)) front.push(...box(3.84, 0, 0, 0.16, 4, 0.1, edge));
  return [...ground('#ECE7DA'), ...merge(lines), ...extras, ...back, ...front];
}

/** Moss lawn (Blossom Gardens): velvety moss sprinkled with fallen petals; a
 * little stream runs along edges that don't lead anywhere. */
function mossLawn(mask: number): Shape[] {
  const tufts: Shape[] = [];
  for (const [x, y] of [
    [0.7, 0.9],
    [2.6, 0.6],
    [1.5, 2.0],
    [3.0, 2.5],
    [0.9, 3.1],
  ]) {
    tufts.push(...floor(x, y, 0.003, 0.45, 0.28, '#7CBF63'));
  }
  const brook: Shape[] = [];
  const water = '#8FD3E8';
  if (!has(mask, DIR.N)) brook.push(...floor(0, 0, 0.004, 4, 0.35, water));
  if (!has(mask, DIR.W)) brook.push(...floor(0, 0, 0.004, 0.35, 4, water));
  if (!has(mask, DIR.S)) brook.push(...floor(0, 3.65, 0.004, 4, 0.35, water));
  if (!has(mask, DIR.E)) brook.push(...floor(3.65, 0, 0.004, 0.35, 4, water));
  const petals: Shape[] = [];
  for (const [x, y] of [
    [1.2, 1.3],
    [2.9, 1.5],
    [2.2, 2.9],
    [1.0, 2.4],
    [3.1, 3.2],
    [1.9, 0.9],
  ]) {
    petals.push(...spot(x, y, 0.01, 0.1, 0.06, '#F7B6CB'));
  }
  return [...ground('#5FA055'), ...merge(tufts), ...merge(brook), ...merge(petals)];
}

const BUILD: Record<PathId, (mask: number) => Shape[]> = {
  'cobblestone-street': street,
  'brick-sidewalk': sidewalk,
  'pocket-lawn': lawn,
  'boardwalk-planks': boardwalk,
  'quay-stones': quay,
  'sandy-strip': sand,
  'stepping-stones': steppingStones,
  'raked-gravel': rakedGravel,
  'moss-lawn': mossLawn,
};

/** Tallest point of each path (hedges, kerbs), in tile units. */
export const PATH_HEIGHT: Record<PathId, number> = {
  'cobblestone-street': 0.4,
  'brick-sidewalk': 0.5,
  'pocket-lawn': 0.8,
  'boardwalk-planks': 0.7,
  'quay-stones': 0.45,
  'sandy-strip': 0.2,
  'stepping-stones': 0.65,
  'raked-gravel': 0.7,
  'moss-lawn': 0.1,
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
