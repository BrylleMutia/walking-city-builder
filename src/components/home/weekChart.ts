// Pure helpers for the Home week card, kept apart from WeekSteps.tsx so tests
// don't load React Native.

const DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Weekday letter for a `YYYY-MM-DD` key, read in local time like `dayKey` writes it. */
export function dayLetter(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return DAY[new Date(y, m - 1, d).getDay()];
}
