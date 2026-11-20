import type { BlossomGardensId } from '../../data/sets/blossomGardens';
import {
  ball,
  box,
  cylinder,
  disc,
  flat,
  floor,
  ground,
  project,
  pyramid,
  shade,
  slab,
  spot,
  wallL,
  wallR,
  type Shape,
} from './iso';
import type { ArtPiece } from './itemShapes';

/**
 * Series 3 (Blossom Gardens) buildings and props. Same rules as itemShapes.ts: 4
 * iso units per lot, shapes listed back to front, multi-lot items on a `slab`.
 * The palette is an old-town garden in spring: moss, pale stone, timber and
 * plaster, vermilion lacquer and a lot of cherry blossom.
 */

const MOSS = '#6FAE5F';
const MOSS_LIGHT = '#7DB86A';
const STONE = '#B8B3A6';
const STONE_DARK = '#8E8A7E';
const STONE_LIGHT = '#CFCABD';
const GRAVEL = '#E6E0D1';
const TIMBER = '#7A5236';
const TIMBER_DARK = '#5A3B27';
const PLASTER = '#F5EEDC';
const PAPER = '#FFF8E6';
const SLATE = '#56607A';
const ROOF_GREEN = '#3E6B5A';
const VERMILION = '#D9543F';
const WATER = '#7FC6DE';
const WATER_DEEP = '#5FAFCB';
const LEAF = '#4FA65B';
const LEAF_DARK = '#3F8F4D';
const LEAF_LIGHT = '#62B86B';
const BAMBOO = '#8CC152';
const CHERRY = '#F7A8C4';
const CHERRY_LIGHT = '#FFD3E1';
const CHERRY_DEEP = '#EE8FB3';
const BLOSSOM_WHITE = '#FFF0F5';
const WISTERIA = '#B58CFF';
const WISTERIA_DEEP = '#9C6ADE';
const WISTERIA_LIGHT = '#C9A8FF';
const GOLD = '#E0B44C';
const WARM_GLOW = '#FFE3A0';
const GLOW = 'rgba(255,214,120,0.28)';
const GLASS = 'rgba(205,240,232,0.5)';
const FRAME = '#F4F6F2';

const n = (v: number) => Math.round(v * 1000) / 1000;

/**
 * A branch: a screen-space quad between two 3D points, `w` wide on screen. Iso
 * has no primitive for slanted 3D bars, and limbs are thin enough that a flat
 * ribbon reads as round.
 */
function limb(a: [number, number, number], b: [number, number, number], w: number, color: string): Shape[] {
  const [ax, ay] = project(...a);
  const [bx, by] = project(...b);
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const ox = (-(by - ay) / len) * (w / 2);
  const oy = ((bx - ax) / len) * (w / 2);
  // the far end tapers to 60%
  const t = 0.6;
  return [
    {
      d: `M${n(ax + ox)} ${n(ay + oy)} L${n(bx + ox * t)} ${n(by + oy * t)} L${n(bx - ox * t)} ${n(by - oy * t)} L${n(ax - ox)} ${n(ay - oy)} Z`,
      color,
    },
  ];
}

/** Deterministic pseudo-random numbers, so the drawings never change between runs. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** A small stone lantern standing at (x, y), `k` times the size of the prop's. */
function miniLantern(x: number, y: number, k: number): Shape[] {
  return [
    ...box(x - 0.3 * k, y - 0.3 * k, 0, 0.6 * k, 0.6 * k, 0.16 * k, STONE_DARK),
    ...cylinder(x, y, 0.16 * k, 0.13 * k, 0.6 * k, STONE),
    ...box(x - 0.24 * k, y - 0.24 * k, 0.76 * k, 0.48 * k, 0.48 * k, 0.34 * k, STONE),
    ...wallL(x - 0.12 * k, y + 0.24 * k, 0.84 * k, 0.24 * k, 0.2 * k, WARM_GLOW),
    ...pyramid(x - 0.45 * k, y - 0.45 * k, 1.1 * k, 0.9 * k, 0.9 * k, 0.32 * k, STONE_DARK),
    ...ball(x, y, 1.48 * k, 0.08 * k, STONE),
  ];
}

/**
 * Wide, shallow hip roof (a frustum) centred on (cx, cy): from an `outer`
 * half-width at z to an `inner` one at z + h. All four slopes face up enough
 * to be seen, so the two back ones are drawn first.
 */
function eaveRoof(cx: number, cy: number, z: number, outer: number, inner: number, h: number, color: string): Shape[] {
  const o = outer;
  const i = inner;
  const zt = z + h;
  return [
    ...flat([[cx - o, cy - o, z], [cx + o, cy - o, z], [cx + i, cy - i, zt], [cx - i, cy - i, zt]], shade(color, 0.12)),
    ...flat([[cx - o, cy - o, z], [cx - o, cy + o, z], [cx - i, cy + i, zt], [cx - i, cy - i, zt]], shade(color, 0.05)),
    ...floor(cx - i, cy - i, zt, i * 2, i * 2, shade(color, 0.2)),
    ...flat([[cx - o, cy + o, z], [cx + o, cy + o, z], [cx + i, cy + i, zt], [cx - i, cy + i, zt]], color),
    ...flat([[cx + o, cy - o, z], [cx + o, cy + o, z], [cx + i, cy + i, zt], [cx + i, cy - i, zt]], shade(color, -0.22)),
  ];
}

