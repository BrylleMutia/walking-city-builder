import { dayLetter } from './weekChart';

describe('dayLetter', () => {
  it('reads the day key in local time', () => {
    expect(dayLetter('2026-11-27')).toBe('F');
    expect(dayLetter('2026-11-29')).toBe('S');
    expect(dayLetter('2026-11-30')).toBe('M');
  });
});
