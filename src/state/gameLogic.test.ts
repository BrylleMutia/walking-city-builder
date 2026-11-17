import {
  DIR,
  GRID_SIZE,
  STARTING_BALANCE,
  addCards,
  addSteps,
  available,
  initialData,
  pathMask,
  placeItem,
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