const stoneLantern = (): Shape[] => [
  ...ground(MOSS),
  ...floor(0.3, 0.3, 0.001, 3.4, 3.4, MOSS_LIGHT),
  ...ball(0.8, 0.9, 0.2, 0.35, STONE_DARK),
  ...ball(3.1, 1.0, 0.15, 0.3, STONE),
  ...box(1.3, 1.3, 0, 1.4, 1.4, 0.35, STONE_DARK),
  ...cylinder(2, 2, 0.35, 0.32, 1.3, STONE),
  ...box(1.35, 1.35, 1.65, 1.3, 1.3, 0.2, STONE_DARK),
  ...box(1.5, 1.5, 1.85, 1.0, 1.0, 0.8, STONE),
  ...wallL(1.72, 2.5, 2.0, 0.56, 0.5, WARM_GLOW),
  ...wallR(2.5, 1.72, 2.0, 0.56, 0.5, WARM_GLOW),
  ...spot(2.3, 2.3, 2.25, 0.95, 0.65, GLOW),
  ...pyramid(1.0, 1.0, 2.65, 2.0, 2.0, 0.7, STONE_DARK),
  ...ball(2, 2, 3.45, 0.2, STONE),
  // fern and moss stones in front
  ...ball(0.9, 3.0, 0.3, 0.34, LEAF_DARK),
  ...ball(3.1, 3.1, 0.28, 0.32, LEAF),
];

const bambooGrove = (): Shape[] => {
  const s: Shape[] = [...ground(MOSS), ...floor(0.2, 0.2, 0.001, 3.6, 3.6, MOSS_LIGHT)];
  const stalks: [number, number, number][] = [
    [0.8, 0.8, 4.2],
    [1.7, 0.6, 4.8],
    [0.6, 1.7, 4.5],
    [2.6, 1.0, 3.9],
    [1.5, 1.6, 5.0],
    [1.0, 2.6, 3.6],
    [2.3, 2.1, 4.4],
    [3.0, 2.0, 3.4],
    [2.0, 2.9, 3.2],
  ];
  stalks.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [x, y, h] of stalks) {
    s.push(...cylinder(x, y, 0, 0.13, h, BAMBOO));
    for (let z = 0.8; z < h - 0.3; z += 0.8) s.push(...cylinder(x, y, z, 0.15, 0.05, '#6E9F3F'));
    s.push(...ball(x + 0.28, y - 0.05, h - 0.25, 0.36, LEAF), ...ball(x - 0.2, y + 0.1, h + 0.05, 0.3, LEAF_LIGHT));
  }
  // low bamboo fence along the two front edges
  const post = (x: number, y: number) => s.push(...cylinder(x, y, 0, 0.08, 0.75, '#C9B27A'));
  for (const x of [0.4, 1.5, 2.6]) post(x, 3.7);
  s.push(...box(0.35, 3.66, 0.35, 3.3, 0.08, 0.08, '#B89D62'), ...box(0.35, 3.66, 0.6, 3.3, 0.08, 0.08, '#B89D62'));
  for (const y of [0.4, 1.5, 2.6]) post(3.7, y);
  post(3.7, 3.7);
  s.push(...box(3.66, 0.35, 0.35, 0.08, 3.35, 0.08, '#B89D62'), ...box(3.66, 0.35, 0.6, 0.08, 3.35, 0.08, '#B89D62'));
  return s;
};

const teaHut = (): Shape[] => {
  const s: Shape[] = [
    ...ground(MOSS),
    ...floor(0.2, 0.2, 0.001, 3.6, 3.6, MOSS_LIGHT),
    // raised timber platform with a veranda in front
    ...box(0.5, 0.5, 0, 3.0, 3.1, 0.35, TIMBER_DARK),
    ...box(0.8, 0.7, 0.35, 2.4, 2.3, 1.5, PLASTER),
  ];
  // timber frame on the front
  for (const x of [0.8, 1.94, 3.08]) s.push(...wallL(x, 3.0, 0.35, 0.12, 1.5, TIMBER));
  // sliding paper doors with their lattice
  s.push(...wallL(0.95, 3.0, 0.45, 0.95, 1.2, PAPER), ...wallL(2.08, 3.0, 0.45, 0.95, 1.2, PAPER));
  for (const x of [1.27, 1.59, 2.4, 2.72]) s.push(...wallL(x, 3.0, 0.45, 0.04, 1.2, TIMBER));
  for (const z of [0.85, 1.25]) s.push(...wallL(0.95, 3.0, z, 2.1, 0.04, TIMBER));
  s.push(
    // noren curtain over the doorway
    ...wallL(1.1, 3.002, 1.3, 1.8, 0.3, VERMILION),
    ...wallL(1.98, 3.003, 1.3, 0.04, 0.3, shade(VERMILION, -0.3)),
    // side window and the top beam
    ...wallR(3.2, 1.2, 0.85, 1.1, 0.7, PAPER),
    ...wallR(3.2, 1.75, 0.85, 0.04, 0.7, TIMBER),
    ...wallR(3.2, 0.7, 1.72, 2.3, 0.13, TIMBER),
    ...wallL(0.8, 3.0, 1.72, 2.4, 0.13, TIMBER),
    // roof: an eave board, then a steep hip
    ...box(0.3, 0.2, 1.85, 3.4, 3.3, 0.12, shade(SLATE, -0.2)),
    ...pyramid(0.3, 0.2, 1.97, 3.4, 3.3, 1.3, SLATE),
    ...ball(2.0, 1.85, 3.3, 0.14, GOLD),
    // stepping stones up to the veranda
    ...disc(1.6, 3.82, 0.01, 0.16, STONE_LIGHT),
    ...disc(2.4, 3.84, 0.01, 0.14, STONE_LIGHT),
  );
  return s;
};

