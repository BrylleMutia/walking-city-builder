import {
  DIR,
  GRID_SIZE,
  STARTING_BALANCE,
  addCards,
  addSteps,
  applyCityOps,
  cleanDisplayName,
  available,
  hasGuestProgress,
  initialData,
  moveItem,
  pathMask,
  placeItem,
  raiseStepsToday,
  recentDays,
  removeAt,
  rollDay,
  spend,
  streak,
  uniqueOwned,
  walkGraph,
} from './gameLogic';

type TestId = 'bakery' | 'lamp-post' | 'cobblestone-street' | 'pocket-lawn';
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
  it('adds steps to today, lifetime and balance', () => {
    const s = addSteps(initialData('2026-11-16'), 500, '2026-11-16');
    expect(s.stepsToday).toBe(500);
    expect(s.lifetimeSteps).toBe(500);
    expect(s.balance).toBe(STARTING_BALANCE + 500);
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
    expect(s.balance).toBe(STARTING_BALANCE + 4100);
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
});

describe('spending', () => {
  it('refuses to overspend', () => {
    const s = initialData();
    expect(spend(s, STARTING_BALANCE + 1)).toBeNull();
    expect(spend(s, 1000)?.balance).toBe(STARTING_BALANCE - 1000);
    expect(spend(s, STARTING_BALANCE)?.balance).toBe(0);
  });
});

describe('collection and city', () => {
  const owned = addCards(initialData(), [card('bakery'), card('bakery', true), card('lamp-post')]);

  it('counts cards and foils', () => {
    expect(owned.collection.bakery).toEqual({ count: 2, foil: 1 });
    expect(uniqueOwned(owned)).toBe(2);
    expect(owned.packsOpened).toBe(1);
  });

  it('places only what is owned, on free tiles inside the grid', () => {
    const a = placeItem(owned, 'bakery', 0, 0)!;
    expect(available(a, 'bakery')).toBe(1);
    expect(placeItem(a, 'lamp-post', 0, 0)).toBeNull();
    const b = placeItem(a, 'bakery', 1, 0)!;
    expect(placeItem(b, 'bakery', 2, 0)).toBeNull();
    expect(GRID_SIZE).toBe(16); // must match the server's game_config.grid_size
    expect(placeItem(owned, 'bakery', 15, 15)).not.toBeNull();
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
  const owned = addCards(initialData(), [card('bakery'), card('lamp-post')]);
  const built = applyCityOps(owned, [
    { op: 'place', itemId: 'bakery', x: 1, y: 1 },
    { op: 'place', itemId: 'lamp-post', x: 2, y: 2 },
  ]);

  it('moves an object to a free lot', () => {
    const s = moveItem(built, 1, 1, 6, 4)!;
    expect(s.city).toEqual([
      { itemId: 'bakery', x: 6, y: 4 },
      { itemId: 'lamp-post', x: 2, y: 2 },
    ]);
    // Moving never changes what is owned or placed.
    expect(available(s, 'bakery')).toBe(available(built, 'bakery'));
  });

  it('swaps two objects when the target lot is taken', () => {
    const s = moveItem(built, 1, 1, 2, 2)!;
    expect(s.city).toEqual([
      { itemId: 'bakery', x: 2, y: 2 },
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
      { op: 'move', fx: 1, fy: 1, tx: 2, ty: 2 }, // swap
      { op: 'move', fx: 7, fy: 7, tx: 0, ty: 0 }, // nothing there any more: skipped
      { op: 'move', fx: 2, fy: 2, tx: 3, ty: 3 },
    ]);
    expect(s.city).toEqual([
      { itemId: 'bakery', x: 3, y: 3 },
      { itemId: 'lamp-post', x: 1, y: 1 },
    ]);
  });
});

describe('applyCityOps', () => {
  const owned = addCards(initialData(), [card('bakery'), card('lamp-post')]);

  it('replays queued changes in order', () => {
    const s = applyCityOps(owned, [
      { op: 'place', itemId: 'bakery', x: 1, y: 1 },
      { op: 'place', itemId: 'lamp-post', x: 2, y: 1 },
      { op: 'remove', x: 1, y: 1 },
      { op: 'place', itemId: 'bakery', x: 5, y: 5 },
    ]);
    expect(s.city).toEqual([
      { itemId: 'lamp-post', x: 2, y: 1 },
      { itemId: 'bakery', x: 5, y: 5 },
    ]);
  });

  it('skips changes that no longer fit the state', () => {
    const base = placeItem(owned, 'bakery', 0, 0)!; // e.g. already on the server
    const s = applyCityOps(base, [
      { op: 'place', itemId: 'lamp-post', x: 0, y: 0 }, // tile taken
      { op: 'place', itemId: 'bakery', x: 3, y: 3 }, // no bakery left
      { op: 'remove', x: 9, y: 9 }, // nothing there
      { op: 'place', itemId: 'lamp-post', x: 4, y: 4 },
    ]);
    expect(s.city).toEqual([
      { itemId: 'bakery', x: 0, y: 0 },
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
    expect(s.balance).toBe(STARTING_BALANCE + 6200);
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
