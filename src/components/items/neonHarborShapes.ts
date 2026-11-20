import type { NeonHarborId } from '../../data/sets/neonHarbor';
import {
  ball,
  barR,
  box,
  cylinder,
  disc,
  flat,
  floor,
  gable,
  ground,
  pyramid,
  slab,
  spot,
  uprightRing,
  wallL,
  wallR,
  type Shape,
} from './iso';
import type { ArtPiece } from './itemShapes';

/**
 * Series 2 (Neon Harbor) buildings and props. Same rules as itemShapes.ts: 4 iso
 * units per lot, shapes listed back to front, multi-lot items on a `slab`.
 * The palette is the docks at dusk: navy and violet walls, pink and cyan neon.
 */

const QUAY = '#8E97A3';
const QUAY_LIGHT = '#9AA3AE';
const NAVY = '#1E2452';
const VIOLET = '#2A1F5C';
const PINK = '#FF4FB3';
const CYAN = '#3FF0FF';
const RED = '#E8505B';
const CHROME = '#F2F4F7';
const GLASS = '#BFEFFF';
const WARM = '#FFE9A0';
const WATER = '#4F8FB0';
const ORANGE = '#F2A93B';
const PINK_GLOW = 'rgba(255,79,179,0.22)';
const CYAN_GLOW = 'rgba(63,240,255,0.25)';

const neonLamp = (): Shape[] => [
  ...ground(QUAY),
  ...floor(0.3, 0.3, 0.001, 3.4, 3.4, QUAY_LIGHT),
  ...box(1.7, 1.7, 0, 0.6, 0.6, 0.3, NAVY),
  ...spot(2, 2, 2.4, 1.2, 1.4, PINK_GLOW),
  ...box(1.62, 1.96, 0.9, 0.08, 0.08, 2.6, PINK),
  ...box(1.88, 1.88, 0.3, 0.24, 0.24, 3.6, '#2B3150'),
  ...box(2.3, 1.96, 0.9, 0.08, 0.08, 2.6, CYAN),
  ...box(1.55, 1.55, 3.9, 0.9, 0.9, 0.16, NAVY),
  ...spot(2, 2, 4.3, 1.1, 1.1, CYAN_GLOW),
  ...box(1.7, 1.7, 4.06, 0.6, 0.6, 0.5, GLASS),
  ...pyramid(1.55, 1.55, 4.56, 0.9, 0.9, 0.4, NAVY),
  ...ball(2, 2, 5.02, 0.09, PINK),
];

const cargoCrates = (): Shape[] => [
  ...ground(QUAY),
  ...floor(0.2, 0.2, 0.001, 3.6, 3.6, QUAY_LIGHT),
  ...box(0.5, 0.5, 0, 1.4, 1.4, 1.1, '#C77B3A'),
  ...wallL(0.5, 1.9, 0.35, 1.4, 0.08, '#9C5B26'),
  ...wallL(0.5, 1.9, 0.75, 1.4, 0.08, '#9C5B26'),
  ...box(2.1, 0.5, 0, 1.4, 1.4, 1.1, '#2F7DA8'),
  ...wallR(3.5, 0.5, 0.35, 1.4, 0.08, '#1F5F84'),
  ...wallR(3.5, 0.5, 0.75, 1.4, 0.08, '#1F5F84'),
  ...box(1.2, 0.8, 1.1, 1.5, 1.2, 0.95, '#D9A441'),
  ...wallL(1.2, 2.0, 1.4, 1.5, 0.08, '#B5852E'),
  // coiled rope and a bollard at the quay edge
  ...cylinder(1.2, 3.0, 0, 0.55, 0.18, '#E8D7B0'),
  ...disc(1.2, 3.0, 0.18, 0.25, '#C9B68C'),
  ...cylinder(3.0, 3.0, 0, 0.26, 0.45, '#3B4252'),
  ...cylinder(3.0, 3.0, 0.45, 0.34, 0.1, '#4C566A'),
];

