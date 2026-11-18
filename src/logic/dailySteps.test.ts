import { createDailyStepsTracker } from './dailySteps';

const DAY = '2026-11-18';

describe('createDailyStepsTracker', () => {
  it('adds live steps on top of the last total', () => {
    const t = createDailyStepsTracker();
    expect(t.onTotal(4000, DAY)).toBe(4000);
    expect(t.onLive(120, DAY)).toBe(4120);
    expect(t.onLive(300, DAY)).toBe(4300);
  });

  it('does not double count when a late total covers the live steps', () => {
    const t = createDailyStepsTracker();
    t.onTotal(4000, DAY);
    t.onLive(300, DAY); // 4300 shown
    // Health Connect caught up with 250 of those 300 steps: keep 4300, not 4550.
    expect(t.onTotal(4250, DAY)).toBe(4300);
    expect(t.onLive(310, DAY)).toBe(4310);
    // Other steps (walked with the app closed) make the total bigger: it wins.
    expect(t.onTotal(6000, DAY)).toBe(6000);
    expect(t.onLive(320, DAY)).toBe(6010);
  });

  it('starts over on a new day', () => {
    const t = createDailyStepsTracker();
    t.onTotal(9000, DAY);
    t.onLive(500, DAY);
    expect(t.onLive(520, '2026-11-19')).toBe(0);
    expect(t.onLive(540, '2026-11-19')).toBe(20);
    expect(t.onTotal(35, '2026-11-19')).toBe(35);
  });

  it('works with live steps only (no total yet)', () => {
    const t = createDailyStepsTracker();
    expect(t.onLive(15, DAY)).toBe(15);
  });
});
