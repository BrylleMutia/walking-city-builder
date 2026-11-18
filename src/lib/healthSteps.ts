import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/** Reads today's step total from Health Connect. */
export type HealthSteps = {
  /** Steps since local midnight, or null if Health Connect didn't answer. */
  readStepsSinceMidnight: () => Promise<number | null>;
};

/**
 * Android development build only: connects to Health Connect and asks for
 * read access to steps. Returns null in Expo Go, on iOS, when Health Connect
 * is missing or out of date, or when the player says no; the step tracker
 * then falls back to the live sensor (or the simulate buttons in Expo Go).
 *
 * The library is required lazily, inside this function, on purpose: it looks
 * up its native module as soon as it's evaluated, which throws in Expo Go (no
 * such module there), so a top-level import would crash Expo Go. A `require`
 * here is bundled with the app but only runs when called. (Not `import()`:
 * in development Metro serves that as a separate download, which hung.)
 */
export async function connectHealthConnect(): Promise<HealthSteps | null> {
  if (Platform.OS !== 'android' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const hc = require('react-native-health-connect') as typeof import('react-native-health-connect');
    if ((await hc.getSdkStatus()) !== hc.SdkAvailabilityStatus.SDK_AVAILABLE) return null;
    if (!(await hc.initialize())) return null;

    // Granted lists also hold special permissions (exercise routes, history…).
    const canReadSteps = (list: readonly { recordType?: string; accessType?: string }[]) =>
      list.some((p) => p.recordType === 'Steps' && p.accessType === 'read');
    // Ask only when needed: requesting opens Health Connect's permission sheet.
    if (!canReadSteps(await hc.getGrantedPermissions())) {
      const granted = await hc.requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
      if (!canReadSteps(granted)) return null;
    }

    return {
      readStepsSinceMidnight: async () => {
        try {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const result = await hc.aggregateRecord({
            recordType: 'Steps',
            timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: new Date().toISOString() },
          });
          return result.COUNT_TOTAL;
        } catch {
          return null;
        }
      },
    };
  } catch {
    return null;
  }
}
