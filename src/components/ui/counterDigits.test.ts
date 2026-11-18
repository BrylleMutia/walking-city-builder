import { digitColumns } from './counterDigits';

const FMT = { decimals: 0, padStart: 1, separator: ',', decimalSeparator: '.' };

describe('digitColumns', () => {
  it('groups thousands and labels the number', () => {
    const { columns, label } = digitColumns(12480, FMT);
    expect(label).toBe('12,480');
    expect(columns.map((c) => c.key)).toEqual(['d4', 'd3', 's3', 'd2', 'd1', 'd0']);
  });

  it('gives each wheel the cumulative value up to its place', () => {
    const { columns } = digitColumns(12480, FMT);
    const targets = columns.flatMap((c) => (c.kind === 'digit' ? [c.target] : []));
    expect(targets).toEqual([1, 12, 124, 1248, 12480]);
  });

  it('keeps wheel keys stable when a place is gained', () => {
    const before = digitColumns(999, FMT).columns.map((c) => c.key);
    const after = digitColumns(1000, FMT).columns.map((c) => c.key);
    expect(after.slice(-3)).toEqual(before);
  });

  it('pads, rounds decimals and handles zero and negatives', () => {
    expect(digitColumns(7, { ...FMT, padStart: 3 }).label).toBe('007');
    expect(digitColumns(3.14159, { ...FMT, decimals: 2 }).label).toBe('3.14');
    expect(digitColumns(0, FMT).label).toBe('0');
    expect(digitColumns(-1500, FMT).label).toBe('−1,500');
    expect(digitColumns(NaN, FMT).label).toBe('0');
  });

  it('can drop the separator', () => {
    expect(digitColumns(1234567, { ...FMT, separator: '' }).label).toBe('1234567');
  });
});
