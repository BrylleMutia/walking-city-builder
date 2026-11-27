import * as Haptics from 'expo-haptics';

import type { Rarity } from '../data/rarity';
import { REVEAL_FX, type HapticStep } from '../logic/revealFx';

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
  /** A short rhythm of taps (ms offsets), e.g. heavy · heavy · success for a legendary. */
  pattern: (steps: readonly HapticStep[]) => {
    if (!enabled) return;
    for (const step of steps) {
      if (step.at <= 0) haptic[step.kind]();
      else setTimeout(() => haptic[step.kind](), step.at);
    }
  },
  /** The rarity's reveal rhythm (`REVEAL_FX`): one light tap for a common up to three beats for a legendary. */
  reveal: (rarity: Rarity) => haptic.pattern(REVEAL_FX[rarity].haptic),
};
