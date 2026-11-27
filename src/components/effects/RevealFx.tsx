import {
  BlurMask,
  Canvas,
  Circle,
  Path,
  RadialGradient,
  Rect,
  RoundedRect,
  usePathValue,
  vec,
} from '@shopify/react-native-skia';
import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { RARITY_COLOR, RARITY_ORDER } from '../../data/rarity';
import {
  REVEAL_FX,
  burstEnvelope,
  rayAngle,
  ringSparkle,
  showerSparkle,
} from '../../logic/revealFx';

/**
 * The rarity celebration around the top card of the revealed stack, in two
 * Skia layers: `RevealBackdrop` goes *behind* the cards (glow, light rays, the
 * tease leaking from under the stack), `RevealOverlay` *above* them (flash,
 * sparkle ring, gold shower). Both are pure functions of the shared values and
 * a clock (no per-frame React state), and every effect draws one path per layer.
 *
 * The clock is *not* Skia's always-running `useClock`: it only ticks while
 * something here moves on its own (a tease, or rays that stay). Otherwise the
 * canvases have nothing to redraw, which keeps the UI thread free for the
 * flick gesture (an idle redraw every frame made fast flicks drop on Android).
 */

// Indexed by rarity tier, so worklets can look things up by number.
const FX = RARITY_ORDER.map((r) => REVEAL_FX[r]);
const MAIN = RARITY_ORDER.map((r) => RARITY_COLOR[r].main);
const DARK = RARITY_ORDER.map((r) => RARITY_COLOR[r].dark);
const LIGHT = RARITY_ORDER.map((r) => RARITY_COLOR[r].light);

export interface RevealFxValues {
  /** 0 → 1 over the current card's burst (restarted on every reveal). */
  burst: SharedValue<number>;
  /** Rarity tier of the card on top. */
  tier: SharedValue<number>;
  /** 0..1: how much of the card's while-on-top glow/rays show (0 once it's flicked). */
  persist: SharedValue<number>;
  /** 0..1: the next card is worth teasing. */
  tease: SharedValue<number>;
  teaseTier: SharedValue<number>;
  /** ms; advances only while a tease or lasting rays are on screen. */
  clock: SharedValue<number>;
}

interface Props {
  values: RevealFxValues;
  width: number;
  height: number;
  /** Centre and size of the top card of the stack. */
  cx: number;
  cy: number;
  cardW: number;
  cardH: number;
  reduceMotion: boolean;
}

