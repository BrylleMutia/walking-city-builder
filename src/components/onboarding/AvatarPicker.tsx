import { Feather } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AVATARS, type AvatarId } from '../../data/avatars';
import { colors } from '../../theme/tokens';
import { Avatar } from '../ui/illustrations';
import { Tap } from '../ui/Tap';

const GAP = 10;
const RING = 3;
const POP = { stiffness: 380, damping: 14, mass: 0.6 } as const;

/** One row of the five portraits; the chosen one pops up with a green ring and a check. */
export function AvatarPicker({
  value,
  onChange,
  horizontalPadding,
}: {
  value: AvatarId;
  onChange: (id: AvatarId) => void;
  /** Space the row sits inside, so the five fit the screen width. */
  horizontalPadding: number;
}) {
  const { width } = useWindowDimensions();
  const size = Math.min(60, Math.floor((width - horizontalPadding * 2 - GAP * 4) / 5));
  return (
    <View className="flex-row justify-between" accessibilityRole="radiogroup" accessibilityLabel="Avatar">
      {AVATARS.map((a) => (
        <Option key={a.id} id={a.id} label={a.label} size={size} selected={a.id === value} onPress={() => onChange(a.id)} />
      ))}
    </View>
  );
}

function Option({
  id,
  label,
  size,
  selected,
  onPress,
}: {
  id: AvatarId;
  label: string;
  size: number;
  selected: boolean;
  onPress: () => void;
}) {
  const on = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    on.set(withSpring(selected ? 1 : 0, POP));
  }, [selected, on]);

  const ring = useAnimatedStyle(() => ({
    borderColor: selected ? colors.primary.DEFAULT : 'transparent',
    transform: [{ scale: 0.92 + on.value * 0.1 }],
  }));
  const badge = useAnimatedStyle(() => ({ opacity: on.value, transform: [{ scale: on.value }] }));

  return (
    <Tap
      onPress={onPress}
      haptics="tick"
      scaleTo={0.9}
      testID={`avatar-${id}`}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[{ width: size + RING * 2 + 4, height: size + RING * 2 + 4, borderRadius: size, borderWidth: RING, padding: 2 }, ring]}
        accessibilityState={{ selected }}
      >
        <Avatar size={size} variant={id} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        className="absolute rounded-full items-center justify-center border-2 border-card"
        style={[{ right: -2, bottom: -2, width: 20, height: 20, backgroundColor: colors.primary.DEFAULT }, badge]}
      >
        <Feather name="check" size={11} color="#FFFFFF" />
      </Animated.View>
    </Tap>
  );
}
