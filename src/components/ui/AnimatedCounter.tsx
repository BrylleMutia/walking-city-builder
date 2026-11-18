import React, { memo, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";

import { colors, fonts } from "../../theme/tokens";
import { digitColumns } from "./counterDigits";

// Design and behaviour translated from Rare UI's "Animated counter"
// (rareui.com, MIT + Commons Clause). This is an original React Native
// implementation, not a port of its source.

const WEIGHT = {
  body: fonts.body,
  semi: fonts.semi,
  strong: fonts.strong,
  heavy: fonts.heavy,
} as const;
const TONE = {
  ink: colors.ink.DEFAULT,
  soft: colors.ink.soft,
  muted: colors.muted,
  white: "#FFFFFF",
  primary: colors.primary.dark,
  accent: colors.accent.DEFAULT,
} as const;

/** A column spins at most this many faces per change, so a +5,000 jump doesn't blur. */
const MAX_SPIN = 20;
const LAYOUT = LinearTransition.springify().damping(18).stiffness(220);

export interface AnimatedCounterProps {
  value: number;
  /** Decimal places to keep (0–6). The value is rounded, so wheels land on whole digits. */
  decimals?: number;
  /** Fewest whole digits, padded with zeros: holds the width steady across powers of ten. */
  padStart?: number;
  /** Put every three whole digits. Empty string to group nothing. */
  separator?: string;
  decimalSeparator?: string;
  /** Rendered before/after the number; never animates. */
  prefix?: string;
  suffix?: string;
  /** Font size in px. Wheel height is derived from it, so it is a number, not a class. */
  size?: number;
  weight?: keyof typeof WEIGHT;
  tone?: keyof typeof TONE;
  /** Overrides `tone` (e.g. a badge colour). */
  color?: string;
  /** Roughly how many ms a digit takes to settle. Lower it for values that change constantly. */
  duration?: number;
  testID?: string;
}

/**
 * An odometer: every digit is a wheel that rolls up as the number grows and
 * down as it shrinks. A gained place slides in, a lost one fades out while the
 * rest close up. Runs on the UI thread, so a value that changes on every step
 * sync never re-renders per frame.
 */
export const AnimatedCounter = memo(function AnimatedCounter({
  value,
  decimals = 0,
  padStart = 1,
  separator = ",",
  decimalSeparator = ".",
  prefix,
  suffix,
  size = 16,
  weight = "heavy",
  tone = "ink",
  color,
  duration = 650,
  testID,
}: AnimatedCounterProps) {
  const lineHeight = Math.round(size * 1.3);
  const textStyle = {
    fontFamily: WEIGHT[weight],
    fontSize: size,
    lineHeight,
    color: color ?? TONE[tone],
    includeFontPadding: false,
  };
  // The widest digit sets every column's width, so wheels don't wobble as faces change.
  const [digitWidth, setDigitWidth] = useState(Math.ceil(size * 0.64));
  const { columns, label } = digitColumns(value, {
    decimals,
    padStart,
    separator,
    decimalSeparator,
  });

  return (
    <View
      className="flex-row items-center"
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${prefix ?? ""}${label}${suffix ?? ""}`}
    >
      {/* Invisible measuring run of the widest digits. */}
      <Text
        style={[textStyle, styles.measure]}
        onLayout={(e) =>
          setDigitWidth(Math.ceil(e.nativeEvent.layout.width / 4))
        }
      >
        0808
      </Text>
      {prefix ? <Text style={textStyle}>{prefix}</Text> : null}
      {columns.map((c) =>
        c.kind === "digit" ? (
          <Animated.View
            key={c.key}
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(160)}
            layout={LAYOUT}
          >
            <DigitWheel
              target={c.target}
              width={digitWidth}
              height={lineHeight}
              textStyle={textStyle}
              duration={duration}
            />
          </Animated.View>
        ) : (
          <Animated.View
            key={c.key}
            entering={FadeIn.duration(220)}
            exiting={FadeOut.duration(160)}
            layout={LAYOUT}
          >
            <Text style={textStyle}>{c.char}</Text>
          </Animated.View>
        ),
      )}
      {suffix ? <Text style={textStyle}>{suffix}</Text> : null}
    </View>
  );
});

type TextStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  color: string;
  includeFontPadding: boolean;
};

/**
 * `target` is the whole number up to this place (e.g. 1248 for the tens of
 * 12,480), not just one digit. Springing that cumulative value and showing it
 * mod 10 is what makes 19 → 20 roll the ones wheel *forward* through 0
 * instead of back down through 8…1.
 */
function DigitWheel({
  target,
  width,
  height,
  textStyle,
  duration,
}: {
  target: number;
  width: number;
  height: number;
  textStyle: TextStyle;
  duration: number;
}) {
  const pos = useSharedValue(target);

  useEffect(() => {
    const from = pos.get();
    const diff = target - from;
    if (Math.abs(diff) > MAX_SPIN) {
      // Skip whole turns: a jump of a multiple of 10 shows the same face, so it's invisible.
      pos.set(
        from + Math.sign(diff) * (Math.floor(Math.abs(diff) / 10) - 1) * 10,
      );
    }
    pos.set(withSpring(target, { duration, dampingRatio: 0.78 }));
  }, [target, duration, pos]);

  return (
    <View style={{ width, height, overflow: "hidden" }}>
      {FACES.map((d) => (
        <Face
          key={d}
          digit={d}
          pos={pos}
          height={height}
          textStyle={textStyle}
        />
      ))}
    </View>
  );
}

const FACES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Face({
  digit,
  pos,
  height,
  textStyle,
}: {
  digit: number;
  pos: SharedValue<number>;
  height: number;
  textStyle: TextStyle;
}) {
  const style = useAnimatedStyle(() => {
    // Signed distance from the window on a 10-face ring, in [-5, 5).
    const d = ((((digit - pos.value) % 10) + 15) % 10) - 5;
    return {
      transform: [{ translateY: d * height }],
      // Fade near the window edges instead of a hard cut.
      opacity: interpolate(Math.abs(d), [0, 0.75], [1, 0], "clamp"),
    };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Text style={[textStyle, styles.center]}>{digit}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  measure: { position: "absolute", opacity: 0 },
  center: { textAlign: "center" },
});
