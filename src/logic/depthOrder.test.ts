import { behind, depthOrder, type Rect } from './depthOrder';

const r = (x: number, y: number, w = 1, d = 1): Rect => ({ x, y, w, d });

describe('depthOrder', () => {
  it('keeps the old x + y order for single lots', () => {
    const rects = [r(2, 2), r(0, 0), r(1, 0), r(0, 1)];
    const order = depthOrder(rects).map((i) => rects[i]);
    expect(order[0]).toEqual(r(0, 0));
    expect(order[order.length - 1]).toEqual(r(2, 2));
  });

  it('draws a lamp post beside a big building after it, though its x + y is smaller', () => {
    // Theater 3×2 at (0, 2): x + y = 2. Lamp at (3, 0): x + y = 3, but at (3, 2)
    // it sits right of the theater's front, and at (1, 4) in front of it.
    const theater = r(0, 2, 3, 2);
    const lamp = r(3, 2);
    const front = r(1, 4);
    const back = r(1, 1);
    const rects = [lamp, front, theater, back];
    const order = depthOrder(rects).map((i) => rects[i]);
    expect(order.indexOf(back)).toBeLessThan(order.indexOf(theater));
    expect(order.indexOf(theater)).toBeLessThan(order.indexOf(lamp));
    expect(order.indexOf(theater)).toBeLessThan(order.indexOf(front));
  });

  it('needs no rule between diagonal neighbours', () => {
    expect(behind(r(0, 1), r(1, 0))).toBe(false);
    expect(behind(r(1, 0), r(0, 1))).toBe(false);
    expect(behind(r(0, 0), r(1, 1))).toBe(false);
  });

  it('orders an object in the notch of an L between its two arms', () => {
    // Café L at (0,0): arm A = 2×1 at (0,0), wing B = 1×1 at (0,1). Notch (1,1).
    const armA = r(0, 0, 2, 1);
    const wingB = r(0, 1);
    const notch = r(1, 1);
    const rects = [notch, wingB, armA];
    const order = depthOrder(rects).map((i) => rects[i]);
    expect(order.indexOf(armA)).toBeLessThan(order.indexOf(notch));
    expect(order.indexOf(wingB)).toBeLessThan(order.indexOf(notch));
  });

  it('survives overlapping (bad) data without dropping anything', () => {
    expect(depthOrder([r(0, 0, 2, 2), r(1, 1, 2, 2)]).sort()).toEqual([0, 1]);
  });
});
