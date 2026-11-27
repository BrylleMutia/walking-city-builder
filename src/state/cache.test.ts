import { CACHE_VERSION, CITY_SHIFT, migrateCache, sanitizeCache, toCache } from './cache';
import { initialData } from './gameLogic';

const TODAY = '2026-11-17';
const HOME = '11111111-1111-4111-8111-111111111111';
const HARBOR = '22222222-2222-4222-8222-222222222222';

describe('sanitizeCache', () => {
  it('turns garbage into a fresh-player cache', () => {
    for (const raw of [undefined, null, 42, 'x', []]) {
      expect(sanitizeCache(raw, TODAY)).toEqual({
        ...initialData(TODAY),
        hapticsOn: true,
        soundOn: true,
        forceLegendary: false,
        forceFoil: false,
        pendingCity: [],
        onboarded: false,
        profilePending: false,
        avatarId: 'sprout',
        haul: { steps: 0, wood: 0 },
        cityTiles: {},
        notifications: [],
        notificationsReadPending: [],
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
      soundOn: false,
      forceLegendary: true,
      forceFoil: false,
      pendingCity: [
        { cityId: HOME, op: 'place' as const, itemId: 'cobblestone-street' as const, x: 0, y: 0 },
        { cityId: null, op: 'remove' as const, x: 2, y: 3 },
      ],
      onboarded: true,
      profilePending: true,
      avatarId: 'curly' as const,
      haul: { steps: 420, wood: 44 },
      cities: [
        { id: HOME, name: null, position: 0, lots: 2 },
        { id: HARBOR, name: 'Harbor Side', position: 1, lots: 1 },
      ],
      activeCityId: HOME,
      placedElsewhere: { 'lamp-post': 1 },
      cityTiles: { [HARBOR]: [{ itemId: 'lamp-post' as const, x: 4, y: 4 }] },
      notifications: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          kind: 'welcome',
          title: 'Welcome to Stridewood!',
          body: 'Walk, collect, build.',
          createdAt: '2026-11-16T04:00:00Z',
          readAt: '2026-11-16T05:00:00Z',
        },
      ],
      notificationsReadPending: ['00000000-0000-4000-8000-000000000001'],
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
    expect(out.pendingCity).toEqual([{ cityId: null, op: 'remove', x: 3, y: 3 }]);
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
    expect(out.pendingCity).toEqual([{ cityId: null, op: 'move', fx: 1, fy: 1, tx: 15, ty: 15 }]);
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

  it('takes back objects whose footprint no longer fits (caches from before multi-lot items)', () => {
    const out = sanitizeCache(
      {
        collection: { bakery: { count: 1, foil: 0 }, 'lamp-post': { count: 1, foil: 0 }, 'grand-theater': { count: 1, foil: 0 } },
        city: [
          { itemId: 'lamp-post', x: 3, y: 3 },
          { itemId: 'bakery', x: 2, y: 3 }, // its right half is the lamp post's lot
          { itemId: 'grand-theater', x: 14, y: 0 }, // 3 wide: off the lawn
        ],
      },
      TODAY,
    );
    expect(out.city).toEqual([{ itemId: 'lamp-post', x: 3, y: 3 }]);
  });

  it('resets a broken haul', () => {
    expect(sanitizeCache({ haul: 'lots' }, TODAY).haul).toEqual({ steps: 0, wood: 0 });
    expect(sanitizeCache({ haul: { steps: -4, wood: 12.8 } }, TODAY).haul).toEqual({ steps: 0, wood: 12 });
  });

  it('keeps only well-formed cities, and cached tiles of known, inactive ones', () => {
    const out = sanitizeCache(
      {
        cities: [
          { id: HOME, name: '', position: 0, lots: 3 },
          { id: HARBOR, name: 'x'.repeat(25), position: 1, lots: -2 },
          { id: HARBOR, name: 'Twice', position: 2, lots: 0 },
          { id: 'not-a-uuid', name: 'Bad', position: 3, lots: 0 },
        ],
        activeCityId: 'not-a-uuid',
        placedElsewhere: { 'lamp-post': 2, bakery: 0, 'old-item': 4 },
        cityTiles: {
          [HOME]: [{ itemId: 'bakery', x: 1, y: 1 }],
          [HARBOR]: [{ itemId: 'lamp-post', x: 1, y: 1 }, { itemId: 'lamp-post', x: 1, y: 1 }],
          'not-a-uuid': [{ itemId: 'bakery', x: 1, y: 1 }],
        },
      },
      TODAY,
    );
    expect(out.cities).toEqual([
      { id: HOME, name: null, position: 0, lots: 3 },
      { id: HARBOR, name: null, position: 1, lots: 0 },
    ]);
    expect(out.activeCityId).toBeNull();
    expect(out.placedElsewhere).toEqual({ 'lamp-post': 2 });
    // Unknown cities dropped; overlapping tiles fitted. (The active one would be dropped too.)
    expect(out.cityTiles).toEqual({
      [HOME]: [{ itemId: 'bakery', x: 1, y: 1 }],
      [HARBOR]: [{ itemId: 'lamp-post', x: 1, y: 1 }],
    });
    expect(sanitizeCache({ cities: [{ id: HOME, position: 0 }], activeCityId: HOME, cityTiles: { [HOME]: [] } }, TODAY).cityTiles).toEqual({});
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
    expect(out.balance).toBe(840); // Steps → Wood (v4)
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
      { cityId: null, op: 'place', itemId: 'bakery', x: 6, y: 7 },
      { cityId: null, op: 'remove', x: 2, y: 2 },
    ]);
    // Already on the new lawn: no second shift.
    expect(migrateCache(out, CACHE_VERSION, TODAY).city).toEqual(out.city);
  });

  it('turns a Steps balance (v3) into Wood with the same buying power', () => {
    const v3 = { ...initialData(TODAY), balance: 3999 };
    expect(migrateCache(v3, 3, TODAY).balance).toBe(799);
    expect(migrateCache(v3, 3, TODAY).haul).toEqual({ steps: 0, wood: 0 });
    // Already Wood: no second conversion.
    expect(migrateCache({ ...v3, balance: 600 }, CACHE_VERSION, TODAY).balance).toBe(600);
  });

  it('puts a single-city cache (v4) and its queued changes in the first city', () => {
    const v4 = {
      ...initialData(TODAY),
      collection: { bakery: { count: 1, foil: 0 } },
      city: [{ itemId: 'bakery', x: 3, y: 3 }],
      pendingCity: [{ op: 'place', itemId: 'bakery', x: 3, y: 3 }],
    };
    const out = migrateCache(v4, 4, TODAY);
    expect(out.city).toEqual([{ itemId: 'bakery', x: 3, y: 3 }]);
    expect(out.pendingCity).toEqual([{ cityId: null, op: 'place', itemId: 'bakery', x: 3, y: 3 }]);
    expect(out).toMatchObject({ cities: [], activeCityId: null, placedElsewhere: {}, cityTiles: {} });
  });

  it('adds empty notifications to a v5 cache and keeps valid cached ones', () => {
    const v5 = { ...initialData(TODAY), haul: { steps: 0, wood: 0 } };
    expect(migrateCache(v5, 5, TODAY)).toMatchObject({ notifications: [], notificationsReadPending: [] });
    const notice = {
      id: '00000000-0000-4000-8000-000000000001',
      kind: 'welcome',
      title: 'Welcome to Stridewood!',
      body: 'Walk, collect, build.',
      createdAt: '2026-11-25T04:00:00Z',
      readAt: null,
    };
    const out = sanitizeCache(
      { notifications: [notice, { id: 'bad' }], notificationsReadPending: [notice.id, 'bad'] },
      TODAY,
    );
    expect(out.notifications).toEqual([notice]);
    expect(out.notificationsReadPending).toEqual([notice.id]);
  });

  it('turns sound on for a v6 cache and keeps a saved choice', () => {
    expect(migrateCache({ ...initialData(TODAY) }, 6, TODAY).soundOn).toBe(true);
    expect(migrateCache({ ...initialData(TODAY), soundOn: false }, CACHE_VERSION, TODAY).soundOn).toBe(false);
  });

  it('round-trips through toCache', () => {
    const state = { ...sanitizeCache({}, TODAY), sensor: 'live', pendingPack: null };
    const cached = toCache(state);
    expect(cached).not.toHaveProperty('sensor');
    expect(migrateCache(cached, CACHE_VERSION, TODAY)).toEqual(cached);
  });
});
