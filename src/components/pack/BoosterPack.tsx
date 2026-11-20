import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { CARDS_PER_PACK } from '../../data/rarity';
import type { CardSet } from '../../data/sets/types';
import { GlareOverlay } from '../effects/GlareOverlay';
import { TILT_RELEASE_SPRING, TILT_SPRING, clamp, type Tilt } from '../effects/tilt';
import { fonts } from '../../theme/tokens';
import { PackArt } from './PackArt';
import type { PackGeometry } from './packGeometry';

interface Props {
  geo: PackGeometry;
  set: CardSet;
  /** Tear progress, 0 sealed → 1 open. Owned by the screen, driven from here. */
  progress: SharedValue<number>;
  tilt: Tilt;
  /** True while a finger is tearing; used for haptic ticks. */
  tearing: SharedValue<boolean>;
  /** Gestures are ignored once the cards have been pulled out. */
  enabled: SharedValue<boolean>;
  /** Tapping the body of an opened pack takes the cards out. */
  onTakeCards: () => void;
}

const MODE_NONE = 0;
const MODE_TILT = 1;
const MODE_TEAR = 2;

const SETTLE_SPRING = { stiffness: 260, damping: 26, mass: 0.7, overshootClamping: true } as const;
const FLICK_VELOCITY = 650;

export const BoosterPack = memo(function BoosterPack({
  geo,
  set,
  progress,
  tilt,
  tearing,
  enabled,
  onTakeCards,
}: Props) {
  const { width: W, height: H, tearY } = geo;
  // Generous touch target: the flap plus a band below it.
  const tearZone = tearY + H * 0.1;

  const mode = useSharedValue(MODE_NONE);
  const startProgress = useSharedValue(0);
  const pressed = useSharedValue(0);

  const pan = usePanGesture({
    minDistance: 1,
    onBegin: (e) => {
      'worklet';
      if (!enabled.value) {
        mode.value = MODE_NONE;
        return;
      }
      pressed.value = withSpring(1, TILT_SPRING);
      if (e.y < tearZone) {
        // One gesture, two jobs: where the touch lands decides which.
        mode.value = MODE_TEAR;
        cancelAnimation(progress);
        startProgress.value = progress.value;
        tearing.value = true;
      } else {
        mode.value = MODE_TILT;
        tilt.x.value = withSpring(clamp((e.x - W / 2) / (W / 2), -1, 1), TILT_SPRING);
        tilt.y.value = withSpring(clamp((e.y - H / 2) / (H / 2), -1, 1), TILT_SPRING);
      }
    },
    onUpdate: (e) => {
      'worklet';
      if (mode.value === MODE_TEAR) {
        // 1:1 with the finger — no easing while dragging, that's what makes it feel direct.
        progress.value = clamp(startProgress.value + e.translationX / (W * 0.92), 0, 1);
      } else if (mode.value === MODE_TILT) {
        tilt.x.value = withSpring(clamp((e.x - W / 2) / (W / 2), -1, 1), TILT_SPRING);
        tilt.y.value = withSpring(clamp((e.y - H / 2) / (H / 2), -1, 1), TILT_SPRING);
      }
    },
    onDeactivate: (e) => {
      'worklet';
      if (mode.value !== MODE_TEAR) return;
      const wasOpen = startProgress.value > 0.5;
      let open: boolean;
      if (e.velocityX > FLICK_VELOCITY) open = true;
      else if (e.velocityX < -FLICK_VELOCITY) open = false;
      else open = wasOpen ? progress.value > 0.6 : progress.value >= 0.8;
      progress.value = withSpring(open ? 1 : 0, SETTLE_SPRING);
      tearing.value = false;
      mode.value = MODE_NONE;
    },
    onFinalize: () => {
      'worklet';
      // Runs for every touch, including ones that never moved.
      if (mode.value === MODE_TEAR) {
        progress.value = withSpring(progress.value > 0.5 ? 1 : 0, SETTLE_SPRING);
        tearing.value = false;
      }
      mode.value = MODE_NONE;
      pressed.value = withSpring(0, TILT_SPRING);
      tilt.x.value = withSpring(0, TILT_RELEASE_SPRING);
      tilt.y.value = withSpring(0, TILT_RELEASE_SPRING);
    },
  });

  const tap = useTapGesture({
    onActivate: (e) => {
      'worklet';
      if (enabled.value && progress.value > 0.95 && e.y > tearZone) scheduleOnRN(onTakeCards);
    },
  });

  // Pan activates as soon as the finger moves; a touch that never moves is a tap.
  const gesture = useCompetingGestures(pan, tap);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pressed.value * 0.025 }],
  }));

  const bodyTop = tearY + 3;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View testID="booster-pack" style={[{ width: W, height: H }, pressStyle]}>
        <PackArt geo={geo} set={set} progress={progress} tiltX={tilt.x} tiltY={tilt.y} />

        <View style={[styles.labels, { top: tearY + H * 0.045 }]} pointerEvents="none">
          <Text style={[styles.kicker, { fontSize: W * 0.052, color: set.wrapper.ink }]}>
            ★ BOOSTER PACK ★
          </Text>
          <Text
            style={[
              styles.title,
              { fontSize: W * 0.145, lineHeight: W * 0.155, color: set.wrapper.ink },
            ]}
          >
            {set.name.toUpperCase().replace(' ', '\n')}
          </Text>
          <Text style={[styles.tagline, { fontSize: W * 0.05, color: set.wrapper.ink }]}>
            {set.tagline}
          </Text>
        </View>

        <View style={[styles.badgeRow, { bottom: geo.crimpH + H * 0.025 }]} pointerEvents="none">
          <View style={[styles.badge, { backgroundColor: set.wrapper.window }]}>
            <Text style={[styles.badgeText, { fontSize: W * 0.05, color: set.wrapper.ink }]}>
              {CARDS_PER_PACK} CARDS
            </Text>
          </View>
        </View>

        <View style={{ position: 'absolute', left: 0, top: bodyTop }} pointerEvents="none">
          <GlareOverlay
            width={W}
            height={H - bodyTop}
            radius={4}
            tiltX={tilt.x}
            tiltY={tilt.y}
            surfaceHeight={H}
            offsetY={bodyTop}
            rest={0.14}
          />
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  labels: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  kicker: {
    fontFamily: fonts.heavy,
    letterSpacing: 1.5,
    opacity: 0.75,
  },
  title: {
    marginTop: 4,
    fontFamily: fonts.heavy,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: 4,
    fontFamily: fonts.semi,
    opacity: 0.8,
  },
  badgeRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: fonts.heavy,
    letterSpacing: 1.2,
  },
});
