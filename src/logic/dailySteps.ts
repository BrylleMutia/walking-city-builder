/**
 * Combines a "steps since midnight" total that arrives late (Health Connect:
 * step sources write in batches) with the live step sensor (instant, but only
 * while the app is open), so the counter moves during a walk and still ends
 * at the phone's own total.
 *
 * Never counts a step twice: a new total *replaces* the estimate when it's
 * higher (the steps it covers are the ones the live sensor already showed),
 * and live steps are only added on top of the latest total/estimate.
 */
export function createDailyStepsTracker() {
  let day = '';
  let base = 0; // best known total for `day`
  let live = 0; // live sensor steps since it was subscribed
  let liveAtBase = 0; // live sensor reading when `base` was set

  const startDay = (today: string) => {
    if (today === day) return;
    // First reading: everything since subscribing is today's. A day change:
    // only steps from now on are.
    liveAtBase = day === '' ? 0 : live;
    day = today;
    base = 0;
  };
  const estimate = () => base + Math.max(0, live - liveAtBase);

  return {
    /** A total since midnight from the phone. Returns today's best count. */
    onTotal(total: number, today: string): number {
      startDay(today);
      base = Math.max(total, estimate());
      liveAtBase = live;
      return base;
    },
    /** The live sensor's running count since subscribing. Returns today's best count. */
    onLive(stepsSinceSubscribe: number, today: string): number {
      live = stepsSinceSubscribe;
      startDay(today); // a new day counts live steps from this reading on
      return estimate();
    },
  };
}
