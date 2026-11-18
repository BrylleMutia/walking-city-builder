export const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'] as const;
export type Strength = 0 | 1 | 2 | 3 | 4;

/**
 * A quick 0–4 score for the meter (0 = empty). It is a nudge, not a policy:
 * the real rules live with whoever checks the password (Supabase Auth).
 * Anything under 8 characters is Weak no matter how varied it is.
 */
export function passwordStrength(password: string): Strength {
  if (!password) return 0;
  if (password.length < 8) return 1;
  let score = 1;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  // One character repeated, or a plain run like "12345678", stays weak.
  if (/^(.)\1+$/.test(password) || /^(?:0123456789|abcdefghij)/i.test(password)) return 1;
  return Math.min(4, Math.max(1, score - 1)) as Strength;
}
