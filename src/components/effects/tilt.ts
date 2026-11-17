import type { SharedValue } from 'react-native-reanimated';

/** Normalised tilt, each axis in [-1, 1]. x: finger right of centre, y: finger below centre. */
export interface Tilt {
  x: SharedValue<number>;
  y: SharedValue<number>;
}

export const MAX_TILT_DEG = 16;

export const TILT_SPRING = { stiffness: 320, damping: 26, mass: 0.6 } as const;
export const TILT_RELEASE_SPRING = { stiffness: 140, damping: 9, mass: 0.7 } as const;

export function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Where the specular streak sits for a given tilt. The highlight moves the
 * opposite way to the finger: pushing the right edge away brings the light
 * toward the left, like a real glossy surface under a fixed lamp.
 */
export function glareLine(tx: number, ty: number, w: number, h: number) {
  'worklet';
  const cx = w * (0.5 - tx * 0.75);
  const cy = h * (0.5 - ty * 0.75);
  // Streak runs perpendicular to this diagonal.
  const dx = 0.82;
  const dy = 0.57;
  const half = Math.max(w, h) * 0.42;
  return {
    x0: cx - dx * half,
    y0: cy - dy * half,
    x1: cx + dx * half,
    y1: cy + dy * half,
  };
}

/** Glare gets brighter the further the surface is tilted. */
export function glareOpacity(tx: number, ty: number, rest: number) {
  'worklet';
  return Math.min(1, rest + Math.sqrt(tx * tx + ty * ty) * 0.95);
}
