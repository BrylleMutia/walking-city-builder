import { Pedometer } from 'expo-sensors';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { connectHealthConnect, type HealthSteps } from '../lib/healthSteps';
import { createDailyStepsTracker } from '../logic/dailySteps';
import { dayKey } from './gameLogic';
import { useGameStore } from './useGameStore';

/** Re-read Health Connect at most this often while the live sensor is firing. */
const HEALTH_READ_INTERVAL_MS = 30_000;

/** iOS only (expo-sensors): the phone's own count for a date range. */
async function readIosStepsSinceMidnight(): Promise<number | null> {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return (await Pedometer.getStepCountAsync(start, new Date())).steps;
  } catch {
    return null;
  }
}

/** Live sensor: available, and allowed by the player? */
async function pedometerAccess(): Promise<'ok' | 'unavailable' | 'denied'> {
  if (!(await Pedometer.isAvailableAsync())) return 'unavailable';
  return (await Pedometer.requestPermissionsAsync()).granted ? 'ok' : 'denied';
}

/**
 * Feeds real steps into the store when the device can provide them, and keeps
 * the "today" counter on the right calendar day.
 *
 * - New players are asked for the permission on the onboarding steps screen,
 *   not at launch: the sensor part waits for `onboarded` or an explicit request.
 * - iOS reports "steps since midnight", so there the counter is raised to the
 *   phone's own total (at start, on return to the foreground, and whenever the
 *   live watcher fires). That also picks up steps walked while the app was closed.
 * - Android development build: Health Connect gives the same daily total, but
 *   it lags (step sources write in batches), so live sensor steps are added on
 *   top until the next read (createDailyStepsTracker; never double counts).
 *   Without Health Connect, only live sensor steps (app open) are counted.
 * - Expo Go on Android has neither: the sensor reports unavailable and steps
 *   only come from the simulate buttons.
 */
export function useStepTracker() {
  const hydrated = useGameStore((s) => s.hydrated);
  const allowed = useGameStore((s) => s.onboarded || s.stepTrackingRequested);

  // Calendar day roll-over, independent of the sensor.
  useEffect(() => {
    if (!hydrated) return;
    useGameStore.getState().syncDay();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') useGameStore.getState().syncDay();
    });
    return () => sub.remove();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !allowed) return;
    const { addSteps, raiseStepsToday, setSensor } = useGameStore.getState();
    let cancelled = false;
    let subscription: { remove: () => void } | null = null;
    // Foreground re-sync of the daily total (iOS / Health Connect), once live.
    let resyncTotal: (() => void) | null = null;

    const startIos = async () => {
      const syncTotal = async () => {
        const total = await readIosStepsSinceMidnight();
        if (!cancelled && total !== null) raiseStepsToday(total);
      };
      await syncTotal();
      if (cancelled) return;
      // The watcher is only a "something changed" signal here: re-reading the
      // total can't double-count the way adding its deltas on top would.
      subscription = Pedometer.watchStepCount(() => void syncTotal());
      resyncTotal = () => void syncTotal();
    };

    const startHealthConnect = async (health: HealthSteps, withLiveSensor: boolean) => {
      const tracker = createDailyStepsTracker();
      let lastRead = 0;
      const readTotal = async () => {
        lastRead = Date.now();
        const total = await health.readStepsSinceMidnight();
        if (!cancelled && total !== null) raiseStepsToday(tracker.onTotal(total, dayKey()));
      };
      await readTotal();
      if (cancelled) return;
      if (withLiveSensor) {
        subscription = Pedometer.watchStepCount((result) => {
          raiseStepsToday(tracker.onLive(result.steps, dayKey()));
          if (Date.now() - lastRead > HEALTH_READ_INTERVAL_MS) void readTotal();
        });
      }
      resyncTotal = () => void readTotal();
    };

    const startLiveOnly = () => {
      // watchStepCount reports the total since subscribing; we add the difference.
      let last = 0;
      subscription = Pedometer.watchStepCount((result) => {
        const delta = result.steps - last;
        last = result.steps;
        if (delta > 0) addSteps(delta);
      });
    };

    (async () => {
      try {
        const pedometer = await pedometerAccess();
        if (cancelled) return;
        if (Platform.OS === 'ios') {
          if (pedometer !== 'ok') return setSensor(pedometer);
          await startIos();
        } else {
          // Null in Expo Go (no native module) and without Health Connect access.
          const health = await connectHealthConnect();
          if (cancelled) return;
          if (health) await startHealthConnect(health, pedometer === 'ok');
          else if (pedometer === 'ok') startLiveOnly();
          else return setSensor(pedometer);
        }
        if (!cancelled) setSensor('live');
      } catch {
        if (!cancelled) setSensor('unavailable');
      }
    })();

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') resyncTotal?.();
    });

    return () => {
      cancelled = true;
      subscription?.remove();
      appState.remove();
    };
  }, [hydrated, allowed]);
}
