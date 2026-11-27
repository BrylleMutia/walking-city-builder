import {
  DIR,
  GRID_SIZE,
  EMPTY_HAUL,
  HAUL_MIN_STEPS,
  CITY_PRICE_STEP,
  STARTING_WOOD,
  activeCityOf,
  addCards,
  cityDisplayName,
  cityPrice,
  cleanCityName,
  lotsCovered,
  switchCity,
  addToHaul,
  fitCity,
  fits,
  objectAt,
  addSteps,
  applyCityOps,
  cleanDisplayName,
  available,
  hasGuestProgress,
  haulReady,
  initialData,
  moveItem,
  pathMask,
  placeItem,
  raiseStepsToday,
  recentDays,
  weekSummary,
  removeAt,
  rollDay,
  spend,
  stepsForWood,
  streak,
  uniqueOwned,
  walkGraph,
} from './gameLogic';

type TestId =
  | 'bakery'
  | 'lamp-post'
  | 'cobblestone-street'
  | 'pocket-lawn'
  | 'flower-kiosk'
  | 'grand-theater'
  | 'corner-cafe'
  | 'bookshop'
  | 'neon-diner';
const card = (id: TestId, foil = false) => ({ item: { id }, foil });

describe('hasGuestProgress (sign-in warning)', () => {
  it('is false for a fresh install, even with the starting balance', () => {
    expect(hasGuestProgress(initialData('2026-11-16'))).toBe(false);
  });

  it('is true once the player walked, opened a pack or built something', () => {
    const s0 = initialData('2026-11-16');
    expect(hasGuestProgress(addSteps(s0, 1, '2026-11-16'))).toBe(true);
    expect(hasGuestProgress({ ...s0, packsOpened: 1 })).toBe(true);
    expect(hasGuestProgress({ ...s0, collection: { bakery: { count: 1, foil: 0 } } })).toBe(true);
    expect(hasGuestProgress({ ...s0, city: [{ itemId: 'bakery', x: 0, y: 0 }] })).toBe(true);
  });
});

describe('steps', () => {
  it('adds steps to today and lifetime, but not to the Wood balance', () => {
    const s = addSteps(initialData('2026-11-16'), 500, '2026-11-16');
    expect(s.stepsToday).toBe(500);
    expect(s.lifetimeSteps).toBe(500);
    // Wood is rolled by the server when the steps sync.
    expect(s.balance).toBe(STARTING_WOOD);
  });

  it('ignores negative and fractional input', () => {
    const s0 = initialData('2026-11-16');
    expect(addSteps(s0, -50, '2026-11-16').stepsToday).toBe(0);
    expect(addSteps(s0, 10.9, '2026-11-16').stepsToday).toBe(10);
  });

  it('archives the previous day on rollover and keeps the balance', () => {
    let s = addSteps(initialData('2026-11-15'), 4000, '2026-11-15');
    s = addSteps(s, 100, '2026-11-16');
    expect(s.history['2026-11-15']).toBe(4000);
    expect(s.stepsToday).toBe(100);
    expect(s.balance).toBe(STARTING_WOOD);
    expect(rollDay(s, '2026-11-16')).toBe(s);
  });

  it('reports the last seven days and the streak', () => {
    let s = addSteps(initialData('2026-11-14'), 1000, '2026-11-14');
    s = addSteps(s, 2000, '2026-11-15');
    s = addSteps(s, 3000, '2026-11-16');
    const today = new Date(2026, 10, 16);
    const days = recentDays(s, today);
    expect(days).toHaveLength(7);
    expect(days.slice(-3).map((d) => d.steps)).toEqual([1000, 2000, 3000]);
    expect(days[0].steps).toBe(0);
    expect(streak(s, today)).toBe(3);
    // A new day with no steps yet does not break yesterday's streak.
    expect(streak(rollDay(s, '2026-11-17'), new Date(2026, 10, 17))).toBe(3);
  });

  it('summarises a week against the goal', () => {
    const days = (...steps: number[]) => steps.map((n) => ({ steps: n }));
    expect(weekSummary(days(0, 0, 0, 0, 0, 0, 0), 10000)).toEqual({ total: 0, average: 0, goalsHit: 0, best: 0 });
    // Exactly the goal counts as hit; the average includes the empty days.
    expect(weekSummary(days(0, 10000, 2500, 0, 12000, 500, 3000), 10000)).toEqual({
      total: 28000,
      average: 4000,
      goalsHit: 2,
      best: 12000,
    });
    expect(weekSummary([], 10000)).toEqual({ total: 0, average: 0, goalsHit: 0, best: 0 });
  });
});

