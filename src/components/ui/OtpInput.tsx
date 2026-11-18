import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput, View, type TextInputKeyPressEvent } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptic } from '../../lib/haptics';
import { cardShadow, colors } from '../../theme/tokens';
import { AppText } from './AppText';
import { Tap } from './Tap';

// Design and behaviour translated from Rare UI's "OTP Input" (rareui.com,
// MIT + Commons Clause). Original React Native implementation: arrow keys
// become "tap a slot", and one hidden TextInput feeds every slot.

export type OtpStatus = 'idle' | 'success' | 'error';
type Charset = 'numbers' | 'letters' | 'both';

const SIZES = { sm: 40, md: 48, lg: 56 } as const;
const ALLOWED: Record<Charset, RegExp> = { numbers: /[0-9]/, letters: /[a-zA-Z]/, both: /[a-zA-Z0-9]/ };
const ROLL = { stiffness: 420, damping: 22, mass: 0.6 } as const;
const CARET = { stiffness: 520, damping: 34, mass: 0.6 } as const;

export interface OtpInputProps {
  /** Number of slots. */
  length?: number;
  /** Slot height (sm 40, md 48, lg 56); width, text, caret and gaps scale with it. */
  size?: keyof typeof SIZES;
  /** Starting code (the component tracks its own slots after that). */
  defaultValue?: string;
  /** Every edit, with the code so far (empty slots left out). */
  onChange?: (code: string) => void;
  /** Once every slot is filled. */
  onComplete?: (code: string) => void;
  /** Which characters a slot accepts; anything else is ignored, paste included. */
  type?: Charset;
  /** success: a green ring traced around each slot in turn; error: red rings and one shake. */
  status?: OtpStatus;
  /** Show dots instead of the characters. */
  mask?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Bump to empty every slot (e.g. after a wrong code). */
  resetKey?: number;
  testID?: string;
}

/**
 * One-time-code entry. Characters roll up into their slot, a single caret
 * slides from slot to slot, backspace clears a slot in place and then steps
 * back, and a pasted or autofilled code drops straight in.
 */
export function OtpInput({
  length = 6,
  size = 'md',
  defaultValue = '',
  onChange,
  onComplete,
  type = 'numbers',
  status = 'idle',
  mask = false,
  disabled = false,
  autoFocus = false,
  resetKey = 0,
  testID,
}: OtpInputProps) {
  const h = SIZES[size];
  const w = Math.round(h * 0.86);
  const gap = Math.round(h * 0.22);
  const allowed = ALLOWED[type];

  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [slots, setSlots] = useState<string[]>(() => fill(Array(length).fill(''), 0, defaultValue, allowed));
  const [active, setActive] = useState(() => Math.min(firstEmpty(slots), length - 1));
  const [focused, setFocused] = useState(false);

  // Empty everything when asked (wrong code → try again).
  const firstReset = useRef(true);
  useEffect(() => {
    if (firstReset.current) {
      firstReset.current = false;
      return;
    }
    setSlots(Array(length).fill(''));
    setActive(0);
    // Disabling the field while a code is checked drops keyboard focus; take it back for the retry.
    const t = setTimeout(() => input.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [resetKey, length]);

  const emit = useCallback(
    (next: string[]) => {
      const code = next.join('');
      onChange?.(code);
      if (next.every((c) => c !== '')) onComplete?.(code);
    },
    [onChange, onComplete],
  );

  const onChangeText = (text: string) => {
    const typed = [...text].filter((c) => allowed.test(c));
    if (typed.length === 0 || disabled) return;
    // A whole code (paste / SMS-email autofill) fills from the start.
    const from = typed.length >= length ? 0 : active;
    const next = fill(slots, from, typed.join(''), allowed);
    setSlots(next);
    setActive(Math.min(from + typed.length, length - 1));
    if (typed.length === 1) haptic.tick();
    emit(next);
  };

  const onKeyPress = (e: TextInputKeyPressEvent) => {
    if (e.nativeEvent.key !== 'Backspace' || disabled) return;
    const next = [...slots];
    if (next[active]) {
      next[active] = ''; // clear in place…
    } else if (active > 0) {
      next[active - 1] = ''; // …then step back
      setActive(active - 1);
    }
    setSlots(next);
    emit(next);
  };

  const focusSlot = (i: number) => {
    if (disabled) return;
    // Jump only as far as the first empty slot, so codes can't get holes ahead of the caret.
    setActive(Math.min(i, firstEmpty(slots)));
    input.current?.focus();
  };

  // The caret glides between slots and blinks while it rests.
  const caretX = useSharedValue(active * (w + gap));
  const blink = useSharedValue(1);
  useEffect(() => {
    caretX.set(withSpring(active * (w + gap), CARET));
    blink.set(1);
    blink.set(
      withDelay(400, withRepeat(withTiming(0, { duration: 480, easing: Easing.inOut(Easing.quad) }), -1, true)),
    );
    return () => cancelAnimation(blink);
  }, [active, w, gap, caretX, blink]);
  const caretStyle = useAnimatedStyle(() => ({ opacity: blink.value, transform: [{ translateX: caretX.value }] }));

  // Wrong code: one shake of the whole row.
  const shake = useSharedValue(0);
  useEffect(() => {
    if (status === 'error') {
      haptic.warning();
      shake.set(
        withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 70 }),
          withTiming(-7, { duration: 60 }),
          withTiming(5, { duration: 55 }),
          withSpring(0, { stiffness: 400, damping: 12 }),
        ),
      );
    } else if (status === 'success') {
      haptic.success();
    }
  }, [status, shake]);
  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const showCaret = focused && !disabled && status === 'idle' && !slots[active];

  return (
    <View style={{ opacity: disabled ? 0.5 : 1, alignSelf: 'center' }}>
      <Animated.View className="flex-row" style={[{ gap }, rowStyle]} accessibilityLabel={`${length}-character code`}>
        {slots.map((c, i) => (
          <Slot
            key={i}
            index={i}
            char={c}
            mask={mask}
            w={w}
            h={h}
            active={focused && i === active && status === 'idle'}
            status={status}
            onPress={() => focusSlot(i)}
          />
        ))}
        {showCaret && (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: w / 2 - 1,
                top: h * 0.26,
                width: 2,
                height: h * 0.48,
                borderRadius: 1,
                backgroundColor: colors.primary.DEFAULT,
              },
              caretStyle,
            ]}
          />
        )}
      </Animated.View>
      <TextInput
        ref={input}
        testID={testID}
        // Always empty: each change is read as "typed these" and the field resets.
        value=""
        onChangeText={onChangeText}
        onKeyPress={onKeyPress}
        keyboardType={type === 'numbers' ? 'number-pad' : 'default'}
        autoCapitalize={type === 'numbers' ? 'none' : 'characters'}
        autoCorrect={false}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        contextMenuHidden={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
      />
    </View>
  );
}

