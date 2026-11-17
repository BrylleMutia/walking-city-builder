import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { tilesPerCard } from '../data/items';
import { getListing } from '../data/sets';
import type { ItemId } from '../data/sets/cozyDowntown';
import { setHapticsEnabled } from '../lib/haptics';
import type { PackCard } from '../logic/openPack';
import * as api from './backend';
import { BackendError, type BackendReason } from './backend';
import * as G from './gameLogic';
import { applyServerState, toPackCards } from './serverState';

export type SensorStatus = 'checking' | 'live' | 'unavailable';

/**
 * Connection to the game server (Supabase):
 * - connecting: signing in / loading
 * - online: signed in, local state reflects the server
 * - offline: no network or server unreachable (steps keep counting locally and
 *   are credited on the next connect; buying packs is unavailable)
 * - signin_disabled: the project doesn't allow anonymous sign-ins yet
 */
export type CloudStatus = 'connecting' | 'online' | 'offline' | 'signin_disabled';

export interface Settings {
  hapticsOn: boolean;
  /** Testing aids for pack rolls; the server honours them only for tester accounts. */
  forceLegendary: boolean;
  forceFoil: boolean;
}

export interface PendingPack {
  setId: string;
  cards: PackCard[];
  /** Changes with every purchase, so the opening screen can remount per pack. */
  nonce: number;
}

export type BuyResult = { ok: true } | { ok: false; reason: BackendReason };

interface GameStore extends G.GameData, Settings {
  /** Not persisted. */
  hydrated: boolean;
  sensor: SensorStatus;
  cloud: CloudStatus;
  /** The pack bought most recently, waiting to be opened on the pack screen. */
  pendingPack: PendingPack | null;

  /** Signs in (anonymously), uploads steps walked offline, then loads the server state. */
  connect: () => Promise<void>;
  addSteps: (n: number) => void;
  syncDay: () => void;
  setGoal: (goal: number) => void;
  /** Buys a pack on the server (which pays, rolls and grants the cards). */
  buyPack: (setId: string) => Promise<BuyResult>;
  /** Optimistic: updates the city at once, then confirms with the server. */
  placeItem: (itemId: ItemId, x: number, y: number) => boolean;
  removeAt: (x: number, y: number) => boolean;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setSensor: (status: SensorStatus) => void;
  reset: () => Promise<boolean>;
}

