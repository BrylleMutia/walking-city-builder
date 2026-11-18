import { formatCountdown, looksLikeEmail, normalizeEmail } from './email';

describe('email helpers', () => {
  it('accepts plausible addresses and rejects obvious typos', () => {
    expect(looksLikeEmail('bry@example.com')).toBe(true);
    expect(looksLikeEmail('  bry.m+walk@mail.co.uk ')).toBe(true);
    expect(looksLikeEmail('bry@example')).toBe(false);
    expect(looksLikeEmail('bry example.com')).toBe(false);
    expect(looksLikeEmail('@example.com')).toBe(false);
    expect(looksLikeEmail('bry@example.c')).toBe(false);
  });

  it('normalises for sending', () => {
    expect(normalizeEmail('  Bry@Example.COM ')).toBe('bry@example.com');
  });

  it('formats the resend countdown', () => {
    expect(formatCountdown(60)).toBe('1:00');
    expect(formatCountdown(42)).toBe('0:42');
    expect(formatCountdown(5.2)).toBe('0:06');
    expect(formatCountdown(-3)).toBe('0:00');
  });
});
