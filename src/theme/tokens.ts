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
