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
  | 'insufficient_wood'
  | 'set_not_available'
  | 'none_available'
  | 'tile_occupied'
  | 'tile_empty'
  | 'out_of_bounds'
  | 'same_tile'
  // Cities
  | 'city_limit'
  | 'last_city'
  | 'city_not_found'
  | 'invalid_name'
  // Email sign-up (guest -> email account)
  | 'email_invalid'
  | 'email_taken'
  | 'too_many_emails'
  | 'code_invalid'
  // Email sign-in (existing account on this phone)
  | 'no_account'
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
  'insufficient_wood',
  'set_not_available',
  'none_available',
  'tile_occupied',
  'tile_empty',
  'out_of_bounds',
  'same_tile',
  'city_limit',
  'last_city',
  'city_not_found',
  'invalid_name',
  'not_authenticated',
];

/** Exported for tests. */
export function toBackendError(error: unknown): BackendError {
  if (error instanceof BackendError) return error;
  const e = error as { message?: string; code?: string; name?: string } | null;
  const text = `${e?.code ?? ''} ${e?.message ?? ''}`;
  if (text.includes('anonymous_provider_disabled') || /anonymous sign-ins are disabled/i.test(text)) {
    return new BackendError('anonymous_disabled', e?.message);
  }
  // Supabase Auth error codes (auth-js ErrorCode) for the email sign-up.
  if (text.includes('email_exists') || text.includes('user_already_exists')) return new BackendError('email_taken', e?.message);
  if (text.includes('email_address_invalid')) return new BackendError('email_invalid', e?.message);
  // Sign-in with shouldCreateUser: false and no account for that email.
  if (text.includes('otp_disabled') || /signups not allowed for otp/i.test(text)) {
    return new BackendError('no_account', e?.message);
  }
  if (text.includes('over_email_send_rate_limit') || text.includes('over_request_rate_limit')) {
    return new BackendError('too_many_emails', e?.message);
  }
  // Supabase answers a wrong code and an expired one the same way.
  if (text.includes('otp_expired') || /token has expired or is invalid/i.test(text)) {
    return new BackendError('code_invalid', e?.message);
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

/** The signed-in player's saved email, or null while they're a guest. */
export async function getAccountEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  return user && !user.is_anonymous && user.email ? user.email : null;
}

/**
 * Starts saving a guest's progress to an email: Supabase emails a 6-digit
 * code (the "Change email address" template must include {{ .Token }}).
 * The account, and so all progress, stays the same; only an email is added.
 */
export async function sendEmailCode(email: string): Promise<void> {
  try {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw error;
  } catch (e) {
    throw toBackendError(e);
  }
}

/** Confirms the emailed code; afterwards the player is no longer a guest. Returns the saved email. */
export async function verifyEmailCode(email: string, code: string): Promise<string> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email_change' });
    if (error) throw error;
    // Verifying issues a fresh session; the guest session from before stays
    // valid unless revoked. Right now the only other sessions are that guest
    // one (a guest can't be signed in anywhere else), so close them. Best
    // effort: the account is already saved if this fails.
    await supabase.auth.signOut({ scope: 'others' }).catch(() => {});
    return data.user?.email ?? email;
  } catch (e) {
    throw toBackendError(e);
  }
}

/**
 * Starts signing in to an account that already has an email (a returning
 * player on a new phone). Never creates an account, so a typo answers
 * `no_account` instead of making an empty one. The code arrives through the
 * "Magic Link" email template, which must include {{ .Token }}.
 */
export async function sendSignInCode(email: string): Promise<void> {
  try {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error) throw error;
  } catch (e) {
    throw toBackendError(e);
  }
}

/**
 * Confirms a sign-in code. The account's session replaces the guest one on
 * this phone (the guest account is left behind). Returns the signed-in email.
 */
export async function verifySignInCode(email: string, code: string): Promise<string> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) throw error;
    if (!data.session) throw new BackendError('unknown', 'No session returned');
    return data.user?.email ?? email;
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