// 1×2: a glass house full of plants, ridge running front to back.
const greenhouse = (): Shape[] => {
  const s: Shape[] = [
    ...slab(0, 0, 4, 8, MOSS),
    ...floor(0.3, 0.3, 0.001, 3.4, 7.4, '#CFC6B0'),
    ...box(0.5, 0.5, 0, 3, 7, 0.45, '#B86F55'),
  ];
  const plants: [number, number, number, string][] = [
    [1.2, 1.2, 0.55, LEAF],
    [2.7, 1.6, 0.5, LEAF_LIGHT],
    [1.4, 3.2, 0.6, LEAF_DARK],
    [2.6, 3.8, 0.45, LEAF],
    [1.3, 5.3, 0.5, LEAF_LIGHT],
    [2.7, 5.8, 0.55, LEAF_DARK],
    [1.6, 6.8, 0.45, LEAF],
  ];
  const flowers = [CHERRY, '#FFD166', WISTERIA, '#FF7A9C'];
  plants.forEach(([x, y, r, c], i) => {
    s.push(...ball(x, y, 0.45 + r, r, c), ...ball(x + 0.15, y + 0.1, 0.55 + r * 1.5, 0.13, flowers[i % 4]));
  });
  // glass walls and their frames
  s.push(...wallL(0.5, 7.5, 0.45, 3, 1.9, GLASS), ...wallR(3.5, 0.5, 0.45, 7, 1.9, GLASS));
  for (const x of [0.5, 1.25, 2, 2.75, 3.5]) s.push(...wallL(x - 0.04, 7.5, 0.45, 0.08, 1.9, FRAME));
  for (let y = 0.5; y <= 7.5; y += 1) s.push(...wallR(3.5, y - 0.04, 0.45, 0.08, 1.9, FRAME));
  s.push(
    ...wallL(0.5, 7.5, 2.3, 3, 0.08, FRAME),
    ...wallR(3.5, 0.5, 2.3, 7, 0.08, FRAME),
    ...wallL(1.5, 7.501, 0.45, 1.0, 1.5, 'rgba(255,255,255,0.35)'),
    ...wallL(1.97, 7.502, 0.45, 0.06, 1.5, FRAME),
    // glass roof: back slope, front slope, gable end
    ...flat([[0.5, 0.5, 2.35], [0.5, 7.5, 2.35], [2, 7.5, 3.4], [2, 0.5, 3.4]], 'rgba(225,248,242,0.55)'),
    ...flat([[3.5, 0.5, 2.35], [3.5, 7.5, 2.35], [2, 7.5, 3.4], [2, 0.5, 3.4]], 'rgba(185,228,220,0.55)'),
    ...flat([[0.5, 7.5, 2.35], [3.5, 7.5, 2.35], [2, 7.5, 3.4]], GLASS),
  );
  for (let y = 0.5; y <= 7.5; y += 1) {
    s.push(...flat([[3.5, y - 0.04, 2.35], [3.5, y + 0.04, 2.35], [2, y + 0.04, 3.4], [2, y - 0.04, 3.4]], FRAME));
  }
  s.push(
    ...box(1.95, 0.4, 3.4, 0.1, 7.2, 0.1, FRAME),
    // potted flowers by the door
    ...box(0.7, 7.6, 0, 0.32, 0.32, 0.3, '#C9734A'),
    ...ball(0.86, 7.76, 0.5, 0.22, CHERRY),
    ...box(2.9, 7.6, 0, 0.32, 0.32, 0.3, '#C9734A'),
    ...ball(3.06, 7.76, 0.5, 0.22, '#FFD166'),
  );
  return s;
};

