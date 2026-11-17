import {
  Canvas,
  Circle,
  Group,
  ImageSVG,
  LinearGradient,
  Path,
  Rect,
  RoundedRect,
  rect,
  rrect,
  useSVG,
  vec,
} from '@shopify/react-native-skia';
import React, { memo, useMemo } from 'react';

import type { SetListing } from '../../data/sets';
import { colors } from '../../theme/tokens';
import { makePackGeometry } from '../pack/packGeometry';

const SKIN = '#F6C9A6';
const HAIR = '#3B2A20';
const AVATAR_CLIP = rrect(rect(0, 0, 64, 64), 32, 32);

/** Fits a drawing authored in a `vw × vh` box into `width × height`, centred. */
function fit(vw: number, vh: number, width: number, height: number) {
  const s = Math.min(width / vw, height / vh);
  return [{ translateX: (width - vw * s) / 2 }, { translateY: (height - vh * s) / 2 }, { scale: s }];
}

/** Round character portrait used for the player. */
export const Avatar = memo(function Avatar({ size = 52 }: { size?: number }) {
  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={fit(64, 64, size, size)}>
        <Circle cx={32} cy={32} r={32} color={colors.mint.deep} />
        <Group clip={AVATAR_CLIP}>
          <Path path="M10 66 Q10 45 32 45 Q54 45 54 66 Z" color={colors.primary.DEFAULT} />
          <Path path="M26 45 L32 52 L38 45 Z" color="#FFFFFF" />
        </Group>
        <RoundedRect x={28} y={36} width={8} height={10} r={3} color="#E9B48F" />
        <Circle cx={32} cy={29} r={13} color={SKIN} />
        <Path path="M18.5 28 Q18 13 32 13 Q46 13 45.5 28 Q41 19.5 32 21 Q24 20 18.5 28 Z" color={HAIR} />
        <Circle cx={27} cy={30} r={1.7} color={colors.ink.DEFAULT} />
        <Circle cx={37} cy={30} r={1.7} color={colors.ink.DEFAULT} />
        <Circle cx={24} cy={34} r={2.4} color="#F59A9A" opacity={0.45} />
        <Circle cx={40} cy={34} r={2.4} color="#F59A9A" opacity={0.45} />
        <Path
          path="M28 35 Q32 39 36 35"
          style="stroke"
          strokeWidth={1.8}
          strokeCap="round"
          color={colors.ink.DEFAULT}
        />
      </Group>
    </Canvas>
  );
});

/**
 * Home hero artwork (assets/walking-city-builder-full-card.svg). The file *is*
 * the whole hero card: a rounded card body (y ≥ 344) plus a band above it where
 * the skyline and the builder stick out, both clipped inside the SVG itself.
 */
const HERO_SVG = require('../../../assets/walking-city-builder-full-card.svg');
/** The artwork's viewBox is 0 0 1348 1100. */
const HERO_VW = 1348;
const HERO_VH = 1100;
/** Height / width of the hero artwork. */
export const HERO_ASPECT = HERO_VH / HERO_VW;

export const HomeHeroArt = memo(function HomeHeroArt({ width }: { width: number }) {
  // Loaded once from the bundled asset and drawn by Skia. ImageSVG doesn't
  // rescale this file's viewBox, so draw it at its native size and scale it
  // with our own transform, like `fit()` above.
  const svg = useSVG(HERO_SVG);
  const height = width * HERO_ASPECT;
  return (
    <Canvas style={{ width, height }}>
      {svg && (
        <Group transform={fit(HERO_VW, HERO_VH, width, height)}>
          <ImageSVG svg={svg} x={0} y={0} width={HERO_VW} height={HERO_VH} />
        </Group>
      )}
    </Canvas>
  );
});

/** Static booster pack wrapper art, for shop listings. */
export const PackThumb = memo(function PackThumb({
  listing,
  width,
}: {
  listing: SetListing;
  width: number;
}) {
  const geo = useMemo(() => makePackGeometry(width), [width]);
  const w = listing.wrapper;
  const { width: W, height: H, crimpH, tearY } = geo;
  return (
    <Canvas style={{ width: W, height: H }}>
      <RoundedRect x={0} y={0} width={W} height={H} r={5}>
        <LinearGradient start={vec(0, 0)} end={vec(0, H)} colors={w.gradient} positions={[0, 0.5, 1]} />
      </RoundedRect>
      <Circle cx={W / 2} cy={H * 0.56} r={W * 0.36} color={w.sun} opacity={0.22} />
      <Circle cx={W / 2} cy={H * 0.56} r={W * 0.24} color={w.sun} opacity={0.9} />
      <Path path={geo.skylineFar} color={w.skylineFar} />
      <Path path={geo.skylineNear} color={w.skyline} />
      <Path path={geo.windows} color={w.window} />
      <Rect x={0} y={0} width={W} height={crimpH} color="rgba(255,255,255,0.22)" />
      <Rect x={0} y={H - crimpH} width={W} height={crimpH} color={w.skyline} />
      <Path path={geo.ridges} style="stroke" strokeWidth={1} color="rgba(0,0,0,0.16)" />
      <Path path={geo.tearLine} style="stroke" strokeWidth={1} color="rgba(255,255,255,0.6)" />
      {/* soft sheen so the thumbnail reads as glossy foil */}
      <Rect x={0} y={tearY} width={W} height={H - tearY}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(W, H)}
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
          positions={[0.25, 0.45, 0.65]}
        />
      </Rect>
    </Canvas>
  );
});
