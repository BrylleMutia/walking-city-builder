import {
  Canvas,
  Circle,
  Group,
  Line,
  Oval,
  Path,
  RoundedRect,
  rect,
  rrect,
  vec,
} from '@shopify/react-native-skia';
import React, { memo } from 'react';

import { colors } from '../../theme/tokens';

/** The drawing is authored on a VIEW × VIEW grid and scaled to `size`. */
export const BEAVER_VIEW = 128;

const m = colors.mascot;

// Each body part is its own Group with a pivot so Phase 2 poses can rotate
// them (head nod, arm wave, tail slap) without touching this geometry.
const TAIL = { cx: 96, cy: 98, rx: 13, ry: 23 };
const TAIL_CLIP = rrect(
  rect(TAIL.cx - TAIL.rx, TAIL.cy - TAIL.ry, TAIL.rx * 2, TAIL.ry * 2),
  TAIL.rx,
  TAIL.ry,
);
const TAIL_HATCH = [-14, -6, 2, 10, 18].map((dy) => TAIL.cy + dy);

/**
 * Timber's drawing on the VIEW × VIEW grid, for use inside any Skia Canvas:
 * wrap it in a Group to place and scale it (see the onboarding scenes).
 */
export const BeaverArt = memo(function BeaverArt({
  shadowColor = colors.mint.deep,
  shadowOpacity = 0.7,
}: {
  /** Ground shadow, tinted to whatever the mascot stands on. */
  shadowColor?: string;
  shadowOpacity?: number;
}) {
  return (
      <Group>
        {/* Ground shadow */}
        <Oval x={34} y={113} width={60} height={9} color={shadowColor} opacity={shadowOpacity} />

        {/* Tail: flat paddle behind the body, cross-hatched */}
        <Group origin={vec(TAIL.cx, TAIL.cy + TAIL.ry)} transform={[{ rotate: -0.55 }]}>
          <Oval x={TAIL.cx - TAIL.rx} y={TAIL.cy - TAIL.ry} width={TAIL.rx * 2} height={TAIL.ry * 2} color={m.tail} />
          <Group clip={TAIL_CLIP}>
            {TAIL_HATCH.map((y) => (
              <Line key={y} p1={vec(TAIL.cx - 16, y - 6)} p2={vec(TAIL.cx + 16, y + 6)} color={m.furDark} strokeWidth={1.4} />
            ))}
            {[-6, 3].map((dx) => (
              <Line
                key={dx}
                p1={vec(TAIL.cx + dx, TAIL.cy - 26)}
                p2={vec(TAIL.cx + dx, TAIL.cy + 26)}
                color={m.furDark}
                strokeWidth={1.4}
              />
            ))}
          </Group>
        </Group>

        {/* Feet */}
        <Oval x={40} y={109} width={20} height={9} color={m.furDark} />
        <Oval x={68} y={109} width={20} height={9} color={m.furDark} />

        {/* Body + belly */}
        <Oval x={36} y={62} width={56} height={54} color={m.fur} />
        <Oval x={48} y={72} width={32} height={40} color={m.belly} />

        {/* Hi-vis vest: two open panels with reflective stripes */}
        <Path path="M40 74 Q46 64 56 64 L54 112 Q44 110 39 100 Z" color={colors.accent.DEFAULT} />
        <Path path="M88 74 Q82 64 72 64 L74 112 Q84 110 89 100 Z" color={colors.accent.DEFAULT} />
        <Path path="M39.5 88 L55.3 88 L55 93 L39.5 93 Z" color={colors.card} />
        <Path path="M88.5 88 L72.7 88 L73 93 L88.5 93 Z" color={colors.card} />
        {/* Step counter clipped to the vest */}
        <RoundedRect x={43} y={96} width={10} height={8} r={2} color={colors.ink.DEFAULT} />
        <RoundedRect x={44.5} y={97.5} width={7} height={3.5} r={1} color={colors.mint.DEFAULT} />

        {/* Arms, pivoting at the shoulders */}
        <Group origin={vec(40, 72)}>
          <RoundedRect x={33} y={70} width={11} height={28} r={5.5} color={m.fur} />
        </Group>
        <Group origin={vec(88, 72)}>
          <RoundedRect x={84} y={70} width={11} height={28} r={5.5} color={m.fur} />
        </Group>

        {/* Head, pivoting at the neck */}
        <Group origin={vec(64, 66)}>
          {/* Ears peek out under the hat brim */}
          <Circle cx={40} cy={41} r={7} color={m.furDark} />
          <Circle cx={88} cy={41} r={7} color={m.furDark} />
          <Circle cx={40} cy={41} r={3.5} color={m.belly} />
          <Circle cx={88} cy={41} r={3.5} color={m.belly} />

          <Circle cx={64} cy={48} r={25} color={m.fur} />
          <Oval x={50} y={50} width={28} height={19} color={m.belly} />

          {/* Eyes with a highlight: calm, slightly sleepy foreman look */}
          <Circle cx={53} cy={45} r={2.8} color={colors.ink.DEFAULT} />
          <Circle cx={75} cy={45} r={2.8} color={colors.ink.DEFAULT} />
          <Circle cx={54} cy={44} r={0.9} color={colors.card} />
          <Circle cx={76} cy={44} r={0.9} color={colors.card} />
          <Circle cx={46} cy={55} r={3.6} color={m.blush} opacity={0.45} />
          <Circle cx={82} cy={55} r={3.6} color={m.blush} opacity={0.45} />

          {/* Nose, mouth, teeth */}
          <Oval x={59} y={51} width={10} height={6.5} color={colors.ink.DEFAULT} />
          <Path
            path="M59 59 Q64 62 69 59"
            style="stroke"
            strokeWidth={1.6}
            strokeCap="round"
            color={colors.ink.DEFAULT}
          />
          <RoundedRect x={60.6} y={60.2} width={3.2} height={5} r={1} color={m.tooth} />
          <RoundedRect x={64.2} y={60.2} width={3.2} height={5} r={1} color={m.tooth} />

          {/* Hard hat: dome, ridge, brim, pack badge */}
          <Path path="M39 36 Q39 15 64 15 Q89 15 89 36 Z" color={colors.sun} />
          <RoundedRect x={61} y={15.5} width={6} height={20} r={3} color={m.hatShade} />
          <RoundedRect x={33} y={33} width={62} height={7} r={3.5} color={m.hatShade} />
          <RoundedRect x={49} y={22} width={10} height={9} r={2} color={colors.primary.DEFAULT} />
          <Path
            path="M50 25 L52 24 L54 25 L56 24 L58 25"
            style="stroke"
            strokeWidth={1}
            strokeJoin="round"
            color={colors.card}
          />
        </Group>
      </Group>
  );
});

/** Timber, the site-foreman beaver. Static drawing for now (Phase 1). */
export const Beaver = memo(function Beaver({ size = 128 }: { size?: number }) {
  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ scale: size / BEAVER_VIEW }]}>
        <BeaverArt />
      </Group>
    </Canvas>
  );
});