// 2×1: a stone-rimmed pond with koi, lily pads and a plank crossing.
const koiPond = (): Shape[] => {
  const s: Shape[] = [
    ...slab(0, 0, 8, 4, MOSS),
    ...floor(0.2, 0.2, 0.001, 7.6, 3.6, MOSS_LIGHT),
    // a weeping maple at the back right, behind the pond
    ...box(6.9, 0.7, 0, 0.22, 0.22, 1.3, TIMBER),
    ...ball(6.7, 0.8, 1.6, 0.6, '#D9543F'),
    ...ball(7.2, 0.6, 1.8, 0.55, '#E8743B'),
    ...ball(6.95, 0.75, 2.25, 0.45, '#F09A4A'),
    // a small lantern at the back left
    ...miniLantern(0.8, 0.8, 0.9),
    // rim and water
    ...disc(2.3, 2, 0.002, 1.4, STONE_DARK),
    ...disc(4, 2, 0.002, 1.55, STONE_DARK),
    ...disc(5.7, 2, 0.002, 1.4, STONE_DARK),
    ...disc(2.3, 2, 0.003, 1.15, WATER),
    ...disc(4, 2, 0.003, 1.3, WATER),
    ...disc(5.7, 2, 0.003, 1.15, WATER),
    ...disc(4, 2.1, 0.004, 0.8, WATER_DEEP),
  ];
  // koi: orange, white and red, with a patch on each
  const koi: [number, number, string, string][] = [
    [2.0, 1.6, '#FF8A3D', '#FFFFFF'],
    [3.3, 2.5, '#FFFFFF', '#E8505B'],
    [4.7, 1.5, '#E8505B', '#FFFFFF'],
    [5.9, 2.4, '#FF8A3D', '#FFE3A0'],
    [2.9, 1.2, '#FFE3A0', '#FF8A3D'],
  ];
  for (const [x, y, body, patch] of koi) {
    s.push(...spot(x, y, 0.006, 0.24, 0.09, body), ...spot(x + 0.06, y, 0.007, 0.08, 0.05, patch));
  }
  for (const [x, y] of [[1.7, 2.4], [5.2, 2.7], [6.3, 1.6]]) {
    s.push(...disc(x, y, 0.008, 0.22, '#5FA055'), ...ball(x + 0.05, y, 0.12, 0.07, CHERRY_LIGHT));
  }
  // a plank crossing the narrow middle
  s.push(...box(3.65, 0.55, 0.02, 0.7, 2.9, 0.12, '#A0714D'));
  for (let y = 0.85; y < 3.4; y += 0.5) s.push(...floor(3.65, y, 0.141, 0.7, 0.04, '#7E5638'));
  // rim rocks back to front
  const rocks: [number, number, number][] = [
    [3.0, 0.55, 0.3],
    [5.3, 0.6, 0.28],
    [1.0, 1.4, 0.32],
    [7.1, 1.6, 0.3],
    [0.9, 2.8, 0.3],
    [7.0, 2.8, 0.28],
    [2.6, 3.45, 0.32],
    [5.5, 3.45, 0.3],
  ];
  for (const [x, y, r] of rocks) s.push(...ball(x, y, r * 0.6, r, (x + y) % 2 < 1 ? STONE : STONE_DARK));
  // irises at the front corners
  for (const [x, y] of [[0.5, 3.6], [7.5, 3.5]]) {
    s.push(...box(x - 0.08, y - 0.08, 0, 0.16, 0.16, 0.5, LEAF), ...ball(x, y, 0.6, 0.12, WISTERIA_DEEP));
  }
  return s;
};

