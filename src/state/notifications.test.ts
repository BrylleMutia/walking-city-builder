import {
  MAX_NOTICES,
  markRead,
  mergeServerNotices,
  sanitizeIds,
  sanitizeNotices,
  timeAgo,
  toNotices,
  unreadCount,
  welcomeNextStep,
  type ServerNotice,
} from './notifications';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const row = (n: number, over: Partial<ServerNotice> = {}): ServerNotice => ({
  id: id(n),
  kind: 'welcome',
  title: 'Welcome to Stridewood!',
  body: 'Walk, collect, build.',
  created_at: `2026-11-${String(10 + n).padStart(2, '0')}T08:00:00Z`,
  read_at: null,
  ...over,
});

describe('toNotices', () => {
  it('maps server rows, newest first', () => {
    const list = toNotices([row(1), row(3), row(2, { read_at: '2026-11-20T00:00:00Z' })]);
    expect(list.map((n) => n.id)).toEqual([id(3), id(2), id(1)]);
    expect(list[1]).toMatchObject({ kind: 'welcome', readAt: '2026-11-20T00:00:00Z', createdAt: row(2).created_at });
  });

  it('skips malformed rows and duplicates', () => {
    const bad = [
      row(1),
      row(1),
      row(2, { id: 'nope' }),
      row(3, { title: '' }),
      row(4, { created_at: 'yesterday' }),
      null,
    ] as unknown as ServerNotice[];
    expect(toNotices(bad).map((n) => n.id)).toEqual([id(1)]);
    expect(toNotices(undefined)).toEqual([]);
  });
});

describe('sanitizeNotices', () => {
  it('keeps the newest MAX_NOTICES and drops bad read times', () => {
    const many = Array.from({ length: MAX_NOTICES + 5 }, (_, i) => ({
      id: id(i),
      kind: 'news',
      title: 't',
      body: 'b',
      createdAt: new Date(Date.UTC(2026, 0, 1) + i * 60_000).toISOString(),
      readAt: i === MAX_NOTICES + 4 ? 'garbage' : null,
    }));
    const list = sanitizeNotices(many);
    expect(list).toHaveLength(MAX_NOTICES);
    expect(list[0]).toMatchObject({ id: id(MAX_NOTICES + 4), readAt: null });
    expect(sanitizeNotices('x')).toEqual([]);
  });

  it('sanitizeIds keeps unique uuids only', () => {
    expect(sanitizeIds([id(1), id(1), 'x', 5, id(2)])).toEqual([id(1), id(2)]);
    expect(sanitizeIds(null)).toEqual([]);
  });
});

describe('read state', () => {
  const list = toNotices([row(1), row(2), row(3, { read_at: '2026-11-14T00:00:00Z' })]);

  it('counts unread', () => {
    expect(unreadCount(list)).toBe(2);
    expect(unreadCount([])).toBe(0);
  });

  it('marks only the given unread ones, keeping earlier read times', () => {
    const next = markRead(list, [id(1), id(3)], '2026-11-25T00:00:00Z');
    expect(next.find((n) => n.id === id(1))?.readAt).toBe('2026-11-25T00:00:00Z');
    expect(next.find((n) => n.id === id(2))?.readAt).toBeNull();
    expect(next.find((n) => n.id === id(3))?.readAt).toBe('2026-11-14T00:00:00Z');
    expect(unreadCount(next)).toBe(1);
  });

  it('a refresh keeps reads the server has not confirmed yet', () => {
    const merged = mergeServerNotices([row(1), row(2)], [id(2)], '2026-11-25T00:00:00Z');
    expect(merged.find((n) => n.id === id(2))?.readAt).toBe('2026-11-25T00:00:00Z');
    expect(unreadCount(merged)).toBe(1);
  });
});

describe('timeAgo', () => {
  const now = new Date(2026, 10, 25, 15, 0, 0);
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it('reads like a person would say it', () => {
    expect(timeAgo(ago(20_000), now)).toBe('Just now');
    expect(timeAgo(ago(5 * 60_000), now)).toBe('5 min ago');
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe('3 h ago');
    expect(timeAgo(new Date(2026, 10, 24, 9, 0).toISOString(), now)).toBe('Yesterday');
    expect(timeAgo(new Date(2026, 10, 20, 9, 0).toISOString(), now)).toMatch(/20/);
    expect(timeAgo(new Date(2025, 2, 4, 9, 0).toISOString(), now)).toMatch(/2025/);
    expect(timeAgo('soon', now)).toBe('');
  });
});

describe('welcomeNextStep', () => {
  const base = { balance: 400, packsOpened: 0, placed: 0, cheapestPack: 200 };
  it('points a new player at their first pack, or at walking for it', () => {
    expect(welcomeNextStep(base)).toEqual({ step: 'buy', balance: 400 });
    expect(welcomeNextStep({ ...base, balance: 150 })).toEqual({ step: 'walk', woodShort: 50 });
  });
  it('then at building, then at the next pack', () => {
    expect(welcomeNextStep({ ...base, packsOpened: 1 })).toEqual({ step: 'build' });
    expect(welcomeNextStep({ ...base, packsOpened: 1, placed: 3 })).toEqual({ step: 'more' });
  });
});
