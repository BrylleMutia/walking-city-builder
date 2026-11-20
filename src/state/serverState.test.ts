import { initialData } from './gameLogic';
import { applyServerState, toPackCards, type ServerState } from './serverState';

const server: ServerState = {
  profile: {
    display_name: 'Walker',
    step_goal: 9000,
    balance: 1234,
    lifetime_steps: 5678,
    packs_opened: 2,
    is_tester: false,
  },
  steps: { '2026-11-17': 800, '2026-11-16': 4000, '2026-11-10': 0 },
  inventory: {
    'cobblestone-street': { count: 4, foil: 1 },
    bakery: { count: 1, foil: 0 },
    'not-in-this-app-version': { count: 3, foil: 0 },
  },
  city: [
    { x: 1, y: 2, item_id: 'cobblestone-street' },
    { x: 5, y: 5, item_id: 'not-in-this-app-version' },
  ],
};

describe('applyServerState', () => {
  it('takes balances, steps, inventory and city from the server', () => {
    const local = { ...initialData('2026-11-17'), stepsToday: 99, balance: 1 };
    const s = applyServerState(local, server, '2026-11-17');
    expect(s.balance).toBe(1234);
    expect(s.goal).toBe(9000);
    expect(s.lifetimeSteps).toBe(5678);
    expect(s.packsOpened).toBe(2);
    expect(s.stepsToday).toBe(800);
    expect(s.history).toEqual({ '2026-11-16': 4000 });
    expect(s.collection['cobblestone-street']).toEqual({ count: 4, foil: 1 });
    expect(s.city).toEqual([{ itemId: 'cobblestone-street', x: 1, y: 2 }]);
  });

  it('skips items this app version does not know', () => {
    const s = applyServerState(initialData('2026-11-17'), server, '2026-11-17');
    expect(Object.keys(s.collection)).not.toContain('not-in-this-app-version');
    expect(s.city).toHaveLength(1);
  });

  it('keeps today’s not-yet-synced steps only when asked', () => {
    const local = { ...initialData('2026-11-17'), stepsToday: 1000 };
    const kept = applyServerState(local, server, '2026-11-17', true);
    expect(kept.stepsToday).toBe(1000);
    // Their Wood isn't rolled yet: the balance is the server's.
    expect(kept.balance).toBe(1234);
    expect(kept.lifetimeSteps).toBe(5678 + 200);
    // Server ahead (another device walked more today): the server wins.
    const behind = applyServerState({ ...local, stepsToday: 500 }, server, '2026-11-17', true);
    expect(behind.stepsToday).toBe(800);
    expect(behind.balance).toBe(1234);
    // Steps from a previous day are never carried into today.
    const old = applyServerState({ ...local, dateKey: '2026-11-16' }, server, '2026-11-17', true);
    expect(old.stepsToday).toBe(800);
    expect(applyServerState(local, server, '2026-11-17').stepsToday).toBe(800);
  });

  it('keeps local values when the profile is missing', () => {
    const s = applyServerState(initialData('2026-11-17'), { ...server, profile: null }, '2026-11-17');
    expect(s.balance).toBe(initialData().balance);
  });
});

describe('toPackCards', () => {
  it('orders cards by position and attaches local item data', () => {
    const cards = toPackCards([
      { position: 1, item_id: 'grand-theater', rarity: 'legendary', foil: true },
      { position: 0, item_id: 'lamp-post', rarity: 'common', foil: false },
    ]);
    expect(cards.map((c) => c.item.id)).toEqual(['lamp-post', 'grand-theater']);
    expect(cards[1]).toMatchObject({ rarity: 'legendary', foil: true, uid: '1-grand-theater' });
  });
});
