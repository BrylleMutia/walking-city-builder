import { DEFAULT_AVATAR, isAvatarId } from '../data/avatars';
import { getItem } from '../data/items';
import type { Rarity } from '../data/rarity';
import type { ItemId } from '../data/sets/cozyDowntown';
import type { PackCard } from '../logic/openPack';
import type { GameData, Owned, Placed } from './gameLogic';

/** Shape of `get_my_state()` from the database. */
export interface ServerState {
  profile: {
    display_name: string;
    step_goal: number;
    /** Older servers don't send it. */
    avatar_id?: string;
    balance: number;
    lifetime_steps: number;
    packs_opened: number;
    is_tester: boolean;
  } | null;
  /** day (YYYY-MM-DD) → steps */
  steps: Record<string, number>;
  inventory: Record<string, { count: number; foil: number }>;
  city: { x: number; y: number; item_id: string }[];
}

/** One card as returned by `buy_pack()`. */
export interface ServerCard {
  position: number;
  item_id: string;
  rarity: string;
  foil: boolean;
}

/**
 * Replaces the local game data with the server's (the server is authoritative).
 * Ids the app doesn't know yet (e.g. a set added on the server before an app
 * update) are skipped rather than crashing the UI.
 */
export function applyServerState<T extends GameData>(
  s: T,
  server: ServerState,
  today: string,
  /**
   * True while today's local steps are still on their way to the server: steps
   * counted beyond the server's total for today are kept (and their Steps
   * credited locally), so a refresh mid-walk doesn't make the counter jump back.
   */
  keepUnsyncedSteps = false,
): T {
  const history: Record<string, number> = {};
  for (const [day, steps] of Object.entries(server.steps)) {
    if (day !== today && steps > 0) history[day] = steps;
  }

  const collection: Partial<Record<ItemId, Owned>> = {};
  for (const [id, owned] of Object.entries(server.inventory)) {
    if (getItem(id as ItemId)) collection[id as ItemId] = { count: owned.count, foil: owned.foil };
  }

  const city: Placed[] = server.city
    .filter((t) => getItem(t.item_id as ItemId))
    .map((t) => ({ itemId: t.item_id as ItemId, x: t.x, y: t.y }));

  const p = server.profile;
  const serverToday = server.steps[today] ?? 0;
  const unsynced = keepUnsyncedSteps && s.dateKey === today ? Math.max(0, s.stepsToday - serverToday) : 0;
  return {
    ...s,
    dateKey: today,
    stepsToday: serverToday + unsynced,
    history,
    collection,
    city,
    ...(p
      ? {
          balance: p.balance + unsynced,
          goal: p.step_goal,
          displayName: p.display_name,
          avatarId: isAvatarId(p.avatar_id) ? p.avatar_id : DEFAULT_AVATAR,
          lifetimeSteps: p.lifetime_steps + unsynced,
          packsOpened: p.packs_opened,
        }
      : {}),
  };
}

/** Turns server-rolled cards into the app's PackCard objects (already sorted). */
export function toPackCards(cards: ServerCard[]): PackCard[] {
  return [...cards]
    .sort((a, b) => a.position - b.position)
    .flatMap((c) => {
      const item = getItem(c.item_id as ItemId);
      if (!item) return [];
      return [{ uid: `${c.position}-${c.item_id}`, item, rarity: c.rarity as Rarity, foil: c.foil }];
    });
}
