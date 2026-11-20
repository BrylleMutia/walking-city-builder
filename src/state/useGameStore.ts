import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { tilesPerCard } from '../data/items';
import { toast } from '../components/ui/toast';
import { isAvatarId, type AvatarId } from '../data/avatars';
import { getListing } from '../data/sets';
import type { ItemId } from '../data/sets/cozyDowntown';
import { setHapticsEnabled } from '../lib/haptics';
import type { PackCard } from '../logic/openPack';
import * as api from './backend';
import { BackendError, type BackendReason } from './backend';
import { CACHE_VERSION, migrateCache, sanitizeCache, toCache } from './cache';
import * as G from './gameLogic';
import { applyServerState, toPackCards } from './serverState';

/**
 * Step sensor: `unavailable` = this phone/build can't count steps (Expo Go on
 * Android); `denied` = it could, but the player said no to the permission.
 */
export type SensorStatus = 'checking' | 'live' | 'unavailable' | 'denied';

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
  /**
   * City changes made while offline (or whose request was cut off), in order.
   * Persisted, replayed on the next connect before the server state is loaded.
   */
  pendingCity: G.CityOp[];
  /** Persisted: the first-run onboarding is done on this install. */
  onboarded: boolean;
  /** Not persisted (the auth session is the source): the saved email, or null for a guest. */
  accountEmail: string | null;
  /** Persisted: name, goal or avatar changed here and the server doesn't have them yet. */
  profilePending: boolean;
  /**
   * Not persisted. The player pressed "count my steps" during onboarding, so
   * the tracker may start (and show the permission prompt) before `onboarded`.
   */
  stepTrackingRequested: boolean;

  /** Signs in (anonymously), uploads steps walked offline, then loads the server state. */
  connect: () => Promise<void>;
  addSteps: (n: number) => void;
  /** Raises today's steps to a total read from the phone; never lowers them. */
  raiseStepsToday: (total: number) => void;
  syncDay: () => void;
  /** Kept locally and re-sent on the next connect if the server can't be reached. */
  setGoal: (goal: number) => void;
  /** Same queueing as the goal. Returns false (and changes nothing) for an unusable name. */
  setDisplayName: (name: string) => boolean;
  /** Same queueing as the name and goal. */
  setAvatar: (id: AvatarId) => void;
  /** Re-reads the saved email from the auth session (after the email code is confirmed). */
  refreshAccount: () => Promise<void>;
  /**
   * Signs this phone in to an existing email account with the emailed code,
   * replacing the guest's local data with the account's. Throws BackendError
   * (the guest stays signed in) when the code is refused.
   */
  signIn: (email: string, code: string) => Promise<void>;
  requestStepTracking: () => void;
  completeOnboarding: () => void;
  /** Testing: shows the first-run flow again. */
  replayOnboarding: () => void;
  /** Buys a pack on the server (which pays, rolls and grants the cards). */
  buyPack: (setId: string) => Promise<BuyResult>;
  /** Optimistic: updates the city at once, then confirms with the server. */
  placeItem: (itemId: ItemId, x: number, y: number) => boolean;
  removeAt: (x: number, y: number) => boolean;
  /** Optimistic: moves an object (or swaps two) at once, then confirms with the server. */
  moveItem: (fx: number, fy: number, tx: number, ty: number) => boolean;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setSensor: (status: SensorStatus) => void;
  reset: () => Promise<boolean>;
  /** Stops live updates while the app is in the background (connect() resumes them). */
  pauseLive: () => void;
}

const STEP_SYNC_DELAY = 1200;
let stepSyncTimer: ReturnType<typeof setTimeout> | null = null;
let connecting: Promise<void> | null = null;

/** Live sync (changes from the player's other devices). */
const LIVE_REFRESH_DELAY = 400;
let stopLive: (() => void) | null = null;
let liveRefreshTimer: ReturnType<typeof setTimeout> | null = null;
/** A step sync is being sent right now (see applyServerState's keepUnsyncedSteps). */
let flushingSteps = false;
/** City changes sent to the server but not answered yet. */
let inflightCity: G.CityOp[] = [];
/** The "saved for later" toast shows once per offline stretch, not on every placement. */
let offlineNoticeShown = false;
/** Purchases in progress: a refresh then could undo the cards being granted. */
let buying = 0;
/** Bumped by every local change a refresh started earlier wouldn't include. */
let localGen = 0;

