import { sizeOf } from '../../data/items';
import type { ItemId } from '../../data/sets/types';
import { NEON_BUILDERS } from './neonHarborShapes';
import { DEFAULT_MASK, PATH_HEIGHT, getPathShapes, isPathId, type PathId } from './pathShapes';
import {
  ball,
  box,
  cylinder,
  disc,
  flat,
  floor,
  gable,
  ground,
  pyramid,
  shade,
  slab,
  spot,
  wallL,
  wallR,
  type Shape,
} from './iso';

const PAVEMENT = '#D8D2C4';
const GRASS = '#8CCB6A';
const GLASS_WARM = '#FFE9A0';
const GLASS_COOL = '#A9DCEB';
const WOOD = '#8B5A3C';
const LEAF = '#4FA65B';

/**
 * One rectangular part of an item's drawing, in lots relative to its anchor:
 * [dx, dy, w, d]. Shapes are in the item's own iso units (4 per lot, origin at
 * the anchor's back corner). Rectangular items are one piece; an L is two, so
 * the city can depth-sort each part against whatever stands in the notch.
 */
export interface ArtPiece {
  rect: [dx: number, dy: number, w: number, d: number];
  shapes: Shape[];
}

export interface ItemArtDef {
  /** Back to front within the item. */
  pieces: ArtPiece[];
  /** Footprint bounding box in lots. */
  size: [w: number, d: number];
  /** Height of the tallest point in tile units, used to fit the art in a card and for taps. */
  height: number;
}

const lampPost = (): Shape[] => [
  ...ground(PAVEMENT),
  ...floor(0.3, 0.3, 0.001, 3.4, 3.4, '#E6E1D5'),
  // planter behind the lamp
  ...box(0.6, 0.7, 0, 1.1, 0.7, 0.4, WOOD),
  ...ball(0.9, 1.05, 0.75, 0.38, LEAF),
  ...ball(1.4, 1.05, 0.7, 0.32, '#FF7A9C'),
  // lamp
  ...box(1.7, 1.7, 0, 0.6, 0.6, 0.3, '#3B4252'),
  ...box(1.88, 1.88, 0.3, 0.24, 0.24, 3.5, '#4C566A'),
  ...box(1.6, 1.6, 3.8, 0.8, 0.8, 0.14, '#3B4252'),
  ...spot(2, 2, 4.3, 1.25, 1.25, 'rgba(255,225,130,0.28)'),
  ...box(1.72, 1.72, 3.94, 0.56, 0.56, 0.62, GLASS_WARM),
  ...pyramid(1.55, 1.55, 4.56, 0.9, 0.9, 0.45, '#3B4252'),
  ...ball(2, 2, 5.05, 0.09, '#FFC73A'),
];

const parkBench = (): Shape[] => [
  ...ground(GRASS),
  ...floor(0.4, 2.7, 0.001, 3.2, 0.9, '#D9C9A3'),
  // tree
  ...box(0.75, 0.7, 0, 0.32, 0.32, 1.5, '#7A5236'),
  ...ball(0.6, 1.0, 1.9, 0.75, '#3F8F4D'),
  ...ball(1.2, 0.7, 2.1, 0.8, LEAF),
  ...ball(0.9, 0.85, 2.75, 0.7, '#62B86B'),
  // bush
  ...ball(3.3, 0.9, 0.35, 0.45, LEAF),
  ...ball(3.35, 0.95, 0.62, 0.12, '#FFD166'),
  // bench
  ...box(1.0, 1.7, 0, 0.14, 0.8, 0.5, '#3B4252'),
  ...box(2.86, 1.7, 0, 0.14, 0.8, 0.5, '#3B4252'),
  ...box(0.9, 1.7, 0.62, 2.2, 0.12, 0.3, '#B87A40'),
  ...box(0.9, 1.7, 0.98, 2.2, 0.12, 0.3, '#B87A40'),
  ...box(0.9, 1.75, 0.5, 2.2, 0.8, 0.12, '#CF9152'),
];

