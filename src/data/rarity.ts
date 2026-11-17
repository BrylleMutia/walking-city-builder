export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/** Lowest → highest. Index in this array is the rarity "tier". */
export const RARITY_ORDER: readonly Rarity[] = [
  'common',
  'uncommon',
  'rare',
  'epic',
  'legendary',
];

/** Per-card roll chances. Must sum to 1. */
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 0.55,
  uncommon: 0.27,
  rare: 0.12,
  epic: 0.04,
  legendary: 0.02,
};

/** Independent chance, on top of rarity, that a card is a foil. */
export const FOIL_CHANCE = 0.1;

export const CARDS_PER_PACK = 5;

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

/** Main colour (borders, glitter) and a darker companion for gradients. */
export const RARITY_COLOR: Record<Rarity, { main: string; dark: string; light: string }> = {
  common: { main: '#C9D3E0', dark: '#7C8798', light: '#F2F5FA' },
  uncommon: { main: '#4FD67B', dark: '#1E8C46', light: '#B8F5CB' },
  rare: { main: '#4AA8FF', dark: '#1C5FC2', light: '#BFE0FF' },
  epic: { main: '#B76BFF', dark: '#6B2BC4', light: '#E3C6FF' },
  legendary: { main: '#FFC73A', dark: '#D9820B', light: '#FFF0B3' },
};

/**
 * How far the pack must be torn (0..1) before glitter of each rarity starts
 * to escape. Rarer colours only show up late in the swipe, which is the tease.
 */
export const GLITTER_THRESHOLD: Record<Rarity, number> = {
  common: 0.03,
  uncommon: 0.2,
  rare: 0.4,
  epic: 0.6,
  legendary: 0.8,
};

export const rarityTier = (r: Rarity): number => RARITY_ORDER.indexOf(r);