const noodleStand = (): Shape[] => [
  ...ground(QUAY),
  ...floor(0.3, 0.3, 0.001, 3.4, 3.4, QUAY_LIGHT),
  ...box(0.7, 0.6, 0, 2.6, 2.2, 1.7, RED),
  ...wallR(3.3, 0.9, 0.7, 1.6, 0.7, WARM),
  ...wallL(0.9, 2.8, 0.95, 2.2, 0.6, WARM),
  // steam from the pots
  ...ball(1.4, 2.0, 2.0, 0.18, 'rgba(255,255,255,0.7)'),
  ...ball(1.6, 2.0, 2.3, 0.14, 'rgba(255,255,255,0.6)'),
  ...box(0.6, 2.8, 0, 2.8, 0.45, 0.9, '#F3E3C3'),
  ...box(0.4, 0.4, 1.7, 3.2, 2.9, 0.15, NAVY),
  // neon bowl sign
  ...box(1.1, 1.8, 1.85, 1.8, 0.14, 1.0, NAVY),
  ...spot(2.0, 1.95, 2.25, 0.62, 0.32, PINK_GLOW),
  ...spot(2.0, 1.941, 2.2, 0.45, 0.2, PINK),
  ...spot(2.0, 1.941, 2.27, 0.38, 0.12, NAVY),
  ...wallL(1.7, 1.941, 2.4, 0.06, 0.4, CYAN),
  ...wallL(2.1, 1.941, 2.4, 0.06, 0.4, CYAN),
  // paper lanterns and stools
  ...ball(0.55, 3.25, 1.55, 0.16, RED),
  ...ball(3.45, 3.25, 1.55, 0.16, RED),
  ...cylinder(1.1, 3.6, 0, 0.06, 0.55, '#4C566A'),
  ...disc(1.1, 3.6, 0.55, 0.22, PINK),
  ...cylinder(2.0, 3.6, 0, 0.06, 0.55, '#4C566A'),
  ...disc(2.0, 3.6, 0.55, 0.22, CYAN),
  ...cylinder(2.9, 3.6, 0, 0.06, 0.55, '#4C566A'),
  ...disc(2.9, 3.6, 0.55, 0.22, PINK),
];

// 1×2: a long shed on the water, a boat nosing out of its doors.
const boathouse = (): Shape[] => {
  const s: Shape[] = [
    ...slab(0, 0, 4, 8, WATER),
    ...floor(0.2, 0.2, 0.001, 3.6, 7.6, '#6B4A34'),
    ...box(0.5, 0.5, 0, 3, 6.6, 2.4, '#5C7FA3'),
  ];
  // clapboard lines on the long side
  for (const z of [0.4, 0.8, 1.2, 1.6, 2.0]) s.push(...wallR(3.5, 0.5, z, 6.6, 0.05, '#4A6A8C'));
  for (const y of [1.2, 3.0, 4.8]) s.push(...wallR(3.5, y, 1.0, 0.7, 0.6, WARM));
  s.push(
    // life ring
    ...spot(3.51, 6.2, 1.25, 0.32, 0.36, '#FF7A3C'),
    ...spot(3.51, 6.2, 1.25, 0.16, 0.18, '#5C7FA3'),
    // boat doors and the boat
    ...wallL(0.9, 7.1, 0, 2.2, 1.8, '#2C3E57'),
    ...box(1.35, 6.6, 0.05, 1.3, 1.25, 0.35, '#F3E3C3'),
    ...wallL(1.35, 7.85, 0.18, 1.3, 0.08, RED),
    // roof: ridge runs front to back, gable faces the water
    ...flat([[0.3, 0.3, 2.4], [0.3, 7.4, 2.4], [2, 7.4, 3.6], [2, 0.3, 3.6]], '#3E5878'),
    ...flat([[3.7, 0.3, 2.4], [3.7, 7.4, 2.4], [2, 7.4, 3.6], [2, 0.3, 3.6]], '#2F4562'),
    ...flat([[0.3, 7.4, 2.4], [3.7, 7.4, 2.4], [2, 7.4, 3.6]], '#6E8FB3'),
    ...spot(2, 7.401, 2.85, 0.2, 0.2, CYAN),
    // mooring posts
    ...box(3.75, 7.6, 0, 0.18, 0.18, 0.7, '#5E3B26'),
    ...box(0.1, 7.6, 0, 0.18, 0.18, 0.7, '#5E3B26'),
  );
  return s;
};