// 1×2: a terrace of two townhouses running back (y 0..4) to front (y 4..8).
// Doors face screen-right; the front house's gable end faces screen-left.
const brickTownhouse = (): Shape[] => {
  const s: Shape[] = [...slab(0, 0, 4, 8, PAVEMENT)];
  const house = (y0: number, h: number, brick: string, roof: string) => {
    s.push(...box(0.6, y0, 0, 2.8, 3.4, h, brick));
    for (const z of [1.35, 2.65]) s.push(...wallR(3.4, y0, z, 3.4, 0.1, shade(brick, -0.12)));
    // upper floors: two windows each
    for (const z of [1.65, 2.95]) for (const y of [y0 + 0.45, y0 + 2.3]) s.push(...wallR(3.4, y, z, 0.6, 0.75, GLASS_COOL));
    // ground floor: window + door with a stoop
    s.push(
      ...wallR(3.4, y0 + 0.45, 0.45, 0.6, 0.7, GLASS_COOL),
      ...wallR(3.4, y0 + 2.2, 0, 0.75, 1.2, '#4A2F22'),
      ...box(3.4, y0 + 2.05, 0, 0.45, 1.05, 0.2, '#B9B4A8'),
      ...box(0.45, y0 - 0.15, h, 3.1, 3.7, 0.25, roof),
      ...box(1.0, y0 + 0.5, h + 0.25, 0.55, 0.55, 0.8, '#8D4B3A'),
      ...box(0.95, y0 + 0.45, h + 1.05, 0.65, 0.65, 0.12, '#5E3226'),
    );
  };
  house(0.6, 4.2, '#C8553D', '#7A3B2E');
  house(4.0, 4.6, '#B84A35', '#6E3528');
  // the front house's street end
  for (const z of [1.35, 2.65]) s.push(...wallL(0.6, 7.4, z, 2.8, 0.1, '#A8432F'));
  for (const z of [0.45, 1.65, 2.95]) for (const x of [0.95, 2.45]) s.push(...wallL(x, 7.4, z, 0.6, 0.75, GLASS_WARM));
  // window box
  s.push(...box(0.9, 7.4, 1.6, 0.7, 0.18, 0.12, WOOD), ...ball(1.1, 7.55, 1.78, 0.12, '#FF6B8B'), ...ball(1.4, 7.55, 1.78, 0.12, LEAF));
  return s;
};

