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

import { DEFAULT_AVATAR, type AvatarId } from '../../data/avatars';
import type { SetListing } from '../../data/sets';
import { colors } from '../../theme/tokens';
import { PACK_ASPECT, makePackGeometry } from '../pack/packGeometry';

const AVATAR_CLIP = rrect(rect(0, 0, 64, 64), 32, 32);

/** Fits a drawing authored in a `vw × vh` box into `width × height`, centred. */
function fit(vw: number, vh: number, width: number, height: number) {
  const s = Math.min(width / vw, height / vh);
  return [{ translateX: (width - vw * s) / 2 }, { translateY: (height - vh * s) / 2 }, { scale: s }];
}

const av = colors.avatar;
type HairStyle = 'short' | 'long' | 'curly' | 'bun' | 'cap';

/** What each portrait in `data/avatars.ts` looks like (64 × 64 grid). */
const AVATAR_LOOKS: Record<AvatarId, { bg: string; shirt: string; skin: string; neck: string; hair: string; style: HairStyle }> = {
  // The original portrait: players from before the picker keep this one.
  sprout: { bg: colors.mint.deep, shirt: colors.primary.DEFAULT, skin: av.skin2, neck: av.skin2Shade, hair: av.hairDark, style: 'short' },
  sunny: { bg: colors.butter.deep, shirt: colors.accent.DEFAULT, skin: av.skin3, neck: av.skin3Shade, hair: av.hairBrown, style: 'long' },
  curly: { bg: colors.sky.soft, shirt: colors.sky.DEFAULT, skin: av.skin5, neck: av.skin5Shade, hair: av.hairBlack, style: 'curly' },
  bun: { bg: colors.petal.deep, shirt: colors.mascot.blush, skin: av.skin1, neck: av.skin1Shade, hair: av.hairRed, style: 'bun' },
  cap: { bg: colors.accent.soft, shirt: colors.ink.soft, skin: av.skin4, neck: av.skin4Shade, hair: av.hairDark, style: 'cap' },
};

const CURLS = [
  [19, 27, 4.5], [21, 20, 5], [27, 15.5, 5.5], [34, 14, 5.5], [41, 17, 5], [45, 23, 4.5], [46, 29, 3.5], [18, 32, 3],
] as const;

/** Round character portrait used for the player. */
export const Avatar = memo(function Avatar({ size = 52, variant = DEFAULT_AVATAR }: { size?: number; variant?: AvatarId }) {
  const look = AVATAR_LOOKS[variant] ?? AVATAR_LOOKS[DEFAULT_AVATAR];
  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={fit(64, 64, size, size)}>
        <Circle cx={32} cy={32} r={32} color={look.bg} />
        {/* Hair that falls behind the head and shoulders. */}
        {look.style === 'long' && (
          <Path path="M17 30 Q16 12 32 12 Q48 12 47 30 L48 47 Q44 50 40 46 L41 30 L23 30 L24 46 Q20 50 16 47 Z" color={look.hair} />
        )}
        {look.style === 'bun' && <Circle cx={32} cy={13} r={6.5} color={look.hair} />}
        <Group clip={AVATAR_CLIP}>
          <Path path="M10 66 Q10 45 32 45 Q54 45 54 66 Z" color={look.shirt} />
          <Path path="M26 45 L32 52 L38 45 Z" color="#FFFFFF" />
        </Group>
        <RoundedRect x={28} y={36} width={8} height={10} r={3} color={look.neck} />
        <Circle cx={32} cy={29} r={13} color={look.skin} />
        {/* Hair (or cap) on top of the head. */}
        {look.style === 'short' && (
          <Path path="M18.5 28 Q18 13 32 13 Q46 13 45.5 28 Q41 19.5 32 21 Q24 20 18.5 28 Z" color={look.hair} />
        )}
        {look.style === 'long' && (
          <Path path="M19 27 Q19 14 32 14 Q45 14 45 27 Q39 19 32 21.5 Q25 19 19 27 Z" color={look.hair} />
        )}
        {look.style === 'bun' && (
          <Path path="M19 27 Q19 15 32 15 Q45 15 45 27 Q40 20 32 21 Q24 20 19 27 Z" color={look.hair} />
        )}
        {look.style === 'curly' && CURLS.map(([x, y, r]) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} color={look.hair} />)}
        {look.style === 'cap' && (
          <>
            <Path path="M19 30 Q18 22 21 21 L21 31 Z M45 30 Q46 22 43 21 L43 31 Z" color={look.hair} />
            <Path path="M18.5 25 Q18.5 12 32 12 Q45.5 12 45.5 25 Z" color={colors.accent.DEFAULT} />
            <RoundedRect x={30} y={22.5} width={21} height={4.5} r={2.2} color={colors.accent.dark} />
            <Circle cx={32} cy={12.5} r={1.6} color={colors.accent.dark} />
          </>
        )}
        <Circle cx={27} cy={30} r={1.7} color={colors.ink.DEFAULT} />
        <Circle cx={37} cy={30} r={1.7} color={colors.ink.DEFAULT} />
        <Circle cx={24} cy={34} r={2.4} color={av.cheek} opacity={0.45} />
        <Circle cx={40} cy={34} r={2.4} color={av.cheek} opacity={0.45} />
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
 * Home hero artwork (assets/beaver-long-stride-city-card-clean.svg: the
 * mascot carrying timber along the promenade). The file *is* the whole hero
 * card: a rounded card body (y ≥ 344) plus a band above it where the skyline
 * and the beaver stick out, both clipped inside the SVG itself.
 */
const HERO_SVG = require('../../../assets/beaver-long-stride-city-card-clean.svg');
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

/**
 * A booster pack wrapper drawn at the origin, `width` wide and
 * `width × PACK_ASPECT` tall. Must be rendered inside a Skia Canvas.
 */
export const PackThumbArt = memo(function PackThumbArt({
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
    <Group>
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
    </Group>
  );
});

/** Static booster pack wrapper art, for shop listings. */
export const PackThumb = memo(function PackThumb({ listing, width }: { listing: SetListing; width: number }) {
  return (
    <Canvas style={{ width, height: Math.round(width * PACK_ASPECT) }}>
      <PackThumbArt listing={listing} width={width} />
    </Canvas>
  );
});
