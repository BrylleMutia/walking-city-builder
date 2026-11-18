import { Circle, Group, Oval, Path, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import React, { memo } from 'react';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import type { ItemId } from '../../data/sets/cozyDowntown';
import { getListing } from '../../data/sets';
import { colors } from '../../theme/tokens';
import { ItemArt } from '../items/ItemArt';
import { BEAVER_VIEW, BeaverArt } from '../mascot/Beaver';
import { PackThumbArt } from '../ui/illustrations';
import { ArtPanel } from './ArtPanel';

// PLACEHOLDER ART. Each scene is built from the mascot and existing game art
// so the onboarding can ship before the final illustrations exist. To swap in
// the real artwork, replace the body of a scene (or the whole component):
// the screens only depend on <OnboardingArt scene width height />.

export type OnboardingScene =
  | 'walk'
  | 'collect'
  | 'build'
  | 'name'
  | 'steps'
  | 'goal'
  | 'save'
  // Email sign-up mockups (dev/signup):
  | 'email'
  | 'account'
  | 'code';

const BG: Record<OnboardingScene, string> = {
  walk: colors.mint.DEFAULT,
  collect: colors.butter.DEFAULT,
  build: colors.petal.DEFAULT,
  name: colors.petal.DEFAULT,
  steps: colors.mint.DEFAULT,
  goal: colors.butter.DEFAULT,
  save: colors.sky.soft,
  email: colors.mint.DEFAULT,
  account: colors.sky.soft,
  code: colors.butter.DEFAULT,
};

interface Props {
  scene: OnboardingScene;
  width: number;
  height: number;
  /**
   * Signed distance from this slide while paging (0 = centred, ±1 = one page
   * away). Layers drift by different amounts for a light parallax.
   */
  offset?: SharedValue<number>;
}

export const OnboardingArt = memo(function OnboardingArt({ scene, width, height, offset }: Props) {
  return (
    <ArtPanel width={width} height={height} color={BG[scene]}>
      {scene === 'walk' && <WalkScene w={width} h={height} offset={offset} />}
      {scene === 'collect' && <CollectScene w={width} h={height} offset={offset} />}
      {scene === 'build' && <BuildScene w={width} h={height} offset={offset} />}
      {/* The setup screens have a back button top-left: keep the sun clear of it. */}
      {scene === 'steps' && <WalkScene w={width} h={height} sunX={0.36} />}
      {scene === 'name' && <NameScene w={width} h={height} />}
      {scene === 'goal' && <GoalScene w={width} h={height} />}
      {scene === 'save' && <SaveScene w={width} h={height} />}
      {scene === 'email' && <EmailScene w={width} h={height} />}
      {scene === 'account' && <AccountScene w={width} h={height} />}
      {scene === 'code' && <CodeScene w={width} h={height} />}
    </ArtPanel>
  );
});

type SceneProps = { w: number; h: number; offset?: SharedValue<number> };

/** A parallax layer: shifts sideways by `depth` × width per page of scroll. */
function Layer({ offset, depth, w, children }: { offset?: SharedValue<number>; depth: number; w: number; children: React.ReactNode }) {
  const transform = useDerivedValue(() => [{ translateX: (offset ? offset.value : 0) * -depth * w }]);
  return <Group transform={transform}>{children}</Group>;
}

/** The beaver standing with its feet at (cx, footY), `size` px tall. */
function Mascot({ cx, footY, size, shadow }: { cx: number; footY: number; size: number; shadow?: string }) {
  const s = size / BEAVER_VIEW;
  // Feet rest at y≈118 on the 128 grid.
  return (
    <Group transform={[{ translateX: cx - (BEAVER_VIEW / 2) * s }, { translateY: footY - 118 * s }, { scale: s }]}>
      <BeaverArt shadowColor={shadow} />
    </Group>
  );
}

/** Walk: rolling hills, a flag on the far one, a trail of footprints to the beaver. */
function WalkScene({ w, h, offset, sunX = 0.2 }: SceneProps & { sunX?: number }) {
  const ground = h * 0.66;
  return (
    <>
      <Layer offset={offset} depth={0.05} w={w}>
        <Circle cx={w * sunX} cy={h * 0.24} r={w * 0.06} color="#FFFFFF" />
        {/* far hill + flag */}
        <Oval x={w * 0.42} y={h * 0.38} width={w * 0.9} height={h * 0.5} color={colors.mint.deep} />
        <Path path={`M${w * 0.86} ${h * 0.395} V${h * 0.31}`} style="stroke" strokeWidth={2} color={colors.ink.DEFAULT} />
        <Path path={`M${w * 0.86} ${h * 0.31} L${w * 0.92} ${h * 0.33} L${w * 0.86} ${h * 0.35} Z`} color={colors.accent.DEFAULT} />
      </Layer>
      <Layer offset={offset} depth={0.12} w={w}>
        <Oval x={-w * 0.3} y={h * 0.46} width={w * 0.95} height={h * 0.5} color={colors.primary.soft} />
        <Rect x={0} y={ground} width={w} height={h - ground} color={colors.primary.soft} />
        {/* footprint trail leading in from the left */}
        {[0, 1, 2, 3].map((i) => (
          <Group key={i} transform={[{ translateX: w * (0.08 + i * 0.07) }, { translateY: h * (0.84 - i * 0.025) }]}>
            <Oval x={0} y={i % 2 ? 0 : 7} width={7} height={11} color={colors.mint.deep} />
          </Group>
        ))}
      </Layer>
      <Layer offset={offset} depth={0.22} w={w}>
        <Mascot cx={w * 0.56} footY={h * 0.9} size={h * 0.58} shadow={colors.primary.DEFAULT} />
      </Layer>
    </>
  );
}

/** Collect: spotlight rays onto the beaver holding up a booster pack. */
function CollectScene({ w, h, offset }: SceneProps) {
  const listing = getListing('cozy-downtown');
  const packW = w * 0.22;
  return (
    <>
      <Layer offset={offset} depth={0.04} w={w}>
        <Path path={`M0 0 L${w * 0.32} 0 L${w * 0.62} ${h} L${w * 0.38} ${h} Z`} color="#FFFFFF" opacity={0.35} />
        <Path path={`M${w} 0 L${w * 0.68} 0 L${w * 0.38} ${h} L${w * 0.62} ${h} Z`} color="#FFFFFF" opacity={0.35} />
        <Rect x={0} y={h * 0.78} width={w} height={h * 0.22} color={colors.butter.deep} />
        {/* rarity sparkles, like map pins in the reference */}
        {[
          [0.16, 0.5, colors.primary.DEFAULT],
          [0.84, 0.48, colors.sky.DEFAULT],
          [0.5, 0.16, '#A26BF6'],
        ].map(([x, y, c]) => (
          <Group key={String(c)} origin={vec(w * (x as number), h * (y as number))} transform={[{ rotate: Math.PI / 4 }]}>
            <RoundedRect x={w * (x as number) - 9} y={h * (y as number) - 9} width={18} height={18} r={4} color={c as string} />
          </Group>
        ))}
      </Layer>
      <Layer offset={offset} depth={0.2} w={w}>
        <Mascot cx={w * 0.45} footY={h * 0.92} size={h * 0.58} shadow={colors.butter.deep} />
        {listing && (
          <Group
            origin={vec(w * 0.68, h * 0.62)}
            transform={[{ translateX: w * 0.6 }, { translateY: h * 0.42 }, { rotate: 0.18 }]}
          >
            <PackThumbArt listing={listing} width={packW} />
          </Group>
        )}
      </Layer>
    </>
  );
}

const BUILD_TILES: ItemId[] = ['bakery', 'corner-cafe', 'brick-townhouse', 'bookshop', 'flower-kiosk', 'clock-tower'];

/** Build: rows of buildings filling the frame, the beaver in front. */
function BuildScene({ w, h, offset }: SceneProps) {
  const cell = w * 0.28;
  const rows = Math.ceil(h / (cell * 0.62)) + 1;
  return (
    <>
      <Layer offset={offset} depth={0.08} w={w}>
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: 5 }, (_, c) => {
            const id = BUILD_TILES[(r * 2 + c) % BUILD_TILES.length];
            const x = (c - 0.5) * cell + (r % 2 ? cell / 2 : 0);
            const y = r * cell * 0.62 - cell * 0.4;
            return <ItemArt key={`${r}-${c}`} id={id} x={x} y={y} width={cell} height={cell} />;
          }),
        )}
        <Rect x={0} y={0} width={w} height={h} color={colors.petal.DEFAULT} opacity={0.35} />
      </Layer>
      <Layer offset={offset} depth={0.2} w={w}>
        <Oval x={w * 0.24} y={h * 0.82} width={w * 0.52} height={h * 0.12} color="#FFFFFF" opacity={0.75} />
        <Mascot cx={w * 0.5} footY={h * 0.9} size={h * 0.56} shadow={colors.petal.deep} />
      </Layer>
    </>
  );
}