// L over 3 lots (## / #.): a café wrapped round a corner. Its windows and doors
// face the notch, so whatever stands there (a lamp, a lawn) becomes its terrace.
// Two rectangular pieces, depth-sorted on their own (see logic/depthOrder.ts).
const cornerCafe = (): ArtPiece[] => {
  const CREAM = '#F3E3C3';
  const TEAL = '#2F6F6A';
  const ROOF = '#6B4A3A';
  // arm along x: lots (0,0) and (1,0)
  const arm: Shape[] = [
    ...slab(0, 0, 8, 4, PAVEMENT),
    ...box(0.5, 0.5, 0, 7, 3, 2.6, CREAM),
    ...wallL(3.5, 3.5, 0, 4, 0.35, TEAL),
    ...wallR(7.5, 0.5, 0, 3, 0.35, TEAL),
    ...wallL(3.85, 3.5, 0.6, 0.95, 0.9, GLASS_WARM),
    ...wallL(6.25, 3.5, 0.6, 0.95, 0.9, GLASS_WARM),
    ...wallL(5.1, 3.5, 0, 0.8, 1.45, ROOF),
    ...wallL(5.25, 3.5, 0.7, 0.5, 0.6, GLASS_WARM),
    ...wallR(7.5, 0.9, 0.6, 2.2, 1.0, GLASS_COOL),
    ...box(3.5, 3.5, 1.7, 4, 0.7, 0.12, '#D9534F'),
  ];
  for (let i = 0; i < 4; i++) arm.push(...floor(3.5 + i * 1.0, 3.5, 1.821, 0.5, 0.7, '#FFF4E6'));
  arm.push(
    ...box(0.4, 0.4, 2.6, 7.2, 3.2, 0.3, ROOF),
    // roof sign with a coffee cup
    ...box(4.6, 3.2, 2.9, 2.2, 0.16, 0.85, TEAL),
    ...spot(5.7, 3.37, 3.3, 0.26, 0.26, '#FFF4E6'),
    ...spot(5.7, 3.37, 3.33, 0.15, 0.13, ROOF),
  );
  // wing along y: lot (0,1)
  const wing: Shape[] = [
    ...slab(0, 4, 4, 4, PAVEMENT),
    ...box(0.5, 3.5, 0, 3, 4, 2.6, CREAM),
    ...wallR(3.5, 3.5, 0, 4, 0.35, TEAL),
    ...wallL(0.5, 7.5, 0, 3, 0.35, TEAL),
    ...wallR(3.5, 4.3, 0.6, 0.95, 0.9, GLASS_COOL),
    ...wallR(3.5, 6.35, 0.6, 0.95, 0.9, GLASS_COOL),
    ...wallR(3.5, 5.45, 0, 0.75, 1.45, ROOF),
    ...wallL(0.85, 7.5, 0.6, 2.3, 1.0, GLASS_WARM),
    ...box(3.5, 3.5, 1.7, 0.7, 4, 0.12, '#D9534F'),
  ];
  for (let i = 0; i < 4; i++) wing.push(...floor(3.5, 3.5 + i * 1.0, 1.821, 0.7, 0.5, '#FFF4E6'));
  wing.push(
    ...box(0.4, 3.6, 2.6, 3.2, 4.0, 0.3, ROOF),
    ...box(1.2, 4.6, 2.9, 0.5, 0.5, 0.6, '#8D4B3A'),
    // pavement table at the street end
    ...cylinder(2.0, 7.8, 0, 0.06, 0.5, '#4C566A'),
    ...disc(2.0, 7.8, 0.5, 0.3, '#FFF4E6'),
  );
  return [
    { rect: [0, 0, 2, 1], shapes: arm },
    { rect: [0, 1, 1, 1], shapes: wing },
  ];
};

// 2×1: a long shopfront facing screen-left, gable roof along the street.
const bakery = (): Shape[] => {
  const s: Shape[] = [
    ...slab(0, 0, 8, 4, PAVEMENT),
    ...box(0.5, 0.7, 0, 7, 2.6, 2.2, '#F7C9A3'),
    ...wallR(7.5, 1.2, 0.6, 1.6, 0.95, GLASS_COOL),
  ];
  for (const x of [0.8, 2.15, 4.85, 6.2]) {
    s.push(
      ...wallL(x, 3.3, 0.5, 1.0, 0.95, GLASS_WARM),
      // loaves in the window
      ...wallL(x + 0.1, 3.3, 0.55, 0.24, 0.2, '#C98B4F'),
      ...wallL(x + 0.4, 3.3, 0.55, 0.24, 0.28, '#B87333'),
      ...wallL(x + 0.7, 3.3, 0.55, 0.22, 0.2, '#C98B4F'),
    );
  }
  s.push(
    ...wallL(3.6, 3.3, 0, 0.8, 1.35, '#7A4A2B'),
    ...wallL(3.72, 3.3, 0.7, 0.56, 0.5, GLASS_WARM),
    ...box(0.5, 3.3, 1.55, 7, 0.55, 0.12, '#FFF3E0'),
  );
  for (let i = 0; i < 7; i++) s.push(...floor(0.5 + i * 1.0, 3.3, 1.671, 0.5, 0.55, '#F28B9B'));
  s.push(
    ...gable(0.3, 0.5, 2.2, 7.4, 3.0, 1.4, '#B5523B', '#F7C9A3'),
    // round bread sign on the gable end
    ...spot(7.7, 2.0, 2.75, 0.24, 0.3, '#E0A45B'),
    ...spot(7.7, 2.0, 2.75, 0.1, 0.13, '#9A5B2A'),
    ...box(1.4, 1.0, 2.9, 0.48, 0.48, 1.0, '#8D4B3A'),
    ...ball(1.7, 1.25, 4.35, 0.26, '#F4F1EC'),
    ...ball(1.95, 1.35, 4.95, 0.36, '#F4F1EC'),
    ...ball(1.75, 1.2, 5.65, 0.3, '#FAF8F4'),
    // bread crate by the door
    ...box(5.0, 3.55, 0, 0.6, 0.35, 0.35, WOOD),
    ...ball(5.15, 3.72, 0.42, 0.13, '#C98B4F'),
    ...ball(5.42, 3.72, 0.42, 0.13, '#B87333'),
  );
  return s;
};

