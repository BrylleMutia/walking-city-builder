import { cellsOf, isWalkable, sameFootprint, tilesPerCard } from '../data/items';
import { DEFAULT_AVATAR, type AvatarId } from '../data/avatars';
import type { ItemId } from '../data/sets/types';

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

/** One of the player's cities, as listed in the switcher. */
export interface CitySummary {
  id: string;
  /** null: the default name (see `cityDisplayName`). */
  name: string | null;
  /** Order in the list (ascending); there can be gaps after a delete. */
  position: number;
  /** Lots covered, as the server last counted them (the active city's live count comes from `city`). */
  lots: number;
}

export interface GameData {
  /** Local calendar day the `stepsToday` counter belongs to, e.g. 2026-11-16. */
  dateKey: string;
  stepsToday: number;
  /** Finished days only; today lives in `stepsToday`. */
  history: Record<string, number>;
  lifetimeSteps: number;
  /**
   * Spendable Wood. Only the server changes it: each synced step has a chance
   * to drop one (`sync_steps`), packs cost some.
   */
  balance: number;
  goal: number;
  /** What the app calls the player (greeting, Profile). Stored on the server profile. */
  displayName: string;
  /** Chosen portrait (data/avatars.ts). Stored on the server profile. */
  avatarId: AvatarId;
  collection: Partial<Record<ItemId, Owned>>;
  /** The objects of the active city. Every placement rule works on this alone. */
  city: Placed[];
  /** The player's cities, in order. Empty until the first sync. */
  cities: CitySummary[];
  /** The city `city` belongs to; null means the first city (before the first sync). */
  activeCityId: string | null;
  /**
   * Shared pool: per item, the copies standing in the player's *other* cities.
   * A card stands in one place at a time, so these aren't available here.
   */
  placedElsewhere: Partial<Record<ItemId, number>>;
  packsOpened: number;
}

/** Must match the server's `game_config.grid_size` (place_item's bounds check). */
export const GRID_SIZE = 16;
/** Must match the server's `game_config.city_price_step`: the Nth city costs (N − 1) × this. */
export const CITY_PRICE_STEP = 1000;
/** Must match the server's `game_config.max_cities`. */
export const MAX_CITIES = 10;
/** Same bound as the server's `cities.name`. */
export const CITY_NAME_MAX = 24;
/** Must match the server's `game_config.starting_balance` (two Cozy Downtown packs). */
export const STARTING_WOOD = 400;
/** Must match the server's `game_config.wood_drop_chance`; used only for "about N steps to go" hints. */
export const WOOD_DROP_CHANCE = 0.1;
export const DEFAULT_GOAL = 8000;
export const DEFAULT_NAME = 'Walker';
/** The server allows 32; the greeting and Profile header fit about this many. */
export const NAME_MAX = 20;

/**
 * Tidies a name typed by the player: strips control characters, collapses
 * inner whitespace and trims. Returns null when nothing usable is left or it's
 * too long (the input caps length, so that only happens with pasted text).
 */
export function cleanDisplayName(raw: string): string | null {
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (name.length === 0 || [...name].length > NAME_MAX) return null;
  return name;
}

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
    balance: STARTING_WOOD,
    goal: DEFAULT_GOAL,
    displayName: DEFAULT_NAME,
    avatarId: DEFAULT_AVATAR,
    collection: {},
    city: [],
    cities: [],
    activeCityId: null,
    placedElsewhere: {},
    packsOpened: 0,
  };
}

/**
 * Whether this phone holds progress a sign-in would replace: anything beyond
 * a fresh install (packs, cards, buildings or walked steps).
 */
export function hasGuestProgress(
  s: Pick<GameData, 'packsOpened' | 'collection' | 'city' | 'lifetimeSteps' | 'stepsToday'>,
): boolean {
  return (
    s.packsOpened > 0 || s.city.length > 0 || Object.keys(s.collection).length > 0 || s.lifetimeSteps > 0 || s.stepsToday > 0
  );
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
  };
}

/**
 * Raises today's counter to a total reported by the phone (e.g. "steps since
 * midnight"), crediting only the difference. It never lowers the counter, so
 * reading the same total twice, or a total below what we already counted
 * (simulated steps), changes nothing.
 */
export function raiseStepsToday<T extends GameData>(s: T, total: number, today: string): T {
  const rolled = rollDay(s, today);
  if (!Number.isFinite(total)) return rolled;
  return addSteps(rolled, Math.floor(total) - rolled.stepsToday, today);
}

/**
 * Steps and Wood credited by the server since the "your walk paid off" popup
 * last showed. It adds up across opens until it reaches HAUL_MIN_STEPS.
 */
export interface Haul {
  steps: number;
  wood: number;
}

export const EMPTY_HAUL: Haul = { steps: 0, wood: 0 };
/** The popup shows on an app open once at least this many steps were credited. */
export const HAUL_MIN_STEPS = 500;

export function addToHaul(h: Haul, credited: number, wood: number): Haul {
  const c = Number.isFinite(credited) ? Math.max(0, Math.floor(credited)) : 0;
  const w = Number.isFinite(wood) ? Math.max(0, Math.floor(wood)) : 0;
  if (c === 0 && w === 0) return h;
  return { steps: h.steps + c, wood: h.wood + w };
}