function Slot({
  index,
  char,
  mask,
  w,
  h,
  active,
  status,
  onPress,
}: {
  index: number;
  char: string;
  mask: boolean;
  w: number;
  h: number;
  active: boolean;
  status: OtpStatus;
  onPress: () => void;
}) {
  // Character rolls up into place from below.
  const roll = useSharedValue(char ? 1 : 0);
  useEffect(() => {
    roll.set(char ? withSpring(1, ROLL) : withTiming(0, { duration: 90 }));
  }, [char, roll]);
  const charStyle = useAnimatedStyle(() => ({
    opacity: roll.value,
    transform: [{ translateY: (1 - roll.value) * h * 0.45 }],
  }));

  // Status ring, traced slot by slot for success.
  const ring = useSharedValue(0); // 0 none, 1 success, -1 error
  useEffect(() => {
    if (status === 'success') ring.set(withDelay(index * 60, withTiming(1, { duration: 180 })));
    else if (status === 'error') ring.set(withTiming(-1, { duration: 120 }));
    else ring.set(withTiming(0, { duration: 160 }));
  }, [status, index, ring]);

  const base = active ? colors.primary.DEFAULT : char ? colors.mint.deep : colors.line;
  const boxStyle = useAnimatedStyle(() => ({
    borderColor:
      ring.value >= 0
        ? interpolateColor(ring.value, [0, 1], [base, colors.primary.DEFAULT])
        : interpolateColor(-ring.value, [0, 1], [base, colors.danger.DEFAULT]),
    transform: [{ scale: 1 + Math.max(0, ring.value) * 0.04 * (1 - ring.value) * 4 }],
  }));

  return (
    <Tap onPress={onPress} haptics={false} scaleTo={0.96} accessibilityLabel={`Character ${index + 1}`}>
      <Animated.View
        className="bg-card rounded-chip items-center justify-center overflow-hidden"
        style={[cardShadow, { width: w, height: h, borderWidth: 2 }, boxStyle]}
      >
        <Animated.View style={charStyle}>
          {mask && char ? (
            <View style={{ width: h * 0.2, height: h * 0.2, borderRadius: h * 0.1, backgroundColor: colors.ink.DEFAULT }} />
          ) : (
            <AppText weight="heavy" style={{ fontSize: Math.round(h * 0.44), lineHeight: Math.round(h * 0.56) }}>
              {char}
            </AppText>
          )}
        </Animated.View>
      </Animated.View>
    </Tap>
  );
}

/** Writes `text` into the slots starting at `from`, keeping only allowed characters. */
function fill(slots: string[], from: number, text: string, allowed: RegExp): string[] {
  const next = [...slots];
  let i = from;
  for (const c of text) {
    if (i >= next.length) break;
    if (!allowed.test(c)) continue;
    next[i++] = c;
  }
  return next;
}

const firstEmpty = (slots: string[]) => {
  const i = slots.indexOf('');
  return i === -1 ? slots.length - 1 : i;
};
