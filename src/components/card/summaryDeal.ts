/**
 * The end-of-pack summary "deals" the cards into their grid slots one after
 * another, in place: each card fades in, rises a little and settles, with no
 * travel across the screen and no overshoot. Everything here is a pure function
 * of one 0..1 timeline (`summary`), so it runs in worklets and is testable.
 */

/** Gap between two cards starting to land. */
export const DEAL_STAGGER_MS = 70;
/** How long one card takes to land. */
export const DEAL_CARD_MS = 320;
/** How far below its slot a card starts, in dp. */
export const DEAL_RISE = 14;
/** Size a card starts at, relative to its settled size. */
export const DEAL_START_SCALE = 0.92;
/** Lean (degrees) a card starts with, alternating left/right. */
export const DEAL_LEAN = 2;
/** The best card's extra swell as it lands (4%). */
export const DEAL_POP = 0.04;
/** A card counts as landed (haptic) from this progress on. */
export const DEAL_LANDED = 0.6;

/** The whole deal, first card starting to last card settled. */
export function dealDurationMs(count: number): number {
  return Math.max(0, count - 1) * DEAL_STAGGER_MS + DEAL_CARD_MS;
}

/**
 * One card's eased progress (0..1, ease-out cubic) on the shared linear
 * timeline `s` (0..1 over `dealDurationMs(count)`). Card i starts i staggers in.
 */
export function dealProgress(s: number, index: number, count: number): number {
  'worklet';
  const total = Math.max(0, count - 1) * DEAL_STAGGER_MS + DEAL_CARD_MS;
  const raw = (s * total - index * DEAL_STAGGER_MS) / DEAL_CARD_MS;
  const x = raw <= 0 ? 0 : raw >= 1 ? 1 : raw;
  return 1 - (1 - x) * (1 - x) * (1 - x);
}

/** Scale multiplier for the best card: swells to 1 + DEAL_POP mid-landing, back to exactly 1. */
export function dealPop(t: number): number {
  'worklet';
  const x = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return 1 + DEAL_POP * Math.sin(Math.PI * x);
}