describe('spending', () => {
  it('refuses to overspend', () => {
    const s = initialData();
    expect(spend(s, STARTING_WOOD + 1)).toBeNull();
    expect(spend(s, 200)?.balance).toBe(STARTING_WOOD - 200);
    expect(spend(s, STARTING_WOOD)?.balance).toBe(0);
  });

  it('estimates the steps still needed for some Wood (10% drop chance)', () => {
    expect(stepsForWood(37)).toBe(370);
    expect(stepsForWood(0)).toBe(0);
    expect(stepsForWood(-5)).toBe(0);
  });
});

describe('haul (the "your walk paid off" popup)', () => {
  it('adds up credited steps and Wood across syncs', () => {
    let h = addToHaul(EMPTY_HAUL, 300, 31);
    h = addToHaul(h, 250, 22);
    expect(h).toEqual({ steps: 550, wood: 53 });
  });

  it('ignores missing, negative and fractional numbers (older servers send no wood)', () => {
    expect(addToHaul(EMPTY_HAUL, 0, 0)).toBe(EMPTY_HAUL);
    expect(addToHaul(EMPTY_HAUL, 120.7, undefined as unknown as number)).toEqual({ steps: 120, wood: 0 });
    expect(addToHaul(EMPTY_HAUL, -10, -3)).toBe(EMPTY_HAUL);
  });

  it(`is ready from ${HAUL_MIN_STEPS} steps`, () => {
    expect(haulReady({ steps: HAUL_MIN_STEPS - 1, wood: 99 })).toBe(false);
    expect(haulReady({ steps: HAUL_MIN_STEPS, wood: 0 })).toBe(true);
  });
});

describe('collection and city', () => {
  const owned = addCards(initialData(), [card('bakery'), card('bakery', true), card('lamp-post')]);

  it('counts cards and foils', () => {
    expect(owned.collection.bakery).toEqual({ count: 2, foil: 1 });
    expect(uniqueOwned(owned)).toBe(2);
    expect(owned.packsOpened).toBe(1);
  });

  it('places only what is owned, on free lots inside the grid', () => {
    // The bakery is 2×1: it covers (0,0) and (1,0).
    const a = placeItem(owned, 'bakery', 0, 0)!;
    expect(available(a, 'bakery')).toBe(1);
    expect(placeItem(a, 'lamp-post', 0, 0)).toBeNull();
    expect(placeItem(a, 'lamp-post', 1, 0)).toBeNull();
    expect(placeItem(a, 'bakery', 1, 0)).toBeNull();
    const b = placeItem(a, 'bakery', 2, 0)!;
    expect(placeItem(b, 'bakery', 4, 0)).toBeNull(); // none left
    expect(GRID_SIZE).toBe(16); // must match the server's game_config.grid_size
    expect(placeItem(owned, 'bakery', 14, 15)).not.toBeNull();
    expect(placeItem(owned, 'bakery', 15, 15)).toBeNull(); // its right half would be off the lawn
    expect(placeItem(owned, 'bakery', GRID_SIZE, 0)).toBeNull();
    expect(placeItem(owned, 'bakery', -1, 0)).toBeNull();
    expect(placeItem(initialData(), 'bakery', 0, 0)).toBeNull();
  });

  it('returns a removed building to the inventory', () => {
    const a = placeItem(owned, 'lamp-post', 3, 3)!;
    expect(available(a, 'lamp-post')).toBe(0);
    const b = removeAt(a, 3, 3)!;
    expect(available(b, 'lamp-post')).toBe(1);
    expect(removeAt(b, 3, 3)).toBeNull();
  });
});