/** Name: the beaver holding up a blank "hello, my name is" sticker. */
function NameScene({ w, h }: SceneProps) {
  const tagW = w * 0.34;
  const tagH = tagW * 0.66;
  const x = w * 0.56;
  const y = h * 0.26;
  return (
    <>
      <Rect x={0} y={h * 0.74} width={w} height={h * 0.26} color={colors.petal.deep} />
      <Mascot cx={w * 0.34} footY={h * 0.9} size={h * 0.6} shadow={colors.petal.deep} />
      <Group origin={vec(x + tagW / 2, y + tagH / 2)} transform={[{ rotate: -0.08 }]}>
        <RoundedRect x={x} y={y} width={tagW} height={tagH} r={10} color="#FFFFFF" />
        <RoundedRect x={x} y={y} width={tagW} height={tagH * 0.32} r={10} color={colors.danger.DEFAULT} />
        <Rect x={x} y={y + tagH * 0.2} width={tagW} height={tagH * 0.12} color={colors.danger.DEFAULT} />
        {/* a blank line to write on */}
        <Path
          path={`M${x + tagW * 0.14} ${y + tagH * 0.72} H${x + tagW * 0.86}`}
          style="stroke"
          strokeWidth={2}
          strokeCap="round"
          color={colors.line}
        />
        <Path
          path={`M${x + tagW * 0.18} ${y + tagH * 0.64} q${tagW * 0.08} -${tagH * 0.16} ${tagW * 0.16} 0 t${tagW * 0.16} 0 t${tagW * 0.16} 0`}
          style="stroke"
          strokeWidth={3}
          strokeCap="round"
          color={colors.ink.DEFAULT}
        />
      </Group>
    </>
  );
}

