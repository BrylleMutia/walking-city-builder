import { isAvatarId } from '../data/avatars';
import { getItem } from '../data/items';
import type { ItemId } from '../data/sets/types';
import {
  CITY_NAME_MAX,
  EMPTY_HAUL,
  GRID_SIZE,
  fitCity,
  initialData,
  type CityOp,
  type CitySummary,
  type GameData,
  type Haul,
  type Owned,
  type Placed,
} from './gameLogic';
import { sanitizeIds, sanitizeNotices, type Notice } from './notifications';

/**
 * The on-disk cache of the game store (zustand persist) and how old caches are
 * upgraded. The server is the source of truth, so the cache only has to be
 * *safe* until the next sync, never perfect.
 *
 * Bump CACHE_VERSION whenever the shape of a persisted field changes, and add a
 * step for the old version in `migrateCache` (renames, unit changes, …) before
 * the final sanitize pass.
 */
export const CACHE_VERSION = 7;

/** Everything the store writes to disk. */
export interface CachedData extends GameData {
  hapticsOn: boolean;
  soundOn: boolean;
  forceLegendary: boolean;
  forceFoil: boolean;
  pendingCity: CityOp[];
  /** The first-run onboarding has been finished (or skipped) on this install. */
  onboarded: boolean;
  /** Name or step goal changed locally and the server doesn't have them yet. */
  profilePending: boolean;
  /** Steps and Wood credited since the "your walk paid off" popup last showed. */
  haul: Haul;
  /**
   * Last known tiles of cities other than the active one (only those seen on
   * this phone), so switching back is instant and works offline.
   */
  cityTiles: Record<string, Placed[]>;
  /** Newest notifications from the server, so the bell's dot shows at launch and offline. */
  notifications: Notice[];
  /** Notifications read on this phone that the server hasn't confirmed yet (re-sent on connect). */
  notificationsReadPending: string[];
}

type Raw = Record<string, unknown>;

const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const count = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
/** Same bounds as the server column (1–32 characters after trimming). */
const name = (v: unknown, fallback: string) => {
  const t = typeof v === 'string' ? v.trim() : '';
  return t.length >= 1 && t.length <= 32 ? t : fallback;
};
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isItem = (v: unknown): v is ItemId => typeof v === 'string' && !!getItem(v as ItemId);
/** Server ids are uuids. */
const isId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
const onGrid = (x: unknown, y: unknown): boolean =>
  Number.isInteger(x) && Number.isInteger(y) && (x as number) >= 0 && (y as number) >= 0 &&
  (x as number) < GRID_SIZE && (y as number) < GRID_SIZE;

/**
 * Field-by-field copy of a cache into the current shape. Anything missing, of
 * the wrong type, or naming an item this build doesn't know falls back to the
 * fresh-player default, so the app can always render while it reconnects.
 */
export function sanitizeCache(raw: unknown, today?: string): CachedData {
  const d = initialData(today);
  const r = isObj(raw) ? raw : {};

  const history: Record<string, number> = {};
  if (isObj(r.history)) {
    for (const [k, v] of Object.entries(r.history)) if (isDay(k) && count(v, -1) >= 0) history[k] = count(v, 0);
  }

  const collection: Partial<Record<ItemId, Owned>> = {};
  if (isObj(r.collection)) {
    for (const [k, v] of Object.entries(r.collection)) {
      if (isItem(k) && isObj(v)) collection[k] = { count: count(v.count, 0), foil: count(v.foil, 0) };
    }
  }

  const city = tiles(r.city);

  const cities: CitySummary[] = [];
  if (Array.isArray(r.cities)) {
    for (const c of r.cities) {
      if (!isObj(c) || !isId(c.id) || cities.some((k) => k.id === c.id)) continue;
      const cityName = typeof c.name === 'string' && c.name.trim().length >= 1 && c.name.length <= CITY_NAME_MAX ? c.name : null;
      cities.push({ id: c.id, name: cityName, position: count(c.position, cities.length), lots: count(c.lots, 0) });
    }
  }
  const knownCity = (id: unknown): id is string => isId(id) && cities.some((c) => c.id === id);

  const placedElsewhere: Partial<Record<ItemId, number>> = {};
  if (isObj(r.placedElsewhere)) {
    for (const [k, v] of Object.entries(r.placedElsewhere)) if (isItem(k) && count(v, 0) > 0) placedElsewhere[k] = count(v, 0);
  }

  const activeCityId = knownCity(r.activeCityId) ? r.activeCityId : null;
  const cityTiles: Record<string, Placed[]> = {};
  if (isObj(r.cityTiles)) {
    for (const [id, list] of Object.entries(r.cityTiles)) {
      if (knownCity(id) && id !== activeCityId) cityTiles[id] = fitCity(tiles(list));
    }
  }

  const pendingCity: CityOp[] = [];
  if (Array.isArray(r.pendingCity)) {
    for (const o of r.pendingCity) {
      if (!isObj(o)) continue;
      // Ops queued before cities existed (cache v4) belong to the first city.
      const cityId = isId(o.cityId) ? o.cityId : null;
      if (o.op === 'move') {
        if (onGrid(o.fx, o.fy) && onGrid(o.tx, o.ty)) {
          pendingCity.push({ cityId, op: 'move', fx: o.fx as number, fy: o.fy as number, tx: o.tx as number, ty: o.ty as number });
        }
        continue;
      }
      if (!onGrid(o.x, o.y)) continue;
      const x = o.x as number;
      const y = o.y as number;
      if (o.op === 'place' && isItem(o.itemId)) pendingCity.push({ cityId, op: 'place', itemId: o.itemId, x, y });
      else if (o.op === 'remove') pendingCity.push({ cityId, op: 'remove', x, y });
    }
  }

  return {
    dateKey: isDay(r.dateKey) ? r.dateKey : d.dateKey,
    stepsToday: count(r.stepsToday, d.stepsToday),
    history,
    lifetimeSteps: count(r.lifetimeSteps, d.lifetimeSteps),
    balance: count(r.balance, d.balance),
    goal: count(r.goal, d.goal),
    displayName: name(r.displayName, d.displayName),
    collection,
    // Every object must fit its footprint (a cache from before items covered
    // several lots may overlap): later ones that don't go back to the inventory,
    // like the server's `item_footprints` migration did.
    city: fitCity(city),
    cities,
    activeCityId,
    placedElsewhere,
    cityTiles,
    packsOpened: count(r.packsOpened, d.packsOpened),
    hapticsOn: bool(r.hapticsOn, true),
    soundOn: bool(r.soundOn, true),
    forceLegendary: bool(r.forceLegendary, false),
    forceFoil: bool(r.forceFoil, false),
    pendingCity,
    onboarded: bool(r.onboarded, false),
    profilePending: bool(r.profilePending, false),
    avatarId: isAvatarId(r.avatarId) ? r.avatarId : d.avatarId,
    haul: isObj(r.haul) ? { steps: count(r.haul.steps, 0), wood: count(r.haul.wood, 0) } : EMPTY_HAUL,
    notifications: sanitizeNotices(r.notifications),
    notificationsReadPending: sanitizeIds(r.notificationsReadPending),
  };
}

