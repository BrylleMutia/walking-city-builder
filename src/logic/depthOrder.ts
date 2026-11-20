/**
 * Back-to-front drawing order for the city's objects, which cover rectangles of
 * lots (an L-shaped building is drawn as several rectangles).
 *
 * With 1×1 objects, sorting by x + y was enough. A 3×2 theater breaks that: a
 * lamp post at (4, 0) has a smaller x + y than the theater's front corner but
 * stands in front of its right wall. The exact rule for boxes standing on a
 * grid: A must be drawn before B when A ends where B starts (or earlier) on one
 * axis while their ranges overlap on the other. Boxes that are diagonal to each
 * other never overlap on screen, so they need no rule between them.
 */

export interface Rect {
  /** Lots: x0..x0+w along +x, y0..y0+d along +y. */
  x: number;
  y: number;
  w: number;
  d: number;
}

/** A must be drawn before B (A is behind B). */
export function behind(a: Rect, b: Rect): boolean {
  const overlapY = a.y < b.y + b.d && b.y < a.y + a.d;
  const overlapX = a.x < b.x + b.w && b.x < a.x + a.w;
  return (a.x + a.w <= b.x && overlapY) || (a.y + a.d <= b.y && overlapX);
}

/**
 * Indices of `rects` in drawing order. A topological sort over `behind`, always
 * taking the ready rect with the smallest x + y next, so 1×1-only cities keep
 * their old order. Rects must not overlap each other.
 */
export function depthOrder(rects: readonly Rect[]): number[] {
  const n = rects.length;
  const before: number[][] = Array.from({ length: n }, () => []);
  const waiting = new Array<number>(n).fill(0);
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      if (a !== b && behind(rects[a], rects[b])) {
        before[a].push(b);
        waiting[b]++;
      }
    }
  }
  const key = (i: number) => rects[i].x + rects[i].y + rects[i].x / 1000;
  const ready: number[] = [];
  for (let i = 0; i < n; i++) if (waiting[i] === 0) ready.push(i);
  const out: number[] = [];
  const done = new Array<boolean>(n).fill(false);
  while (out.length < n) {
    if (ready.length === 0) {
      // Only possible with overlapping rects (bad data): fall back to x + y.
      const rest = [...Array(n).keys()].filter((i) => !done[i]).sort((a, b) => key(a) - key(b));
      out.push(...rest);
      break;
    }
    let best = 0;
    for (let i = 1; i < ready.length; i++) if (key(ready[i]) < key(ready[best])) best = i;
    const i = ready.splice(best, 1)[0];
    done[i] = true;
    out.push(i);
    for (const j of before[i]) if (--waiting[j] === 0) ready.push(j);
  }
  return out;
}
