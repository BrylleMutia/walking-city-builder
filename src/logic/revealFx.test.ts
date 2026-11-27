import { RARITY_ORDER } from '../data/rarity';
import {
  MAX_RAYS,
  MAX_RING,
  MAX_SHOWER,
  REVEAL_FX,
  burstEnvelope,
  hash01,
  rayAngle,
  ringSparkle,
  showerSparkle,
  teaseFor,
  trembleAt,
} from './revealFx';

describe('REVEAL_FX ladder', () => {
  it('never gets quieter as rarity goes up', () => {
    for (let i = 1; i < RARITY_ORDER.length; i++) {
      const lo = REVEAL_FX[RARITY_ORDER[i - 1]];
      const hi = REVEAL_FX[RARITY_ORDER[i]];
      expect(hi.burstMs).toBeGreaterThanOrEqual(lo.burstMs);
      expect(hi.glow).toBeGreaterThanOrEqual(lo.glow);
      expect(hi.rays).toBeGreaterThanOrEqual(lo.rays);
      expect(hi.ring).toBeGreaterThanOrEqual(lo.ring);
      expect(hi.shower).toBeGreaterThanOrEqual(lo.shower);
      expect(hi.flash).toBeGreaterThanOrEqual(lo.flash);
      expect(hi.volume).toBeGreaterThanOrEqual(lo.volume);
      expect(hi.haptic.length).toBeGreaterThanOrEqual(lo.haptic.length);
    }
  });

  it('keeps commons plain and gives each of rare, epic, legendary something new', () => {
    const c = REVEAL_FX.common;
    expect(c.glow + c.rays + c.ring + c.shower + c.flash).toBe(0);
    expect(REVEAL_FX.rare.glow).toBeGreaterThan(REVEAL_FX.uncommon.glow);
    expect(REVEAL_FX.epic.rays).toBeGreaterThan(REVEAL_FX.rare.rays);
    expect(REVEAL_FX.legendary.shower).toBeGreaterThan(REVEAL_FX.epic.shower);
    expect(REVEAL_FX.legendary.persistRays).toBe(true);
  });

  it('fits the layers the Skia components allocate', () => {
    for (const r of RARITY_ORDER) {
      expect(REVEAL_FX[r].rays).toBeLessThanOrEqual(MAX_RAYS);
      expect(REVEAL_FX[r].ring).toBeLessThanOrEqual(MAX_RING);
      expect(REVEAL_FX[r].shower).toBeLessThanOrEqual(MAX_SHOWER);
      expect(REVEAL_FX[r].haptic[0].at).toBe(0);
    }
  });
});

describe('teaseFor', () => {
  it('teases an epic or legendary under a lower card', () => {
    expect(teaseFor('common', 'legendary')).toBe('legendary');
    expect(teaseFor('rare', 'epic')).toBe('epic');
  });
  it('stays quiet otherwise', () => {
    expect(teaseFor('common', 'rare')).toBeNull();
    expect(teaseFor('epic', 'epic')).toBeNull();
    expect(teaseFor('legendary', undefined)).toBeNull();
  });
});

describe('effect maths', () => {
  it('hash01 is deterministic and in 0..1', () => {
    for (let i = 0; i < 50; i++) {
      const v = hash01(i, 3);
      expect(v).toBe(hash01(i, 3));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('burstEnvelope rises to 1 and returns to 0', () => {
    expect(burstEnvelope(0)).toBe(0);
    expect(burstEnvelope(0.15)).toBeCloseTo(1);
    expect(burstEnvelope(1)).toBe(0);
    expect(burstEnvelope(2)).toBe(0);
  });

  it('ring sparkles move outward and fade', () => {
    const a = ringSparkle(3, 14, 0.1);
    const b = ringSparkle(3, 14, 0.9);
    expect(Math.hypot(b.dx, b.dy)).toBeGreaterThan(Math.hypot(a.dx, a.dy));
    expect(b.alpha).toBeLessThan(a.alpha);
    expect(ringSparkle(3, 14, 1).alpha).toBe(0);
  });

  it('shower sparkles fall down the screen and are gone at the end', () => {
    const early = showerSparkle(2, 0.4, 400, 800);
    const late = showerSparkle(2, 0.8, 400, 800);
    expect(late.y).toBeGreaterThan(early.y);
    expect(showerSparkle(2, 1, 400, 800).alpha).toBeCloseTo(0);
    expect(showerSparkle(2, 0, 400, 800).alpha).toBe(0);
  });

  it('rays spread evenly, turn slowly, and hold still under reduced motion', () => {
    expect(rayAngle(1, 4, 0)).toBeCloseTo(Math.PI / 2);
    expect(rayAngle(0, 4, 2)).toBeCloseTo(0.5);
    expect(rayAngle(0, 4, 2, true)).toBe(0);
  });

  it('the tremble stays within a degree', () => {
    for (let s = 0; s < 10; s += 0.01) expect(Math.abs(trembleAt(s))).toBeLessThanOrEqual(1);
  });
});
