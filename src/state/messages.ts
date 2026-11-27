import type { BackendReason } from './backend';

/** Player-facing explanation for a failed pack purchase. */
const BUY_ERRORS: Partial<Record<BackendReason, string>> = {
  offline: 'Can’t reach the shop. Check your connection and try again.',
  anonymous_disabled: 'The shop is closed right now. Try again later.',
  not_configured: 'The shop is closed right now. Try again later.',
  insufficient_wood: 'Not enough Wood yet: keep walking!',
  set_not_available: 'This set is not available right now.',
};

export const buyErrorMessage = (reason: BackendReason) =>
  BUY_ERRORS[reason] ?? 'Something went wrong. Please try again.';

/** Player-facing explanation for a failed city change (new, rename, delete). */
const CITY_ERRORS: Partial<Record<BackendReason, string>> = {
  offline: 'Can’t reach the server. Check your connection and try again.',
  anonymous_disabled: 'Cities can’t be changed right now. Try again later.',
  not_configured: 'Cities can’t be changed in this build.',
  insufficient_wood: 'Not enough Wood yet: keep walking!',
  city_limit: 'You have as many cities as you can have.',
  last_city: 'You need at least one city.',
  city_not_found: 'That city is gone. Your list was refreshed.',
  invalid_name: 'City names are 1 to 24 characters.',
};

export const cityErrorMessage = (reason: BackendReason) =>
  CITY_ERRORS[reason] ?? 'Something went wrong. Please try again.';

/** Player-facing explanation for a failed email sign-up step. */
const ACCOUNT_ERRORS: Partial<Record<BackendReason, string>> = {
  offline: 'Can’t reach the server. Check your connection and try again.',
  not_configured: 'Saving progress isn’t available in this build.',
  anonymous_disabled: 'Saving progress isn’t available right now.',
  email_invalid: 'That doesn’t look like an email address.',
  email_taken: 'This email already has an account.',
  too_many_emails: 'Too many emails sent. Wait a while and try again.',
  code_invalid: 'That code didn’t work. Check it, or send a new one.',
  no_account: 'No account uses this email yet. Check the spelling and try again.',
};

export const accountErrorMessage = (reason: BackendReason) =>
  ACCOUNT_ERRORS[reason] ?? 'Something went wrong. Please try again.';