describe('paths', () => {
  it('turns one path card into a bundle of tiles', () => {
    const s = addCards(initialData(), [card('cobblestone-street', true), card('pocket-lawn')]);
    expect(s.collection['cobblestone-street']).toEqual({ count: 4, foil: 1 });
    expect(s.collection['pocket-lawn']).toEqual({ count: 2, foil: 0 });
  });

  // A small T-junction of street plus a lawn, with a bakery that isn't walkable:
  //   x→ 0 1 2
  // y0   S S S
  // y1   . S B
  // y2   . L .
  function town() {
    let s = addCards(initialData(), [
      card('cobblestone-street'),
      card('cobblestone-street'),
      card('pocket-lawn'),
      card('bakery'),
    ]);
    for (const [x, y] of [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ]) {
      s = placeItem(s, 'cobblestone-street', x, y)!;
    }
    s = placeItem(s, 'pocket-lawn', 1, 2)!;
    s = placeItem(s, 'bakery', 2, 1)!;
    return s;
  }

  it('masks only walkable neighbours', () => {
    const s = town();
    expect(pathMask(s, 1, 0)).toBe(DIR.E | DIR.W | DIR.S);
    expect(pathMask(s, 1, 1)).toBe(DIR.N | DIR.S); // bakery on the east doesn't count
    expect(pathMask(s, 0, 0)).toBe(DIR.E);
    expect(pathMask(s, 1, 2)).toBe(DIR.N);
  });

  it('builds a walk graph of connected walkable tiles', () => {
    const g = walkGraph(town());
    expect(g.size).toBe(5);
    expect(g.has('2,1')).toBe(false);
    expect(new Set(g.get('1,0'))).toEqual(new Set(['2,0', '1,1', '0,0']));
    expect(g.get('1,2')).toEqual(['1,1']);
  });
});

describe('moveItem (top-down editing)', () => {
  const owned = addCards(initialData(), [card('flower-kiosk'), card('lamp-post')]);
  const built = applyCityOps(owned, [
    { cityId: null, op: 'place', itemId: 'flower-kiosk', x: 1, y: 1 },
    { cityId: null, op: 'place', itemId: 'lamp-post', x: 2, y: 2 },
  ]);

  it('moves an object to a free lot', () => {
    const s = moveItem(built, 1, 1, 6, 4)!;
    expect(s.city).toEqual([
      { itemId: 'flower-kiosk', x: 6, y: 4 },
      { itemId: 'lamp-post', x: 2, y: 2 },
    ]);
    // Moving never changes what is owned or placed.
    expect(available(s, 'flower-kiosk')).toBe(available(built, 'flower-kiosk'));
  });

  it('swaps two objects when the target lot is taken', () => {
    const s = moveItem(built, 1, 1, 2, 2)!;
    expect(s.city).toEqual([
      { itemId: 'flower-kiosk', x: 2, y: 2 },
      { itemId: 'lamp-post', x: 1, y: 1 },
    ]);
  });

  it('refuses the same lot, an empty source and off-lawn targets', () => {
    expect(moveItem(built, 1, 1, 1, 1)).toBeNull();
    expect(moveItem(built, 9, 9, 3, 3)).toBeNull();
    expect(moveItem(built, 1, 1, GRID_SIZE, 0)).toBeNull();
    expect(moveItem(built, 1, 1, -1, 0)).toBeNull();
    expect(moveItem(built, 1, 1, 0.5, 0)).toBeNull();
  });

  it('replays queued moves, skipping ones that no longer fit', () => {
    const s = applyCityOps(built, [
      { cityId: null, op: 'move', fx: 1, fy: 1, tx: 2, ty: 2 }, // swap
      { cityId: null, op: 'move', fx: 7, fy: 7, tx: 0, ty: 0 }, // nothing there any more: skipped
      { cityId: null, op: 'move', fx: 2, fy: 2, tx: 3, ty: 3 },
    ]);
    expect(s.city).toEqual([
      { itemId: 'flower-kiosk', x: 3, y: 3 },
      { itemId: 'lamp-post', x: 1, y: 1 },
    ]);
  });
});

