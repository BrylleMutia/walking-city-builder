export interface PackGeometry {
  width: number;
  height: number;
  /** y of the tear line; everything above it is the flap that gets torn off. */
  tearY: number;
  /** Height of the crimped seals at the top and bottom. */
  crimpH: number;
  /** Extra canvas room around the pack so the lifted flap isn't clipped. */
  pad: { left: number; top: number; right: number; bottom: number };
  /** Clip for the flap (above the jagged tear line). */
  flapPath: string;
  /** Clip for the body (below the jagged tear line). */
  bodyPath: string;
  /** The jagged line itself, for the torn-edge highlight. */
  tearLine: string;
  ridges: string;
  chevrons: string;
  dashes: string;
  skylineFar: string;
  skylineNear: string;
  windows: string;
}

export const PACK_ASPECT = 1.55;
const TOOTH = 6;
const TOOTH_AMP = 2.4;

const r = (v: number) => Math.round(v * 100) / 100;

type Roof = 'flat' | 'gable' | 'spire';
type Building = [x: number, w: number, h: number, roof: Roof];

// Fractions of the pack width. A little main street, clock tower included.
const NEAR: Building[] = [
  [0, 0.17, 0.2, 'flat'],
  [0.17, 0.15, 0.27, 'gable'],
  [0.32, 0.19, 0.16, 'flat'],
  [0.51, 0.12, 0.36, 'spire'],
  [0.63, 0.17, 0.21, 'gable'],
  [0.8, 0.2, 0.25, 'flat'],
];
const FAR: Building[] = [
  [-0.05, 0.2, 0.38, 'flat'],
  [0.13, 0.15, 0.46, 'gable'],
  [0.28, 0.2, 0.33, 'flat'],
  [0.46, 0.14, 0.5, 'gable'],
  [0.6, 0.2, 0.4, 'flat'],
  [0.78, 0.27, 0.47, 'gable'],
];

function skyline(buildings: Building[], W: number, base: number): string {
  let d = '';
  for (const [fx, fw, fh, roof] of buildings) {
    const x = fx * W;
    const w = fw * W;
    const top = base - fh * W;
    d += `M${r(x)} ${r(base)} L${r(x)} ${r(top)} `;
    if (roof === 'gable') d += `L${r(x + w / 2)} ${r(top - w * 0.38)} `;
    if (roof === 'spire') {
      d += `L${r(x + w * 0.1)} ${r(top)} L${r(x + w / 2)} ${r(top - w * 1.1)} L${r(x + w * 0.9)} ${r(top)} `;
    }
    d += `L${r(x + w)} ${r(top)} L${r(x + w)} ${r(base)} Z `;
  }
  return d;
}

function windows(buildings: Building[], W: number, base: number): string {
  let d = '';
  const ww = W * 0.018;
  const wh = W * 0.026;
  buildings.forEach(([fx, fw, fh], b) => {
    const cols = Math.max(1, Math.floor((fw * W) / (W * 0.05)));
    const rows = Math.max(1, Math.floor((fh * W) / (W * 0.062)));
    const gapX = (fw * W) / (cols + 1);
    const gapY = (fh * W) / (rows + 0.6);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        // Deterministic "some lights are off" pattern.
        if ((i * 7 + j * 3 + b * 5) % 4 === 0) continue;
        const x = fx * W + gapX * (i + 1) - ww / 2;
        const y = base - fh * W + gapY * (j + 0.45);
        if (y + wh > base - 3) continue;
        d += `M${r(x)} ${r(y)} h${r(ww)} v${r(wh)} h${r(-ww)} Z `;
      }
    }
  });
  return d;
}

export function makePackGeometry(width: number): PackGeometry {
  const W = width;
  const H = Math.round(W * PACK_ASPECT);
  const tearY = Math.round(H * 0.12);
  const crimpH = Math.round(H * 0.06);

  // Shared zig-zag so the flap and body edges interlock exactly.
  const teeth = Math.ceil(W / TOOTH);
  const zig: [number, number][] = [];
  for (let i = 0; i <= teeth; i++) {
    zig.push([Math.min(W, i * TOOTH), tearY + (i % 2 === 0 ? -TOOTH_AMP : TOOTH_AMP)]);
  }
  const zigFwd = zig.map(([x, y]) => `L${r(x)} ${r(y)}`).join(' ');
  const zigBack = [...zig].reverse().map(([x, y]) => `L${r(x)} ${r(y)}`).join(' ');

  const flapPath = `M0 -1 L${W} -1 ${zigBack} Z`;
  const bodyPath = `M0 ${H + 1} ${zigFwd} L${W} ${H + 1} Z`;
  const tearLine = `M${zig[0][0]} ${r(zig[0][1])} ${zigFwd}`;

  // Vertical crimp ridges for both seals.
  let ridges = '';
  for (let x = 2; x < W; x += 4) {
    ridges += `M${x} 1.5 V${crimpH - 1} M${x} ${H - crimpH + 1} V${H - 1.5} `;
  }

  // "Tear this way" chevrons on the flap.
  let chevrons = '';
  const cy = (crimpH + tearY) / 2;
  const ch = (tearY - crimpH) * 0.22;
  for (let i = 0; i < 3; i++) {
    const x = W * 0.07 + i * 9;
    chevrons += `M${r(x)} ${r(cy - ch)} L${r(x + ch)} ${r(cy)} L${r(x)} ${r(cy + ch)} `;
  }

  let dashes = '';
  for (let x = W * 0.07 + 36; x < W - 8; x += 9) {
    dashes += `M${r(x)} ${r(cy)} h4.5 `;
  }

  const base = H - crimpH;
  return {
    width: W,
    height: H,
    tearY,
    crimpH,
    pad: {
      left: 14,
      top: Math.ceil(W + 18),
      right: Math.ceil(tearY + W * 0.2 + 18),
      bottom: 14,
    },
    flapPath,
    bodyPath,
    tearLine,
    ridges,
    chevrons,
    dashes,
    skylineFar: skyline(FAR, W, base),
    skylineNear: skyline(NEAR, W, base),
    windows: windows(NEAR, W, base),
  };
}

/** Flap lift angle (radians) for a given tear progress. */
export function flapAngle(p: number): number {
  'worklet';
  // Piecewise: a quick initial pop, steady peel, then swing clear when fully open.
  if (p <= 0) return 0;
  if (p < 0.04) return (p / 0.04) * 0.2;
  if (p < 0.85) return 0.2 + ((p - 0.04) / 0.81) * 0.75;
  return 0.95 + ((Math.min(1, p) - 0.85) / 0.15) * 0.55;
}

/**
 * Highest point of the flap, in pack coordinates (0 = the pack's top edge,
 * negative = above it), for a given tear progress. Mirrors PackArt: the torn
 * part of the flap (x 0..cut, y 0..tearY) rotates clockwise by flapAngle()
 * around the cut point (cut, tearY). The attached part never rises above 0.
 */
export function flapTopY(p: number, width: number, tearY: number): number {
  'worklet';
  const cut = Math.min(1, Math.max(0, p)) * width;
  if (cut <= 0) return 0;
  const a = flapAngle(p);
  const s = Math.sin(a);
  const c = Math.cos(a);
  // Rotated y of the torn part's corners, relative to the pivot.
  const topLeft = -cut * s - tearY * c;
  const bottomLeft = -cut * s;
  const topRight = -tearY * c;
  return Math.min(0, tearY + Math.min(topLeft, bottomLeft, topRight));
}