// The third L (#. / ##): a timber-framed shop at the back left, and a low
// potting shed along the front that wraps round to the right.
const gardenShop = (): ArtPiece[] => {
  const shop: Shape[] = [
    ...slab(0, 0, 4, 8, MOSS),
    ...floor(0.2, 0.2, 0.001, 3.6, 7.6, GRAVEL),
    ...box(0.5, 0.5, 0, 3, 7, 2.4, PLASTER),
    // timber frame on the open right side (the notch)
    ...wallR(3.5, 0.5, 1.15, 4, 0.1, TIMBER),
    ...wallR(3.5, 0.9, 0.5, 1.2, 0.5, WARM_GLOW),
    ...wallR(3.5, 2.6, 0.5, 1.2, 0.5, WARM_GLOW),
    ...wallR(3.5, 1.0, 1.5, 2.6, 0.55, WARM_GLOW),
    ...wallR(3.5, 2.27, 1.5, 0.06, 0.55, TIMBER),
    ...wallR(3.5, 0.5, 0, 0.1, 2.4, TIMBER),
    ...wallR(3.5, 2.25, 0, 0.1, 1.15, TIMBER),
    // front: door, upper window and a hanging sign
    ...wallL(1.4, 7.5, 0, 1.2, 1.5, TIMBER_DARK),
    ...wallL(1.55, 7.5, 0.8, 0.9, 0.5, WARM_GLOW),
    ...wallL(1.2, 7.5, 1.75, 1.6, 0.5, WARM_GLOW),
    ...wallL(1.97, 7.5, 1.75, 0.06, 0.5, TIMBER),
    ...wallL(0.5, 7.5, 1.6, 3, 0.1, TIMBER),
    ...box(0.55, 7.55, 1.2, 0.06, 0.5, 0.06, TIMBER_DARK),
    ...wallL(0.6, 8.05, 0.75, 0.5, 0.4, ROOF_GREEN),
    ...spot(0.85, 8.05, 0.95, 0.12, 0.12, '#FFD166'),
    // roof: ridge runs front to back, green tiles, plaster gable
    ...flat([[0.3, 0.3, 2.4], [0.3, 7.7, 2.4], [2, 7.7, 3.5], [2, 0.3, 3.5]], shade(ROOF_GREEN, 0.1)),
    ...flat([[3.5, 0.3, 2.4], [3.5, 7.7, 2.4], [2, 7.7, 3.5], [2, 0.3, 3.5]], shade(ROOF_GREEN, -0.15)),
    ...flat([[0.3, 7.7, 2.4], [3.5, 7.7, 2.4], [2, 7.7, 3.5]], shade(PLASTER, -0.05)),
    ...spot(2, 7.701, 2.8, 0.22, 0.22, WARM_GLOW),
    ...box(1.94, 0.25, 3.5, 0.12, 7.5, 0.1, shade(ROOF_GREEN, -0.3)),
  ];
  const shed: Shape[] = [
    ...slab(4, 4, 4, 4, MOSS),
    ...floor(4, 4.2, 0.001, 3.8, 3.6, GRAVEL),
    ...box(3.5, 4.5, 0, 4, 3, 1.6, '#E9DCC0'),
    ...wallR(7.5, 5.0, 0.5, 2.0, 0.8, GLASS),
    ...wallR(7.5, 5.98, 0.5, 0.04, 0.8, FRAME),
    ...wallL(4.0, 7.5, 0.5, 3.0, 0.8, GLASS),
    ...wallL(5.48, 7.5, 0.5, 0.04, 0.8, FRAME),
  ];
  // seedlings on the window sill
  for (const x of [4.3, 4.8, 5.8, 6.4, 7.0]) shed.push(...ball(x, 7.5, 0.62, 0.12, LEAF_LIGHT));
  shed.push(...box(3.4, 4.4, 1.6, 4.2, 3.2, 0.14, ROOF_GREEN));
  // striped awning over the front
  shed.push(...box(3.6, 7.5, 1.2, 4.0, 0.7, 0.08, ROOF_GREEN));
  for (let i = 0; i < 5; i++) shed.push(...floor(3.7 + i * 0.8, 7.5, 1.281, 0.4, 0.7, FRAME));
  // flower crates out front
  const crate = (x: number, colors: string[]) => {
    shed.push(...box(x, 7.55, 0, 0.9, 0.4, 0.3, '#A0714D'));
    colors.forEach((c, i) => shed.push(...ball(x + 0.2 + i * 0.25, 7.75, 0.42, 0.13, c)));
  };
  crate(4.0, [CHERRY, '#FFD166', CHERRY_DEEP]);
  crate(5.2, [WISTERIA, BLOSSOM_WHITE, WISTERIA_DEEP]);
  crate(6.4, ['#FF7A9C', '#FFD166', '#FF7A9C']);
  return [
    { rect: [0, 0, 1, 2], shapes: shop },
    { rect: [1, 1, 1, 1], shapes: shed },
  ];
};

