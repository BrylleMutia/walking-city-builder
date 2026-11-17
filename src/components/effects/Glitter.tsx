import { BlurMask, Canvas, Circle, Path, useClock, usePathValue } from '@shopify/react-native-skia';
import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { GLITTER_THRESHOLD, RARITY_COLOR, RARITY_ORDER } from '../../data/rarity';

interface EmitterProps {
  /** Screen position of the left end of the tear line, and its length. */
  originX: number;
  originY: number;
  /** Live vertical offset of the emitter (the pack sliding down while it tears). */
  originDy?: SharedValue<number>;
  span: number;
  progress: SharedValue<number>;
  /** Global multiplier, 0 switches everything off. */
  power: SharedValue<number>;
}

interface LayerProps extends EmitterProps {
  clock: SharedValue<number>;
  color: string;
  glow: string;
  /** Thin darker edge so pale flakes stay visible on a light background. */
  outline: string;
  threshold: number;
  count: number;
  seed: number;
  size: number;
}

interface Seeds {
  emit: number[];
  phase: number[];
  life: number[];
  angle: number[];
  speed: number[];
  size: number[];
  spin: number[];
  flip: number[];
}

function makeSeeds(count: number, seed: number): Seeds {
  // Small LCG: deterministic per layer, so particles keep their identity
  // across frames without any stored state.
  let s = (seed * 9301 + 49297) % 233280;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const seeds: Seeds = { emit: [], phase: [], life: [], angle: [], speed: [], size: [], spin: [], flip: [] };
  for (let i = 0; i < count; i++) {
    seeds.emit.push(rnd());
    seeds.phase.push(rnd());
    seeds.life.push(0.75 + rnd() * 0.9);
    seeds.angle.push(-Math.PI / 2 + (rnd() - 0.5) * 2.0);
    seeds.speed.push(150 + rnd() * 400);
    seeds.size.push(0.55 + rnd() * 0.75);
    seeds.spin.push((rnd() - 0.5) * 9);
    seeds.flip.push(5 + rnd() * 11);
  }
  return seeds;
}

const GRAVITY = 560;

/**
 * One colour of glitter. There is no per-particle state: each particle's
 * position is a pure function of the clock and its random seeds (it loops
 * through birth → arc → fade forever). Every frame the worklet rebuilds one
 * path containing all of this colour's flakes, so a layer costs one draw call.
 */
const GlitterLayer = memo(function GlitterLayer({
  originX,
  originY,
  originDy,
  span,
  progress,
  power,
  clock,
  color,
  glow,
  outline,
  threshold,
  count,
  seed,
  size,
}: LayerProps) {
  const seeds = useMemo(() => makeSeeds(count, seed), [count, seed]);

  const path = usePathValue((b) => {
    'worklet';
    const p = progress.value;
    const pw = power.value;
    if (pw <= 0.01 || p < threshold) return;
    const t = clock.value / 1000;
    const oy = originY + (originDy ? originDy.value : 0);
    // This colour fades in over the next stretch of the swipe after its threshold.
    const ramp = Math.min(1, (p - threshold) / 0.14) * pw;
    const active = Math.ceil(count * ramp);
    const reach = p * 1.1 + 0.04;

    for (let i = 0; i < active; i++) {
      // A flake can only escape where the wrapper is already torn.
      if (seeds.emit[i] > reach) continue;
      const life = seeds.life[i];
      const cycle = t / life + seeds.phase[i];
      const age = cycle - Math.floor(cycle);
      const tau = age * life;
      const a = seeds.angle[i];
      const v = seeds.speed[i];
      const x = originX + seeds.emit[i] * span + Math.cos(a) * v * tau;
      const y = oy + Math.sin(a) * v * tau + 0.5 * GRAVITY * tau * tau;

      const fadeIn = age < 0.08 ? age / 0.08 : 1;
      const fadeOut = 1 - age * age;
      const s = size * seeds.size[i] * fadeIn * fadeOut;
      if (s < 0.3) continue;

      // Flakes tumble: squashing one axis reads as a flat chip flipping in the light.
      const squash = Math.max(0.12, Math.abs(Math.cos(tau * seeds.flip[i] + i)));
      const rot = i + tau * seeds.spin[i];
      const cx = Math.cos(rot);
      const sy = Math.sin(rot);
      const hw = s * squash;
      const hh = s;
      b.moveTo(x + cx * hw, y + sy * hw);
      b.lineTo(x - sy * hh, y + cx * hh);
      b.lineTo(x - cx * hw, y - sy * hw);
      b.lineTo(x + sy * hh, y - cx * hh);
      b.close();
    }
  });

  return (
    <>
      <Path path={path} color={glow} opacity={0.45}>
        <BlurMask blur={5} style="normal" />
      </Path>
      <Path path={path} color={color} />
      <Path path={path} color={outline} style="stroke" strokeWidth={0.9} opacity={0.85} />
    </>
  );
});

interface Props extends EmitterProps {
  /** Which rarities are in the pack, indexed by tier. */
  rarities: boolean[];
  hasFoil: boolean;
  /** 0..1 pulse fired when the pack snaps open. */
  flash: SharedValue<number>;
  flashColor: string;
}

/**
 * Full-screen glitter fountain coming out of the tear. Only rarities actually
 * present in the pack get a layer, and each layer has its own threshold, so
 * the colours you see while swiping are an honest hint of what's inside.
 */
export const Glitter = memo(function Glitter({
  rarities,
  hasFoil,
  flash,
  flashColor,
  ...emitter
}: Props) {
  const clock = useClock();
  const flashOpacity = useDerivedValue(() => flash.value * 0.55 * emitter.power.value);
  const flashRadius = useDerivedValue(() => emitter.span * (0.45 + flash.value * 0.5));
  const flashY = useDerivedValue(
    () => emitter.originY + (emitter.originDy ? emitter.originDy.value : 0),
  );

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Circle
        cx={emitter.originX + emitter.span / 2}
        cy={flashY}
        r={flashRadius}
        color={flashColor}
        opacity={flashOpacity}
      >
        <BlurMask blur={38} style="normal" />
      </Circle>
      {RARITY_ORDER.map((rarity, tier) =>
        rarities[tier] ? (
          <GlitterLayer
            key={rarity}
            {...emitter}
            clock={clock}
            color={RARITY_COLOR[rarity].main}
            glow={RARITY_COLOR[rarity].main}
            outline={RARITY_COLOR[rarity].dark}
            threshold={GLITTER_THRESHOLD[rarity]}
            count={tier === 0 ? 30 : 34}
            seed={tier + 1}
            size={4.2 + tier * 0.5}
          />
        ) : null,
      )}
      {hasFoil && (
        <GlitterLayer
          {...emitter}
          clock={clock}
          color="#FFFFFF"
          glow="#BFE9FF"
          outline="#6FA8DC"
          threshold={0.5}
          count={18}
          seed={11}
          size={3.4}
        />
      )}
    </Canvas>
  );
});