export const RevealBackdrop = memo(function RevealBackdrop({
  values: V,
  width,
  height,
  cx,
  cy,
  cardW,
  cardH,
  reduceMotion,
}: Props) {
  const clock = V.clock;
  const reach = Math.hypot(width, height) * 0.75;

  const color = useDerivedValue(() => MAIN[V.tier.value] ?? MAIN[0]);
  const glowOpacity = useDerivedValue(() => {
    const fx = FX[V.tier.value];
    if (!fx) return 0;
    const soft = reduceMotion ? 0.7 : 1;
    return (fx.glow * burstEnvelope(V.burst.value) + fx.persistGlow * V.persist.value) * soft;
  });

  // Rays: thin wedges from the card's centre, turning slowly.
  const rays = usePathValue((b) => {
    'worklet';
    const fx = FX[V.tier.value];
    if (!fx || fx.rays === 0) return;
    const sec = clock.value / 1000;
    const half = 0.06;
    for (let i = 0; i < fx.rays; i++) {
      const a = rayAngle(i, fx.rays, sec, reduceMotion);
      b.moveTo(cx, cy);
      b.lineTo(cx + Math.cos(a - half) * reach, cy + Math.sin(a - half) * reach);
      b.lineTo(cx + Math.cos(a + half) * reach, cy + Math.sin(a + half) * reach);
      b.close();
    }
  });
  const rayOpacity = useDerivedValue(() => {
    const fx = FX[V.tier.value];
    if (!fx || fx.rays === 0) return 0;
    const burst = burstEnvelope(V.burst.value, 0.25) * 0.6;
    const stay = fx.persistRays ? V.persist.value * 0.32 : 0;
    return Math.max(burst, stay);
  });
  const rayColors = useDerivedValue(() => [MAIN[V.tier.value] ?? MAIN[0], 'rgba(255,255,255,0)']);

  // Tease: the next (rarer) card's colour leaking around the stack, breathing.
  const teaseColor = useDerivedValue(() => MAIN[V.teaseTier.value] ?? MAIN[0]);
  const teaseOpacity = useDerivedValue(() => {
    const breath = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin((clock.value / 1000) * 2.4);
    return V.tease.value * (0.45 + 0.35 * breath);
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path path={rays} opacity={rayOpacity}>
        <RadialGradient c={vec(cx, cy)} r={reach} colors={rayColors} />
      </Path>
      <Circle cx={cx} cy={cy} r={cardW * 0.85} color={color} opacity={glowOpacity}>
        <BlurMask blur={48} style="normal" />
      </Circle>
      {/* A halo just larger than the stack; the cards cover its middle, so only the edges glow. */}
      <RoundedRect
        x={cx - cardW / 2 - 14}
        y={cy - cardH / 2 - 8}
        width={cardW + 28}
        height={cardH + 44}
        r={cardW * 0.1}
        color={teaseColor}
        opacity={teaseOpacity}
      >
        <BlurMask blur={22} style="normal" />
      </RoundedRect>
    </Canvas>
  );
});

export const RevealOverlay = memo(function RevealOverlay({
  values: V,
  width,
  height,
  cx,
  cy,
  cardW,
  reduceMotion,
}: Props) {
  const flashColor = useDerivedValue(() => LIGHT[V.tier.value] ?? LIGHT[0]);
  const flashOpacity = useDerivedValue(() => {
    const fx = FX[V.tier.value];
    if (!fx || fx.flash === 0) return 0;
    return fx.flash * burstEnvelope(V.burst.value, 0.06) * (reduceMotion ? 0.6 : 1);
  });

  const unit = cardW / 2;
  // Four-point sparkle stars around the card.
  const ring = usePathValue((b) => {
    'worklet';
    const fx = FX[V.tier.value];
    const t = V.burst.value;
    if (!fx || fx.ring === 0 || t <= 0 || t >= 1) return;
    for (let i = 0; i < fx.ring; i++) {
      const p = ringSparkle(i, fx.ring, t, V.tier.value + 1);
      if (p.alpha <= 0.02) continue;
      const x = cx + p.dx * unit;
      const y = cy + p.dy * unit;
      const s = 7 * p.size * Math.min(1, p.alpha * 1.5);
      const w = s * 0.28;
      b.moveTo(x, y - s);
      b.lineTo(x + w, y - w);
      b.lineTo(x + s, y);
      b.lineTo(x + w, y + w);
      b.lineTo(x, y + s);
      b.lineTo(x - w, y + w);
      b.lineTo(x - s, y);
      b.lineTo(x - w, y - w);
      b.close();
    }
  });
  const ringColor = useDerivedValue(() => MAIN[V.tier.value] ?? MAIN[0]);
  const ringEdge = useDerivedValue(() => DARK[V.tier.value] ?? DARK[0]);
  const ringOpacity = useDerivedValue(() => {
    const t = V.burst.value;
    return t <= 0 || t >= 1 ? 0 : 1 - t * t;
  });

  // Gold chips drifting down from the top (legendary only).
  const shower = usePathValue((b) => {
    'worklet';
    const fx = FX[V.tier.value];
    const t = V.burst.value;
    if (reduceMotion || !fx || fx.shower === 0 || t <= 0 || t >= 1) return;
    for (let i = 0; i < fx.shower; i++) {
      const p = showerSparkle(i, t, width, height);
      if (p.alpha <= 0.02) continue;
      const c = Math.cos(p.rot);
      const s = Math.sin(p.rot);
      const hw = p.size * Math.max(0.2, Math.abs(Math.cos(p.rot * 1.7)));
      const hh = p.size;
      b.moveTo(p.x + c * hw, p.y + s * hw);
      b.lineTo(p.x - s * hh, p.y + c * hh);
      b.lineTo(p.x - c * hw, p.y - s * hw);
      b.lineTo(p.x + s * hh, p.y - c * hh);
      b.close();
    }
  });
  const showerOpacity = useDerivedValue(() => {
    const t = V.burst.value;
    return t <= 0 ? 0 : 1 - Math.pow(t, 4);
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height} color={flashColor} opacity={flashOpacity} />
      <Path path={ring} color={ringColor} opacity={ringOpacity} />
      <Path path={ring} color={ringEdge} style="stroke" strokeWidth={0.8} opacity={ringOpacity} />
      <Path path={shower} color={MAIN[4]} opacity={showerOpacity} />
      <Path path={shower} color={DARK[4]} style="stroke" strokeWidth={0.8} opacity={showerOpacity} />
    </Canvas>
  );
});
