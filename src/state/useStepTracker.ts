import { Pedometer } from 'expo-sensors';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useGameStore } from './useGameStore';

/**
 * Feeds real steps into the store when the device can provide them, and keeps
 * the "today" counter on the right calendar day.
 *
 * Expo Go on Android has no activity-recognition permission, so there the
 * sensor reports unavailable and steps only come from the simulate button.
 * The same code starts counting for real on iOS or in a development build.
 */
export function useStepTracker() {
  const hydrated = useGameStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    const { addSteps, syncDay, setSensor } = useGameStore.getState();
    let cancelled = false;
    let subscription: { remove: () => void } | null = null;
    // watchStepCount reports the total since subscribing; we add the difference.
    let last = 0;

    syncDay();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncDay();
    });

    (async () => {
      try {
        if (!(await Pedometer.isAvailableAsync())) throw new Error('unavailable');
        const permission = await Pedometer.requestPermissionsAsync();
        if (!permission.granted) throw new Error('denied');
        if (cancelled) return;
        subscription = Pedometer.watchStepCount((result) => {
          const delta = result.steps - last;
          last = result.steps;
          if (delta > 0) addSteps(delta);
        });
        setSensor('live');
      } catch {
        if (!cancelled) setSensor('unavailable');
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
      appState.remove();
    };
  }, [hydrated]);
}
