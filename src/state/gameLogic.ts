import { isWalkable, tilesPerCard } from '../data/items';
import type { ItemId } from '../data/sets/cozyDowntown';

/** Pure game rules. No React, no storage: easy to test and to reason about. */

export interface Owned {
  count: number;
  foil: number;
}

export interface Placed {
  itemId: ItemId;
  x: number;
  y: number;
}

export interface GameData {
  /** Local calendar day the `stepsToday` counter belongs to, e.g. 2026-11-16. */
  dateKey: string;
  stepsToday: number;
  /** Finished days only; today lives in `stepsToday`. */
  history: Record<string, number>;
  lifetimeSteps: number;
  /** Spendable currency. Earned 1:1 with steps, reduced by purchases. */
  balance: number;
  goal: number;
  collection: Partial<Record<ItemId, Owned>>;
  city: Placed[];
  packsOpened: number;
}

export const GRID_SIZE = 12;
export const STARTING_BALANCE = 3000;
export const DEFAULT_GOAL = 8000;

export function dayKey(d: Date = new Date()): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function initialData(today: string = dayKey()): GameData {
  return {
    dateKey: today,
    stepsToday: 0,
    history: {},
    lifetimeSteps: 0,
    balance: STARTING_BALANCE,
    goal: DEFAULT_GOAL,
    collection: {},
    city: [],
    packsOpened: 0,
  };
}

/** Moves yesterday's counter into history when the calendar day has changed. */
export function rollDay<T extends GameData>(s: T, today: string): T {
  if (s.dateKey === today) return s;
  const history = { ...s.history };
  if (s.stepsToday > 0) history[s.dateKey] = s.stepsToday;
  return { ...s, history, dateKey: today, stepsToday: 0 };
}

export function addSteps<T extends GameData>(s: T, steps: number, today: string): T {
  const n = Math.max(0, Math.floor(steps));
  const rolled = rollDay(s, today);
  if (n === 0) return rolled;
  return {
    ...rolled,
    stepsToday: rolled.stepsToday + n,
    lifetimeSteps: rolled.lifetimeSteps + n,
    balance: rolled.balance + n,
  };
}

/** Returns null when the balance is too low; never lets it go negative. */
export function spend<T extends GameData>(s: T, cost: number): T | null {
  if (cost < 0 || s.balance < cost) return null;
  return { ...s, balance: s.balance - cost };
}

export function addCards<T extends GameData>(
  s: T,
  cards: readonly { item: { id: ItemId }; foil: boolean }[],
): T {
  const collection = { ...s.collection };
  for (const c of cards) {
    const prev = collection[c.item.id] ?? { count: 0, foil: 0 };
    // Path cards are bundles: one card is several tiles. `count` is what can be
    // placed (tiles); `foil` counts foil cards pulled.
    collection[c.item.id] = {
      count: prev.count + tilesPerCard(c.item.id),
      foil: prev.foil + (c.foil ? 1 : 0),
    };
  }
  return { ...s, collection, packsOpened: s.packsOpened + 1 };
}

export function placedCount(s: GameData, itemId: ItemId): number {
  return s.city.filter((p) => p.itemId === itemId).length;
}

/** Copies of an item that are owned but not standing in the city. */
export function available(s: GameData, itemId: ItemId): number {
  return (s.collection[itemId]?.count ?? 0) - placedCount(s, itemId);
}

export function tileAt(s: Pick<GameData, 'city'>, x: number, y: number): Placed | undefined {
  return s.city.find((p) => p.x === x && p.y === y);
}

export function placeItem<T extends GameData>(
  s: T,
  itemId: ItemId,
  x: number,
  y: number,
): T | null {
  const inside = x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;
  if (!inside || !Number.isInteger(x) || !Number.isInteger(y)) return null;
  if (tileAt(s, x, y) || available(s, itemId) <= 0) return null;
  return { ...s, city: [...s.city, { itemId, x, y }] };
}

export function removeAt<T extends GameData>(s: T, x: number, y: number): T | null {
  if (!tileAt(s, x, y)) return null;
  return { ...s, city: s.city.filter((p) => !(p.x === x && p.y === y)) };
}

/** The last `days` calendar days ending today, oldest first. */
export function recentDays(s: GameData, today: Date, days = 7): { key: string; steps: number }[] {
  const out: { key: string; steps: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = dayKey(d);
    out.push({ key, steps: key === s.dateKey ? s.stepsToday : (s.history[key] ?? 0) });
  }
  return out;
}

/** Consecutive days, ending today or yesterday, with at least one step. */
export function streak(s: GameData, today: Date): number {
  let n = 0;
  for (let i = 0; i < 366; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = dayKey(d);
    const steps = key === s.dateKey ? s.stepsToday : (s.history[key] ?? 0);
    if (steps > 0) n++;
    else if (i > 0) break;
  }
  return n;
}

export function uniqueOwned(s: GameData): number {
  return Object.values(s.collection).filter((o) => o && o.count > 0).length;
}

export function foilsOwned(s: GameData): number {
  return Object.values(s.collection).reduce((a, o) => a + (o?.foil ?? 0), 0);
}

// ── Walkable network ─────────────────────────────────────────────────────────
// Paths auto-connect to walkable neighbours, and the same connections form the
// graph townsfolk (future NPCs) will walk along.

/** Neighbour bits for pathMask. Grid +x is screen down-right, +y is down-left. */
export const DIR = { N: 1, E: 2, S: 4, W: 8 } as const;

const STEPS: readonly [bit: number, dx: number, dy: number][] = [
  [DIR.N, 0, -1],
  [DIR.E, 1, 0],
  [DIR.S, 0, 1],
  [DIR.W, -1, 0],
];

function walkableAt(s: Pick<GameData, 'city'>, x: number, y: number): boolean {
  const t = tileAt(s, x, y);
  return !!t && isWalkable(t.itemId);
}

/** Which of the 4 neighbours of (x, y) are walkable, as DIR bits. */
export function pathMask(s: Pick<GameData, 'city'>, x: number, y: number): number {
  let mask = 0;
  for (const [bit, dx, dy] of STEPS) {
    if (walkableAt(s, x + dx, y + dy)) mask |= bit;
  }
  return mask;
}

export const tileKey = (x: number, y: number) => `${x},${y}`;

/** Adjacency list of walkable tiles ("x,y" → neighbouring "x,y" keys). */
export function walkGraph(s: Pick<GameData, 'city'>): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const t of s.city) {
    if (!isWalkable(t.itemId)) continue;
    const next: string[] = [];
    for (const [, dx, dy] of STEPS) {
      if (walkableAt(s, t.x + dx, t.y + dy)) next.push(tileKey(t.x + dx, t.y + dy));
    }
    graph.set(tileKey(t.x, t.y), next);
  }
  return graph;
}