/** The persisted fields only (an allow-list, so new session-only state never leaks to disk). */
export function toCache(s: CachedData): CachedData {
  return {
    dateKey: s.dateKey,
    stepsToday: s.stepsToday,
    history: s.history,
    lifetimeSteps: s.lifetimeSteps,
    balance: s.balance,
    goal: s.goal,
    displayName: s.displayName,
    avatarId: s.avatarId,
    collection: s.collection,
    city: s.city,
    cities: s.cities,
    activeCityId: s.activeCityId,
    placedElsewhere: s.placedElsewhere,
    cityTiles: s.cityTiles,
    packsOpened: s.packsOpened,
    hapticsOn: s.hapticsOn,
    soundOn: s.soundOn,
    forceLegendary: s.forceLegendary,
    forceFoil: s.forceFoil,
    pendingCity: s.pendingCity,
    onboarded: s.onboarded,
    profilePending: s.profilePending,
    haul: s.haul,
    notifications: s.notifications,
    notificationsReadPending: s.notificationsReadPending,
  };
}

/**
 * zustand persist `migrate`: called when the stored version differs from
 * CACHE_VERSION (older *or* newer, e.g. after an app downgrade).
 *
 * Version history:
 * - 0: caches written before versioning existed. Same shape as 1.
 * - 1: versioned, same shape.
 * - 2: adds `onboarded`, `displayName`, `profilePending` and `avatarId`.
 * - 3: the lawn grew from 12×12 to 16×16 and towns moved by +CITY_SHIFT on
 *   both axes (server migration `city_grid_16`).
 * - 4: the currency changed from Steps to Wood (server migration
 *   `wood_currency`): `balance` is divided by 5, like the server's wallets, and
 *   `haul` is added.
 * - 5: several cities per player (server migration `multi_city`): adds
 *   `cities`, `activeCityId`, `placedElsewhere` and `cityTiles`, and every
 *   queued city op gets a `cityId` (null = the first city, which is where the
 *   v4 town now lives). Sanitize fills all of it in.
 * - 6: in-app notifications (server migration `notifications`): adds
 *   `notifications` and `notificationsReadPending`, both empty until the next
 *   sync (sanitize fills them in).
 * - 7: pack-reveal chimes: adds the `soundOn` setting (on by default; sanitize
 *   fills it in). Current shape, `CachedData`.
 */
export function migrateCache(persisted: unknown, fromVersion: number, today?: string): CachedData {
  let data = persisted;
  // Anyone with a cache from before onboarding existed is already playing:
  // don't send them through the first-run flow. (A fresh install has no cache.)
  if (fromVersion < 2 && isObj(data)) data = { ...data, onboarded: true };
  // Same shift as the server, for the cached town and for changes queued
  // offline before the update (they must replay onto the moved lots).
  if (fromVersion < 3 && isObj(data)) {
    data = { ...data, city: shiftTiles(data.city), pendingCity: shiftTiles(data.pendingCity) };
  }
  // Steps → Wood: packs went from 1,000 Steps to 200 Wood, so same buying power.
  if (fromVersion < 4 && isObj(data) && typeof data.balance === 'number') {
    data = { ...data, balance: Math.floor(data.balance / 5) };
  }
  // Future shape changes: transform `data` here, oldest version first.
  return sanitizeCache(data, today);
}

/** A list of placed objects, keeping only well-formed entries. */
function tiles(list: unknown): Placed[] {
  const out: Placed[] = [];
  if (!Array.isArray(list)) return out;
  for (const p of list) {
    if (!isObj(p) || !isItem(p.itemId) || !onGrid(p.x, p.y)) continue;
    out.push({ itemId: p.itemId, x: p.x as number, y: p.y as number });
  }
  return out;
}

/** How far towns moved when the lawn grew from 12×12 to 16×16 (re-centered). */
export const CITY_SHIFT = 2;

/** Moves every `{ x, y }` entry by CITY_SHIFT; anything else is left for sanitize to judge. */
function shiftTiles(list: unknown): unknown {
  if (!Array.isArray(list)) return list;
  return list.map((t) =>
    isObj(t) && typeof t.x === 'number' && typeof t.y === 'number'
      ? { ...t, x: t.x + CITY_SHIFT, y: t.y + CITY_SHIFT }
      : t,
  );
}
