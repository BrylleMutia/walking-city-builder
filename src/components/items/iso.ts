/**
 * Tiny isometric drawing kit. Everything is described in "tile units" on a
 * 4×4 footprint and projected to 2D SVG path strings, so the same shape lists
 * can later be reused for the city grid.
 *
 * Axes: +x runs down-right, +y runs down-left, +z is up. The viewer therefore
 * sees the top face, the face on the +y side (screen-left) and the face on the
 * +x side (screen-right). Shapes are drawn in list order (painter's algorithm),
 * so list things back-to-front.
 */

export interface Shape {
  d: string;
  color: string;
}

type P3 = [number, number, number];

const COS30 = 0.8660254;

export const project = (x: number, y: number, z: number): [number, number] => [
  (x - y) * COS30,
  (x + y) * 0.5 - z,
];

const n = (v: number) => Math.round(v * 1000) / 1000;

const poly = (pts: P3[]): string =>
  pts
    .map(([x, y, z], i) => {
      const [sx, sy] = project(x, y, z);
      return `${i === 0 ? 'M' : 'L'}${n(sx)} ${n(sy)}`;
    })
    .join(' ') + ' Z';

/** Mixes a #rrggbb colour toward white (amt > 0) or black (amt < 0). */
export function shade(hex: string, amt: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const target = amt >= 0 ? 255 : 0;
  const t = Math.abs(amt);
  const ch = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(v + (target - v) * t)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${ch(1)}${ch(3)}${ch(5)}`;
}

/** Arbitrary flat polygon in 3D. */
export const flat = (pts: P3[], color: string): Shape[] => [{ d: poly(pts), color }];

/** Cuboid with three visible, differently lit faces. */
export function box(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  color: string,
): Shape[] {
  return [
    {
      d: poly([
        [x, y + d, z],
        [x + w, y + d, z],
        [x + w, y + d, z + h],
        [x, y + d, z + h],
      ]),
      color,
    },
    {
      d: poly([
        [x + w, y, z],
        [x + w, y + d, z],
        [x + w, y + d, z + h],
        [x + w, y, z + h],
      ]),
      color: shade(color, -0.22),
    },
    {
      d: poly([
        [x, y, z + h],
        [x + w, y, z + h],
        [x + w, y + d, z + h],
        [x, y + d, z + h],
      ]),
      color: shade(color, 0.22),
    },
  ];
}

/** Pyramid roof with its apex above the centre of the base. */
export function pyramid(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  color: string,
): Shape[] {
  const apex: P3 = [x + w / 2, y + d / 2, z + h];
  return [
    { d: poly([[x, y + d, z], [x + w, y + d, z], apex]), color: shade(color, 0.1) },
    { d: poly([[x + w, y, z], [x + w, y + d, z], apex]), color: shade(color, -0.2) },
  ];
}

/** Gable roof with the ridge running along x. `wall` colours the gable end. */
export function gable(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  color: string,
  wall: string,
): Shape[] {
  const r0: P3 = [x, y + d / 2, z + h];
  const r1: P3 = [x + w, y + d / 2, z + h];
  return [
    { d: poly([[x, y, z], [x + w, y, z], r1, r0]), color: shade(color, -0.3) },
    { d: poly([[x + w, y, z], [x + w, y + d, z], r1]), color: shade(wall, -0.22) },
    { d: poly([[x, y + d, z], [x + w, y + d, z], r1, r0]), color: shade(color, 0.08) },
  ];
}

/** Quad on a wall facing screen-left (constant y). */
export const wallL = (
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  color: string,
): Shape[] =>
  flat(
    [
      [x, y, z],
      [x + w, y, z],
      [x + w, y, z + h],
      [x, y, z + h],
    ],
    color,
  );

/** Quad on a wall facing screen-right (constant x). */
export const wallR = (
  x: number,
  y: number,
  z: number,
  d: number,
  h: number,
  color: string,
): Shape[] =>
  flat(
    [
      [x, y, z],
      [x, y + d, z],
      [x, y + d, z + h],
      [x, y, z + h],
    ],
    shade(color, -0.15),
  );

/** Horizontal quad (ground decal, awning stripe, carpet…). */
export const floor = (
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  color: string,
): Shape[] =>
  flat(
    [
      [x, y, z],
      [x + w, y, z],
      [x + w, y + d, z],
      [x, y + d, z],
    ],
    color,
  );

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${n(cx - rx)} ${n(cy)} A${n(rx)} ${n(ry)} 0 1 0 ${n(cx + rx)} ${n(cy)} ` +
  `A${n(rx)} ${n(ry)} 0 1 0 ${n(cx - rx)} ${n(cy)} Z`;

// A circle lying flat on the ground projects to an ellipse with these radii.
const DISC_RX = Math.SQRT2 * COS30;
const DISC_RY = Math.SQRT1_2;

/** Flat circle lying on a horizontal plane. */
export function disc(x: number, y: number, z: number, r: number, color: string): Shape[] {
  const [cx, cy] = project(x, y, z);
  return [{ d: ellipse(cx, cy, r * DISC_RX, r * DISC_RY), color }];
}

/** Upright cylinder. */
export function cylinder(
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  color: string,
): Shape[] {
  const [cx, bottom] = project(x, y, z);
  const top = bottom - h;
  const rx = r * DISC_RX;
  const ry = r * DISC_RY;
  const side = (x0: number, x1: number) =>
    `M${n(x0)} ${n(top)} L${n(x0)} ${n(bottom)} ` +
    `A${n(rx)} ${n(ry)} 0 0 0 ${n(cx + rx)} ${n(bottom)} L${n(cx + rx)} ${n(top)} Z`;
  return [
    { d: side(cx - rx, cx + rx), color: shade(color, -0.2) },
    // Lit half, to hint at roundness.
    {
      d:
        `M${n(cx - rx)} ${n(top)} L${n(cx - rx)} ${n(bottom)} ` +
        `A${n(rx)} ${n(ry)} 0 0 0 ${n(cx)} ${n(bottom + ry)} L${n(cx)} ${n(top + ry)} Z`,
      color,
    },
    { d: ellipse(cx, top, rx, ry), color: shade(color, 0.25) },
  ];
}

/** Screen-space sphere (foliage, lamps, flowers) with a soft highlight. */
export function ball(x: number, y: number, z: number, r: number, color: string): Shape[] {
  const [cx, cy] = project(x, y, z);
  return [
    { d: ellipse(cx, cy, r, r), color },
    { d: ellipse(cx - r * 0.25, cy - r * 0.28, r * 0.5, r * 0.45), color: shade(color, 0.22) },
  ];
}

/** Screen-space ellipse with no highlight (glows, clock faces). */
export function spot(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  color: string,
): Shape[] {
  const [cx, cy] = project(x, y, z);
  return [{ d: ellipse(cx, cy, rx, ry), color }];
}

/** The 4×4 base slab every item sits on. */
export const ground = (color: string): Shape[] => box(0, 0, -0.35, 4, 4, 0.35, color);
