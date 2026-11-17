import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptic } from '../../lib/haptics';

const PRESS_IN = { stiffness: 520, damping: 30, mass: 0.6 } as const;
const RELEASE = { stiffness: 260, damping: 11, mass: 0.6 } as const;

export interface TapProps {
  onPress?: () => void;
  disabled?: boolean;
  /** Classes for the visible surface. */
  className?: string;
  /** Inline style for the visible surface (shadows, dynamic colours). */
  surfaceStyle?: StyleProp<ViewStyle>;
  /** Style for the outer touch target (layout in the parent: flex, margins). */
  style?: StyleProp<ViewStyle>;
  haptics?: 'tick' | 'light' | 'medium' | false;
  /** How far the surface sinks while pressed. */
  scaleTo?: number;
  hitSlop?: number;
  accessibilityLabel?: string;
  /** Stable id for end-to-end tests (Android view id). */
  testID?: string;
  children?: React.ReactNode;
}

/**
 * Every tappable thing in the app goes through this: it sinks on touch-down
 * and springs back with a little overshoot on release, plus a haptic tick.
 * The press-in spring is stiff (instant response), the release is bouncy.
 */
export function Tap({
  onPress,
  disabled,
  className = '',
  surfaceStyle,
  style,
  haptics = 'light',
  scaleTo = 0.95,
  hitSlop,
  accessibilityLabel,
  testID,
  children,
}: TapProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      disabled={disabled}
      hitSlop={hitSlop}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={style}
      onPressIn={() => {
        scale.set(withSpring(scaleTo, PRESS_IN));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, RELEASE));
      }}
      onPress={() => {
        if (haptics) haptic[haptics]();
        onPress?.();
      }}
    >
      <Animated.View style={animated}>
        <View className={className} style={surfaceStyle}>
          {children}
        </View>
      </Animated.View>
    </Pressable>
  );
}
