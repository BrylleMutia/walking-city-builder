import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { CARD_ASPECT } from '../components/card/Card';
import {
  CardStack,
  PHASE_DONE,
  PHASE_PACK,
  PHASE_REVEAL,
  type StackLayout,
  type StackValues,
} from '../components/card/CardStack';
import { Glitter } from '../components/effects/Glitter';
import { MAX_TILT_DEG } from '../components/effects/tilt';
import { BoosterPack } from '../components/pack/BoosterPack';
import { flapTopY, makePackGeometry } from '../components/pack/packGeometry';
import { RARITY_COLOR, RARITY_LABEL } from '../data/rarity';
import type { CardSet } from '../data/sets/cozyDowntown';
import { PillButton } from '../components/ui/kit';
import { haptic } from '../lib/haptics';
import { rarityFlags, type PackCard } from '../logic/openPack';
import { colors, fonts } from '../theme/tokens';

interface Props {
  set: CardSet;
  cards: PackCard[];
  width: number;
  height: number;
  /** Space to keep clear at the bottom (safe area). */
  bottomInset?: number;
  /** Space taken by the screen's header; the torn flap must stay below it. */
  topInset?: number;
  onDone: () => void;
  /** Omitted when the player can't afford another pack. */
  onOpenAnother?: () => void;
  anotherLabel?: string;
}

type Phase = 'sealed' | 'opened' | 'reveal' | 'done';

// Plain function reference for worklets to schedule back on the JS thread.
const hapticTick = haptic.tick;

/** Space kept clear at the bottom for the hint text / buttons. */
const HUD_SPACE = 110;

function useLayout(width: number, height: number, count: number) {
  return useMemo(() => {
    const cy = height / 2;
    // Big pack (~70% of the width), centred while sealed. Room for the torn flap
    // is made by sliding the pack down as it tears (see `drop` below), not by
    // shrinking it.
    const packW = Math.round(Math.min(width * 0.7, 360));
    const geo = makePackGeometry(packW);
    const packTop = cy - geo.height / 2;

    const cardW = Math.floor(Math.min(width * 0.74, 300, (height * 0.6) / CARD_ASPECT));
    const cardH = cardW * CARD_ASPECT;
    const packScale = (packW * 0.86) / cardW;
    const hiddenTop = packTop + geo.tearY + 10;

    const miniScale = Math.min(0.42, (width - 60) / (3 * cardW));
    const mw = cardW * miniScale;
    const mh = cardH * miniScale;
    const gap = 10;
    const perRow = 3;
    const slots = Array.from({ length: count }, (_, i) => {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, count - row * perRow);
      const col = i - row * perRow;
      const rows = Math.ceil(count / perRow);
      return {
        x: (col - (inRow - 1) / 2) * (mw + gap),
        y: (row - (rows - 1) / 2) * (mh + gap) - height * 0.03,
      };
    });

    const stack: StackLayout = {
      screenW: width,
      screenH: height,
      cardW,
      packScale,
      hiddenDy: hiddenTop + (cardH * packScale) / 2 - cy,
      peekRise: cardH * packScale * 0.42,
      stackDy: -height * 0.02,
      miniScale,
      slots,
    };
    return { geo, packTop, stack };
  }, [width, height, count]);
}

/**
 * One pack, from sealed to summary. Mounted with a fresh `key` per pack, so
 * every shared value below starts from its initial state without manual resets.
 */
