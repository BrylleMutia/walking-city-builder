import type { ItemId } from '../../data/sets/cozyDowntown';
import { DEFAULT_MASK, PATH_HEIGHT, getPathShapes, isPathId } from './pathShapes';
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

export interface ItemArtDef {
  shapes: Shape[];
  /** Height of the tallest point in tile units, used to fit the art in a card. */
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

const brickTownhouse = (): Shape[] => {
  const s: Shape[] = [
    ...ground(PAVEMENT),
    ...box(0.6, 0.6, 0, 2.8, 2.8, 4.2, '#C8553D'),
  ];
  // brick banding
  for (const z of [1.35, 2.65]) {
    s.push(...wallL(0.6, 3.4, z, 2.8, 0.1, '#A8432F'), ...wallR(3.4, 0.6, z, 2.8, 0.1, '#A8432F'));
  }
  for (const z of [1.65, 2.95]) {
    for (const x of [0.95, 2.45]) s.push(...wallL(x, 3.4, z, 0.6, 0.75, GLASS_WARM));
    for (const y of [1.0, 2.3]) s.push(...wallR(3.4, y, z, 0.6, 0.75, GLASS_COOL));
  }
  s.push(
    ...wallL(0.95, 3.4, 0.45, 0.6, 0.7, GLASS_WARM),
    ...wallR(3.4, 1.0, 0.45, 0.6, 0.7, GLASS_COOL),
    ...wallR(3.4, 2.3, 0.45, 0.6, 0.7, GLASS_COOL),
    ...wallL(2.3, 3.4, 0, 0.75, 1.2, '#4A2F22'),
    ...box(2.15, 3.4, 0, 1.05, 0.45, 0.2, '#B9B4A8'),
    ...box(0.45, 0.45, 4.2, 3.1, 3.1, 0.25, '#7A3B2E'),
    ...box(1.0, 1.0, 4.45, 0.55, 0.55, 0.8, '#8D4B3A'),
    ...box(0.95, 0.95, 5.25, 0.65, 0.65, 0.12, '#5E3226'),
  );
  return s;
};

const cornerCafe = (): Shape[] => {
  const s: Shape[] = [
    ...ground(PAVEMENT),
    ...box(0.5, 0.5, 0, 3, 2.7, 2.6, '#F3E3C3'),
    ...wallL(0.5, 3.2, 0, 3, 0.35, '#2F6F6A'),
    ...wallR(3.5, 0.5, 0, 2.7, 0.35, '#2F6F6A'),
    ...wallL(0.75, 3.2, 0.6, 0.75, 0.9, GLASS_WARM),
    ...wallL(2.55, 3.2, 0.6, 0.75, 0.9, GLASS_WARM),
    ...wallL(1.65, 3.2, 0, 0.75, 1.45, '#6B4A3A'),
    ...wallL(1.78, 3.2, 0.7, 0.5, 0.6, GLASS_WARM),
    ...wallR(3.5, 0.9, 0.6, 1.9, 1.0, GLASS_COOL),
    // striped awning
    ...box(0.5, 3.2, 1.7, 3, 0.7, 0.12, '#D9534F'),
  ];
  for (let i = 0; i < 3; i++) s.push(...floor(0.5 + i * 1.0, 3.2, 1.821, 0.5, 0.7, '#FFF4E6'));
  s.push(
    ...box(0.4, 0.4, 2.6, 3.2, 2.9, 0.3, '#6B4A3A'),
    // roof sign with a coffee cup
    ...box(1.1, 2.9, 2.9, 1.8, 0.16, 0.85, '#2F6F6A'),
    ...spot(2.0, 3.07, 3.3, 0.26, 0.26, '#FFF4E6'),
    ...spot(2.0, 3.07, 3.33, 0.15, 0.13, '#6B4A3A'),
    // pavement table
    ...cylinder(0.9, 3.75, 0, 0.06, 0.5, '#4C566A'),
    ...disc(0.9, 3.75, 0.5, 0.3, '#FFF4E6'),
  );
  return s;
};

const bakery = (): Shape[] => {
  const s: Shape[] = [
    ...ground(PAVEMENT),
    ...box(0.5, 0.7, 0, 3, 2.6, 2.2, '#F7C9A3'),
    ...wallR(3.5, 1.2, 0.6, 1.6, 0.95, GLASS_COOL),
    ...wallL(0.7, 3.3, 0.5, 0.75, 0.95, GLASS_WARM),
    ...wallL(2.55, 3.3, 0.5, 0.75, 0.95, GLASS_WARM),
    // loaves in the window
    ...wallL(0.8, 3.3, 0.55, 0.22, 0.2, '#C98B4F'),
    ...wallL(1.12, 3.3, 0.55, 0.22, 0.28, '#B87333'),
    ...wallL(2.65, 3.3, 0.55, 0.22, 0.28, '#C98B4F'),
    ...wallL(2.97, 3.3, 0.55, 0.22, 0.2, '#B87333'),
    ...wallL(1.62, 3.3, 0, 0.78, 1.35, '#7A4A2B'),
    ...box(0.5, 3.3, 1.55, 3, 0.55, 0.12, '#FFF3E0'),
  ];
  for (let i = 0; i < 3; i++) s.push(...floor(0.5 + i * 1.0, 3.3, 1.671, 0.5, 0.55, '#F28B9B'));
  s.push(
    ...gable(0.3, 0.5, 2.2, 3.4, 3.0, 1.4, '#B5523B', '#F7C9A3'),
    ...spot(3.7, 2.0, 2.75, 0.24, 0.3, '#E0A45B'),
    ...spot(3.7, 2.0, 2.75, 0.1, 0.13, '#9A5B2A'),
    ...box(0.9, 1.0, 2.9, 0.48, 0.48, 1.0, '#8D4B3A'),
    ...ball(1.2, 1.25, 4.35, 0.26, '#F4F1EC'),
    ...ball(1.45, 1.35, 4.95, 0.36, '#F4F1EC'),
    ...ball(1.25, 1.2, 5.65, 0.3, '#FAF8F4'),
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

const fountainPlaza = (): Shape[] => {
  const s: Shape[] = [...ground('#E4DED0')];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if ((i + j) % 2 === 0) s.push(...floor(i, j, 0.001, 1, 1, '#D2CABA'));
    }
  }
  s.push(
    ...ball(0.5, 0.5, 0.35, 0.36, LEAF),
    ...cylinder(2, 2, 0, 1.55, 0.45, '#C9CED6'),
    ...disc(2, 2, 0.45, 1.36, '#5DBDE3'),
    ...disc(2.15, 2.15, 0.451, 0.8, '#7FD0EE'),
    ...cylinder(2, 2, 0.45, 0.3, 1.15, '#D9DDE3'),
    ...cylinder(2, 2, 1.6, 0.8, 0.2, '#C9CED6'),
    ...disc(2, 2, 1.8, 0.66, '#7FD0EE'),
    ...cylinder(2, 2, 1.8, 0.13, 0.55, '#D9DDE3'),
    // water jet and falling droplets
    ...spot(2, 2, 2.75, 0.2, 0.42, 'rgba(190,235,255,0.9)'),
    ...spot(2, 2, 3.15, 0.13, 0.2, 'rgba(255,255,255,0.95)'),
    ...spot(1.25, 2.75, 1.3, 0.1, 0.42, 'rgba(190,235,255,0.75)'),
    ...spot(2.75, 1.25, 1.3, 0.1, 0.42, 'rgba(190,235,255,0.75)'),
    ...spot(2.6, 2.6, 1.15, 0.1, 0.46, 'rgba(190,235,255,0.75)'),
    ...ball(3.5, 3.5, 0.35, 0.36, LEAF),
    ...ball(3.52, 3.52, 0.6, 0.1, '#FF6B8B'),
  );
  return s;
};

const bookshop = (): Shape[] => {
  const s: Shape[] = [
    ...ground(PAVEMENT),
    ...box(0.5, 0.5, 0, 3, 3, 3.1, '#3F5E8C'),
    ...wallL(0.75, 3.5, 0.45, 1.3, 1.15, GLASS_WARM),
  ];
  const spines = ['#D9534F', '#4FD67B', '#F2849B', '#FFC73A', '#B58CFF', '#2F6F6A', '#D9534F'];
  spines.forEach((c, i) => {
    s.push(...wallL(0.82 + i * 0.17, 3.5, 0.5, 0.13, 0.42 + (i % 3) * 0.12, c));
  });
  s.push(
    ...wallL(2.45, 3.5, 0, 0.75, 1.45, '#D9A441'),
    ...wallL(2.58, 3.5, 0.7, 0.5, 0.6, GLASS_WARM),
    ...wallL(0.6, 3.5, 1.78, 2.8, 0.42, '#F3E3C3'),
    ...wallL(1.0, 3.5, 1.9, 2.0, 0.16, '#3F5E8C'),
    ...wallL(0.95, 3.5, 2.4, 0.6, 0.5, GLASS_WARM),
    ...wallL(2.45, 3.5, 2.4, 0.6, 0.5, GLASS_WARM),
    ...wallR(3.5, 0.9, 0.5, 0.7, 1.0, GLASS_COOL),
    ...wallR(3.5, 2.2, 0.5, 0.7, 1.0, GLASS_COOL),
    ...wallR(3.5, 0.9, 2.4, 0.7, 0.5, GLASS_COOL),
    ...wallR(3.5, 2.2, 2.4, 0.7, 0.5, GLASS_COOL),
    ...box(0.4, 0.4, 3.1, 3.2, 3.2, 0.2, '#2B3F5E'),
    ...box(0.75, 0.75, 3.3, 2.5, 2.5, 0.55, '#33496E'),
    ...box(0.85, 0.85, 3.85, 2.3, 2.3, 0.1, '#2B3F5E'),
    // hanging sign with an open book
    ...box(3.5, 3.15, 1.7, 0.5, 0.08, 0.5, '#D9A441'),
    ...spot(3.75, 3.24, 1.95, 0.14, 0.1, '#FFF4E6'),
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

const grandTheater = (): Shape[] => {
  const s: Shape[] = [
    ...ground(PAVEMENT),
    // steps
    ...box(0.2, 0.2, 0, 3.6, 3.7, 0.12, '#D6CFC0'),
    ...box(0.3, 0.3, 0.12, 3.4, 3.4, 0.12, '#E2DCCD'),
    ...floor(1.7, 3.2, 0.241, 0.6, 0.5, '#C0392B'),
    ...wallL(1.7, 3.7, 0.12, 0.6, 0.12, '#A93226'),
    ...floor(1.7, 3.7, 0.121, 0.6, 0.2, '#C0392B'),
    // hall
    ...box(0.4, 0.4, 0.24, 3.2, 2.7, 2.6, '#F2E6CF'),
    ...wallR(3.6, 0.8, 0.9, 0.55, 1.3, '#8C2F39'),
    ...wallR(3.6, 1.75, 0.9, 0.55, 1.3, '#8C2F39'),
    ...wallL(1.6, 3.1, 0.24, 0.8, 1.5, '#8C2F39'),
    ...wallL(1.96, 3.1, 0.24, 0.08, 1.5, '#FFC73A'),
    ...wallL(0.7, 3.1, 0.9, 0.5, 1.1, GLASS_WARM),
    ...wallL(2.8, 3.1, 0.9, 0.5, 1.1, GLASS_WARM),
  ];
  for (const x of [0.62, 1.38, 2.62, 3.38]) {
    s.push(
      ...cylinder(x, 3.42, 0.24, 0.2, 0.12, '#D9D2C2'),
      ...cylinder(x, 3.42, 0.36, 0.14, 2.3, '#FFFDF6'),
    );
  }
  s.push(
    // entablature with marquee lights
    ...box(0.3, 0.3, 2.84, 3.4, 3.4, 0.4, '#E5D5B5'),
    ...wallL(1.0, 3.701, 2.9, 2.0, 0.28, '#8C2F39'),
  );
  for (let x = 0.55; x <= 3.5; x += 0.42) {
    s.push(...spot(x, 3.702, 2.86, 0.07, 0.07, '#FFE680'));
  }
  s.push(
    // roof: ridge runs front-to-back, pediment faces the street
    ...flat(
      [
        [3.7, 0.3, 3.24],
        [3.7, 3.7, 3.24],
        [2, 3.7, 4.3],
        [2, 0.3, 4.3],
      ],
      '#9C3D32',
    ),
    ...flat(
      [
        [0.3, 3.7, 3.24],
        [3.7, 3.7, 3.24],
        [2, 3.7, 4.3],
      ],
      '#F7EEDB',
    ),
    ...spot(2, 3.701, 3.62, 0.24, 0.24, '#FFC73A'),
    ...spot(2, 3.701, 3.62, 0.12, 0.12, '#FFF0B3'),
    // golden finial + flags
    ...box(1.97, 3.55, 4.3, 0.06, 0.06, 0.55, '#B8860B'),
    ...ball(2, 3.58, 4.95, 0.15, '#FFC73A'),
    ...box(0.42, 3.5, 3.24, 0.05, 0.05, 0.9, '#6B6B6B'),
    ...wallL(0.47, 3.52, 3.8, 0.45, 0.3, '#C0392B'),
    ...box(3.5, 3.5, 3.24, 0.05, 0.05, 0.9, '#6B6B6B'),
    ...wallL(3.05, 3.52, 3.8, 0.45, 0.3, '#C0392B'),
  );
  return s;
};

const BUILDERS: Record<Exclude<ItemId, 'cobblestone-street' | 'brick-sidewalk' | 'pocket-lawn'>, { build: () => Shape[]; height: number }> = {
  'lamp-post': { build: lampPost, height: 5.6 },
  'park-bench': { build: parkBench, height: 4.0 },
  'brick-townhouse': { build: brickTownhouse, height: 5.6 },
  'corner-cafe': { build: cornerCafe, height: 4.0 },
  bakery: { build: bakery, height: 6.2 },
  'flower-kiosk': { build: flowerKiosk, height: 3.3 },
  'fountain-plaza': { build: fountainPlaza, height: 3.8 },
  bookshop: { build: bookshop, height: 4.2 },
  'clock-tower': { build: clockTower, height: 9.0 },
  'grand-theater': { build: grandTheater, height: 5.4 },
};

const cache = new Map<ItemId, ItemArtDef>();

/** Shape lists are static, so they're built once per item and memoised. */
export function getItemArt(id: ItemId): ItemArtDef {
  let def = cache.get(id);
  if (!def) {
    if (isPathId(id)) {
      // Cards and the inventory show a path on its own, in its default shape.
      def = { shapes: getPathShapes(id, DEFAULT_MASK[id]), height: PATH_HEIGHT[id] };
    } else {
      const b = BUILDERS[id];
      def = { shapes: b.build(), height: b.height };
    }
    cache.set(id, def);
  }
  return def;
}