const flowerKiosk = (): Shape[] => {
  const s: Shape[] = [
    ...ground(GRASS),
    ...floor(0.5, 0.5, 0.001, 3.2, 3.2, '#E3DCC8'),
    ...box(1.1, 0.9, 0, 1.9, 1.7, 1.7, '#3E9E8F'),
    ...wallL(1.3, 2.6, 0.75, 1.5, 0.7, '#1E5F56'),
    ...box(1.2, 2.6, 0.62, 1.7, 0.25, 0.1, '#F3E3C3'),
    ...wallR(3.0, 1.2, 0.7, 1.1, 0.7, GLASS_COOL),
    ...pyramid(0.8, 0.6, 1.7, 2.5, 2.3, 1.1, '#F2849B'),
    ...ball(2.05, 1.75, 2.85, 0.12, '#FFC73A'),
  ];
  const bouquets: [number, number, string][] = [
    [3.45, 2.0, '#FFD166'],
    [0.9, 3.3, '#FF6B8B'],
    [1.9, 3.35, '#FFD166'],
    [2.9, 3.3, '#B58CFF'],
  ];
  for (const [x, y, c] of bouquets) {
    s.push(
      ...cylinder(x, y, 0, 0.26, 0.42, '#9AA3B2'),
      ...ball(x - 0.12, y, 0.62, 0.22, LEAF),
      ...ball(x + 0.12, y, 0.72, 0.2, c),
      ...ball(x - 0.08, y, 0.88, 0.2, c),
    );
  }
  return s;
};

// 2×2: a paved square with a three-tier fountain, trees on the corners and benches.
const fountainPlaza = (): Shape[] => {
  const s: Shape[] = [...slab(0, 0, 8, 8, '#E4DED0')];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) if ((i + j) % 2 === 0) s.push(...floor(i, j, 0.001, 1, 1, '#D2CABA'));
  }
  const tree = (x: number, y: number) =>
    s.push(
      ...cylinder(x, y, 0, 0.55, 0.35, '#B9B4A8'),
      ...disc(x, y, 0.35, 0.45, '#6B4A3A'),
      ...box(x - 0.1, y - 0.1, 0.35, 0.2, 0.2, 0.9, '#7A5236'),
      ...ball(x - 0.15, y, 1.45, 0.62, '#3F8F4D'),
      ...ball(x + 0.2, y - 0.1, 1.7, 0.6, LEAF),
      ...ball(x, y, 2.15, 0.5, '#62B86B'),
    );
  const legs = '#3B4252';
  const seat = '#CF9152';
  // back to front
  tree(1.0, 1.0);
  tree(7.0, 1.0);
  tree(1.0, 7.0);
  s.push(
    ...cylinder(4, 4, 0, 2.7, 0.5, '#C9CED6'),
    ...disc(4, 4, 0.5, 2.45, '#5DBDE3'),
    ...disc(4.3, 4.3, 0.501, 1.5, '#7FD0EE'),
    ...cylinder(4, 4, 0.5, 0.45, 1.3, '#D9DDE3'),
    ...cylinder(4, 4, 1.8, 1.25, 0.22, '#C9CED6'),
    ...disc(4, 4, 2.02, 1.05, '#7FD0EE'),
    ...cylinder(4, 4, 2.02, 0.22, 0.6, '#D9DDE3'),
    ...cylinder(4, 4, 2.62, 0.55, 0.16, '#C9CED6'),
    ...disc(4, 4, 2.78, 0.42, '#7FD0EE'),
    ...cylinder(4, 4, 2.78, 0.1, 0.45, '#D9DDE3'),
    // water jet and falling droplets
    ...spot(4, 4, 3.7, 0.22, 0.5, 'rgba(190,235,255,0.9)'),
    ...spot(4, 4, 4.15, 0.14, 0.24, 'rgba(255,255,255,0.95)'),
    ...spot(2.9, 5.1, 1.5, 0.12, 0.5, 'rgba(190,235,255,0.75)'),
    ...spot(5.1, 2.9, 1.5, 0.12, 0.5, 'rgba(190,235,255,0.75)'),
    ...spot(4.9, 4.9, 1.3, 0.12, 0.55, 'rgba(190,235,255,0.75)'),
    // benches facing the fountain
    ...box(3.3, 7.25, 0, 0.12, 0.3, 0.32, legs),
    ...box(4.58, 7.25, 0, 0.12, 0.3, 0.32, legs),
    ...box(3.2, 7.2, 0.32, 1.6, 0.4, 0.1, seat),
    ...box(7.25, 3.3, 0, 0.3, 0.12, 0.32, legs),
    ...box(7.25, 4.58, 0, 0.3, 0.12, 0.32, legs),
    ...box(7.2, 3.2, 0.32, 0.4, 1.6, 0.1, seat),
  );
  tree(7.0, 7.0);
  s.push(...ball(7.05, 6.85, 2.55, 0.1, '#FF6B8B'), ...ball(6.8, 7.1, 2.3, 0.1, '#FFD166'));
  return s;
};