export const PackSession = memo(function PackSession({
  set,
  cards,
  width,
  height,
  bottomInset = 0,
  topInset = 0,
  onDone,
  onOpenAnother,
  anotherLabel = 'Open another',
}: Props) {
  const { geo, packTop, stack } = useLayout(width, height, cards.length);
  const [phase, setPhase] = useState<Phase>('sealed');
  const [topIndex, setTopIndex] = useState(0);

  // ── animation state (UI thread) ──────────────────────────────────────────
  const progress = useSharedValue(0);
  const reveal = useSharedValue(0);
  const summary = useSharedValue(0);
  const phaseSV = useSharedValue(PHASE_PACK);
  const top = useSharedValue(0);
  const topAnim = useSharedValue(0);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const tearing = useSharedValue(false);
  const packEnabled = useSharedValue(true);
  const enter = useSharedValue(0);
  const float = useSharedValue(0);
  const settled = useSharedValue(0);
  const flash = useSharedValue(0);

  const packTilt = useMemo(() => ({ x: tiltX, y: tiltY }), [tiltX, tiltY]);
  const values: StackValues = useMemo(
    () => ({ progress, reveal, summary, phase: phaseSV, top, topAnim, packTilt }),
    [progress, reveal, summary, phaseSV, top, topAnim, packTilt],
  );

  useEffect(() => {
    enter.value = withSpring(1, { stiffness: 120, damping: 13, mass: 0.9 });
    float.value = withRepeat(
      withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [enter, float]);

  // ── JS-side reactions to animation milestones ────────────────────────────
  const handleOpened = useCallback(() => {
    haptic.heavy();
    setPhase((p) => (p === 'sealed' ? 'opened' : p));
  }, []);
  const handleClosed = useCallback(() => {
    haptic.light();
    setPhase((p) => (p === 'opened' ? 'sealed' : p));
  }, []);

  const pullOut = useCallback(() => {
    if (phaseSV.value !== PHASE_PACK) return;
    phaseSV.set(PHASE_REVEAL);
    packEnabled.set(false);
    reveal.set(withSpring(1, { stiffness: 130, damping: 15, mass: 0.9 }));
    setPhase('reveal');
    haptic.medium();
    haptic.reveal(cards[0].rarity);
  }, [cards, packEnabled, phaseSV, reveal]);

  const handleDismiss = useCallback(
    (index: number) => {
      const next = index + 1;
      setTopIndex(next);
      if (next >= cards.length) {
        phaseSV.set(PHASE_DONE);
        summary.set(withDelay(140, withSpring(1, { stiffness: 110, damping: 15 })));
        setPhase('done');
        haptic.success();
      } else {
        haptic.reveal(cards[next].rarity);
      }
    },
    [cards, phaseSV, summary],
  );

  // Haptic "teeth" while tearing: one tick per ~8% of travel.
  useAnimatedReaction(
    () => Math.floor(progress.value * 12),
    (step, prev) => {
      if (prev !== null && step !== prev && tearing.value) scheduleOnRN(hapticTick);
    },
  );

  // Open/closed with hysteresis so the state doesn't flap around the threshold.
  useAnimatedReaction(
    () => (progress.value >= 0.995 ? 2 : progress.value <= 0.5 ? 0 : 1),
    (zone, prev) => {
      if (prev === null || zone === prev) return;
      if (zone === 2) {
        flash.value = withSequence(
          withTiming(1, { duration: 110 }),
          withTiming(0, { duration: 750, easing: Easing.out(Easing.quad) }),
        );
        settled.value = withDelay(500, withTiming(1, { duration: 1500 }));
        scheduleOnRN(handleOpened);
      } else if (prev === 2) {
        settled.value = withTiming(0, { duration: 150 });
      }
      if (zone === 0 && prev !== null) scheduleOnRN(handleClosed);
    },
  );

  // Glitter gushes while tearing, eases to a trickle once open, stops on reveal.
  const glitterPower = useDerivedValue(() =>
    Math.max(0, (1 - reveal.value * 1.6) * (1 - 0.62 * settled.value)),
  );

  // How far the pack slides down so the rising flap never pokes into the header.
  // A pure function of tear progress: it tracks the finger 1:1, springs back with
  // the flap on reseal, and holds once open. Capped so the pack's bottom stays
  // above the hint text.
  const safeTop = topInset + 12;
  const maxDrop = Math.max(0, height - bottomInset - HUD_SPACE - (packTop + geo.height));
  const drop = useDerivedValue(() => {
    const flapTop = packTop + flapTopY(progress.value, geo.width, geo.tearY);
    return Math.min(maxDrop, Math.max(0, safeTop - flapTop));
  });

  // ── transforms shared by the pack and the cards inside it ────────────────
  const packStyle = useAnimatedStyle(() => {
    const r = Math.min(1, Math.max(0, reveal.value));
    const hold = 1 - r;
    const fall = (1 - enter.value) * -height * 0.8 + r * height * 0.95;
    return {
      transform: [
        { translateY: fall + drop.value + (float.value - 0.5) * 9 * hold },
        { perspective: 800 },
        { rotateX: `${-tiltY.value * MAX_TILT_DEG * hold}deg` },
        { rotateY: `${tiltX.value * MAX_TILT_DEG * hold}deg` },
        { rotateZ: `${(1 - enter.value) * -10 + r * 7}deg` },
      ],
    };
  });

  const cardsStyle = useAnimatedStyle(() => {
    const r = Math.min(1, Math.max(0, reveal.value));
    const hold = 1 - r;
    return {
      transform: [
        {
          translateY:
            ((1 - enter.value) * -height * 0.8 + drop.value + (float.value - 0.5) * 9) * hold,
        },
        { perspective: 800 },
        { rotateX: `${-tiltY.value * MAX_TILT_DEG * hold}deg` },
        { rotateY: `${tiltX.value * MAX_TILT_DEG * hold}deg` },
        { rotateZ: `${(1 - enter.value) * -10 * hold}deg` },
      ],
    };
  });

  // The pack's back wall, visible through the opening behind the cards.
  const backStyle = useAnimatedStyle(() => {
    const r = Math.min(1, Math.max(0, reveal.value));
    return {
      opacity: progress.value > 0.01 ? 1 : 0,
      transform: [{ translateY: r * height * 0.95 }, { rotateZ: `${r * 7}deg` }],
    };
  });

  const packLeft = (width - geo.width) / 2;
  const best = cards[cards.length - 1].rarity;
  const hasFoil = cards.some((c) => c.foil);
  const current = cards[Math.min(topIndex, cards.length - 1)];

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* cards (and the pack's back wall) sit behind the wrapper front */}
      <Animated.View style={[StyleSheet.absoluteFill, cardsStyle]} pointerEvents="box-none">
        <Animated.View
          pointerEvents="none"
          style={[
            styles.packBack,
            {
              left: packLeft + 2,
              top: packTop + geo.tearY - 5,
              width: geo.width - 4,
              height: geo.height - geo.tearY + 3,
            },
            backStyle,
          ]}
        />
        <CardStack
          cards={cards}
          layout={stack}
          values={values}
          onPullOut={pullOut}
          onDismiss={handleDismiss}
        />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, packStyle]} pointerEvents="box-none">
        <View style={{ position: 'absolute', left: packLeft, top: packTop }}>
          <BoosterPack
            geo={geo}
            set={set}
            progress={progress}
            tilt={packTilt}
            tearing={tearing}
            enabled={packEnabled}
            onTakeCards={pullOut}
          />
        </View>
      </Animated.View>

      <Glitter
        originX={packLeft}
        originY={packTop + geo.tearY}
        originDy={drop}
        span={geo.width}
        progress={progress}
        power={glitterPower}
        rarities={rarityFlags(cards)}
        hasFoil={hasFoil}
        flash={flash}
        flashColor={RARITY_COLOR[best].main}
      />

      <View style={[styles.hud, { bottom: bottomInset + 28 }]} pointerEvents="box-none">
        {phase === 'sealed' && (
          <Text style={styles.hint}>
            Swipe <Text style={styles.hintStrong}>across the top edge</Text> to tear it open{'\n'}
            Press and drag the pack to tilt it
          </Text>
        )}
        {phase === 'opened' && (
          <Text style={styles.hint}>
            <Text style={styles.hintStrong}>Tap the pack</Text> to take the cards out{'\n'}
            Swipe the top edge back to reseal
          </Text>
        )}
        {phase === 'reveal' && (
          <>
            <Text style={[styles.rarity, { color: RARITY_COLOR[current.rarity].dark }]}>
              {RARITY_LABEL[current.rarity].toUpperCase()}
              {current.foil ? '  ✦ FOIL' : ''}
            </Text>
            <Text style={styles.hint}>
              Card {Math.min(topIndex + 1, cards.length)} of {cards.length} · drag to tilt · flick
              or tap for next
            </Text>
          </>
        )}
        {phase === 'done' && (
          <View style={styles.actions}>
            {onOpenAnother && (
              <PillButton
                label={anotherLabel}
                variant="accent"
                icon="refresh-cw"
                onPress={onOpenAnother}
                testID="open-another"
              />
            )}
            <PillButton label="Go to my city" icon="check" onPress={onDone} testID="pack-done" />
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  packBack: {
    position: 'absolute',
    backgroundColor: '#B9C9C2',
    borderTopWidth: 2,
    borderColor: '#E3EFEA',
    borderRadius: 4,
  },
  hud: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'flex-end',
  },
  hint: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  hintStrong: {
    color: colors.ink.DEFAULT,
    fontFamily: fonts.strong,
  },
  rarity: {
    fontFamily: fonts.heavy,
    fontSize: 16,
    letterSpacing: 2,
    marginBottom: 4,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 10,
  },
});
