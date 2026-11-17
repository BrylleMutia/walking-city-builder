import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { PackCard } from '../../logic/openPack';
import {
  MAX_TILT_DEG,
  TILT_RELEASE_SPRING,
  TILT_SPRING,
  clamp,
  type Tilt,
} from '../effects/tilt';
import { CARD_ASPECT, Card } from './Card';

export const PHASE_PACK = 0;
export const PHASE_REVEAL = 1;
export const PHASE_DONE = 2;

export interface StackLayout {
  screenW: number;
  screenH: number;
  cardW: number;
  /** Scale of a card while it sits inside the pack. */
  packScale: number;
  /** Card centre offset from screen centre while hidden in the pack. */
  hiddenDy: number;
  /** How far the cards rise out of the opened pack. */
  peekRise: number;
  /** Card centre offset from screen centre once revealed. */
  stackDy: number;
  /** Scale and positions for the end-of-pack summary grid. */
  miniScale: number;
  slots: { x: number; y: number }[];
}

export interface StackValues {
  progress: SharedValue<number>;
  reveal: SharedValue<number>;
  summary: SharedValue<number>;
  phase: SharedValue<number>;
  /** Index of the card currently on top; cards below it have been dismissed. */
  top: SharedValue<number>;
  /** Spring-smoothed `top`, so the stack shuffles up with a bounce. */
  topAnim: SharedValue<number>;
  packTilt: Tilt;
}

interface StackCardProps {
  card: PackCard;
  index: number;
  count: number;
  layout: StackLayout;
  values: StackValues;
  onPullOut: () => void;
  onDismiss: (index: number) => void;
}

const POP_SPRING = { stiffness: 210, damping: 13, mass: 0.7 } as const;
const FLING_SPEED = 850;

const lerp = (a: number, b: number, t: number) => {
  'worklet';
  return a + (b - a) * t;
};

