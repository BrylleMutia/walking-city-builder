import tokens from './tokens.json';

/**
 * Design tokens for code that can't use Tailwind class names (Skia drawings,
 * navigation options, animated styles). `tailwind.config.js` reads the same
 * JSON file, so a colour is only ever defined once.
 */
export const colors = tokens.colors;
export const radius = tokens.radius;
export const fonts = tokens.fonts;

/** Soft, green-tinted drop shadow used by every floating white surface. */
export const cardShadow = {
  shadowColor: '#1B7A5A',
  shadowOpacity: 0.12,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
} as const;

/**
 * A lighter version of `cardShadow` for surfaces that sit close together (the Home cards,
 * the Wood pill, the notification bell).
 * `boxShadow` blurs the same on Android and iOS, unlike `elevation`, which ignores opacity
 * and radius. The old props are zeroed so this can override `cardShadow` (e.g. on `Card`)
 * without drawing two shadows.
 */
export const softShadow = {
  shadowOpacity: 0,
  elevation: 0,
  boxShadow: '0px 3px 12px rgba(27, 122, 90, 0.08)',
} as const;