export const haulReady = (h: Haul) => h.steps >= HAUL_MIN_STEPS;

/** Rough steps still to walk for `wood` more Wood, for "~N steps to go" hints. */
export const stepsForWood = (wood: number) => Math.ceil(Math.max(0, wood) / WOOD_DROP_CHANCE);

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

export function placedCount(s: Pick<GameData, 'city'>, itemId: ItemId): number {
  return s.city.filter((p) => p.itemId === itemId).length;
}

/** Copies of an item that are owned but not standing in this city or any other. */
export function available(s: Pick<GameData, 'collection' | 'city' | 'placedElsewhere'>, itemId: ItemId): number {
  return (s.collection[itemId]?.count ?? 0) - placedCount(s, itemId) - (s.placedElsewhere[itemId] ?? 0);
}

// ── Cities ───────────────────────────────────────────────────────────────────

/** The id of the city `city` holds (null before the first sync: the first city). */
export function activeCityOf(s: Pick<GameData, 'activeCityId' | 'cities'>): string | null {
  return s.activeCityId ?? s.cities[0]?.id ?? null;
}

/** Wood the next city costs when the player already has `count` (the first one is free). */
export const cityPrice = (count: number) => Math.max(0, count) * CITY_PRICE_STEP;

/** "<name>'s Town" for the first city, "Town N" for the others, unless renamed. */
export function cityDisplayName(cities: readonly CitySummary[], id: string | null, displayName: string): string {
  const i = id ? cities.findIndex((c) => c.id === id) : 0;
  const city = cities[i];
  if (city?.name) return city.name;
  return i <= 0 ? `${displayName}'s Town` : `Town ${i + 1}`;
}

/** Same tidy-up as display names, within the city-name bound. Null for an unusable name. */
export function cleanCityName(raw: string): string | null {
  const name = raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (name.length === 0 || [...name].length > CITY_NAME_MAX) return null;
  return name;
}

/** Lots a set of objects covers (multi-lot buildings count every lot). */
export const lotsCovered = (city: readonly Placed[]) => city.reduce((n, p) => n + cellsOf(p.itemId).length, 0);

function addCount(counts: Partial<Record<ItemId, number>>, itemId: ItemId, by: number) {
  const n = (counts[itemId] ?? 0) + by;
  if (n > 0) counts[itemId] = n;
  else delete counts[itemId];
}

/**
 * Makes `toId` the active city with `tiles` as its objects (cached, possibly
 * stale: the next sync corrects them). The outgoing city's objects join
 * `placedElsewhere` and the incoming ones leave it, so the pool stays shared.
 */
export function switchCity<T extends GameData>(s: T, toId: string, tiles: readonly Placed[]): T {
  if (toId === activeCityOf(s)) return s;
  const placedElsewhere = { ...s.placedElsewhere };
  for (const p of s.city) addCount(placedElsewhere, p.itemId, 1);
  for (const p of tiles) addCount(placedElsewhere, p.itemId, -1);
  return { ...s, activeCityId: toId, city: [...tiles], placedElsewhere };
}

/** The object stored at exactly this anchor lot (not just covering it). */
export function tileAt(s: Pick<GameData, 'city'>, x: number, y: number): Placed | undefined {
  return s.city.find((p) => p.x === x && p.y === y);
}

const onGrid = (x: number, y: number) =>
  Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;

/** Lot index → index in `city` of the object covering it, or -1. */
export function occupancy(city: readonly Placed[]): Int16Array {
  const lots = new Int16Array(GRID_SIZE * GRID_SIZE).fill(-1);
  city.forEach((p, i) => {
    for (const [dx, dy] of cellsOf(p.itemId)) {
      const x = p.x + dx;
      const y = p.y + dy;
      if (onGrid(x, y)) lots[y * GRID_SIZE + x] = i;
    }
  });
  return lots;
}

/** The object covering lot (x, y), whichever of its cells that is. */
export function objectAt(s: Pick<GameData, 'city'>, x: number, y: number): Placed | undefined {
  if (!onGrid(x, y)) return undefined;
  for (const p of s.city) {
    for (const [dx, dy] of cellsOf(p.itemId)) {
      if (p.x + dx === x && p.y + dy === y) return p;
    }
  }
  return undefined;
}

/**
 * Whether `itemId` anchored at (x, y) lies fully on the lawn without covering
 * another object. `ignore` objects don't count (the ones being moved).
 */
export function fits(
  s: Pick<GameData, 'city'>,
  itemId: ItemId,
  x: number,
  y: number,
  ignore: readonly Placed[] = [],
): boolean {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  const lots = occupancy(s.city);
  for (const [dx, dy] of cellsOf(itemId)) {
    const cx = x + dx;
    const cy = y + dy;
    if (!onGrid(cx, cy)) return false;
    const owner = lots[cy * GRID_SIZE + cx];
    if (owner >= 0 && !ignore.includes(s.city[owner])) return false;
  }
  return true;
}