// 2×1: two display windows full of books either side of the door.
const bookshop = (): Shape[] => {
  const s: Shape[] = [
    ...slab(0, 0, 8, 4, PAVEMENT),
    ...box(0.5, 0.5, 0, 7, 3, 3.1, '#3F5E8C'),
  ];
  const spines = ['#D9534F', '#4FD67B', '#F2849B', '#FFC73A', '#B58CFF', '#2F6F6A', '#D9534F', '#FFC73A'];
  for (const x0 of [0.75, 4.95]) {
    s.push(...wallL(x0, 3.5, 0.45, 2.3, 1.15, GLASS_WARM));
    spines.forEach((c, i) => s.push(...wallL(x0 + 0.08 + i * 0.27, 3.5, 0.5, 0.2, 0.42 + (i % 3) * 0.12, c)));
    spines.forEach((c, i) => s.push(...wallL(x0 + 0.12 + i * 0.27, 3.5, 1.05, 0.2, 0.3 + ((i + 1) % 3) * 0.1, c)));
  }
  s.push(
    ...wallL(3.6, 3.5, 0, 0.8, 1.45, '#D9A441'),
    ...wallL(3.73, 3.5, 0.7, 0.54, 0.6, GLASS_WARM),
    // name board
    ...wallL(0.6, 3.5, 1.78, 6.8, 0.42, '#F3E3C3'),
    ...wallL(2.0, 3.5, 1.9, 4.0, 0.16, '#3F5E8C'),
  );
  for (const x of [0.95, 2.35, 3.75, 5.15, 6.55]) s.push(...wallL(x, 3.5, 2.4, 0.5, 0.5, GLASS_WARM));
  for (const y of [0.9, 2.2]) s.push(...wallR(7.5, y, 0.5, 0.7, 1.0, GLASS_COOL), ...wallR(7.5, y, 2.4, 0.7, 0.5, GLASS_COOL));
  s.push(
    ...box(0.4, 0.4, 3.1, 7.2, 3.2, 0.2, '#2B3F5E'),
    ...box(0.75, 0.75, 3.3, 6.5, 2.5, 0.55, '#33496E'),
    ...box(0.85, 0.85, 3.85, 6.3, 2.3, 0.1, '#2B3F5E'),
    // reading bench out front
    ...box(1.2, 3.62, 0.3, 1.6, 0.3, 0.1, '#B87A40'),
    ...box(1.3, 3.65, 0, 0.12, 0.24, 0.3, '#3B4252'),
    ...box(2.6, 3.65, 0, 0.12, 0.24, 0.3, '#3B4252'),
    // hanging sign with an open book
    ...box(7.5, 3.15, 1.7, 0.5, 0.08, 0.5, '#D9A441'),
    ...spot(7.75, 3.24, 1.95, 0.14, 0.1, '#FFF4E6'),
  );
  return s;
};