const STEP_SYNC_DELAY = 1200;
let stepSyncTimer: ReturnType<typeof setTimeout> | null = null;
let connecting: Promise<void> | null = null;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      /** Reloads everything from the server (used after any rejected change). */
      const refresh = async () => {
        try {
          const server = await api.fetchState();
          set((s) => applyServerState(s, server, G.dayKey()));
        } catch (e) {
          if (e instanceof BackendError && e.reason === 'offline') set({ cloud: 'offline' });
        }
      };

      const flushSteps = async () => {
        const s = get();
        if (s.cloud !== 'online') return;
        try {
          const res = await api.syncSteps(s.dateKey, s.stepsToday);
          set({ balance: res.balance });
        } catch (e) {
          if (e instanceof BackendError && e.reason === 'offline') set({ cloud: 'offline' });
        }
      };

      return {
        ...G.initialData(),
        hapticsOn: true,
        forceLegendary: false,
        forceFoil: false,
        hydrated: false,
        sensor: 'checking',
        cloud: 'connecting',
        pendingPack: null,

        connect: () => {
          connecting ??= (async () => {
            set({ cloud: 'connecting' });
            try {
              await api.ensureSession();
              // Credit steps walked while offline (the server keeps the max per day,
              // so re-sending is harmless), then take the server's state as truth.
              const s = get();
              const today = G.dayKey();
              const days = G.recentDays(s, new Date(), 8).filter((d) => d.steps > 0);
              for (const d of days) await api.syncSteps(d.key, d.steps);
              const server = await api.fetchState();
              set((cur) => ({ ...applyServerState(cur, server, today), cloud: 'online' }));
            } catch (e) {
              const reason = e instanceof BackendError ? e.reason : 'unknown';
              set({ cloud: reason === 'anonymous_disabled' ? 'signin_disabled' : 'offline' });
            } finally {
              connecting = null;
            }
          })();
          return connecting;
        },

        addSteps: (n) => {
          set((s) => G.addSteps(s, n, G.dayKey()));
          // Batch rapid step updates into one server call.
          if (stepSyncTimer) clearTimeout(stepSyncTimer);
          stepSyncTimer = setTimeout(() => {
            stepSyncTimer = null;
            void flushSteps();
          }, STEP_SYNC_DELAY);
        },
        syncDay: () => set((s) => G.rollDay(s, G.dayKey())),
        setGoal: (goal) => {
          const next = Math.min(30000, Math.max(1000, goal));
          set({ goal: next });
          if (get().cloud === 'online') api.updateGoal(next).catch(() => {});
        },

        buyPack: async (setId) => {
          const listing = getListing(setId);
          if (!listing?.set) return { ok: false, reason: 'set_not_available' };
          if (get().cloud !== 'online') await get().connect();
          if (get().cloud !== 'online') return { ok: false, reason: 'offline' };
          // Make sure the server has today's latest steps before it checks the balance.
          if (stepSyncTimer) {
            clearTimeout(stepSyncTimer);
            stepSyncTimer = null;
            await flushSteps();
          }
          try {
            const s = get();
            const res = await api.buyPack(setId, s.forceLegendary, s.forceFoil);
            const cards = toPackCards(res.cards);
            set((cur) => {
              // Mirror what the server granted, so the city updates without a reload.
              const collection = { ...cur.collection };
              for (const c of cards) {
                const prev = collection[c.item.id] ?? { count: 0, foil: 0 };
                collection[c.item.id] = {
                  count: prev.count + tilesPerCard(c.item.id),
                  foil: prev.foil + (c.foil ? 1 : 0),
                };
              }
              return {
                balance: res.balance,
                collection,
                packsOpened: cur.packsOpened + 1,
                pendingPack: { setId, cards, nonce: (cur.pendingPack?.nonce ?? 0) + 1 },
              };
            });
            return { ok: true };
          } catch (e) {
            const reason = e instanceof BackendError ? e.reason : 'unknown';
            if (reason === 'offline') set({ cloud: 'offline' });
            if (reason === 'insufficient_steps') void refresh();
            return { ok: false, reason };
          }
        },

        placeItem: (itemId, x, y) => {
          const next = G.placeItem(get(), itemId, x, y);
          if (!next) return false;
          set(next);
          if (get().cloud === 'online') {
            api.placeItem(itemId, x, y).catch(() => void refresh());
          }
          return true;
        },
        removeAt: (x, y) => {
          const next = G.removeAt(get(), x, y);
          if (!next) return false;
          set(next);
          if (get().cloud === 'online') {
            api.removeItem(x, y).catch(() => void refresh());
          }
          return true;
        },

        setSetting: (key, value) => {
          if (key === 'hapticsOn') setHapticsEnabled(value as boolean);
          set({ [key]: value } as Partial<GameStore>);
        },
        setSensor: (sensor) => set({ sensor }),

        reset: async () => {
          if (get().cloud !== 'online') return false;
          try {
            await api.resetProgress();
            set({ ...G.initialData(), pendingPack: null });
            await refresh();
            return true;
          } catch {
            return false;
          }
        },
      };
    },
    {
      name: 'walking-pack-city/v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Only durable game data is written to disk: a cache of the last server
      // state for instant start-up. No functions, no session state.
      partialize: (state) => {
        const skip = new Set(['hydrated', 'sensor', 'cloud', 'pendingPack']);
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(state)) {
          if (typeof v !== 'function' && !skip.has(k)) data[k] = v;
        }
        return data as unknown as GameStore;
      },
      onRehydrateStorage: () => (state) => {
        if (state) setHapticsEnabled(state.hapticsOn);
        // Deferred: the store constant isn't assigned yet if storage answers synchronously.
        setTimeout(() => useGameStore.setState({ hydrated: true }), 0);
      },
    },
  ),
);