describe('applyCityOps', () => {
  const owned = addCards(initialData(), [card('flower-kiosk'), card('lamp-post')]);

  it('replays queued changes in order', () => {
    const s = applyCityOps(owned, [
      { cityId: null, op: 'place', itemId: 'flower-kiosk', x: 1, y: 1 },
      { cityId: null, op: 'place', itemId: 'lamp-post', x: 2, y: 1 },
      { cityId: null, op: 'remove', x: 1, y: 1 },
      { cityId: null, op: 'place', itemId: 'flower-kiosk', x: 5, y: 5 },
    ]);
    expect(s.city).toEqual([
      { itemId: 'lamp-post', x: 2, y: 1 },
      { itemId: 'flower-kiosk', x: 5, y: 5 },
    ]);
  });

  it('skips changes that no longer fit the state', () => {
    const base = placeItem(owned, 'flower-kiosk', 0, 0)!; // e.g. already on the server
    const s = applyCityOps(base, [
      { cityId: null, op: 'place', itemId: 'lamp-post', x: 0, y: 0 }, // tile taken
      { cityId: null, op: 'place', itemId: 'flower-kiosk', x: 3, y: 3 }, // no bakery left
      { cityId: null, op: 'remove', x: 9, y: 9 }, // nothing there
      { cityId: null, op: 'place', itemId: 'lamp-post', x: 4, y: 4 },
    ]);
    expect(s.city).toEqual([
      { itemId: 'flower-kiosk', x: 0, y: 0 },
      { itemId: 'lamp-post', x: 4, y: 4 },
    ]);
  });
});

describe('raiseStepsToday (phone-reported daily total)', () => {
  const start = () => initialData('2026-11-17');

  it('credits the difference up to the reported total', () => {
    const s = raiseStepsToday(addSteps(start(), 500, '2026-11-17'), 6200, '2026-11-17');
    expect(s.stepsToday).toBe(6200);
    expect(s.lifetimeSteps).toBe(6200);
    expect(s.balance).toBe(STARTING_WOOD);
  });

  it('never lowers the counter and never double-counts', () => {
    const walked = raiseStepsToday(start(), 3000, '2026-11-17');
    expect(raiseStepsToday(walked, 3000, '2026-11-17')).toBe(walked);
    // Simulated steps can put us above the sensor's total.
    expect(raiseStepsToday(walked, 1200, '2026-11-17')).toBe(walked);
    expect(raiseStepsToday(walked, NaN, '2026-11-17')).toBe(walked);
  });

  it('starts from zero on a new day', () => {
    const yesterday = raiseStepsToday(start(), 4000, '2026-11-17');
    const today = raiseStepsToday(yesterday, 250, '2026-11-18');
    expect(today.stepsToday).toBe(250);
    expect(today.history['2026-11-17']).toBe(4000);
    expect(today.lifetimeSteps).toBe(4250);
  });
});

describe('cleanDisplayName', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanDisplayName('  Bry   Mutia ')).toBe('Bry Mutia');
  });

  it('rejects empty, whitespace-only and too-long names', () => {
    expect(cleanDisplayName('')).toBeNull();
    expect(cleanDisplayName('   ')).toBeNull();
    expect(cleanDisplayName('x'.repeat(21))).toBeNull();
    expect(cleanDisplayName('x'.repeat(20))).toBe('x'.repeat(20));
  });

  it('strips control characters and counts emoji as one character', () => {
    expect(cleanDisplayName('Ann\u0000a\n')).toBe('Anna');
    expect(cleanDisplayName('🦫'.repeat(20))).toBe('🦫'.repeat(20));
  });
});

