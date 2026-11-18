import { toBackendError } from './backend';
import { accountErrorMessage } from './messages';

// The Supabase client isn't needed to test the error mapping.
jest.mock('../lib/supabase', () => ({ backendConfigured: true, supabase: {} }));

const authError = (code: string, message = '') => ({ name: 'AuthApiError', code, message, status: 400 });

describe('toBackendError (email sign-up)', () => {
  it('maps Supabase Auth error codes to reasons the UI explains', () => {
    expect(toBackendError(authError('email_exists')).reason).toBe('email_taken');
    expect(toBackendError(authError('email_address_invalid')).reason).toBe('email_invalid');
    expect(toBackendError(authError('over_email_send_rate_limit')).reason).toBe('too_many_emails');
    expect(toBackendError(authError('otp_expired', 'Token has expired or is invalid')).reason).toBe('code_invalid');
  });

  it('treats network failures as offline and anything else as unknown', () => {
    expect(toBackendError(new TypeError('Network request failed')).reason).toBe('offline');
    expect(toBackendError(authError('unexpected_failure')).reason).toBe('unknown');
  });

  it('maps a sign-in to an email without an account to no_account', () => {
    expect(toBackendError(authError('otp_disabled', 'Signups not allowed for otp')).reason).toBe('no_account');
    expect(toBackendError({ message: 'Signups not allowed for otp' }).reason).toBe('no_account');
  });

  it('has a player-facing message for every sign-up and sign-in reason', () => {
    for (const r of ['email_taken', 'email_invalid', 'too_many_emails', 'code_invalid', 'no_account', 'offline'] as const) {
      expect(accountErrorMessage(r)).not.toMatch(/something went wrong/i);
    }
  });
});