// 2×1: an open hall with striped awnings over ice counters.
const fishMarket = (): Shape[] => {
  const s: Shape[] = [
    ...slab(0, 0, 8, 4, QUAY),
    ...box(0.5, 0.5, 0, 7, 2.5, 2.0, '#EAF2F5'),
    ...wallR(7.5, 1.0, 0.5, 1.5, 1.0, GLASS),
  ];
  for (const x of [1.0, 3.2, 5.4]) s.push(...wallL(x, 3.0, 0.9, 1.4, 0.9, '#3B4A5C'));
  s.push(
    // ice counters with the catch of the day
    ...box(0.8, 3.1, 0, 6.4, 0.6, 0.7, '#DDE7EC'),
  );
  const fish: [number, string][] = [[1.2, '#B8C4CE'], [1.9, '#F2849B'], [2.7, '#B8C4CE'], [3.6, '#FFB36B'], [4.4, '#B8C4CE'], [5.3, '#F2849B'], [6.2, '#B8C4CE']];
  for (const [x, c] of fish) s.push(...spot(x, 3.4, 0.74, 0.28, 0.1, c));
  s.push(...box(0.4, 3.0, 1.5, 7.2, 0.8, 0.12, '#2F7DA8'));
  for (let i = 0; i < 7; i++) s.push(...floor(0.4 + i * 1.03, 3.0, 1.621, 0.5, 0.8, '#FFFFFF'));
  s.push(
    ...gable(0.3, 0.4, 2.0, 7.4, 2.8, 0.9, '#2F7DA8', '#EAF2F5'),
    // fish sign on the gable end
    ...spot(7.71, 1.8, 2.35, 0.4, 0.2, ORANGE),
    ...spot(7.71, 2.22, 2.35, 0.1, 0.16, ORANGE),
    // a gull on the ridge
    ...ball(2.6, 1.8, 3.0, 0.16, '#FFFFFF'),
    ...ball(2.75, 1.8, 3.08, 0.08, '#FFFFFF'),
  );
  return s;
};

// Mirrored L over 3 lots (## / .#): a chrome diner whose notch is front-left.
// The arm's street front faces the notch; the wing reaches toward the viewer.
const neonDiner = (): ArtPiece[] => {
  const arm: Shape[] = [
    ...slab(0, 0, 8, 4, QUAY),
    ...box(0.5, 0.5, 0, 7, 3, 2.2, CHROME),
    ...wallL(0.5, 3.5, 0.5, 4, 0.18, RED),
    ...wallL(0.8, 3.5, 0.8, 1.2, 0.8, GLASS),
    ...wallL(3.2, 3.5, 0.8, 1.0, 0.8, GLASS),
    ...wallL(2.2, 3.5, 0, 0.8, 1.45, NAVY),
    ...wallL(2.32, 3.5, 0.7, 0.56, 0.6, WARM),
    ...wallL(0.5, 3.5, 1.75, 4, 0.18, RED),
    ...wallR(7.5, 0.8, 0.8, 2.4, 0.8, GLASS),
    ...wallR(7.5, 0.5, 0.5, 3, 0.18, RED),
    ...wallR(7.5, 0.5, 1.75, 3, 0.18, RED),
    ...box(0.4, 0.4, 2.2, 7.2, 3.2, 0.25, NAVY),
    // neon script sign over the door
    ...spot(2.6, 3.35, 2.95, 1.7, 0.7, PINK_GLOW),
    ...box(1.0, 3.2, 2.45, 3.2, 0.14, 0.95, NAVY),
    ...wallL(1.2, 3.341, 2.6, 2.8, 0.12, PINK),
    ...wallL(1.2, 3.341, 2.95, 2.8, 0.12, CYAN),
  ];
  const wing: Shape[] = [
    ...slab(4, 4, 4, 4, QUAY),
    ...box(4.5, 3.5, 0, 3, 4, 2.2, CHROME),
    ...wallR(7.5, 4.0, 0.8, 3.0, 0.8, GLASS),
    ...wallR(7.5, 3.5, 0.5, 4, 0.18, RED),
    ...wallR(7.5, 3.5, 1.75, 4, 0.18, RED),
    ...wallL(4.8, 7.5, 0.8, 2.4, 0.8, GLASS),
    ...wallL(4.5, 7.5, 0.5, 3, 0.18, RED),
    ...wallL(4.5, 7.5, 1.75, 3, 0.18, RED),
    ...box(4.4, 3.6, 2.2, 3.2, 4.0, 0.25, NAVY),
    // giant milkshake on the roof
    ...cylinder(6.0, 5.8, 2.45, 0.42, 0.9, '#FF8AD8'),
    ...ball(6.0, 5.8, 3.5, 0.42, '#FFFFFF'),
    ...ball(6.05, 5.75, 3.95, 0.14, RED),
    ...box(6.2, 5.6, 3.45, 0.06, 0.06, 0.9, CYAN),
  ];
  return [
    { rect: [0, 0, 2, 1], shapes: arm },
    { rect: [1, 1, 1, 1], shapes: wing },
  ];
};

