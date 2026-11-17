import {
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  Rect,
  RoundedRect,
  rect,
  vec,
} from '@shopify/react-native-skia';
import React, { memo, useMemo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import type { CardSet } from '../../data/sets/cozyDowntown';
import { glareLine, glareOpacity } from '../effects/tilt';
import { flapAngle, type PackGeometry } from './packGeometry';

interface Props {
  geo: PackGeometry;
  set: CardSet;
  /** Tear progress, 0 sealed → 1 fully open. */
  progress: SharedValue<number>;
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
}

const GLARE = ['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)'];

/**
 * Draws the wrapper. The flap is the same artwork rendered twice: once clipped
 * to the part that's still attached (right of the cut) and once clipped to the
 * part that's been torn (left of the cut) and rotated around the cut point.
 * Moving one number — the cut x — is therefore enough to animate the tear.
 */
export const PackArt = memo(function PackArt({ geo, set, progress, tiltX, tiltY }: Props) {
  const { width: W, height: H, tearY, crimpH, pad } = geo;
  const w = set.wrapper;

  const attachedClip = useDerivedValue(() => {
    const cut = progress.value * W;
    return rect(cut, -4, W - cut + 1, tearY + 8);
  });
  const tornClip = useDerivedValue(() => rect(-1, -4, progress.value * W + 1, tearY + 8));
  const pivot = useDerivedValue(() => vec(progress.value * W, tearY));
  const lift = useDerivedValue(() => [{ rotate: flapAngle(progress.value) }]);
  const tornShade = useDerivedValue(() => Math.min(0.22, flapAngle(progress.value) * 0.16));

  const glareStart = useDerivedValue(() => {
    const l = glareLine(tiltX.value, tiltY.value, W, H);
    return vec(l.x0, l.y0);
  });
  const glareEnd = useDerivedValue(() => {
    const l = glareLine(tiltX.value, tiltY.value, W, H);
    return vec(l.x1, l.y1);
  });
  const glareAlpha = useDerivedValue(() => glareOpacity(tiltX.value, tiltY.value, 0.14));

  // The printed face of the wrapper, shared by body and both flap halves.
  const face = useMemo(
    () => (
      <>
        <RoundedRect x={0} y={0} width={W} height={H} r={5}>
          <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={w.gradient} positions={[0, 0.5, 1]} />
        </RoundedRect>
        {/* setting sun */}
        <Circle cx={W / 2} cy={H * 0.56} r={W * 0.36} color={w.sun} opacity={0.22} />
        <Circle cx={W / 2} cy={H * 0.56} r={W * 0.24} color={w.sun} opacity={0.9} />
        <Path path={geo.skylineFar} color={w.skylineFar} />
        <Path path={geo.skylineNear} color={w.skyline} />
        <Path path={geo.windows} color={w.window} />
        {/* crimped seals */}
        <Rect x={0} y={0} width={W} height={crimpH} color="rgba(255,255,255,0.22)" />
        <Rect x={0} y={H - crimpH} width={W} height={crimpH} color={w.skyline} />
        <Rect x={0} y={H - crimpH} width={W} height={crimpH} color="rgba(255,255,255,0.12)" />
        <Path path={geo.ridges} style="stroke" strokeWidth={1.2} color="rgba(0,0,0,0.16)" />
        <Group transform={[{ translateX: 1.2 }]}>
          <Path path={geo.ridges} style="stroke" strokeWidth={0.8} color="rgba(255,255,255,0.28)" />
        </Group>
        {/* tear guide */}
        <Path
          path={geo.chevrons}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          strokeJoin="round"
          color="rgba(255,255,255,0.9)"
        />
        <Path path={geo.dashes} style="stroke" strokeWidth={1.4} strokeCap="round" color="rgba(255,255,255,0.55)" />
      </>
    ),
    [W, H, crimpH, geo, w],
  );

  const flapGlare = (
    <Group opacity={glareAlpha}>
      <Rect x={0} y={-4} width={W} height={tearY + 8}>
        <LinearGradient start={glareStart} end={glareEnd} colors={GLARE} />
      </Rect>
    </Group>
  );

  return (
    <Canvas
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -pad.left,
        top: -pad.top,
        width: W + pad.left + pad.right,
        height: H + pad.top + pad.bottom,
      }}
    >
      <Group transform={[{ translateX: pad.left }, { translateY: pad.top }]}>
        {/* body */}
        <Group clip={geo.bodyPath}>
          {face}
          {/* inner shadow just below the opening */}
          <Rect x={0} y={tearY} width={W} height={10}>
            <LinearGradient
              start={vec(0, tearY)}
              end={vec(0, tearY + 10)}
              colors={['rgba(0,0,0,0.22)', 'rgba(0,0,0,0)']}
            />
          </Rect>
        </Group>
        <Path path={geo.tearLine} style="stroke" strokeWidth={1.4} color="rgba(255,255,255,0.75)" />

        {/* flap: still attached */}
        <Group clip={attachedClip}>
          <Group clip={geo.flapPath}>
            {face}
            {flapGlare}
          </Group>
        </Group>

        {/* flap: torn part, peeling up around the cut point */}
        <Group origin={pivot} transform={lift}>
          <Group clip={tornClip}>
            <Group clip={geo.flapPath}>
              {face}
              {flapGlare}
              <Rect x={0} y={-4} width={W} height={tearY + 8} color="#000000" opacity={tornShade} />
            </Group>
          </Group>
        </Group>
      </Group>
    </Canvas>
  );
});
