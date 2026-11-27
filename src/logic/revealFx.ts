import { rarityTier, type Rarity } from '../data/rarity';

/**
 * How a card's reveal feels, per rarity. Each step up the ladder adds a layer
 * (haptic weight, sound, glow, sparkles, rays, flash), and commons stay quiet:
 * the contrast is what makes the big pulls land. Everything visual below is a
 * pure function of a clock + seeds, so it runs in worklets without stored state.
 */

export type HapticKind = 'tick' | 'light' | 'medium' | 'heavy' | 'success';
export interface HapticStep {
  kind: HapticKind;
  /** ms after the reveal. */
  at: number;
}

export interface RevealFx {
  haptic: HapticStep[];
  /** How long the one-off reveal burst runs. */
  burstMs: number;
  /** Peak opacity of the coloured glow behind the card (0 = none). */
  glow: number;
  /** Light rays behind the card (0 = none). */
  rays: number;
  /** Sparkles flying out in a ring around the card. */
  ring: number;
  /** Sparkles falling from the top of the screen. */
  shower: number;
  /** Peak opacity of a full-screen flash in the rarity colour. */
  flash: number;
  /** Glow and rays that stay (softly) while the card is on top. */
  persistGlow: number;
  persistRays: boolean;
  /** One light band sweeping across the card face. */
  sweep: boolean;
  /** The HUD label pops instead of fading in. */
  pop: boolean;
  /** Chime volume, 0..1. */
  volume: number;
}

export const REVEAL_FX: Record<Rarity, RevealFx> = {
  common: {
    haptic: [{ kind: 'light', at: 0 }],
    burstMs: 400,
    glow: 0,
    rays: 0,
    ring: 0,
    shower: 0,
    flash: 0,
    persistGlow: 0,
    persistRays: false,
    sweep: false,
    pop: false,
    volume: 0.35,
  },
  uncommon: {
    haptic: [{ kind: 'light', at: 0 }],
    burstMs: 650,
    glow: 0,
    rays: 0,
    ring: 8,
    shower: 0,
    flash: 0,
    persistGlow: 0,
    persistRays: false,
    sweep: false,
    pop: false,
    volume: 0.5,
  },
  rare: {
    haptic: [{ kind: 'medium', at: 0 }],
    burstMs: 800,
    glow: 0.55,
    rays: 0,
    ring: 14,
    shower: 0,
    flash: 0,
    persistGlow: 0,
    persistRays: false,
    sweep: true,
    pop: true,
    volume: 0.65,
  },
  epic: {
    haptic: [
      { kind: 'heavy', at: 0 },
      { kind: 'medium', at: 110 },
    ],
    burstMs: 1000,
    glow: 0.7,
    rays: 8,
    ring: 20,
    shower: 0,
    flash: 0,
    persistGlow: 0.22,
    persistRays: false,
    sweep: true,
    pop: true,
    volume: 0.8,
  },
  legendary: {
    haptic: [
      { kind: 'heavy', at: 0 },
      { kind: 'heavy', at: 90 },
      { kind: 'success', at: 250 },
    ],
    burstMs: 1200,
    glow: 0.85,
    rays: 12,
    ring: 24,
    shower: 34,
    flash: 0.28,
    persistGlow: 0.3,
    persistRays: true,
    sweep: true,
    pop: true,
    volume: 1,
  },
};

/** Tier of the most effects any rarity uses: the Skia layers allocate this many. */
export const MAX_RAYS = 12;
export const MAX_RING = 24;
export const MAX_SHOWER = 34;

/**
 * The card under the top one is worth teasing (epic or legendary, rarer than
 * the top card): light in its colour leaks from under the stack until the flick.
 */
export function teaseFor(top: Rarity, next: Rarity | undefined): Rarity | null {
  if (!next) return null;
  return rarityTier(next) >= rarityTier('epic') && rarityTier(next) > rarityTier(top) ? next : null;
}

// ── maths (worklets) ────────────────────────────────────────────────────────

/** Deterministic 0..1 noise for particle i of a layer. */
export function hash01(i: number, seed: number): number {
  'worklet';
  const v = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const clamp01 = (v: number) => {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
};

/** A quick rise, then a long ease-out fade, back to exactly 0 at t = 1. */
export function burstEnvelope(t: number, attack = 0.15): number {
  'worklet';
  const x = clamp01(t);
  if (x < attack) return x / attack;
  const d = (x - attack) / (1 - attack);
  return (1 - d) * (1 - d);
}

/**
 * Sparkle i of n flying out of the card's edge in a ring. Offsets are in units
 * of the card's half-width (the component scales them), so the ring hugs any
 * card size. Size and alpha shrink as it travels.
 */
export function ringSparkle(i: number, n: number, t: number, seed = 1) {
  'worklet';
  const x = clamp01(t);
  const angle = (i / Math.max(1, n)) * Math.PI * 2 + (hash01(i, seed) - 0.5) * 0.5;
  const reach = 0.95 + hash01(i, seed + 7) * 0.7;
  const travel = 1 - (1 - x) * (1 - x) * (1 - x); // ease-out cubic
  const r = 0.9 + travel * reach;
  return {
    dx: Math.cos(angle) * r,
    dy: Math.sin(angle) * r * 1.35, // the card is taller than wide
    size: (0.6 + hash01(i, seed + 3) * 0.6) * (1 - x * 0.7),
    alpha: x < 0.08 ? x / 0.08 : 1 - x * x,
  };
}

/** Sparkle i of a shower falling from above the screen (absolute screen coordinates). */
export function showerSparkle(i: number, t: number, width: number, height: number, seed = 5) {
  'worklet';
  const x = clamp01(t);
  const delay = hash01(i, seed) * 0.35;
  const local = clamp01((x - delay) / (1 - delay));
  const fall = height * (0.45 + hash01(i, seed + 1) * 0.35);
  const sway = Math.sin(local * Math.PI * 2 * (0.6 + hash01(i, seed + 2))) * 14;
  return {
    x: hash01(i, seed + 3) * width + sway,
    y: -20 + local * local * fall + local * fall * 0.25,
    size: 2.4 + hash01(i, seed + 4) * 3,
    rot: local * (hash01(i, seed + 5) - 0.5) * 12,
    alpha: local <= 0 ? 0 : local < 0.1 ? local / 0.1 : 1 - Math.pow(local, 3),
  };
}

/** Angle (radians) of ray i of n; the fan turns slowly (about 14°/s). */
export function rayAngle(i: number, n: number, seconds: number, still = false): number {
  'worklet';
  return (i / Math.max(1, n)) * Math.PI * 2 + (still ? 0 : seconds * 0.25);
}

/**
 * The stack's faint wobble before a legendary: a few out-of-step sines, so it
 * reads as something stirring underneath rather than a mechanical shake.
 * Stays within ±1 degree.
 */
export function trembleAt(seconds: number): number {
  'worklet';
  const v =
    Math.sin(seconds * 9.1) * 0.5 + Math.sin(seconds * 13.7 + 1.3) * 0.3 + Math.sin(seconds * 5.3 + 2.1) * 0.2;
  return v;
}