// 3×1: a long neon arcade front.
const retroArcade = (): Shape[] => {
  const W = 12;
  const s: Shape[] = [
    ...slab(0, 0, W, 4, QUAY),
    ...box(0.5, 0.5, 0, W - 1, 3, 2.8, VIOLET),
    ...wallR(W - 0.5, 1.0, 0.6, 2.0, 1.2, '#3A2E7A'),
    ...wallR(W - 0.5, 1.4, 0.65, 0.5, 1.0, '#FFD166'),
  ];
  for (const x of [1.0, 3.0, 7.6, 9.6]) {
    s.push(
      ...wallL(x, 3.5, 0.45, 1.5, 1.45, '#3A2E7A'),
      // claw machines in the window
      ...wallL(x + 0.15, 3.5, 0.5, 0.5, 1.25, x % 2 < 1 ? '#FFD166' : CYAN),
      ...wallL(x + 0.85, 3.5, 0.5, 0.5, 1.25, x % 2 < 1 ? PINK : '#FFD166'),
    );
  }
  s.push(
    ...spot(6, 3.6, 0.9, 1.3, 0.9, CYAN_GLOW),
    ...wallL(5.3, 3.5, 0, 1.4, 1.7, '#120C33'),
    ...wallL(5.95, 3.5, 0, 0.1, 1.7, CYAN),
    // neon trims
    ...wallL(0.5, 3.5, 2.5, W - 1, 0.1, PINK),
    ...wallL(0.5, 3.5, 0.12, W - 1, 0.08, CYAN),
    ...box(0.4, 0.4, 2.8, W - 0.8, 3.2, 0.2, '#1A1340'),
    // marquee sign
    ...spot(6, 3.3, 3.7, 3.6, 1.2, PINK_GLOW),
    ...box(3.0, 3.1, 3.0, 6, 0.2, 1.4, '#120C33'),
  );
  // "letters": a row of neon blocks
  for (let i = 0; i < 6; i++) {
    s.push(...wallL(3.4 + i * 0.9, 3.301, 3.25, 0.55, 0.9, i % 2 === 0 ? PINK : CYAN));
  }
  s.push(...ball(3.2, 3.3, 4.5, 0.12, '#FFD166'), ...ball(8.8, 3.3, 4.5, 0.12, '#FFD166'));
  return s;
};

