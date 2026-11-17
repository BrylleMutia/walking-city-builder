import {
  Canvas,
  Group,
  LinearGradient,
  RadialGradient,
  Rect,
  Shader,
  rect,
  rrect,
  vec,
} from '@shopify/react-native-skia';
import React, { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { foilEffect } from './foilShader';
import { glareLine, glareOpacity } from './tilt';

interface Props {
  width: number;
  height: number;
  radius: number;
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  /** Adds the holographic layer and a stronger highlight. */
  foil?: boolean;
  /**
   * When this overlay only covers the lower part of a taller surface (the pack
   * body below the tear line), these describe the full surface so the streak
   * lines up with the part drawn elsewhere.
   */
  surfaceHeight?: number;
  offsetY?: number;
  /** Glare opacity when the surface is flat. */
  rest?: number;
}

const STREAK = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.10)',
  'rgba(255,255,255,0.62)',
  'rgba(255,255,255,0.10)',
  'rgba(255,255,255,0)',
];
const STREAK_POS = [0, 0.38, 0.5, 0.62, 1];
const HOTSPOT = ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)'];

/**
 * Transparent canvas layered above a pack or card that paints the light
 * reflection. Skia reads the Reanimated shared values directly on the UI
 * thread, so tilting never causes a React render.
 */
export const GlareOverlay = memo(function GlareOverlay({
  width,
  height,
  radius,
  tiltX,
  tiltY,
  foil = false,
  surfaceHeight,
  offsetY = 0,
  rest = 0.1,
}: Props) {
  const fullH = surfaceHeight ?? height;
  const clip = useMemo(
    () => rrect(rect(0, 0, width, height), radius, radius),
    [width, height, radius],
  );

  const start = useDerivedValue(() => {
    const l = glareLine(tiltX.value, tiltY.value, width, fullH);
    return vec(l.x0, l.y0 - offsetY);
  });
  const end = useDerivedValue(() => {
    const l = glareLine(tiltX.value, tiltY.value, width, fullH);
    return vec(l.x1, l.y1 - offsetY);
  });
  const spot = useDerivedValue(() =>
    vec(width * (0.5 - tiltX.value * 0.75), fullH * (0.5 - tiltY.value * 0.75) - offsetY),
  );
  const opacity = useDerivedValue(() =>
    glareOpacity(tiltX.value, tiltY.value, foil ? rest + 0.12 : rest),
  );
  const uniforms = useDerivedValue(() => ({
    size: [width, fullH],
    tilt: [tiltX.value, tiltY.value],
    strength: 0.75 + 0.25 * Math.min(1, Math.abs(tiltX.value) + Math.abs(tiltY.value)),
  }));

  return (
    <Canvas style={[styles.overlay, { width, height }]} pointerEvents="none">
      <Group clip={clip}>
        {foil && foilEffect && (
          <Rect x={0} y={0} width={width} height={height}>
            <Shader source={foilEffect} uniforms={uniforms} />
          </Rect>
        )}
        <Group opacity={opacity}>
          <Rect x={0} y={0} width={width} height={height}>
            <LinearGradient start={start} end={end} colors={STREAK} positions={STREAK_POS} />
          </Rect>
          <Rect x={0} y={0} width={width} height={height}>
            <RadialGradient c={spot} r={width * 0.55} colors={HOTSPOT} />
          </Rect>
        </Group>
      </Group>
    </Canvas>
  );
});

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, top: 0 },
});
