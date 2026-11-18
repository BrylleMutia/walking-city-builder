/** Loose on purpose: Supabase Auth is the real judge of an address. */
export const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** Normalised form we send and show: trimmed, lower-case. */
export const normalizeEmail = (v: string) => v.trim().toLowerCase();

/**
 * Digits in the emailed code. Must match Supabase: Authentication → Sign In /
 * Providers → Email → "Email OTP Length" (6–10). Change both together.
 */
export const EMAIL_CODE_LENGTH = 6;

/** Seconds Supabase makes a player wait between two codes (per user). */
export const RESEND_SECONDS = 60;

/** "0:42" for a countdown in seconds. */
export const formatCountdown = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
