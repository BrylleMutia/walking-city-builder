import { CACHE_VERSION, CITY_SHIFT, migrateCache, sanitizeCache, toCache } from './cache';
import { initialData } from './gameLogic';

const TODAY = '2026-11-17';

describe('sanitizeCache', () => {
  it('turns garbage into a fresh-player cache', () => {
    for (const raw of [undefined, null, 42, 'x', []]) {
      expect(sanitizeCache(raw, TODAY)).toEqual({
        ...initialData(TODAY),
        hapticsOn: true,
        forceLegendary: false,
        forceFoil: false,
        pendingCity: [],
        onboarded: false,
        profilePending: false,
        avatarId: 'sprout',
      });
    }
  });

  it('keeps a valid cache unchanged', () => {
    const good = {
      ...initialData('2026-11-16'),
      stepsToday: 1200,
      history: { '2026-11-15': 800 },
      lifetimeSteps: 2000,
      balance: 1500,
      collection: { bakery: { count: 1, foil: 1 }, 'cobblestone-street': { count: 4, foil: 0 } },
      city: [{ itemId: 'bakery' as const, x: 2, y: 3 }],
      packsOpened: 2,
      hapticsOn: false,
      forceLegendary: true,
      forceFoil: false,
      pendingCity: [
        { op: 'place' as const, itemId: 'cobblestone-street' as const, x: 0, y: 0 },
        { op: 'remove' as const, x: 2, y: 3 },
      ],
      onboarded: true,
      profilePending: true,
      avatarId: 'curly' as const,
    };
    expect(sanitizeCache(good, TODAY)).toEqual(good);
  });

  it('drops wrong types, unknown items, off-grid and duplicate tiles', () => {
    const out = sanitizeCache(
      {
        dateKey: 'yesterday',
        stepsToday: '500',
        balance: -10,
        goal: NaN,
        history: { '2026-11-15': 300, bogus: 5, '2026-11-14': 'x' },
        collection: { bakery: { count: 2, foil: 'no' }, 'old-item': { count: 9, foil: 0 }, 'lamp-post': 3 },
        city: [
          { itemId: 'bakery', x: 1, y: 1 },
          { itemId: 'bakery', x: 1, y: 1 },
          { itemId: 'bakery', x: 16, y: 0 },
          { itemId: 'old-item', x: 2, y: 2 },
          { itemId: 'bakery', x: 1.5, y: 0 },
        ],
        pendingCity: [{ op: 'place', itemId: 'nope', x: 0, y: 0 }, { op: 'move', x: 0, y: 0 }, { op: 'remove', x: 3, y: 3 }],
        hapticsOn: 'yes',
      },
      TODAY,
    );
    expect(out.dateKey).toBe(TODAY);
    expect(out.stepsToday).toBe(0);
    expect(out.balance).toBe(initialData().balance);
    expect(out.goal).toBe(initialData().goal);
    expect(out.history).toEqual({ '2026-11-15': 300 });
    expect(out.collection).toEqual({ bakery: { count: 2, foil: 0 } });
    expect(out.city).toEqual([{ itemId: 'bakery', x: 1, y: 1 }]);
    expect(out.pendingCity).toEqual([{ op: 'remove', x: 3, y: 3 }]);
    expect(out.hapticsOn).toBe(true);
  });

  it('keeps valid queued moves and drops broken ones', () => {
    const out = sanitizeCache(
      {
        pendingCity: [
          { op: 'move', fx: 1, fy: 1, tx: 15, ty: 15 },
          { op: 'move', fx: 1, fy: 1, tx: 16, ty: 0 },
          { op: 'move', fx: 'a', fy: 1, tx: 2, ty: 2 },
          { op: 'move', x: 1, y: 1 },
        ],
      },
      TODAY,
    );
    expect(out.pendingCity).toEqual([{ op: 'move', fx: 1, fy: 1, tx: 15, ty: 15 }]);
  });

  it('keeps a valid name and falls back to the default for a bad one', () => {
    expect(sanitizeCache({ displayName: '  Bry ' }, TODAY).displayName).toBe('Bry');
    expect(sanitizeCache({ displayName: '' }, TODAY).displayName).toBe('Walker');
    expect(sanitizeCache({ displayName: 'x'.repeat(33) }, TODAY).displayName).toBe('Walker');
    expect(sanitizeCache({ displayName: 7 }, TODAY).displayName).toBe('Walker');
  });

  it('falls back to the original portrait for an unknown avatar', () => {
    expect(sanitizeCache({ avatarId: 'bun' }, TODAY).avatarId).toBe('bun');
    expect(sanitizeCache({ avatarId: 'dragon' }, TODAY).avatarId).toBe('sprout');
    expect(sanitizeCache({}, TODAY).avatarId).toBe('sprout');
  });

  it('treats a missing or broken onboarding flag as "not onboarded"', () => {
    expect(sanitizeCache({ onboarded: 'yes', profilePending: 1 }, TODAY)).toMatchObject({
      onboarded: false,
      profilePending: false,
    });
  });
});

describe('migrateCache', () => {
  it('upgrades an unversioned (v0) cache, dropping session-only fields', () => {
    const v0 = { ...initialData(TODAY), balance: 4200, cloud: 'online', hydrated: true, hapticsOn: true };
    const out = migrateCache(v0, 0, TODAY);
    expect(out.balance).toBe(4200);
    expect(out).not.toHaveProperty('cloud');
    expect(out).not.toHaveProperty('hydrated');
    expect(CACHE_VERSION).toBeGreaterThan(0);
  });

  it('marks players from before onboarding existed (v0, v1) as onboarded', () => {
    const old = { ...initialData(TODAY), balance: 4200 };
    expect(migrateCache(old, 0, TODAY).onboarded).toBe(true);
    expect(migrateCache(old, 1, TODAY).onboarded).toBe(true);
    // A current cache keeps whatever it says; garbage is a fresh player.
    expect(migrateCache({ ...old, onboarded: false }, CACHE_VERSION, TODAY).onboarded).toBe(false);
    expect(migrateCache(null, 1, TODAY).onboarded).toBe(false);
  });

  it('re-centers a town from the 12×12 lawn (v2) on the 16×16 one, queued changes too', () => {
    const v2 = {
      ...initialData(TODAY),
      collection: { bakery: { count: 2, foil: 0 } },
      city: [
        { itemId: 'bakery', x: 0, y: 0 },
        { itemId: 'bakery', x: 11, y: 11 },
      ],
      pendingCity: [
        { op: 'place', itemId: 'bakery', x: 4, y: 5 },
        { op: 'remove', x: 0, y: 0 },
      ],
    };
    const out = migrateCache(v2, 2, TODAY);
    expect(CITY_SHIFT).toBe(2);
    expect(out.city).toEqual([
      { itemId: 'bakery', x: 2, y: 2 },
      { itemId: 'bakery', x: 13, y: 13 },
    ]);
    expect(out.pendingCity).toEqual([
      { op: 'place', itemId: 'bakery', x: 6, y: 7 },
      { op: 'remove', x: 2, y: 2 },
    ]);
    // Already on the new lawn: no second shift.
    expect(migrateCache(out, CACHE_VERSION, TODAY).city).toEqual(out.city);
  });

  it('round-trips through toCache', () => {
    const state = { ...sanitizeCache({}, TODAY), sensor: 'live', pendingPack: null };
    const cached = toCache(state);
    expect(cached).not.toHaveProperty('sensor');
    expect(migrateCache(cached, CACHE_VERSION, TODAY)).toEqual(cached);
  });
});