/** Four-point sparkle, for "something good just happened" accents. */
function Sparkle({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <Path
      path={`M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z`}
      color={color}
    />
  );
}

/** Email (magic link): the beaver beside a big envelope with a sparkle. */
function EmailScene({ w, h }: SceneProps) {
  const ew = w * 0.36;
  const eh = ew * 0.66;
  const x = w * 0.54;
  const y = h * 0.3;
  return (
    <>
      <Rect x={0} y={h * 0.74} width={w} height={h * 0.26} color={colors.primary.soft} />
      <Group origin={vec(x + ew / 2, y + eh / 2)} transform={[{ rotate: 0.1 }]}>
        <RoundedRect x={x} y={y} width={ew} height={eh} r={10} color="#FFFFFF" />
        {/* flap */}
        <Path
          path={`M${x + 4} ${y + 6} L${x + ew / 2} ${y + eh * 0.56} L${x + ew - 4} ${y + 6}`}
          style="stroke"
          strokeWidth={4}
          strokeJoin="round"
          strokeCap="round"
          color={colors.primary.DEFAULT}
        />
        {/* the link inside: a little green "seal" */}
        <Circle cx={x + ew / 2} cy={y + eh * 0.56} r={eh * 0.13} color={colors.accent.DEFAULT} />
      </Group>
      <Sparkle x={x + ew * 1.02} y={y - eh * 0.1} r={14} color={colors.sun} />
      <Sparkle x={x - ew * 0.12} y={y + eh * 0.1} r={8} color="#FFFFFF" />
      <Mascot cx={w * 0.3} footY={h * 0.9} size={h * 0.6} shadow={colors.primary.DEFAULT} />
    </>
  );
}

/** Account (email + password): the beaver with a padlock and a key. */
function AccountScene({ w, h }: SceneProps) {
  const lw = w * 0.22;
  const lx = w * 0.62;
  const ly = h * 0.36;
  return (
    <>
      <Rect x={0} y={h * 0.74} width={w} height={h * 0.26} color={colors.sky.DEFAULT} opacity={0.35} />
      {/* shackle, then body */}
      <Path
        path={`M${lx + lw * 0.22} ${ly} V${ly - lw * 0.2} Q${lx + lw * 0.22} ${ly - lw * 0.58} ${lx + lw / 2} ${ly - lw * 0.58} Q${lx + lw * 0.78} ${ly - lw * 0.58} ${lx + lw * 0.78} ${ly - lw * 0.2} V${ly}`}
        style="stroke"
        strokeWidth={lw * 0.12}
        strokeCap="round"
        color={colors.ink.soft}
      />
      <RoundedRect x={lx} y={ly} width={lw} height={lw * 0.86} r={10} color={colors.sun} />
      <Circle cx={lx + lw / 2} cy={ly + lw * 0.36} r={lw * 0.1} color={colors.ink.DEFAULT} />
      <RoundedRect x={lx + lw * 0.46} y={ly + lw * 0.4} width={lw * 0.08} height={lw * 0.22} r={2} color={colors.ink.DEFAULT} />
      {/* key */}
      <Group origin={vec(lx - lw * 0.2, ly + lw * 0.9)} transform={[{ rotate: -0.5 }]}>
        <Circle cx={lx - lw * 0.42} cy={ly + lw * 0.9} r={lw * 0.15} color={colors.accent.DEFAULT} />
        <Circle cx={lx - lw * 0.42} cy={ly + lw * 0.9} r={lw * 0.06} color={colors.sky.soft} />
        <RoundedRect x={lx - lw * 0.3} y={ly + lw * 0.86} width={lw * 0.5} height={lw * 0.08} r={2} color={colors.accent.DEFAULT} />
        <RoundedRect x={lx + lw * 0.08} y={ly + lw * 0.9} width={lw * 0.06} height={lw * 0.12} r={1} color={colors.accent.DEFAULT} />
      </Group>
      <Sparkle x={lx + lw * 1.15} y={ly - lw * 0.55} r={12} color="#FFFFFF" />
      <Mascot cx={w * 0.3} footY={h * 0.9} size={h * 0.6} shadow={colors.sky.DEFAULT} />
    </>
  );
}