// 3×1: a vermilion moon bridge over a stream running front to back.
const moonBridge = (): Shape[] => {
  const W = 12;
  const CX = 6;
  const YB = 1.2;
  const YF = 2.8;
  // Deck: a circular arc from (1.6, 0) over (6, 2.4) to (10.4, 0).
  const R = 5.233;
  const CZ = -2.833;
  const deck = (x: number) => CZ + Math.sqrt(Math.max(0, R * R - (x - CX) ** 2));
  // Opening: a half circle of radius 2 on the water line.
  const A = 2;
  const arch = (x: number) => Math.sqrt(Math.max(0, A * A - (x - CX) ** 2));
  const xs = (x0: number, x1: number, steps: number) => Array.from({ length: steps + 1 }, (_, i) => x0 + ((x1 - x0) * i) / steps);

  const s: Shape[] = [
    ...slab(0, 0, W, 4, MOSS),
    ...floor(0.2, 0.2, 0.001, 3.3, 3.6, MOSS_LIGHT),
    ...floor(8.5, 0.2, 0.001, 3.3, 3.6, MOSS_LIGHT),
    // the stream, with darker water in its bed
    ...floor(3.5, 0, 0.002, 5, 4, WATER),
    ...floor(4.3, 0, 0.003, 3.4, 4, WATER_DEEP),
    ...spot(5.0, 0.6, 0.004, 0.22, 0.08, '#FF8A3D'),
    ...spot(7.2, 3.5, 0.004, 0.22, 0.08, '#FFFFFF'),
    // back bank rocks and a lantern at the far end
    ...ball(3.4, 0.5, 0.2, 0.32, STONE_DARK),
    ...ball(8.6, 0.6, 0.18, 0.3, STONE),
    ...miniLantern(1.0, 0.9, 1),
    ...ball(9.9, 0.8, 0.3, 0.3, LEAF),
    ...ball(10.1, 0.9, 0.62, 0.11, WISTERIA_DEEP),
    // stepping stones onto the bridge
    ...disc(0.7, 2.0, 0.01, 0.3, STONE_LIGHT),
    ...disc(11.3, 2.0, 0.01, 0.3, STONE_LIGHT),
  ];

  // Squashed reflection of the bridge's band under the arch: the "moon".
  const reflection: [number, number, number][] = [
    ...xs(4, 8, 12).map((x): [number, number, number] => [x, YF + 0.1, -deck(x) * 0.25]),
    ...xs(8, 4, 12).map((x): [number, number, number] => [x, YF + 0.1, -arch(x) * 0.25]),
  ];
  s.push(...flat(reflection, 'rgba(217,84,63,0.28)'));

  // Underside of the arch: only its left half faces the viewer.
  const under = xs(4, 6, 8);
  for (let i = 0; i < under.length - 1; i++) {
    const [a, b] = [under[i], under[i + 1]];
    s.push(...flat([[a, YB, arch(a)], [b, YB, arch(b)], [b, YF, arch(b)], [a, YF, arch(a)]], shade(VERMILION, -0.35)));
  }
  // Deck surface, plank by plank
  const planks = xs(1.6, 10.4, 22);
  for (let i = 0; i < planks.length - 1; i++) {
    const [a, b] = [planks[i], planks[i + 1]];
    const tone = i % 2 === 0 ? '#B8875C' : '#A97A50';
    s.push(...flat([[a, YB, deck(a)], [b, YB, deck(b)], [b, YF, deck(b)], [a, YF, deck(a)]], tone));
  }
  // Railings: posts every few planks, a rail following the deck 0.6 above it.
  const RAIL = 0.6;
  const railing = (y: number, color: string) => {
    for (const x of xs(1.8, 10.2, 6)) s.push(...box(x - 0.07, y - 0.07, deck(x), 0.14, 0.14, RAIL + 0.1, color));
    const pts = xs(1.8, 10.2, 20);
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      s.push(...flat([[a, y, deck(a) + RAIL], [b, y, deck(b) + RAIL], [b, y, deck(b) + RAIL + 0.1], [a, y, deck(a) + RAIL + 0.1]], color));
    }
  };
  railing(YB + 0.1, shade(VERMILION, -0.15));
  // Front face: the deck curve on top, the half-circle opening below.
  const face: [number, number, number][] = [
    ...xs(1.6, 10.4, 30).map((x): [number, number, number] => [x, YF, deck(x)]),
    [10.4, YF, 0],
    [8, YF, 0],
    ...xs(8, 4, 24).map((x): [number, number, number] => [x, YF, arch(x)]),
    [4, YF, 0],
    [1.6, YF, 0],
  ];
  s.push(...flat(face, VERMILION));
  // a thin pale band where the deck meets the face
  const band = xs(1.6, 10.4, 30);
  for (let i = 0; i < band.length - 1; i++) {
    const [a, b] = [band[i], band[i + 1]];
    s.push(...flat([[a, YF + 0.001, deck(a) - 0.18], [b, YF + 0.001, deck(b) - 0.18], [b, YF + 0.001, deck(b) - 0.08], [a, YF + 0.001, deck(a) - 0.08]], '#F2C9A8'));
  }
  railing(YF - 0.1, VERMILION);
  // gold caps on the four end posts
  for (const x of [1.8, 10.2]) for (const y of [YB + 0.1, YF - 0.1]) s.push(...ball(x, y, deck(x) + RAIL + 0.18, 0.1, GOLD));
  s.push(
    // front bank rocks and an iris clump
    ...ball(3.3, 3.6, 0.2, 0.32, STONE),
    ...ball(8.7, 3.5, 0.2, 0.3, STONE_DARK),
    ...box(1.9, 3.4, 0, 0.16, 0.16, 0.5, LEAF),
    ...ball(1.98, 3.48, 0.6, 0.12, WISTERIA_DEEP),
    ...ball(2.25, 3.3, 0.48, 0.1, WISTERIA),
  );
  return s;
};