export function placeItem<T extends GameData>(
  s: T,
  itemId: ItemId,
  x: number,
  y: number,
): T | null {
  if (available(s, itemId) <= 0 || !fits(s, itemId, x, y)) return null;
  return { ...s, city: [...s.city, { itemId, x, y }] };
}

/** Removes the object anchored at (x, y). */
export function removeAt<T extends GameData>(s: T, x: number, y: number): T | null {
  if (!tileAt(s, x, y)) return null;
  return { ...s, city: s.city.filter((p) => !(p.x === x && p.y === y)) };
}

/**
 * Moves the object anchored at (fx, fy) so its anchor lands on (tx, ty), if it
 * fits there (its own old lots don't count). When it doesn't, but an object
 * with the very same footprint is anchored at (tx, ty), the two swap places.
 * Same rule as the server's move_item. Null when nothing is anchored at the
 * source, both are the same lot, or neither works.
 */
export function moveItem<T extends GameData>(s: T, fx: number, fy: number, tx: number, ty: number): T | null {
  if (!onGrid(tx, ty) || (fx === tx && fy === ty)) return null;
  const from = tileAt(s, fx, fy);
  if (!from) return null;
  if (fits(s, from.itemId, tx, ty, [from])) {
    return { ...s, city: s.city.map((p) => (p === from ? { ...p, x: tx, y: ty } : p)) };
  }
  const to = tileAt(s, tx, ty);
  if (!to || !sameFootprint(from.itemId, to.itemId)) return null;
  return {
    ...s,
    city: s.city.map((p) => {
      if (p === from) return { ...p, x: tx, y: ty };
      if (p === to) return { ...p, x: fx, y: fy };
      return p;
    }),
  };
}

/**
 * Keeps the objects that fit, in order, dropping any that would leave the lawn
 * or cover an earlier one (they return to the inventory: "available" is owned
 * minus placed). For cities laid out before items had real footprints.
 */
export function fitCity(city: readonly Placed[]): Placed[] {
  const kept: Placed[] = [];
  for (const p of city) {
    if (fits({ city: kept }, p.itemId, p.x, p.y)) kept.push(p);
  }
  return kept;
}

/**
 * A city change made locally that the server hasn't confirmed yet. `cityId`
 * null means the player's first city (changes queued before cities existed).
 */
export type CityOp = { cityId: string | null } & (
  | { op: 'place'; itemId: ItemId; x: number; y: number }
  | { op: 'remove'; x: number; y: number }
  | { op: 'move'; fx: number; fy: number; tx: number; ty: number }
);

/**
 * Re-applies queued city changes on top of a (server) state, in order. Changes
 * that no longer fit (tile taken, item not owned) are skipped, so the result is
 * always a valid city. Changes to other cities don't touch `city`, but their
 * placements still take a copy from the shared pool.
 */
export function applyCityOps<T extends GameData>(s: T, ops: readonly CityOp[]): T {
  let out = s;
  const active = activeCityOf(s);
  for (const o of ops) {
    if ((o.cityId ?? s.cities[0]?.id ?? null) !== active) {
      if (o.op === 'place' && available(out, o.itemId) > 0) {
        const placedElsewhere = { ...out.placedElsewhere };
        addCount(placedElsewhere, o.itemId, 1);
        out = { ...out, placedElsewhere };
      }
      continue;
    }
    const next =
      o.op === 'place'
        ? placeItem(out, o.itemId, o.x, o.y)
        : o.op === 'remove'
          ? removeAt(out, o.x, o.y)
          : moveItem(out, o.fx, o.fy, o.tx, o.ty);
    if (next) out = next;
  }
  return out;
}

/** The fields the daily step history is derived from. */
export type DayData = Pick<GameData, 'dateKey' | 'stepsToday' | 'history'>;

/** The last `days` calendar days ending today, oldest first. */
export function recentDays(s: DayData, today: Date, days = 7): { key: string; steps: number }[] {
  const out: { key: string; steps: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = dayKey(d);
    out.push({ key, steps: key === s.dateKey ? s.stepsToday : (s.history[key] ?? 0) });
  }
  return out;
}

export interface WeekSummary {
  total: number;
  /** Rounded mean over every day passed in, including days with no steps. */
  average: number;
  /** Days with at least `goal` steps. */
  goalsHit: number;
  best: number;
}

export function weekSummary(week: { steps: number }[], goal: number): WeekSummary {
  const total = week.reduce((a, d) => a + d.steps, 0);
  return {
    total,
    average: week.length ? Math.round(total / week.length) : 0,
    goalsHit: week.filter((d) => d.steps >= goal).length,
    best: week.reduce((a, d) => Math.max(a, d.steps), 0),
  };
}

/** Consecutive days, ending today or yesterday, with at least one step. */
export function streak(s: DayData, today: Date): number {
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

export function uniqueOwned(s: Pick<GameData, 'collection'>): number {
  return Object.values(s.collection).filter((o) => o && o.count > 0).length;
}

export function foilsOwned(s: Pick<GameData, 'collection'>): number {
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
  const t = objectAt(s, x, y);
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