describe('footprints (multi-lot items)', () => {
  const owned = addCards(initialData(), [
    card('grand-theater'),
    card('corner-cafe'),
    card('lamp-post'),
    card('bookshop'),
    card('bookshop'),
    card('flower-kiosk'),
  ]);

  it('covers every lot of the shape, and any of them finds the object', () => {
    const s = placeItem(owned, 'grand-theater', 4, 4)!; // 3×2: x 4..6, y 4..5
    expect(objectAt(s, 6, 5)).toEqual({ itemId: 'grand-theater', x: 4, y: 4 });
    expect(objectAt(s, 7, 5)).toBeUndefined();
    expect(fits(s, 'lamp-post', 6, 5)).toBe(false);
    expect(fits(s, 'lamp-post', 7, 4)).toBe(true);
    // A 3×2 needs room: anchored at x = 14 it would hang off the lawn.
    expect(fits(owned, 'grand-theater', 13, 14)).toBe(true);
    expect(fits(owned, 'grand-theater', 14, 14)).toBe(false);
  });

  it("leaves the L-shaped café's notch free for something else", () => {
    // ## / #. → covers (0,0) (1,0) (0,1); the notch (1,1) is free.
    const s = placeItem(owned, 'corner-cafe', 0, 0)!;
    expect(fits(s, 'lamp-post', 1, 1)).toBe(true);
    expect(placeItem(s, 'lamp-post', 1, 1)).not.toBeNull();
    expect(fits(s, 'lamp-post', 0, 1)).toBe(false);
  });

  it("leaves the mirrored-L diner's notch (front-left) free", () => {
    // ## / .# → covers (0,0) (1,0) (1,1); the notch (0,1) is free.
    const s = placeItem(addCards(initialData(), [card('neon-diner')]), 'neon-diner', 3, 3)!;
    expect(fits(s, 'lamp-post', 3, 4)).toBe(true);
    expect(fits(s, 'lamp-post', 4, 4)).toBe(false);
    expect(fits(s, 'ferris-wheel', 14, 13)).toBe(true); // 2×3 just fits the corner
    expect(fits(s, 'ferris-wheel', 14, 14)).toBe(false);
  });

  it('moves a big object onto lots it partly covers already', () => {
    const s = placeItem(owned, 'grand-theater', 4, 4)!;
    expect(moveItem(s, 4, 4, 5, 4)?.city).toEqual([{ itemId: 'grand-theater', x: 5, y: 4 }]);
    expect(moveItem(s, 4, 4, 14, 4)).toBeNull(); // off the lawn
  });

  it('swaps only objects with the same footprint', () => {
    let s = placeItem(owned, 'bookshop', 0, 0)!;
    s = placeItem(s, 'bookshop', 0, 1)!;
    s = placeItem(s, 'lamp-post', 2, 0)!;
    s = placeItem(s, 'flower-kiosk', 3, 0)!;
    // Bookshop onto the other bookshop's anchor: swap.
    expect(moveItem(s, 0, 0, 0, 1)?.city.slice(0, 2)).toEqual([
      { itemId: 'bookshop', x: 0, y: 1 },
      { itemId: 'bookshop', x: 0, y: 0 },
    ]);
    // Two 1×1s still swap, as before footprints.
    expect(moveItem(s, 2, 0, 3, 0)).not.toBeNull();
    // A 2×1 onto a lamp post: different shapes, no swap.
    expect(moveItem(s, 0, 0, 2, 0)).toBeNull();
  });

  it('fitCity drops objects that no longer fit, keeping the earlier ones', () => {
    expect(
      fitCity([
        { itemId: 'lamp-post', x: 1, y: 0 },
        { itemId: 'bakery', x: 0, y: 0 }, // would cover the lamp post
        { itemId: 'grand-theater', x: 15, y: 3 }, // off the lawn
        { itemId: 'bakery', x: 2, y: 0 },
      ]),
    ).toEqual([
      { itemId: 'lamp-post', x: 1, y: 0 },
      { itemId: 'bakery', x: 2, y: 0 },
    ]);
  });
});