/** The server's profile is truth, except while a local change is still waiting to be sent. */
const keepLocalProfile = <T extends G.GameData>(
  cur: { goal: number; displayName: string; avatarId: AvatarId; profilePending: boolean },
  next: T,
): T =>
  cur.profilePending ? { ...next, goal: cur.goal, displayName: cur.displayName, avatarId: cur.avatarId } : next;

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      /**
       * Takes the server's state as truth, then puts any still-queued local city
       * changes back on top so they never visibly disappear.
       */
      const adoptServer = (server: Awaited<ReturnType<typeof api.fetchState>>) =>
        set((cur) => {
          const unsynced = stepSyncTimer !== null || flushingSteps;
          const next = keepLocalProfile(cur, applyServerState(cur, server, G.dayKey(), unsynced));
          return G.applyCityOps(next, [...cur.pendingCity, ...inflightCity]);
        });

      /** Sends locally changed name/goal/avatar; pending until the server has those exact values. */
      const pushProfile = async () => {
        const { goal, displayName, avatarId } = get();
        try {
          await api.updateProfile({ displayName, goal, avatarId });
          // Changed again while this was out: the newer values are still pending.
          const now = get();
          if (now.goal === goal && now.displayName === displayName && now.avatarId === avatarId) {
            set({ profilePending: false });
          }
        } catch (e) {
          if (e instanceof BackendError && e.reason === 'offline') set({ cloud: 'offline' });
          // Refused for another reason: stop retrying, the server's profile wins.
          else set({ profilePending: false });
        }
      };

      /** Batches rapid step updates into one server call. */
      const scheduleStepSync = () => {
        if (stepSyncTimer) clearTimeout(stepSyncTimer);
        stepSyncTimer = setTimeout(() => {
          stepSyncTimer = null;
          void flushSteps();
        }, STEP_SYNC_DELAY);
      };

      /** Reloads everything from the server (after a rejected change or a live nudge). */
      const refresh = async () => {
        const gen = localGen;
        try {
          const server = await api.fetchState();
          // A purchase finished while we were fetching: this answer may predate
          // it, so fetch again rather than show the old inventory.
          if (gen !== localGen) {
            scheduleRefresh();
            return;
          }
          adoptServer(server);
        } catch (e) {
          if (e instanceof BackendError && e.reason === 'offline') set({ cloud: 'offline' });
        }
      };

      /**
       * Debounced refresh for live nudges: one action on another device sends
       * several (profile + tiles), and our own changes echo back too.
       */
      const scheduleRefresh = () => {
        if (liveRefreshTimer) clearTimeout(liveRefreshTimer);
        liveRefreshTimer = setTimeout(() => {
          liveRefreshTimer = null;
          if (get().cloud !== 'online') return;
          if (buying > 0) scheduleRefresh();
          else void refresh();
        }, LIVE_REFRESH_DELAY);
      };

      const startLive = async (userId: string) => {
        if (stopLive) return;
        try {
          const stop = await api.subscribePlayer(userId, scheduleRefresh);
          // Paused (app backgrounded) while subscribing.
          if (get().cloud !== 'online' || stopLive) stop();
          else stopLive = stop;
        } catch {
          // Live updates are a bonus: foreground connects still keep devices in sync.
        }
      };

      const enqueue = (op: G.CityOp) => {
        set((s) => ({ pendingCity: [...s.pendingCity, op] }));
        // While still connecting the queue replays in a moment: nothing to tell.
        if (offlineNoticeShown || get().cloud === 'connecting') return;
        offlineNoticeShown = true;
        toast.info('Offline: city saved on this phone', {
          id: 'city-offline',
          description: 'Your changes will sync when you’re back online.',
        });
      };

      /** The server call for one city change. */
      const sendOp = (op: G.CityOp): Promise<unknown> =>
        op.op === 'place'
          ? api.placeItem(op.itemId, op.x, op.y)
          : op.op === 'remove'
            ? api.removeItem(op.x, op.y)
            : api.moveItem(op.fx, op.fy, op.tx, op.ty);

      /** Sends one city change; queues it if the connection fails, re-syncs if rejected. */
      const sendCityOp = (op: G.CityOp) => {
        if (get().cloud !== 'online') {
          enqueue(op);
          return;
        }
        const call = sendOp(op);
        // Until the server answers, refreshes re-apply it so it doesn't flicker away.
        inflightCity = [...inflightCity, op];
        const settle = () => {
          inflightCity = inflightCity.filter((o) => o !== op);
        };
        call.then(settle, (e) => {
          settle();
          if (e instanceof BackendError && e.reason === 'offline') {
            set({ cloud: 'offline' });
            enqueue(op);
          } else {
            toast.warning('Couldn’t save that change', {
              id: 'city-rejected',
              description: 'Your city was reloaded from the server.',
            });
            void refresh();
          }
        });
      };

      /**
       * Replays queued city changes in order. A change the server rejects (tile
       * taken, item no longer owned) is dropped: the server state wins. Stops at
       * the first network failure and keeps the rest queued.
       */
      const replayCityQueue = async () => {
        while (get().pendingCity.length > 0) {
          const op = get().pendingCity[0];
          try {
            await sendOp(op);
          } catch (e) {
            if (e instanceof BackendError && e.reason === 'offline') throw e;
          }
          set((s) => ({ pendingCity: s.pendingCity.slice(1) }));
        }
      };

      const flushSteps = async () => {
        const s = get();
        if (s.cloud !== 'online') return;
        flushingSteps = true;
        try {
          const res = await api.syncSteps(s.dateKey, s.stepsToday);
          // Steps counted while the request was out aren't in this balance yet.
          const since = Math.max(0, get().stepsToday - s.stepsToday);
          set({ balance: res.balance + (get().dateKey === s.dateKey ? since : 0) });
        } catch (e) {
          if (e instanceof BackendError && e.reason === 'offline') set({ cloud: 'offline' });
        } finally {
          flushingSteps = false;
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
        pendingCity: [],
        onboarded: false,
        profilePending: false,
        accountEmail: null,
        stepTrackingRequested: false,

        connect: () => {
          connecting ??= (async () => {
            set({ cloud: 'connecting' });
            try {
              const userId = await api.ensureSession();
              set({ accountEmail: await api.getAccountEmail() });
              // Credit steps walked while offline (the server keeps the max per day,
              // so re-sending is harmless), then take the server's state as truth.
              const s = get();
              const today = G.dayKey();
              const days = G.recentDays(s, new Date(), 8).filter((d) => d.steps > 0);
              for (const d of days) await api.syncSteps(d.key, d.steps);
              // City changes made offline go up before we download, so the
              // server state we adopt already includes them.
              const queued = get().pendingCity.length;
              const toldOffline = offlineNoticeShown;
              await replayCityQueue();
              const server = await api.fetchState();
              set((cur) => ({
                ...G.applyCityOps(keepLocalProfile(cur, applyServerState(cur, server, today)), cur.pendingCity),
                cloud: 'online',
              }));
              // Name/goal picked while offline (or during the very first connect).
              if (get().profilePending) void pushProfile();
              offlineNoticeShown = false;
              if (toldOffline && queued > 0) {
                toast.dismiss('city-offline');
                toast.success('Back online', {
                  description: `${queued} city ${queued === 1 ? 'change' : 'changes'} synced.`,
                });
              }
              void startLive(userId);
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
          scheduleStepSync();
        },
        raiseStepsToday: (total) => {
          const before = get().stepsToday;
          set((s) => G.raiseStepsToday(s, total, G.dayKey()));
          if (get().stepsToday > before) scheduleStepSync();
        },
        syncDay: () => set((s) => G.rollDay(s, G.dayKey())),
        setGoal: (goal) => {
          const next = Math.min(30000, Math.max(1000, goal));
          // Pending until the server confirms, so a sync can't put the old goal back.
          set({ goal: next, profilePending: true });
          if (get().cloud === 'online') void pushProfile();
        },
        setDisplayName: (raw) => {
          const name = G.cleanDisplayName(raw);
          if (!name) return false;
          if (name === get().displayName) return true;
          set({ displayName: name, profilePending: true });
          if (get().cloud === 'online') void pushProfile();
          return true;
        },
        setAvatar: (id) => {
          if (!isAvatarId(id) || id === get().avatarId) return;
          set({ avatarId: id, profilePending: true });
          if (get().cloud === 'online') void pushProfile();
        },
        refreshAccount: async () => {
          try {
            set({ accountEmail: await api.getAccountEmail() });
          } catch {
            // Keeps the last known value; the next connect reads it again.
          }
        },
        signIn: async (email, code) => {
          // Quiet the guest first: once the code is accepted every request
          // carries the account's session, so a step sync, live refresh or
          // queued city change from the guest would land in the account.
          await connecting?.catch(() => {});
          get().pauseLive();
          if (stepSyncTimer) clearTimeout(stepSyncTimer);
          stepSyncTimer = null;
          let saved: string;
          try {
            saved = await api.verifySignInCode(email, code);
          } catch (e) {
            void get().connect(); // still the guest: resume live updates
            throw e;
          }
          localGen++;
          inflightCity = [];
          offlineNoticeShown = false;
          // Settings, tester flags and `onboarded` aren't account data: they stay.
          set({
            ...G.initialData(),
            pendingPack: null,
            pendingCity: [],
            profilePending: false,
            accountEmail: saved,
            cloud: 'connecting',
          });
          await get().connect();
        },
        requestStepTracking: () => set({ stepTrackingRequested: true }),
        completeOnboarding: () => set({ onboarded: true }),
        replayOnboarding: () => set({ onboarded: false, stepTrackingRequested: false, sensor: 'checking' }),

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
          buying++;
          try {
            const s = get();
            const res = await api.buyPack(setId, s.forceLegendary, s.forceFoil);
            localGen++;
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
          } finally {
            buying--;
          }
        },

        placeItem: (itemId, x, y) => {
          const next = G.placeItem(get(), itemId, x, y);
          if (!next) return false;
          set(next);
          sendCityOp({ op: 'place', itemId, x, y });
          return true;
        },
        removeAt: (x, y) => {
          const next = G.removeAt(get(), x, y);
          if (!next) return false;
          set(next);
          sendCityOp({ op: 'remove', x, y });
          return true;
        },
        moveItem: (fx, fy, tx, ty) => {
          const next = G.moveItem(get(), fx, fy, tx, ty);
          if (!next) return false;
          set(next);
          sendCityOp({ op: 'move', fx, fy, tx, ty });
          return true;
        },

        setSetting: (key, value) => {
          if (key === 'hapticsOn') setHapticsEnabled(value as boolean);
          set({ [key]: value } as Partial<GameStore>);
        },
        setSensor: (sensor) => set({ sensor }),

        pauseLive: () => {
          stopLive?.();
          stopLive = null;
          if (liveRefreshTimer) clearTimeout(liveRefreshTimer);
          liveRefreshTimer = null;
        },

        reset: async () => {
          if (get().cloud !== 'online') return false;
          try {
            await api.resetProgress();
            localGen++;
            // The server keeps the name and avatar through a reset; so do we.
            set((cur) => ({
              ...G.initialData(),
              displayName: cur.displayName,
              avatarId: cur.avatarId,
              pendingPack: null,
              pendingCity: [],
              profilePending: false,
            }));
            await refresh();
            return true;
          } catch {
            return false;
          }
        },
      };
    },
    {
      // Pre-rename key (the app was "Walking Pack City"): keep it, or every
      // install loses its cache and sees onboarding again.
      name: 'walking-pack-city/v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Only durable game data is written to disk: a cache of the last server
      // state for instant start-up. No functions, no session state.
      partialize: (state) => toCache(state),
      // Versioned cache: an older (or newer) shape is upgraded by migrateCache;
      // every load is also sanitized in merge, so a corrupt or half-written
      // cache can't put the store in a shape the screens don't expect.
      version: CACHE_VERSION,
      migrate: (persisted, version) => migrateCache(persisted, version),
      merge: (persisted, current) => (persisted ? { ...current, ...sanitizeCache(persisted) } : current),
      onRehydrateStorage: () => (state) => {
        if (state) setHapticsEnabled(state.hapticsOn);
        // Deferred: the store constant isn't assigned yet if storage answers synchronously.
        setTimeout(() => useGameStore.setState({ hydrated: true }), 0);
      },
    },
  ),
);