// 2×2: an open pergola under a roof of wisteria, round stone table inside.
const wisteriaPavilion = (): Shape[] => {
  const s: Shape[] = [
    ...slab(0, 0, 8, 8, MOSS),
    ...floor(0.3, 0.3, 0.001, 7.4, 7.4, MOSS_LIGHT),
    ...box(0.8, 0.8, 0, 6.4, 6.4, 0.25, STONE_LIGHT),
  ];
  // flagstones on the platform
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if ((i + j) % 2 === 0) s.push(...floor(1.0 + i * 1.5, 1.0 + j * 1.5, 0.251, 1.4, 1.4, STONE));
    }
  }
  const post = (x: number, y: number) => s.push(...box(x, y, 0.25, 0.3, 0.3, 3.0, TIMBER));
  post(1.3, 1.3);
  post(6.4, 1.3);
  post(1.3, 6.4);
  s.push(
    // table and stools
    ...cylinder(4, 4, 0.25, 0.25, 0.55, STONE_DARK),
    ...cylinder(4, 4, 0.8, 0.85, 0.12, STONE),
    ...cylinder(2.8, 3.6, 0.25, 0.28, 0.45, STONE),
    ...cylinder(4.4, 2.8, 0.25, 0.28, 0.45, STONE),
    ...cylinder(5.2, 4.5, 0.25, 0.28, 0.45, STONE),
    ...cylinder(3.6, 5.2, 0.25, 0.28, 0.45, STONE),
    // a teapot on the table
    ...ball(4, 4, 1.12, 0.2, '#F4F6F2'),
    ...ball(4, 4, 1.34, 0.06, VERMILION),
  );
  post(6.4, 6.4);
  // beams, then cross-rafters
  for (const y of [1.35, 6.45]) s.push(...box(0.9, y, 3.25, 6.2, 0.2, 0.22, TIMBER_DARK));
  for (let x = 1.2; x < 7; x += 0.8) s.push(...box(x, 0.9, 3.47, 0.14, 6.2, 0.14, TIMBER));
  // the wisteria: a blanket of blooms and leaves on top, back to front
  const r = rng(7);
  const blooms: { x: number; y: number; z: number; rad: number; c: string }[] = [];
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      blooms.push({
        x: 1.1 + i * 0.73 + (r() - 0.5) * 0.4,
        y: 1.1 + j * 0.73 + (r() - 0.5) * 0.4,
        z: 3.7 + r() * 0.3,
        rad: 0.36 + r() * 0.16,
        c: [WISTERIA, WISTERIA_DEEP, WISTERIA_LIGHT, '#5FA055', WISTERIA, WISTERIA_LIGHT][Math.floor(r() * 6)],
      });
    }
  }
  blooms.sort((a, b) => a.x + a.y + a.z - (b.x + b.y + b.z));
  for (const b of blooms) s.push(...ball(b.x, b.y, b.z, b.rad, b.c));
  // drooping clusters along the two front edges
  const drip = (x: number, y: number, len: number) => {
    const shades = [WISTERIA_LIGHT, WISTERIA, WISTERIA_DEEP];
    for (let k = 0; k < len; k++) s.push(...ball(x, y, 3.2 - k * 0.32, 0.22 - k * 0.04, shades[k % 3]));
  };
  for (const [x, l] of [[1.6, 3], [2.8, 4], [4.0, 3], [5.2, 4], [6.6, 3]] as const) drip(x, 7.1, l);
  for (const [y, l] of [[1.6, 3], [2.8, 4], [4.0, 3], [5.2, 4]] as const) drip(7.1, y, l);
  return s;
};

// 1×1, tall: a five-tier pagoda on a gravel bed, gold spire on top.
const gardenPagoda = (): Shape[] => {
  const s: Shape[] = [...ground(GRAVEL)];
  // raked rings round the base
  for (const rad of [1.9, 1.6]) s.push(...disc(2, 2, 0.002, rad, '#D6CFBE'), ...disc(2, 2, 0.003, rad - 0.1, GRAVEL));
  s.push(...box(0.5, 0.5, 0, 3, 3, 0.25, STONE_DARK), ...box(0.7, 0.7, 0.25, 2.6, 2.6, 0.15, STONE));
  let z = 0.4;
  for (let i = 0; i < 5; i++) {
    const b = 0.95 - i * 0.12;
    const h = 1.05 - i * 0.08;
    s.push(
      ...box(2 - b, 2 - b, z, b * 2, b * 2, h, i === 0 ? PLASTER : VERMILION),
      ...wallL(2 - b * 0.4, 2 + b, z + 0.12, b * 0.8, h * 0.6, i === 0 ? TIMBER_DARK : '#3A2A22'),
      ...wallR(2 + b, 2 - b * 0.4, z + 0.12, b * 0.8, h * 0.6, i === 0 ? TIMBER_DARK : '#3A2A22'),
    );
    z += h;
    const outer = b + 0.45 - i * 0.03;
    s.push(
      ...eaveRoof(2, 2, z, outer, b - 0.1, 0.3, SLATE),
      // little bells on the front corners
      ...ball(2 + outer, 2 + outer, z - 0.08, 0.07, GOLD),
      ...ball(2 - outer, 2 + outer, z - 0.08, 0.06, GOLD),
      ...ball(2 + outer, 2 - outer, z - 0.08, 0.06, GOLD),
    );
    z += 0.3;
  }
  s.push(...cylinder(2, 2, z, 0.08, 1.4, GOLD));
  for (let k = 0; k < 5; k++) s.push(...cylinder(2, 2, z + 0.25 + k * 0.2, 0.17 - k * 0.015, 0.05, GOLD));
  s.push(...ball(2, 2, z + 1.5, 0.15, GOLD));
  return s;
};

