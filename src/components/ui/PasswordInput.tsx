import { Feather } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  ZoomIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { cardShadow, colors, fonts } from '../../theme/tokens';
import { AppText } from './AppText';
import { Tap } from './Tap';
import { STRENGTH_LABELS, passwordStrength, type Strength } from './passwordStrength';

// Design and behaviour translated from Rare UI's "Password input"
// (rareui.com, MIT + Commons Clause). Original React Native implementation.

const LEVEL_COLOR: Record<Strength, string> = {
  0: colors.line,
  1: colors.danger.DEFAULT,
  2: colors.accent.DEFAULT,
  3: colors.sky.DEFAULT,
  4: colors.primary.DEFAULT,
};
const SPRING = { stiffness: 320, damping: 24 } as const;

export interface PasswordInputProps
  extends Omit<
    TextInputProps,
    'value' | 'defaultValue' | 'onChange' | 'onChangeText' | 'secureTextEntry' | 'editable' | 'style'
  > {
  /** Controlled value. Leave out to let the field track its own state. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /** Show the four-step strength bar once something is typed. */
  strength?: boolean;
  disabled?: boolean;
}

/**
 * A password field with an eye toggle and an optional strength meter that
 * slides in under it as soon as you type, filling and recolouring per level.
 */
export function PasswordInput({
  value,
  defaultValue = '',
  onChange,
  defaultVisible = false,
  onVisibleChange,
  strength = false,
  disabled,
  placeholder = 'Password',
  testID,
  ...inputProps
}: PasswordInputProps) {
  const [own, setOwn] = useState(defaultValue);
  const text = value ?? own;
  const [visible, setVisible] = useState(defaultVisible);
  const [focused, setFocused] = useState(false);
  const level = passwordStrength(text);

  const focus = useSharedValue(0);
  const meter = useSharedValue(0);
  useEffect(() => {
    focus.set(withTiming(focused ? 1 : 0, { duration: 160 }));
  }, [focused, focus]);
  useEffect(() => {
    meter.set(withSpring(strength && text.length > 0 ? 1 : 0, SPRING));
  }, [strength, text.length, meter]);

  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.card, colors.primary.DEFAULT]),
  }));
  const meterStyle = useAnimatedStyle(() => ({
    height: meter.value * 30,
    opacity: meter.value,
    transform: [{ translateY: (1 - meter.value) * -6 }],
  }));

  return (
    // Disabled = flat and greyed rather than translucent: opacity over an
    // Android elevation shadow renders as a grey smear.
    <View pointerEvents={disabled ? 'none' : 'auto'}>
      <Animated.View
        className={`flex-row items-center rounded-tile pl-4 pr-1.5 ${disabled ? 'bg-line' : 'bg-card'}`}
        style={
          disabled
            ? { height: 56, borderWidth: 2, borderColor: colors.line, opacity: 0.7 }
            : [cardShadow, { height: 56, borderWidth: 2 }, fieldStyle]
        }
      >
        <Feather name="lock" size={17} color={focused ? colors.primary.dark : colors.muted} />
        <TextInput
          {...inputProps}
          testID={testID}
          value={text}
          onChangeText={(t) => {
            if (value === undefined) setOwn(t);
            onChange?.(t);
          }}
          secureTextEntry={!visible}
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          // Re-applied on every render: Android drops the custom font when secureTextEntry toggles.
          style={{ flex: 1, marginLeft: 10, fontFamily: fonts.semi, fontSize: 15, color: colors.ink.DEFAULT }}
        />
        <Tap
          onPress={() => {
            setVisible((v) => !v);
            onVisibleChange?.(!visible);
          }}
          haptics="tick"
          hitSlop={6}
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          testID={testID ? `${testID}-eye` : undefined}
          className="w-11 h-11 rounded-full items-center justify-center"
        >
          {/* Keyed by state so each flip pops the new icon in. */}
          <Animated.View key={visible ? 'on' : 'off'} entering={ZoomIn.springify().damping(13).stiffness(300)}>
            <Feather name={visible ? 'eye' : 'eye-off'} size={19} color={visible ? colors.primary.dark : colors.ink.soft} />
          </Animated.View>
        </Tap>
      </Animated.View>

      {strength && (
        <Animated.View style={[{ overflow: 'hidden' }, meterStyle]} accessibilityLiveRegion="polite">
          <View className="flex-row items-center pt-2.5 px-1">
            <View className="flex-1 flex-row" style={{ gap: 5 }}>
              {([1, 2, 3, 4] as const).map((step) => (
                <Segment key={step} filled={level >= step} color={LEVEL_COLOR[level]} />
              ))}
            </View>
            <AppText weight="strong" className="text-xs ml-3 w-12 text-right" style={{ color: LEVEL_COLOR[level] }}>
              {STRENGTH_LABELS[level]}
            </AppText>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

function Segment({ filled, color }: { filled: boolean; color: string }) {
  const fill = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    fill.set(withSpring(filled ? 1 : 0, SPRING));
  }, [filled, fill]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }], transformOrigin: 'left' }));
  return (
    <View className="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
      <Animated.View className="h-full rounded-full" style={[{ backgroundColor: color }, style]} />
    </View>
  );
}
