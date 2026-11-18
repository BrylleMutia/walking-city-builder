export type CounterColumn =
  | { kind: 'digit'; key: string; target: number }
  | { kind: 'mark'; key: string; char: string };

export interface CounterFormat {
  decimals: number;
  padStart: number;
  separator: string;
  decimalSeparator: string;
}

/**
 * Splits a number into odometer columns, left to right. Keys are tied to the
 * place value (ones, tens, …), not the position from the left, so when 999
 * becomes 1,000 the existing wheels keep their identity and only the new
 * thousands wheel and its separator mount.
 *
 * Each digit's `target` is the whole number up to that place (12,480 → tens
 * target 1248), which the wheel shows mod 10 so it can roll through 9 → 0.
 */
export function digitColumns(
  value: number,
  { decimals, padStart, separator, decimalSeparator }: CounterFormat,
): { columns: CounterColumn[]; label: string } {
  const dec = Math.max(0, Math.min(6, Math.floor(decimals)));
  const safe = Number.isFinite(value) ? value : 0;
  const negative = safe < 0;
  const scaled = Math.round(Math.abs(safe) * 10 ** dec);
  const whole = Math.floor(scaled / 10 ** dec);
  const wholeDigits = Math.max(String(whole).length, Math.floor(padStart), 1);

  const columns: CounterColumn[] = [];
  if (negative && scaled > 0) columns.push({ kind: 'mark', key: 'sign', char: '−' });

  for (let place = wholeDigits + dec - 1; place >= 0; place--) {
    columns.push({ kind: 'digit', key: `d${place}`, target: Math.floor(scaled / 10 ** place) });
    const wholePlace = place - dec;
    if (wholePlace > 0 && wholePlace % 3 === 0 && separator) {
      columns.push({ kind: 'mark', key: `s${wholePlace}`, char: separator });
    }
    if (place === dec && dec > 0) columns.push({ kind: 'mark', key: 'point', char: decimalSeparator });
  }

  const label = columns.map((c) => (c.kind === 'mark' ? c.char : String(c.target % 10))).join('');
  return { columns, label };
}
