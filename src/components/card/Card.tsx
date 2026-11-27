import {
  Canvas,
  Circle,
  LinearGradient,
  RadialGradient,
  Rect,
  RoundedRect,
  vec,
} from '@shopify/react-native-skia';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { RARITY_COLOR, RARITY_LABEL } from '../../data/rarity';
import type { PackCard } from '../../logic/openPack';
import { GlareOverlay } from '../effects/GlareOverlay';
import { ItemArt } from '../items/ItemArt';
import { fonts } from '../../theme/tokens';

export const CARD_ASPECT = 1.4;

interface Props {
  card: PackCard;
  width: number;
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
  /**
   * Position of a one-off light band crossing the face on reveal (rare and
   * up): 0 = just off the top-left corner, 1 = just past the bottom-right.
   * Outside 0..1 nothing is drawn.
   */
  sweep?: SharedValue<number>;
}

const PAPER = '#FFF8EC';
const INK = '#2B2118';

/**
 * A single collectible card at its full size. Purely presentational: position,
 * scale and 3D rotation are applied by the parent; this only needs the tilt to
 * place the light reflection.
 */
export const Card = memo(function Card({ card, width, tiltX, tiltY, sweep }: Props) {
  const height = width * CARD_ASPECT;
  const colors = RARITY_COLOR[card.rarity];
  const radius = width * 0.065;
  const border = width * 0.034;
  const pad = width * 0.07;
  const headerH = width * 0.15;
  const artX = pad;
  const artY = pad + headerH;
  const artW = width - pad * 2;
  const artH = width * 0.8;
  const fancy = card.rarity === 'epic' || card.rarity === 'legendary';

  return (
    <View style={[styles.card, { width, height, borderRadius: radius }]}>
      <Canvas style={StyleSheet.absoluteFill}>
        {/* rarity-coloured frame */}
        <RoundedRect x={0} y={0} width={width} height={height} r={radius}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(width, height)}
            colors={[colors.light, colors.main, colors.dark, colors.main]}
            positions={[0, 0.35, 0.8, 1]}
          />
        </RoundedRect>
        <RoundedRect
          x={border}
          y={border}
          width={width - border * 2}
          height={height - border * 2}
          r={radius - border * 0.6}
          color={PAPER}
        />
        {/* art window */}
        <RoundedRect x={artX} y={artY} width={artW} height={artH} r={width * 0.03}>
          <LinearGradient
            start={vec(0, artY)}
            end={vec(0, artY + artH)}
            colors={fancy ? [colors.light, '#FFFFFF', colors.light] : ['#DDF1F7', '#FDF6E6']}
          />
        </RoundedRect>
        <Circle cx={artX + artW / 2} cy={artY + artH * 0.5} r={artW * 0.5}>
          <RadialGradient
            c={vec(artX + artW / 2, artY + artH * 0.5)}
            r={artW * 0.5}
            colors={[fancy ? colors.main + '66' : 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0)']}
          />
        </Circle>
        <ItemArt
          id={card.item.id}
          x={artX + artW * 0.06}
          y={artY + artH * 0.04}
          width={artW * 0.88}
          height={artH * 0.92}
        />
      </Canvas>

      {/* text is native so it stays crisp at any scale */}
      <View style={[styles.header, { left: pad, right: pad, top: pad * 0.75, height: headerH }]}>
        <Text
          style={[styles.name, { fontSize: width * 0.072, color: INK }]}
          numberOfLines={1}
        >
          {card.item.name}
        </Text>
        <View style={[styles.gem, { width: width * 0.06, height: width * 0.06, backgroundColor: colors.main, borderColor: colors.dark }]} />
      </View>

      <View style={[styles.footer, { left: pad, right: pad, top: artY + artH + width * 0.035 }]}>
        <View style={styles.badges}>
          <View style={[styles.pill, { backgroundColor: colors.dark }]}>
            <Text style={[styles.pillText, { fontSize: width * 0.04 }]}>
              {RARITY_LABEL[card.rarity].toUpperCase()}
            </Text>
          </View>
          {(card.item.tilesPerCard ?? 1) > 1 && (
            <View style={[styles.pill, styles.tilesPill]}>
              <Text style={[styles.pillText, { fontSize: width * 0.04, color: INK }]}>
                ×{card.item.tilesPerCard} TILES
              </Text>
            </View>
          )}
          {card.foil && (
            <View style={[styles.pill, styles.foilPill]}>
              <Text style={[styles.pillText, { fontSize: width * 0.04, color: INK }]}>✦ FOIL</Text>
            </View>
          )}
        </View>
        <Text style={[styles.flavor, { fontSize: width * 0.044 }]} numberOfLines={2}>
          {card.item.flavor}
        </Text>
      </View>

      <GlareOverlay
        width={width}
        height={height}
        radius={radius}
        tiltX={tiltX}
        tiltY={tiltY}
        foil={card.foil}
        rest={0.06}
      />
      {sweep && <Sweep width={width} height={height} sweep={sweep} />}
    </View>
  );
});

const SWEEP_COLORS = ['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)'];

/** The reveal's light band: a soft white stripe sliding diagonally across the card once. */
function Sweep({ width, height, sweep }: { width: number; height: number; sweep: SharedValue<number> }) {
  // The band travels along the diagonal, from before the top-left corner to past the bottom-right.
  const band = width * 0.35;
  const start = useDerivedValue(() => {
    const d = -band + sweep.value * (width + height * 0.6 + band * 2);
    return vec(d - band, d * 0.6 - band * 0.6);
  });
  const end = useDerivedValue(() => {
    const d = -band + sweep.value * (width + height * 0.6 + band * 2);
    return vec(d + band, d * 0.6 + band * 0.6);
  });
  const opacity = useDerivedValue(() => (sweep.value > 0 && sweep.value < 1 ? 1 : 0));
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height} opacity={opacity}>
        <LinearGradient start={start} end={end} colors={SWEEP_COLORS} />
      </Rect>
    </Canvas>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: PAPER,
  },
  header: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
    fontFamily: fonts.heavy,
    letterSpacing: 0.2,
  },
  gem: {
    borderRadius: 3,
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
    marginLeft: 8,
    marginRight: 4,
  },
  footer: {
    position: 'absolute',
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 2.5,
  },
  tilesPill: {
    backgroundColor: '#FFF1D6',
    borderWidth: 1,
    borderColor: '#F2C46D',
  },
  foilPill: {
    backgroundColor: '#E9F4FF',
    borderWidth: 1,
    borderColor: '#9CC9F5',
  },
  pillText: {
    color: '#FFFFFF',
    fontFamily: fonts.heavy,
    letterSpacing: 0.8,
  },
  flavor: {
    marginTop: 6,
    color: '#6B5B4B',
    fontFamily: fonts.body,
  },
});