// 2×2: a gantry crane over containers on the quay.
const cargoCrane = (): Shape[] => {
  const s: Shape[] = [...slab(0, 0, 8, 8, QUAY)];
  for (const y of [1.0, 7.0]) s.push(...floor(0, y, 0.002, 8, 0.12, '#5A6270'));
  s.push(...floor(0.3, 3.9, 0.003, 7.4, 0.12, '#F2C230'));
  const leg = (x: number, y: number) => s.push(...box(x, y, 0, 0.45, 0.45, 5.2, ORANGE));
  const beamX = (y: number) => s.push(...box(0.6, y, 5.2, 6.85, 0.45, 0.5, ORANGE));
  const beamY = (x: number) => s.push(...box(x, 0.6, 5.2, 0.45, 6.85, 0.5, ORANGE));
  // back to front
  leg(0.6, 0.6);
  beamX(0.6);
  beamY(0.6);
  leg(7.0, 0.6);
  leg(0.6, 7.0);
  s.push(
    // container on the ground, another one in the air
    ...box(1.2, 4.6, 0, 3.0, 2.4, 1.3, '#2F7DA8'),
    ...box(4.6, 1.4, 0, 2.4, 2.6, 1.3, '#4FA65B'),
    ...box(3.95, 3.95, 3.6, 0.04, 0.04, 1.6, '#3B4252'),
    ...box(4.95, 3.95, 3.6, 0.04, 0.04, 1.6, '#3B4252'),
    ...box(2.6, 2.7, 2.2, 3.6, 2.4, 1.4, RED),
  );
  for (const x of [3.1, 3.8, 4.5, 5.2, 5.9]) s.push(...wallL(x, 5.1, 2.25, 0.08, 1.3, '#B83A44'));
  s.push(
    ...box(3.5, 3.4, 3.6, 2.0, 1.4, 0.25, '#3B4252'),
    // trolley riding the beams, with the operator's cab
    ...box(3.4, 3.2, 5.7, 2.2, 1.8, 0.45, '#3B4252'),
    ...box(6.0, 5.6, 4.2, 1.2, 1.2, 1.0, ORANGE),
    ...wallR(7.2, 5.8, 4.45, 0.8, 0.5, GLASS),
  );
  beamY(7.0);
  beamX(7.0);
  leg(7.0, 7.0);
  s.push(...ball(7.22, 7.22, 5.95, 0.14, RED));
  return s;
};

const lighthouse = (): Shape[] => [
  ...ground('#8A8F99'),
  ...ball(0.7, 0.8, 0.25, 0.5, '#6E747E'),
  ...ball(3.2, 0.9, 0.2, 0.45, '#7A808A'),
  ...ball(0.8, 3.1, 0.2, 0.45, '#7A808A'),
  ...cylinder(2, 2, 0, 1.45, 0.5, '#D9D2C2'),
  ...cylinder(2, 2, 0.5, 1.1, 1.2, '#FFFFFF'),
  ...cylinder(2, 2, 1.7, 1.0, 1.2, '#D9343F'),
  ...cylinder(2, 2, 2.9, 0.92, 1.2, '#FFFFFF'),
  ...cylinder(2, 2, 4.1, 0.85, 1.2, '#D9343F'),
  ...spot(2.55, 2.55, 0.85, 0.22, 0.38, '#3B2A1C'),
  ...cylinder(2, 2, 5.3, 1.15, 0.12, NAVY),
  // lantern room, its glow and a beam out over the bay
  ...spot(2, 2, 5.85, 1.6, 1.1, 'rgba(255,233,140,0.35)'),
  ...flat([[2, 2, 5.85], [5.6, 4.0, 6.3], [5.6, 4.0, 5.2]], 'rgba(255,240,170,0.35)'),
  ...cylinder(2, 2, 5.42, 0.62, 0.8, '#FFF3B0'),
  ...cylinder(2, 2, 6.22, 0.75, 0.12, NAVY),
  ...cylinder(2, 2, 6.34, 0.45, 0.35, '#D9343F'),
  ...ball(2, 2, 6.95, 0.16, NAVY),
];

