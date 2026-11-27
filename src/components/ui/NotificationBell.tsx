import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { haptic } from '../../lib/haptics';
import { colors, softShadow } from '../../theme/tokens';
import { AnimatedCounter } from './AnimatedCounter';
import { Tap } from './Tap';

// Design and behaviour translated from Rare UI's "Notification bell"
// (rareui.com, MIT + Commons Clause). Original React Native implementation.

const BADGE = {
  accent: colors.accent.DEFAULT,
  primary: colors.primary.DEFAULT,
  danger: colors.danger.DEFAULT,
  sky: colors.sky.DEFAULT,
} as const;

/** Arrivals closer together than this build up a harder swing. */
const STREAK_MS = 700;
/** One breath of the dot's glow: the halo swells and fades, then starts again. */
const GLOW_MS = 1600;

export interface NotificationBellProps {
  /** Unread total. Hidden at 0; fractions and negatives floor to it. */
  count: number;
  /** Highest number shown; above it the badge reads "99+". */
  max?: number;
  variant?: 'count' | 'dot';
  /**
   * `dot` only: a soft halo breathes out of the dot while it shows, so unread
   * news catches the eye without a number. Static under reduced motion.
   */
  glow?: boolean;
  /** Button diameter; bell, badge and digits scale with it. */
  size?: number;
  color?: keyof typeof BADGE;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * A round bell button with an unread badge. The bell swings from its top when
 * a notification lands (harder for a quick burst), the count rolls to the new
 * number, and the badge pops in at 1 and shrinks away at 0.
 */
export function NotificationBell({
  count,
  max = 99,
  variant = 'count',
  glow = false,
  size = 44,
  color = 'accent',
  onPress,
  accessibilityLabel,
  testID,
}: NotificationBellProps) {
  const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  const swing = useSharedValue(0);
  const badge = useSharedValue(n > 0 ? 1 : 0);
  const pulse = useSharedValue(1);
  const breath = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const glowing = glow && variant === 'dot' && n > 0;

  const prev = useRef(n);
  const streak = useRef({ level: 0, at: 0 });

  useEffect(() => {
    const before = prev.current;
    prev.current = n;
    badge.set(withSpring(n > 0 ? 1 : 0, n > 0 ? { stiffness: 380, damping: 14 } : { stiffness: 420, damping: 30 }));
    if (n <= before) return;

    const now = Date.now();
    const s = streak.current;
    s.level = now - s.at < STREAK_MS ? Math.min(s.level + 1, 3) : 0;
    s.at = now;
    const amp = 16 + s.level * 7;
    // Kick one way, then an underdamped spring rings it back to rest.
    swing.set(
      withSequence(
        withTiming(amp, { duration: 70 }),
        withSpring(0, { stiffness: 260, damping: 4.5, mass: 0.5, velocity: -amp * 40 }),
      ),
    );
    pulse.set(withSequence(withTiming(1.25, { duration: 90 }), withSpring(1, { stiffness: 300, damping: 9 })));
    if (s.level >= 2) haptic.medium();
    else haptic.light();
  }, [n, badge, swing, pulse]);

  // The loop only runs while the dot shows (nothing animates for a quiet bell).
  useEffect(() => {
    if (glowing && !reduceMotion) {
      breath.set(0);
      breath.set(withRepeat(withTiming(1, { duration: GLOW_MS, easing: Easing.out(Easing.quad) }), -1, false));
    } else {
      cancelAnimation(breath);
      breath.set(0);
    }
    return () => cancelAnimation(breath);
  }, [glowing, reduceMotion, breath]);

  const bellStyle = useAnimatedStyle(() => ({
    transformOrigin: 'top',
    transform: [{ rotate: `${swing.value}deg` }],
  }));
  const haloStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 0.3, transform: [{ scale: 1.7 }] }
      : { opacity: 0.55 * (1 - breath.value), transform: [{ scale: 1 + breath.value * 1.5 }] },
  );
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, badge.value * 2),
    transform: [{ scale: badge.value * pulse.value }],
  }));

  const badgeH = Math.round(size * 0.42);
  const dotSize = Math.round(size * 0.26);
  const shown = Math.min(n, max);

  return (
    <Tap
      onPress={onPress}
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? (n > 0 ? `Notifications, ${n} unread` : 'Notifications')}
      className="bg-card rounded-full items-center justify-center"
      surfaceStyle={[softShadow, { width: size, height: size }]}
    >
      {/* The pivot sits a little above the glyph so it swings like a hanging bell. */}
      <Animated.View style={[{ paddingTop: size * 0.06 }, bellStyle]}>
        <Feather name="bell" size={size * 0.43} color={colors.ink.DEFAULT} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: variant === 'dot' ? size * 0.2 : -size * 0.08,
            left: variant === 'dot' ? size * 0.56 : size * 0.58,
          },
          badgeStyle,
        ]}
      >
        {variant === 'dot' ? (
          <View style={{ width: dotSize, height: dotSize }}>
            {glowing && (
              <Animated.View
                className="absolute rounded-full"
                style={[{ width: dotSize, height: dotSize, backgroundColor: BADGE[color] }, haloStyle]}
              />
            )}
            <View
              className="rounded-full border-2 border-card"
              style={[
                { width: dotSize, height: dotSize, backgroundColor: BADGE[color] },
                // A warm shadow in the dot's own colour reads as a faint glow even between breaths.
                glow && {
                  shadowColor: BADGE[color],
                  shadowOpacity: 0.8,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 3,
                },
              ]}
            />
          </View>
        ) : (
          <View
            className="rounded-full border-2 border-card flex-row items-center justify-center"
            style={{
              minWidth: badgeH,
              height: badgeH,
              paddingHorizontal: size * 0.06,
              backgroundColor: BADGE[color],
            }}
          >
            <AnimatedCounter
              value={shown}
              size={Math.round(size * 0.24)}
              tone="white"
              separator=""
              duration={450}
              suffix={n > max ? '+' : undefined}
            />
          </View>
        )}
      </Animated.View>
    </Tap>
  );
}