/** Everything about the player, with the tiles of `cityId` only (the first city when null). */
export function fetchState(cityId: string | null = null): Promise<ServerState> {
  return rpc<ServerState>(supabase.rpc('get_my_state', cityId ? { p_city_id: cityId } : {}));
}

export function syncSteps(day: string, steps: number) {
  return rpc<{ day: string; steps: number; credited: number; wood: number; balance: number }>(
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

// City changes name their city; null is the player's first city. (The server
// casts a JSON null to uuid, so these always reach the city-aware overloads.)
type CityId = string | null;

export function placeItem(cityId: CityId, itemId: string, x: number, y: number) {
  return rpc<{ city_id: string; x: number; y: number; item_id: string }>(
    supabase.rpc('place_item', { p_city_id: cityId as string, p_item_id: itemId, p_x: x, p_y: y }),
  );
}

/** Moves an object to another lot; if that lot is taken, the two objects swap. */
export function moveItem(cityId: CityId, fx: number, fy: number, tx: number, ty: number) {
  return rpc<{ swapped: boolean }>(
    supabase.rpc('move_item', { p_city_id: cityId as string, p_from_x: fx, p_from_y: fy, p_to_x: tx, p_to_y: ty }),
  );
}

export function removeItem(cityId: CityId, x: number, y: number) {
  return rpc<{ x: number; y: number; item_id: string }>(
    supabase.rpc('remove_item', { p_city_id: cityId as string, p_x: x, p_y: y }),
  );
}

type ServerCity = NonNullable<ServerState['cities']>[number];

/** A new, empty city. The server charges (number of cities) × 1,000 Wood. */
export function createCity(name: string | null) {
  return rpc<{ city: ServerCity; price: number; balance: number }>(
    supabase.rpc('create_city', name ? { p_name: name } : {}),
  );
}

/** An empty name goes back to the default one. */
export function renameCity(cityId: string, name: string | null) {
  return rpc<{ id: string; name: string | null }>(supabase.rpc('rename_city', { p_city_id: cityId, p_name: name ?? '' }));
}

/** Its buildings return to the inventory; the last city can't be deleted. */
export function deleteCity(cityId: string) {
  return rpc<{ id: string }>(supabase.rpc('delete_city', { p_city_id: cityId }));
}

/** One city's tiles (previews of cities not visited on this phone). */
export function fetchCity(cityId: string) {
  return rpc<ServerState['city']>(supabase.rpc('get_city', { p_city_id: cityId }));
}

/** Saves the player's name, step goal and portrait (the server trims the name and keeps its own if empty). */
export function updateProfile(profile: { displayName: string; goal: number; avatarId: string }) {
  return rpc<{ display_name: string; step_goal: number; avatar_id: string }>(
    supabase.rpc('update_profile', {
      p_display_name: profile.displayName,
      p_step_goal: profile.goal,
      p_avatar_id: profile.avatarId,
    }),
  );
}

/** Marks the player's listed notifications read; returns how many changed (other ids are ignored). */
export function markNotificationsRead(ids: string[]) {
  return rpc<number>(supabase.rpc('mark_notifications_read', { p_ids: ids }));
}

export function resetProgress() {
  return rpc<{ balance: number }>(supabase.rpc('reset_progress'));
}

/**
 * Listens for "something changed" nudges on the player's private Realtime topic
 * (sent by database triggers whenever their profile or city changes, from any
 * device). `onChange` also fires when the channel re-joins after a drop, since
 * nudges sent while disconnected are missed. Returns an unsubscribe function.
 */
export async function subscribePlayer(userId: string, onChange: () => void): Promise<() => void> {
  // Private channels authorize with the player's JWT.
  await supabase.realtime.setAuth();
  let joinedBefore = false;
  const channel = supabase
    .channel(`player:${userId}`, { config: { private: true } })
    .on('broadcast', { event: 'changed' }, () => onChange())
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      // The first join happens right after connect() fetched the state.
      if (joinedBefore) onChange();
      joinedBefore = true;
    });
  return () => {
    void supabase.removeChannel(channel);
  };
}
