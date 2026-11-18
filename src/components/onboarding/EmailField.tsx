import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { ZoomIn, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { looksLikeEmail } from '../../lib/email';
import { cardShadow, colors, fonts } from '../../theme/tokens';

/**
 * Email input in the same style as `PasswordInput` / the name field: white
 * card, primary focus border, mail icon, and a check that pops in once the
 * address looks valid.
 */
export function EmailField({
  value,
  onChangeText,
  autoFocus,
  testID,
}: {
  value: string;
  onChangeText: (v: string) => void;
  autoFocus?: boolean;
  testID?: string;
}) {
  const [focused, setFocused] = useState(false);
  const valid = looksLikeEmail(value);
  const focus = useSharedValue(0);
  useEffect(() => {
    focus.set(withTiming(focused ? 1 : 0, { duration: 160 }));
  }, [focused, focus]);
  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.card, colors.primary.DEFAULT]),
  }));

  return (
    <Animated.View
      className="flex-row items-center bg-card rounded-tile pl-4 pr-3"
      style={[cardShadow, { height: 56, borderWidth: 2 }, fieldStyle]}
    >
      <Feather name="mail" size={17} color={focused ? colors.primary.dark : colors.muted} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder="you@example.com"
        placeholderTextColor={colors.muted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, marginLeft: 10, fontFamily: fonts.semi, fontSize: 15, color: colors.ink.DEFAULT }}
      />
      {valid && (
        <Animated.View entering={ZoomIn.springify().damping(13).stiffness(300)}>
          <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
            <Feather name="check" size={13} color="#FFFFFF" />
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}