// 2×3: the showpiece. A wheel in the plane x = 4 with gondolas, on a deck
// with a ticket booth. Back A-frame legs, then wheel, then front legs.
const ferrisWheel = (): Shape[] => {
  const CY = 6;
  const CZ = 6.4;
  const R = 5.0;
  const s: Shape[] = [
    ...slab(0, 0, 8, 12, QUAY),
    ...floor(0.4, 0.4, 0.002, 7.2, 11.2, '#3A2E7A'),
    ...floor(0.8, 0.8, 0.003, 6.4, 10.4, '#4A3B8F'),
  ];
  const legs = (x: number, color: string) =>
    s.push(...barR(x, 1.6, 0, CY, CZ, 0.32, color), ...barR(x, 10.4, 0, CY, CZ, 0.32, color));
  legs(3.3, '#B7BCD0');
  s.push(
    ...uprightRing(4, CY, CZ, R, 0.3, PINK),
    ...uprightRing(4, CY, CZ, R - 0.75, 0.12, CYAN),
  );
  const N = 12;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    s.push(...barR(4, CY, CZ, CY + R * Math.cos(t), CZ + R * Math.sin(t), 0.08, '#E6E8F2'));
  }
  // gondolas hang below their rim point; draw the higher ones first (they sit further up the screen)
  const cars = Array.from({ length: N }, (_, i) => {
    const t = (i / N) * Math.PI * 2 + Math.PI / N;
    return { y: CY + R * Math.cos(t), z: CZ + R * Math.sin(t), i };
  }).sort((a, b) => b.z - a.z);
  const carColors = [PINK, CYAN, '#FFD166', '#B58CFF'];
  for (const c of cars) {
    s.push(
      ...box(3.97, c.y - 0.02, c.z - 0.5, 0.06, 0.04, 0.5, '#E6E8F2'),
      ...box(3.6, c.y - 0.4, c.z - 1.15, 0.8, 0.8, 0.65, carColors[c.i % 4]),
      ...box(3.55, c.y - 0.45, c.z - 0.5, 0.9, 0.9, 0.08, NAVY),
    );
  }
  s.push(...uprightRing(4.02, CY, CZ, 0.55, 0, NAVY), ...uprightRing(4.03, CY, CZ, 0.25, 0, '#FFD166'));
  legs(4.7, '#D5D9E8');
  s.push(
    // ticket booth and queue rope at the front
    ...box(5.6, 9.4, 0, 1.6, 1.6, 1.6, RED),
    ...wallL(5.9, 11.0, 0.7, 1.0, 0.6, WARM),
    ...box(5.45, 9.25, 1.6, 1.9, 1.9, 0.15, NAVY),
    ...wallL(5.7, 11.151, 1.85, 1.4, 0.3, PINK),
    ...box(2.0, 10.9, 0, 0.12, 0.12, 0.6, '#C9CED6'),
    ...box(4.6, 10.9, 0, 0.12, 0.12, 0.6, '#C9CED6'),
    ...box(2.05, 10.93, 0.45, 2.6, 0.06, 0.06, RED),
  );
  return s;
};

export const NEON_BUILDERS: Record<
  Exclude<NeonHarborId, 'boardwalk-planks' | 'quay-stones' | 'sandy-strip'>,
  { build: () => Shape[] | ArtPiece[]; height: number }
> = {
  'neon-lamp': { build: neonLamp, height: 5.2 },
  'cargo-crates': { build: cargoCrates, height: 2.4 },
  'noodle-stand': { build: noodleStand, height: 2.9 },
  boathouse: { build: boathouse, height: 3.7 },
  'fish-market': { build: fishMarket, height: 3.2 },
  'neon-diner': { build: neonDiner, height: 4.0 },
  'retro-arcade': { build: retroArcade, height: 4.7 },
  'cargo-crane': { build: cargoCrane, height: 6.1 },
  'harbor-lighthouse': { build: lighthouse, height: 7.2 },
  'ferris-wheel': { build: ferrisWheel, height: 11.7 },
};