const StackCard = memo(function StackCard({
  card,
  index,
  count,
  layout: L,
  values: V,
  onPullOut,
  onDismiss,
}: StackCardProps) {
  const cardH = L.cardW * CARD_ASPECT;
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const flyX = useSharedValue(0);
  const flyY = useSharedValue(0);
  const flyRot = useSharedValue(0);
  const active = useSharedValue(false);

  // While in the pack, the card's reflection follows the pack's tilt.
  const glareX = useDerivedValue(() => tiltX.value + V.packTilt.x.value * (1 - V.reveal.value));
  const glareY = useDerivedValue(() => tiltY.value + V.packTilt.y.value * (1 - V.reveal.value));

  const dismiss = (dirX: number, dirY: number) => {
    'worklet';
    if (V.phase.value !== PHASE_REVEAL || V.top.value !== index) return;
    V.top.value = index + 1;
    V.topAnim.value = withSpring(index + 1, POP_SPRING);
    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    const timing = { duration: 360, easing: Easing.out(Easing.quad) };
    flyX.value = withTiming((dirX / len) * L.screenW * 1.3, timing);
    flyY.value = withTiming((dirY / len) * L.screenH * 0.9, timing);
    flyRot.value = withTiming(dirX >= 0 ? 26 : -26, timing);
    scheduleOnRN(onDismiss, index);
  };

  const pan = usePanGesture({
    minDistance: 4,
    onBegin: (e) => {
      'worklet';
      if (V.phase.value !== PHASE_REVEAL || V.top.value !== index) return;
      active.value = true;
      tiltX.value = withSpring(clamp((e.x - L.cardW / 2) / (L.cardW / 2), -1, 1), TILT_SPRING);
      tiltY.value = withSpring(clamp((e.y - cardH / 2) / (cardH / 2), -1, 1), TILT_SPRING);
    },
    onUpdate: (e) => {
      'worklet';
      if (!active.value) return;
      tiltX.value = withSpring(clamp((e.x - L.cardW / 2) / (L.cardW / 2), -1, 1), TILT_SPRING);
      tiltY.value = withSpring(clamp((e.y - cardH / 2) / (cardH / 2), -1, 1), TILT_SPRING);
      // The card leans with the finger but mostly stays put; a *flick* sends it away.
      dragX.value = e.translationX * 0.28;
      dragY.value = e.translationY * 0.28;
    },
    onDeactivate: (e) => {
      'worklet';
      if (V.phase.value === PHASE_PACK) {
        if (V.progress.value > 0.95 && e.translationY < -24) scheduleOnRN(onPullOut);
        return;
      }
      if (!active.value) return;
      const speed = Math.sqrt(e.velocityX * e.velocityX + e.velocityY * e.velocityY);
      const dist = Math.sqrt(e.translationX * e.translationX + e.translationY * e.translationY);
      if (speed > FLING_SPEED) dismiss(e.velocityX, e.velocityY);
      else if (dist > L.cardW * 0.55) dismiss(e.translationX, e.translationY);
    },
    onFinalize: () => {
      'worklet';
      active.value = false;
      tiltX.value = withSpring(0, TILT_RELEASE_SPRING);
      tiltY.value = withSpring(0, TILT_RELEASE_SPRING);
      dragX.value = withSpring(0, TILT_SPRING);
      dragY.value = withSpring(0, TILT_SPRING);
    },
  });

  const tap = useTapGesture({
    onActivate: () => {
      'worklet';
      if (V.phase.value === PHASE_PACK) {
        if (V.progress.value > 0.95) scheduleOnRN(onPullOut);
      } else {
        dismiss(1, -0.2);
      }
    },
  });

  const gesture = useCompetingGestures(pan, tap);

  const style = useAnimatedStyle(() => {
    const r = V.reveal.value;
    const s = V.summary.value;
    const depth = Math.max(0, index - V.topAnim.value);

    // 1) inside / peeking out of the pack
    const peek = interpolate(V.progress.value, [0.5, 1], [0, 1], Extrapolation.CLAMP);
    const fan = index - (count - 1) / 2;
    const packY = L.hiddenDy - peek * L.peekRise + index * 1.5;
    const packRot = fan * 0.7 * peek;

    // 2) revealed stack
    const stackY = L.stackDy + depth * 9;
    const stackScale = 1 - depth * 0.04;
    const stackRot = depth * (index % 2 === 0 ? -1.6 : 1.6);

    let x = fan * 1.4 * peek * (1 - r);
    let y = lerp(packY, stackY, r);
    let scale = lerp(L.packScale, stackScale, r);
    let rot = lerp(packRot, stackRot, r);

    // 3) flicked away, then 4) gathered into the summary grid
    const slot = L.slots[index];
    x = lerp(x + flyX.value + dragX.value, slot.x, s);
    y = lerp(y + flyY.value + dragY.value, slot.y, s);
    rot = lerp(rot + flyRot.value, 0, s);
    scale = lerp(scale, L.miniScale, s);

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { perspective: 900 },
        { rotateX: `${-tiltY.value * MAX_TILT_DEG}deg` },
        { rotateY: `${tiltX.value * MAX_TILT_DEG}deg` },
        { rotateZ: `${rot}deg` },
        { scale },
      ],
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.card,
          {
            width: L.cardW,
            height: cardH,
            left: (L.screenW - L.cardW) / 2,
            top: (L.screenH - cardH) / 2,
            borderRadius: L.cardW * 0.065,
          },
          style,
        ]}
      >
        <Card card={card} width={L.cardW} tiltX={glareX} tiltY={glareY} />
      </Animated.View>
    </GestureDetector>
  );
});

interface Props {
  cards: PackCard[];
  layout: StackLayout;
  values: StackValues;
  onPullOut: () => void;
  onDismiss: (index: number) => void;
}

/**
 * The five cards for the whole flow: hidden in the pack → peeking out →
 * revealed stack → summary grid. Each stage is just a different target for the
 * same views, blended by shared values, so transitions are always continuous.
 */
export const CardStack = memo(function CardStack({
  cards,
  layout,
  values,
  onPullOut,
  onDismiss,
}: Props) {
  // Render back-to-front so card 0 (top of the stack) is drawn last.
  const order = cards.map((_, i) => cards.length - 1 - i);
  return (
    <>
      {order.map((i) => (
        <StackCard
          key={cards[i].uid}
          card={cards[i]}
          index={i}
          count={cards.length}
          layout={layout}
          values={values}
          onPullOut={onPullOut}
          onDismiss={onDismiss}
        />
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    backgroundColor: '#FFF8EC',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
});
