import { Feather } from '@expo/vector-icons';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { haptic } from '../../lib/haptics';
import { cardShadow, colors } from '../../theme/tokens';
import { Tap } from './Tap';

// Design and behaviour translated from Rare UI's "Delete button" (rareui.com,
// MIT + Commons Clause). Original React Native implementation.

const OPEN = { stiffness: 340, damping: 24, mass: 0.7 } as const;
const LID = { stiffness: 300, damping: 9, mass: 0.6 } as const;

type Phase = 'idle' | 'open' | 'done';

export interface DeleteButtonProps {
  /** Called when the check is pressed. */
  onConfirm: () => void;
  /** Called when the panel closes without deleting (cross or bin). */
  onCancel?: () => void;
  /** Button height in px; everything scales with it. */
  size?: number;
  /** How long the drawn check stays before the bin comes back. `false` keeps the check. */
  resetAfter?: number | false;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Asks for confirmation in place, no dialog: tap the bin and its lid lifts
 * while a ✓ / ✕ panel slides out. Confirming draws a check where the bin was;
 * backing out settles the lid with a bounce.
 */
export function DeleteButton({
  onConfirm,
  onCancel,
  size = 44,
  resetAfter = 1600,
  accessibilityLabel = 'Delete',
  testID,
}: DeleteButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const open = useSharedValue(0);
  const lid = useSharedValue(0);
  const done = useSharedValue(0);

  const inner = size - 8;
  const panel = inner * 2 + 8;

  useEffect(() => {
    open.set(withSpring(phase === 'open' ? 1 : 0, OPEN));
    lid.set(withSpring(phase === 'open' ? 1 : 0, LID));
    done.set(
      phase === 'done'
        ? withDelay(120, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }))
        : withTiming(0, { duration: 160 }),
    );
    if (phase !== 'done' || resetAfter === false) return;
    const t = setTimeout(() => setPhase('idle'), resetAfter);
    return () => clearTimeout(t);
  }, [phase, resetAfter, open, lid, done]);

  const cancel = () => {
    setPhase('idle');
    onCancel?.();
  };

  const rootStyle = useAnimatedStyle(() => ({ width: size + open.value * panel }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: open.value,
    transform: [{ translateX: (1 - open.value) * -12 }],
  }));
  const binStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, done.value * 3),
    transform: [{ scale: 1 - done.value * 0.4 }],
  }));

  return (
    <Animated.View
      testID={testID}
      className="flex-row items-center bg-card rounded-full overflow-hidden"
      style={[cardShadow, { height: size }, rootStyle]}
    >
      <Tap
        onPress={() => {
          if (phase === 'idle') {
            haptic.warning();
            setPhase('open');
          } else if (phase === 'open') cancel();
        }}
        haptics={false}
        disabled={phase === 'done'}
        accessibilityLabel={phase === 'open' ? 'Cancel delete' : accessibilityLabel}
        testID={testID ? `${testID}-bin` : undefined}
        surfaceStyle={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      >
        <Animated.View style={binStyle}>
          <Bin size={size * 0.42} lid={lid} />
        </Animated.View>
        <DrawnCheck size={size} progress={done} />
      </Tap>

      <Animated.View
        className="flex-row items-center"
        style={[{ gap: 8, paddingRight: 4 }, panelStyle]}
        pointerEvents={phase === 'open' ? 'auto' : 'none'}
      >
        <Tap
          onPress={() => {
            haptic.success();
            setPhase('done');
            onConfirm();
          }}
          haptics={false}
          accessibilityLabel="Confirm delete"
          testID={testID ? `${testID}-confirm` : undefined}
          className="rounded-full items-center justify-center"
          surfaceStyle={{ width: inner, height: inner, backgroundColor: colors.danger.DEFAULT }}
        >
          <Feather name="check" size={inner * 0.45} color="#FFFFFF" />
        </Tap>
        <Tap
          onPress={cancel}
          haptics="tick"
          accessibilityLabel="Cancel delete"
          testID={testID ? `${testID}-cancel` : undefined}
          className="rounded-full items-center justify-center bg-line"
          surfaceStyle={{ width: inner, height: inner }}
        >
          <Feather name="x" size={inner * 0.45} color={colors.ink.soft} />
        </Tap>
      </Animated.View>
    </Animated.View>
  );
}

/** A bin drawn from views so the lid can hinge on its left corner. */
function Bin({ size, lid }: { size: number; lid: SharedValue<number> }) {
  const stroke = Math.max(1.8, size * 0.1);
  const lidStyle = useAnimatedStyle(() => ({
    transformOrigin: 'left bottom',
    transform: [{ translateY: -lid.value * size * 0.12 }, { rotate: `${-lid.value * 28}deg` }],
  }));
  const ink = colors.danger.DEFAULT;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Animated.View style={[{ alignItems: 'center', marginBottom: stroke * 0.4 }, lidStyle]}>
        <View
          style={{
            width: size * 0.36,
            height: size * 0.16,
            borderWidth: stroke,
            borderBottomWidth: 0,
            borderTopLeftRadius: stroke,
            borderTopRightRadius: stroke,
            borderColor: ink,
          }}
        />
        <View style={{ width: size * 0.92, height: stroke, borderRadius: stroke, backgroundColor: ink }} />
      </Animated.View>
      <View
        style={{
          width: size * 0.7,
          height: size * 0.62,
          borderWidth: stroke,
          borderTopWidth: 0,
          borderBottomLeftRadius: size * 0.14,
          borderBottomRightRadius: size * 0.14,
          borderColor: ink,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: size * 0.12,
          paddingTop: size * 0.1,
          paddingBottom: size * 0.1,
        }}
      >
        <View style={{ width: stroke * 0.8, borderRadius: stroke, backgroundColor: ink }} />
        <View style={{ width: stroke * 0.8, borderRadius: stroke, backgroundColor: ink }} />
      </View>
    </View>
  );
}

/** A check that draws itself: Skia trims the stroke with `end`, read straight from the shared value. */
function DrawnCheck({ size, progress }: { size: number; progress: SharedValue<number> }) {
  const path = useMemo(() => {
    const p = Skia.PathBuilder.Make();
    p.moveTo(size * 0.3, size * 0.52);
    p.lineTo(size * 0.44, size * 0.66);
    p.lineTo(size * 0.71, size * 0.36);
    return p.build();
  }, [size]);
  const end = useDerivedValue(() => progress.value);
  return (
    <Canvas style={{ position: 'absolute', width: size, height: size }} pointerEvents="none">
      <Path
        path={path}
        style="stroke"
        strokeWidth={size * 0.075}
        strokeCap="round"
        strokeJoin="round"
        color={colors.primary.DEFAULT}
        start={0}
        end={end}
      />
    </Canvas>
  );
}