const clockTower = (): Shape[] => {
  const s: Shape[] = [
    ...ground(PAVEMENT),
    ...floor(0.6, 0.6, 0.001, 2.8, 2.8, '#E6E1D5'),
    ...box(0.95, 0.95, 0, 2.1, 2.1, 1.2, '#B9A68C'),
    ...wallL(1.7, 3.05, 0, 0.6, 0.9, '#4A3524'),
    ...box(0.85, 0.85, 1.2, 2.3, 2.3, 0.15, '#A39078'),
    ...box(1.25, 1.25, 1.35, 1.5, 1.5, 3.5, '#D8C6A5'),
  ];
  for (const z of [2.0, 3.4]) {
    s.push(...wallL(1.85, 2.75, z, 0.3, 0.75, '#5C4630'), ...wallR(2.75, 1.85, z, 0.3, 0.75, '#5C4630'));
  }
  s.push(
    ...box(1.05, 1.05, 4.85, 1.9, 1.9, 1.5, '#C9B48F'),
    // clock faces (left and right walls)
    ...spot(2.0, 2.95, 5.6, 0.5, 0.56, '#3A2A1C'),
    ...spot(2.0, 2.95, 5.6, 0.42, 0.48, '#FFF8E7'),
    ...wallL(1.97, 2.951, 5.6, 0.06, 0.36, '#3A2A1C'),
    ...wallL(1.97, 2.951, 5.57, 0.28, 0.06, '#3A2A1C'),
    ...spot(2.95, 2.0, 5.6, 0.5, 0.56, '#3A2A1C'),
    ...spot(2.95, 2.0, 5.6, 0.42, 0.48, '#EDE4CC'),
    ...wallR(2.951, 1.97, 5.6, 0.06, 0.36, '#3A2A1C'),
    ...wallR(2.951, 1.75, 5.57, 0.28, 0.06, '#3A2A1C'),
    ...box(0.95, 0.95, 6.35, 2.1, 2.1, 0.15, '#A39078'),
    ...pyramid(1.0, 1.0, 6.5, 2.0, 2.0, 1.7, '#2F8F86'),
    ...box(1.97, 1.97, 8.1, 0.06, 0.06, 0.4, '#FFC73A'),
    ...ball(2, 2, 8.6, 0.13, '#FFC73A'),
  );
  return s;
};