// 3×3, the showpiece: an ancient cherry tree on a mossy mound.
const greatCherryTree = (): Shape[] => {
  const C = 6;
  const s: Shape[] = [
    ...slab(0, 0, 12, 12, MOSS),
    ...floor(0.3, 0.3, 0.001, 11.4, 11.4, MOSS_LIGHT),
    // a small pond at the back left
    ...disc(9.9, 2.1, 0.002, 1.6, STONE_DARK),
    ...disc(9.9, 2.1, 0.003, 1.35, WATER),
    ...spot(9.7, 2.0, 0.004, 0.26, 0.1, '#FF8A3D'),
    ...spot(10.3, 2.4, 0.004, 0.22, 0.09, '#FFFFFF'),
    ...ball(8.6, 1.1, 0.2, 0.3, STONE_DARK),
    ...ball(11.2, 3.3, 0.2, 0.32, STONE),
  ];
  // petals already fallen on the moss
  const r = rng(3);
  const petals: Shape[] = [];
  for (let i = 0; i < 40; i++) {
    const x = 0.6 + r() * 10.8;
    const y = 0.6 + r() * 10.8;
    if (Math.hypot(x - 9.9, y - 2.1) < 1.7) continue;
    petals.push(...spot(x, y, 0.005, 0.12, 0.07, r() < 0.5 ? CHERRY : CHERRY_LIGHT));
  }
  // one path per colour keeps the draw calls down
  const byColor = new Map<string, string>();
  for (const p of petals) byColor.set(p.color, (byColor.get(p.color) ?? '') + p.d + ' ');
  for (const [color, d] of byColor) s.push({ color, d });

  s.push(
    // the mound and its ring of stones
    ...cylinder(C, C, 0, 3.4, 0.45, MOSS_LIGHT),
    ...disc(C, C, 0.46, 3.0, '#86C273'),
  );
  // roots spreading over the mound
  for (const [dx, dy] of [[-1.6, -0.6], [-0.4, -1.7], [1.5, 0.9], [0.8, 1.7], [-1.2, 1.3], [1.7, -0.8]]) {
    s.push(...limb([C, C, 0.6], [C + dx, C + dy, 0.45], 0.45, TIMBER_DARK));
  }
  // trunk: two leaning, twisting halves
  s.push(
    ...cylinder(C, C, 0.45, 0.9, 1.4, '#5E4030'),
    ...cylinder(C - 0.15, C + 0.1, 1.7, 0.7, 1.2, '#6B4A36'),
    ...cylinder(C - 0.35, C + 0.2, 2.7, 0.55, 0.9, '#5E4030'),
  );
  // main limbs reaching out into the crown
  const limbs: [number, number, number][] = [
    [-3.2, -1.4, 5.3],
    [-1.2, -3.0, 5.6],
    [2.8, -1.8, 5.0],
    [3.0, 1.8, 4.6],
    [-2.6, 2.2, 4.8],
    [0.4, 3.1, 5.0],
    [0.2, 0.0, 6.6],
  ];
  for (const [dx, dy, z] of limbs) s.push(...limb([C - 0.35, C + 0.2, 3.3], [C + dx, C + dy, z], 0.55, '#5E4030'));

  // the crown: a dome of blossom, sorted back to front by iso depth
  const cr = rng(11);
  const crown: { x: number; y: number; z: number; rad: number; c: string }[] = [];
  const colors = [CHERRY, CHERRY_LIGHT, CHERRY_DEEP, BLOSSOM_WHITE, CHERRY, CHERRY_LIGHT];
  for (let i = 0; i < 120; i++) {
    const a = cr() * Math.PI * 2;
    const d = Math.sqrt(cr());
    const x = C + Math.cos(a) * d * 4.9;
    const y = C + Math.sin(a) * d * 4.9;
    const z = 4.9 + (1 - d * d) * 2.2 + (cr() - 0.5) * 0.6;
    crown.push({ x, y, z, rad: 0.75 + cr() * 0.45, c: colors[Math.floor(cr() * colors.length)] });
  }
  crown.sort((p, q) => p.x + p.y + p.z - (q.x + q.y + q.z));
  for (const b of crown) s.push(...ball(b.x, b.y, b.z, b.rad, b.c));

  s.push(
    // a stone lantern and a picnic blanket in front
    ...miniLantern(2.0, 9.6, 1.4),
    ...floor(8.2, 8.6, 0.006, 2.4, 1.8, '#F4F6F2'),
  );
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      if ((i + j) % 2 === 0) s.push(...floor(8.2 + i * 0.6, 8.6 + j * 0.6, 0.007, 0.6, 0.6, '#E8505B'));
    }
  }
  s.push(
    ...box(9.0, 9.2, 0.006, 0.6, 0.4, 0.3, '#C99A5B'),
    ...floor(9.0, 9.2, 0.33, 0.6, 0.4, '#E3B97A'),
    // falling petals in the air
    ...spot(9.8, 7.2, 3.0, 0.13, 0.08, CHERRY),
    ...spot(10.6, 5.0, 2.2, 0.12, 0.07, CHERRY_LIGHT),
    ...spot(7.4, 10.4, 1.6, 0.12, 0.07, CHERRY),
  );
  return s;
};

export const BLOSSOM_BUILDERS: Record<
  Exclude<BlossomGardensId, 'stepping-stones' | 'raked-gravel' | 'moss-lawn'>,
  { build: () => Shape[] | ArtPiece[]; height: number }
> = {
  'stone-lantern': { build: stoneLantern, height: 3.7 },
  'bamboo-grove': { build: bambooGrove, height: 5.5 },
  'tea-hut': { build: teaHut, height: 3.5 },
  greenhouse: { build: greenhouse, height: 3.6 },
  'koi-pond': { build: koiPond, height: 2.8 },
  'garden-shop': { build: gardenShop, height: 3.7 },
  'moon-bridge': { build: moonBridge, height: 3.3 },
  'wisteria-pavilion': { build: wisteriaPavilion, height: 4.9 },
  'garden-pagoda': { build: gardenPagoda, height: 8.1 },
  'great-cherry-tree': { build: greatCherryTree, height: 9.0 },
};