describe('several cities (shared pool)', () => {
  const A = 'city-a';
  const B = 'city-b';
  const cities = [
    { id: A, name: null, position: 0, lots: 0 },
    { id: B, name: 'Harbor Side', position: 1, lots: 0 },
  ];
  const owned = { ...addCards(initialData(), [card('lamp-post'), card('flower-kiosk')]), cities, activeCityId: A };

  it('counts copies standing in other cities as taken', () => {
    const s = { ...owned, placedElsewhere: { 'lamp-post': 1 } };
    expect(available(s, 'lamp-post')).toBe(0);
    expect(placeItem(s, 'lamp-post', 0, 0)).toBeNull();
    expect(available(s, 'flower-kiosk')).toBe(1);
  });

  it('moves the pool with the player when switching, and back again', () => {
    const inA = placeItem(owned, 'lamp-post', 2, 2)!;
    const inB = switchCity(inA, B, []);
    expect(inB.city).toEqual([]);
    expect(inB.activeCityId).toBe(B);
    expect(available(inB, 'lamp-post')).toBe(0); // it stands in A
    const kiosk = placeItem(inB, 'flower-kiosk', 5, 5)!;
    const backInA = switchCity(kiosk, A, inA.city);
    expect(backInA.city).toEqual([{ itemId: 'lamp-post', x: 2, y: 2 }]);
    expect(backInA.placedElsewhere).toEqual({ 'flower-kiosk': 1 });
    expect(switchCity(backInA, B, kiosk.city).placedElsewhere).toEqual({ 'lamp-post': 1 });
    // Switching to the city on screen changes nothing.
    expect(switchCity(backInA, A, [])).toBe(backInA);
  });

  it('treats a null active city as the first one', () => {
    expect(activeCityOf({ activeCityId: null, cities })).toBe(A);
    expect(activeCityOf({ activeCityId: null, cities: [] })).toBeNull();
  });

  it('prices each new city one step higher (the first is free)', () => {
    expect(CITY_PRICE_STEP).toBe(1000);
    expect([cityPrice(0), cityPrice(1), cityPrice(2), cityPrice(4)]).toEqual([0, 1000, 2000, 4000]);
  });

  it('names cities by default until renamed', () => {
    const three = [...cities, { id: 'city-c', name: null, position: 5, lots: 0 }];
    expect(cityDisplayName(three, A, 'Bry')).toBe("Bry's Town");
    expect(cityDisplayName(three, B, 'Bry')).toBe('Harbor Side');
    expect(cityDisplayName(three, 'city-c', 'Bry')).toBe('Town 3');
    expect(cityDisplayName([], null, 'Bry')).toBe("Bry's Town");
    expect(cleanCityName('  Old   Town ')).toBe('Old Town');
    expect(cleanCityName('   ')).toBeNull();
    expect(cleanCityName('x'.repeat(25))).toBeNull();
  });

  it('replays only the active city’s changes, but other cities’ placements still take from the pool', () => {
    const s = applyCityOps(owned, [
      { cityId: B, op: 'place', itemId: 'lamp-post', x: 1, y: 1 },
      { cityId: A, op: 'place', itemId: 'lamp-post', x: 2, y: 2 }, // the only lamp is in B now
      { cityId: null, op: 'place', itemId: 'flower-kiosk', x: 3, y: 3 }, // null = the first city, A
      { cityId: B, op: 'remove', x: 3, y: 3 },
    ]);
    expect(s.city).toEqual([{ itemId: 'flower-kiosk', x: 3, y: 3 }]);
    expect(s.placedElsewhere).toEqual({ 'lamp-post': 1 });
  });

  it('counts the lots a city covers', () => {
    expect(lotsCovered([{ itemId: 'grand-theater', x: 0, y: 0 }, { itemId: 'lamp-post', x: 5, y: 5 }])).toBe(7);
  });
});
