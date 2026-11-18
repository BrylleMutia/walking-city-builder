import React from 'react';
import { View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { colors } from '../../theme/tokens';

const DOT = 8;
const ACTIVE = 22;

/**
 * Page indicator driven straight by the scroll position (`page` is fractional:
 * 0.5 = halfway between the first two slides), so the active dot stretches
 * and hands over 1:1 with the finger.
 */
export function PageDots({ count, page }: { count: number; page: SharedValue<number> }) {
  return (
    <View className="flex-row items-center" style={{ gap: 6 }} accessibilityElementsHidden>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} index={i} page={page} />
      ))}
    </View>
  );
}

function Dot({ index, page }: { index: number; page: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const near = 1 - Math.min(1, Math.abs(page.value - index));
    return {
      width: interpolate(near, [0, 1], [DOT, ACTIVE]),
      backgroundColor: interpolateColor(near, [0, 1], [colors.line, colors.primary.DEFAULT]),
    };
  });
  return <Animated.View style={[{ height: DOT, borderRadius: DOT / 2 }, style]} />;
}