// 3×2: the showpiece. Steps, a colonnade along the street front, a marquee and
// a pediment roof.
const grandTheater = (): Shape[] => {
  const W = 12;
  const D = 8;
  const s: Shape[] = [
    ...slab(0, 0, W, D, PAVEMENT),
    // steps
    ...box(0.2, 0.2, 0, W - 0.4, D - 0.3, 0.12, '#D6CFC0'),
    ...box(0.3, 0.3, 0.12, W - 0.6, D - 0.6, 0.12, '#E2DCCD'),
    ...floor(5.3, 7.2, 0.241, 1.4, 0.5, '#C0392B'),
    ...wallL(5.3, 7.7, 0.12, 1.4, 0.12, '#A93226'),
    ...floor(5.3, 7.7, 0.121, 1.4, 0.2, '#C0392B'),
    // hall
    ...box(0.4, 0.4, 0.24, W - 0.8, D - 1.3, 2.6, '#F2E6CF'),
  ];
  for (const y of [0.9, 2.3, 3.7, 5.1]) s.push(...wallR(W - 0.4, y, 0.9, 0.6, 1.3, '#8C2F39'));
  s.push(
    ...wallL(5.2, D - 0.9, 0.24, 1.6, 1.5, '#8C2F39'),
    ...wallL(5.96, D - 0.9, 0.24, 0.08, 1.5, '#FFC73A'),
  );
  for (const x of [1.1, 2.9, 8.5, 10.3]) s.push(...wallL(x, D - 0.9, 0.9, 0.6, 1.1, GLASS_WARM));
  for (const x of [0.7, 2.1, 3.5, 4.9, 7.1, 8.5, 9.9, 11.3]) {
    s.push(
      ...cylinder(x, D - 0.58, 0.24, 0.22, 0.12, '#D9D2C2'),
      ...cylinder(x, D - 0.58, 0.36, 0.15, 2.3, '#FFFDF6'),
    );
  }
  s.push(
    // entablature with marquee lights
    ...box(0.3, 0.3, 2.84, W - 0.6, D - 0.6, 0.4, '#E5D5B5'),
    ...wallL(3.4, D - 0.299, 2.9, 5.2, 0.28, '#8C2F39'),
  );
  for (let x = 0.55; x <= W - 0.4; x += 0.45) s.push(...spot(x, D - 0.298, 2.86, 0.07, 0.07, '#FFE680'));
  const top = 5.2;
  s.push(
    // roof: ridge runs front-to-back, pediment faces the street
    ...flat([[0.3, 0.3, 3.24], [0.3, D - 0.3, 3.24], [W / 2, D - 0.3, top], [W / 2, 0.3, top]], '#B44A3D'),
    ...flat([[W - 0.3, 0.3, 3.24], [W - 0.3, D - 0.3, 3.24], [W / 2, D - 0.3, top], [W / 2, 0.3, top]], '#9C3D32'),
    ...flat([[0.3, D - 0.3, 3.24], [W - 0.3, D - 0.3, 3.24], [W / 2, D - 0.3, top]], '#F7EEDB'),
    ...spot(W / 2, D - 0.299, 3.95, 0.4, 0.4, '#FFC73A'),
    ...spot(W / 2, D - 0.299, 3.95, 0.22, 0.22, '#FFF0B3'),
    // golden finial + flags
    ...box(W / 2 - 0.03, D - 0.45, top, 0.06, 0.06, 0.55, '#B8860B'),
    ...ball(W / 2, D - 0.42, top + 0.65, 0.15, '#FFC73A'),
    ...box(0.42, D - 0.5, 3.24, 0.05, 0.05, 1.0, '#6B6B6B'),
    ...wallL(0.47, D - 0.48, 3.9, 0.55, 0.32, '#C0392B'),
    ...box(W - 0.5, D - 0.5, 3.24, 0.05, 0.05, 1.0, '#6B6B6B'),
    ...wallL(W - 0.95, D - 0.48, 3.9, 0.45, 0.32, '#C0392B'),
  );
  return s;
};

const BUILDERS: Record<
  Exclude<ItemId, PathId>,
  { build: () => Shape[] | ArtPiece[]; height: number }
> = {
  'lamp-post': { build: lampPost, height: 5.6 },
  'park-bench': { build: parkBench, height: 4.0 },
  'brick-townhouse': { build: brickTownhouse, height: 5.9 },
  'corner-cafe': { build: cornerCafe, height: 3.8 },
  bakery: { build: bakery, height: 6.2 },
  'flower-kiosk': { build: flowerKiosk, height: 3.3 },
  'fountain-plaza': { build: fountainPlaza, height: 4.4 },
  bookshop: { build: bookshop, height: 4.2 },
  'clock-tower': { build: clockTower, height: 9.0 },
  'grand-theater': { build: grandTheater, height: 6.1 },
  // Series 2
  ...NEON_BUILDERS,
};

const isPieces = (v: Shape[] | ArtPiece[]): v is ArtPiece[] => v.length > 0 && 'rect' in v[0];

const cache = new Map<ItemId, ItemArtDef>();

/** Shape lists are static, so they're built once per item and memoised. */
export function getItemArt(id: ItemId): ItemArtDef {
  let def = cache.get(id);
  if (!def) {
    if (isPathId(id)) {
      // Cards and the inventory show a path on its own, in its default shape.
      const shapes = getPathShapes(id, DEFAULT_MASK[id]);
      def = { pieces: [{ rect: [0, 0, 1, 1], shapes }], size: [1, 1], height: PATH_HEIGHT[id] };
    } else {
      const b = BUILDERS[id];
      const size = sizeOf(id);
      const built = b.build();
      const pieces: ArtPiece[] = isPieces(built) ? built : [{ rect: [0, 0, size[0], size[1]], shapes: built }];
      def = { pieces, size, height: b.height };
    }
    cache.set(id, def);
  }
  return def;
}
