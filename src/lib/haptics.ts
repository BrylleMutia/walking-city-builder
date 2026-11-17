import * as Haptics from 'expo-haptics';

import type { Rarity } from '../data/rarity';

let enabled = true;

/** Mirrors the user's setting; kept outside React so worklet callbacks can use it. */
export function setHapticsEnabled(value: boolean) {
  enabled = value;
}

const run = (fn: () => Promise<void>) => {
  if (!enabled) return;
  fn().catch(() => {});
};

export const haptic = {
  tick: () => run(() => Haptics.selectionAsync()),
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  /** Stronger feedback the rarer the card that just came into view. */
  reveal: (rarity: Rarity) => {
    if (rarity === 'legendary') haptic.success();
    else if (rarity === 'epic') haptic.heavy();
    else if (rarity === 'rare') haptic.medium();
    else haptic.light();
  },
};
