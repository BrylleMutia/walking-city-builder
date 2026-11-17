import { backendConfigured, supabase } from '../lib/supabase';
import type { ServerCard, ServerState } from './serverState';

/**
 * Thin wrapper over the Supabase game functions. Every call either resolves or
 * throws a BackendError with one of a few reasons the UI knows how to show.
 */
export type BackendReason =
  | 'not_configured'
  | 'offline'
  | 'anonymous_disabled'
  | 'not_authenticated'
  | 'insufficient_steps'
  | 'set_not_available'
  | 'none_available'
  | 'tile_occupied'
  | 'tile_empty'
  | 'out_of_bounds'
  | 'unknown';

export class BackendError extends Error {
  constructor(
    public reason: BackendReason,
    message?: string,
  ) {
    super(message ?? reason);
  }
}

const KNOWN: BackendReason[] = [
  'insufficient_steps',
  'set_not_available',
  'none_available',
  'tile_occupied',
  'tile_empty',
  'out_of_bounds',
  'not_authenticated',
];

function toBackendError(error: unknown): BackendError {
  if (error instanceof BackendError) return error;
  const e = error as { message?: string; code?: string; name?: string } | null;
  const text = `${e?.code ?? ''} ${e?.message ?? ''}`;
  if (text.includes('anonymous_provider_disabled') || /anonymous sign-ins are disabled/i.test(text)) {
    return new BackendError('anonymous_disabled', e?.message);
  }
  const known = KNOWN.find((k) => text.includes(k));
  if (known) return new BackendError(known, e?.message);
  if (/network request failed|failed to fetch|fetch failed|timeout/i.test(text) || e?.name === 'TypeError') {
    return new BackendError('offline', e?.message);
  }
  return new BackendError('unknown', e?.message);
}

/** Makes sure there's a signed-in (anonymous) player; returns their user id. */
export async function ensureSession(): Promise<string> {
  if (!backendConfigured) throw new BackendError('not_configured');
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return data.session.user.id;
    const { data: signIn, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    if (!signIn.user) throw new BackendError('unknown', 'No user returned');
    return signIn.user.id;
  } catch (e) {
    throw toBackendError(e);
  }
}

async function rpc<T>(call: PromiseLike<{ data: unknown; error: unknown }>): Promise<T> {
  try {
    const { data, error } = await call;
    if (error) throw error;
    return data as T;
  } catch (e) {
    throw toBackendError(e);
  }
}

export function fetchState(sinceDay?: string): Promise<ServerState> {
  return rpc<ServerState>(supabase.rpc('get_my_state', sinceDay ? { p_since: sinceDay } : {}));
}

export function syncSteps(day: string, steps: number) {
  return rpc<{ day: string; steps: number; credited: number; balance: number }>(
    supabase.rpc('sync_steps', { p_day: day, p_steps: Math.max(0, Math.floor(steps)) }),
  );
}

export function buyPack(setId: string, forceLegendary: boolean, forceFoil: boolean) {
  return rpc<{ opening_id: string; set_id: string; balance: number; cards: ServerCard[] }>(
    supabase.rpc('buy_pack', {
      p_set_id: setId,
      p_force_legendary: forceLegendary,
      p_force_foil: forceFoil,
    }),
  );
}

export function placeItem(itemId: string, x: number, y: number) {
  return rpc<{ x: number; y: number; item_id: string }>(
    supabase.rpc('place_item', { p_item_id: itemId, p_x: x, p_y: y }),
  );
}

export function removeItem(x: number, y: number) {
  return rpc<{ x: number; y: number; item_id: string }>(supabase.rpc('remove_item', { p_x: x, p_y: y }));
}

export function updateGoal(goal: number) {
  return rpc<{ step_goal: number }>(supabase.rpc('update_profile', { p_step_goal: goal }));
}

export function resetProgress() {
  return rpc<{ balance: number }>(supabase.rpc('reset_progress'));
}
