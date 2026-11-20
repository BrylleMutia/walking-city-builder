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
