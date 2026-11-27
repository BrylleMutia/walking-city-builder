import { DEAL_CARD_MS, DEAL_POP, DEAL_STAGGER_MS, dealDurationMs, dealPop, dealProgress } from './summaryDeal';

describe('dealProgress', () => {
  const count = 5;

  it('starts every card at 0 and ends every card at 1', () => {
    for (let i = 0; i < count; i++) {
      expect(dealProgress(0, i, count)).toBe(0);
      expect(dealProgress(1, i, count)).toBe(1);
    }
  });

  it('deals in order: each card lags the one before it', () => {
    for (const s of [0.1, 0.3, 0.5, 0.7]) {
      for (let i = 1; i < count; i++) {
        expect(dealProgress(s, i, count)).toBeLessThanOrEqual(dealProgress(s, i - 1, count));
      }
    }
    // The last card hasn't started while the first is already well on its way.
    const early = DEAL_STAGGER_MS / dealDurationMs(count);
    expect(dealProgress(early * 2, 0, count)).toBeGreaterThan(0);
    expect(dealProgress(early * 2, count - 1, count)).toBe(0);
  });

  it('stays within 0..1 and never goes backwards', () => {
    for (let i = 0; i < count; i++) {
      let prev = 0;
      for (let s = -0.2; s <= 1.2; s += 0.01) {
        const t = dealProgress(s, i, count);
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(1);
        expect(t).toBeGreaterThanOrEqual(prev);
        prev = t;
      }
    }
  });
});

describe('dealPop', () => {
  it('swells to the pop size mid-landing and settles at exactly 1', () => {
    expect(dealPop(0)).toBe(1);
    expect(dealPop(0.5)).toBeCloseTo(1 + DEAL_POP);
    expect(dealPop(1)).toBeCloseTo(1, 10);
    for (let t = 0; t <= 1; t += 0.05) expect(dealPop(t)).toBeLessThanOrEqual(1 + DEAL_POP + 1e-9);
  });
});

it('dealDurationMs covers the stagger plus one landing', () => {
  expect(dealDurationMs(5)).toBe(4 * DEAL_STAGGER_MS + DEAL_CARD_MS);
  expect(dealDurationMs(1)).toBe(DEAL_CARD_MS);
});