/** Code: the beaver next to a phone showing a speech bubble of dots. */
function CodeScene({ w, h }: SceneProps) {
  const pw = w * 0.22;
  const ph = pw * 1.75;
  const px = w * 0.6;
  const py = h * 0.2;
  const bx = px - pw * 0.55;
  const by = py + ph * 0.18;
  const bw = pw * 1.25;
  const bh = pw * 0.45;
  return (
    <>
      <Rect x={0} y={h * 0.74} width={w} height={h * 0.26} color={colors.butter.deep} />
      <Group origin={vec(px + pw / 2, py + ph / 2)} transform={[{ rotate: 0.08 }]}>
        <RoundedRect x={px} y={py} width={pw} height={ph} r={14} color={colors.ink.DEFAULT} />
        <RoundedRect x={px + 5} y={py + 12} width={pw - 10} height={ph - 24} r={8} color={colors.mint.soft} />
        <RoundedRect x={px + pw * 0.38} y={py + 5} width={pw * 0.24} height={3} r={1.5} color={colors.ink.soft} />
      </Group>
      {/* the code, in a bubble that pops out of the phone */}
      <RoundedRect x={bx} y={by} width={bw} height={bh} r={bh / 2} color="#FFFFFF" />
      <Path path={`M${bx + bw * 0.78} ${by + bh - 1} l${bh * 0.25} ${bh * 0.35} l${bh * 0.08} ${-bh * 0.38} Z`} color="#FFFFFF" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Circle
          key={i}
          cx={bx + bw * (0.17 + i * 0.133)}
          cy={by + bh / 2}
          r={bh * 0.11}
          color={i < 4 ? colors.primary.DEFAULT : colors.line}
        />
      ))}
      <Sparkle x={px + pw * 1.25} y={py + ph * 0.05} r={12} color={colors.accent.DEFAULT} />
      <Mascot cx={w * 0.27} footY={h * 0.9} size={h * 0.6} shadow={colors.butter.deep} />
    </>
  );
}

/** Goal: the beaver next to a big target. */
function GoalScene({ w, h }: SceneProps) {
  const cx = w * 0.7;
  const cy = h * 0.42;
  return (
    <>
      <Rect x={0} y={h * 0.72} width={w} height={h * 0.28} color={colors.butter.deep} />
      {[0.2, 0.15, 0.1, 0.05].map((r, i) => (
        <Circle key={r} cx={cx} cy={cy} r={w * r} color={i % 2 ? '#FFFFFF' : colors.accent.DEFAULT} />
      ))}
      <Path path={`M${cx} ${cy + w * 0.2} V${h * 0.78}`} style="stroke" strokeWidth={4} color={colors.ink.soft} />
      <Mascot cx={w * 0.32} footY={h * 0.88} size={h * 0.6} shadow={colors.butter.deep} />
    </>
  );
}

/** Save progress: the beaver with a cloud and a safe little house. */
function SaveScene({ w, h }: SceneProps) {
  return (
    <>
      <Group transform={[{ translateX: w * 0.58 }, { translateY: h * 0.12 }]}>
        <Circle cx={w * 0.08} cy={h * 0.12} r={h * 0.09} color="#FFFFFF" />
        <Circle cx={w * 0.2} cy={h * 0.08} r={h * 0.12} color="#FFFFFF" />
        <Circle cx={w * 0.31} cy={h * 0.13} r={h * 0.08} color="#FFFFFF" />
        <Rect x={w * 0.06} y={h * 0.12} width={w * 0.27} height={h * 0.09} color="#FFFFFF" />
      </Group>
      <Rect x={0} y={h * 0.74} width={w} height={h * 0.26} color={colors.sky.DEFAULT} opacity={0.35} />
      <ItemArt id="brick-townhouse" x={w * 0.56} y={h * 0.38} width={w * 0.36} height={h * 0.46} />
      <Mascot cx={w * 0.33} footY={h * 0.9} size={h * 0.58} shadow={colors.sky.DEFAULT} />
    </>
  );
}
