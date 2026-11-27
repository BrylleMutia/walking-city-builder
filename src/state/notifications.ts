/**
 * In-app notifications (the bell on Home). The server writes them (the welcome
 * is created with the player's account); the app caches the newest ones, marks
 * them read one at a time when tapped, and queues those reads while offline.
 */

/** What `get_my_state()` sends per notification. */
export interface ServerNotice {
  id: string;
  kind: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface Notice {
  id: string;
  /** `welcome` gets its own layout; any other kind shows title + body. */
  kind: string;
  title: string;
  body: string;
  /** ISO timestamps. */
  createdAt: string;
  readAt: string | null;
}

/** The server sends at most this many; the cache keeps the same. */
export const MAX_NOTICES = 50;

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isTime = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));

const byNewest = (a: Notice, b: Notice) => Date.parse(b.createdAt) - Date.parse(a.createdAt);

/** Server rows → notices, newest first, skipping anything malformed. */
export function toNotices(rows: readonly ServerNotice[] | null | undefined): Notice[] {
  return sanitizeNotices(
    (rows ?? []).map((r) => (isObj(r) ? { ...r, createdAt: r.created_at, readAt: r.read_at } : r)),
  );
}

/** A cached list in the current shape (bad entries and duplicates dropped, newest first, capped). */
export function sanitizeNotices(raw: unknown): Notice[] {
  if (!Array.isArray(raw)) return [];
  const out: Notice[] = [];
  for (const n of raw) {
    if (!isObj(n) || !isId(n.id) || out.some((o) => o.id === n.id)) continue;
    if (!isText(n.kind) || !isText(n.title) || !isText(n.body) || !isTime(n.createdAt)) continue;
    out.push({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      createdAt: n.createdAt,
      readAt: isTime(n.readAt) ? n.readAt : null,
    });
  }
  return out.sort(byNewest).slice(0, MAX_NOTICES);
}

/** Ids read on this phone that the server hasn't confirmed yet. */
export function sanitizeIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(isId))].slice(0, MAX_NOTICES);
}

export function unreadCount(list: readonly Notice[]): number {
  return list.reduce((n, x) => (x.readAt ? n : n + 1), 0);
}

/** Marks the given notices read (those already read keep their time). */
export function markRead(list: readonly Notice[], ids: readonly string[], now: string): Notice[] {
  if (ids.length === 0) return [...list];
  return list.map((n) => (!n.readAt && ids.includes(n.id) ? { ...n, readAt: now } : n));
}

/**
 * The server's list is truth, except that notices read here and not yet
 * confirmed stay read, so a refresh doesn't bring the dot back mid-sync.
 */
export function mergeServerNotices(
  server: readonly ServerNotice[],
  readPending: readonly string[],
  now: string,
): Notice[] {
  return markRead(toNotices(server), readPending, now);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Short, friendly age for the list: "Just now", "5 min ago", "3 h ago", "Yesterday", "Mar 4". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const ms = now.getTime() - t;
  if (ms < MINUTE) return 'Just now';
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)} min ago`;
  const then = new Date(t);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (t >= startOfToday) return `${Math.floor(ms / HOUR)} h ago`;
  if (t >= startOfToday - 24 * HOUR) return 'Yesterday';
  return then.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(then.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

/**
 * The welcome's "what to do next", from where the player is in the loop:
 * afford a first pack → buy it; can't yet → walk; opened packs but nothing
 * built → build; otherwise keep walking toward the next pack.
 */
export type NextStep =
  | { step: 'buy'; balance: number }
  | { step: 'walk'; woodShort: number }
  | { step: 'build' }
  | { step: 'more' };

export function welcomeNextStep(p: {
  balance: number;
  packsOpened: number;
  /** Objects standing in any city. */
  placed: number;
  cheapestPack: number;
}): NextStep {
  if (p.packsOpened === 0) {
    return p.balance >= p.cheapestPack
      ? { step: 'buy', balance: p.balance }
      : { step: 'walk', woodShort: p.cheapestPack - p.balance };
  }
  return p.placed === 0 ? { step: 'build' } : { step: 'more' };
}
