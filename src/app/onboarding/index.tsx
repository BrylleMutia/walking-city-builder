import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { OnboardingArt, type OnboardingScene } from '../../components/onboarding/OnboardingArt';
import { PageDots } from '../../components/onboarding/PageDots';
import { AppText } from '../../components/ui/AppText';
import { PillButton } from '../../components/ui/kit';
import { Tap } from '../../components/ui/Tap';
import { haptic } from '../../lib/haptics';

const SLIDES: { scene: OnboardingScene; title: string; body: string }[] = [
  { scene: 'walk', title: 'Walk', body: 'Every step is a chance\nto gather Wood' },
  { scene: 'collect', title: 'Collect', body: 'Trade your Wood for packs\nof buildings and surprises' },
  { scene: 'build', title: 'Build', body: 'Grow your own little city,\none building at a time' },
];
const LAST = SLIDES.length - 1;
/** Share of the screen the illustration takes, as in the reference. */
const ART_SHARE = 0.66;
/** Height above the bottom inset kept for the SKIP/dots (or Get started) row: 56 offset + 56 tall. */
const CONTROLS_H = 112;
/** The least room the title + two-line subtitle need; short phones shrink the art to keep it. */
const TEXT_MIN = 130;

/** Intro carousel: what the app is for, in three swipes. */
export default function OnboardingIntro() {
  // The root frame, not useWindowDimensions: on Android that leaves out the
  // status and navigation bars, but the app draws edge-to-edge, so heights
  // from it come out short and the text sits above the middle of its space.
  const { width, height } = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  const textAreaBottom = insets.bottom + CONTROLS_H;
  const artH = Math.round(Math.min(height * ART_SHARE, height - textAreaBottom - TEXT_MIN));
  const textH = height - artH - textAreaBottom;

  const page = useSharedValue(0);
  const [onLast, setOnLast] = useState(false);
  const onScroll = useAnimatedScrollHandler((e) => {
    page.value = e.contentOffset.x / width;
  });

  // A tick per page turn, and which bottom control is live (only that one takes taps).
  useAnimatedReaction(
    () => Math.round(page.value),
    (now, before) => {
      if (before === null || now === before) return;
      scheduleOnRN(haptic.tick);
      scheduleOnRN(setOnLast, now === LAST);
    },
  );

  const rowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(page.value, [LAST - 0.6, LAST], [1, 0], 'clamp'),
  }));
  const startStyle = useAnimatedStyle(() => ({
    opacity: interpolate(page.value, [LAST - 0.6, LAST], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(page.value, [LAST - 1, LAST], [16, 0], 'clamp') }],
  }));

  const next = () => router.push('/onboarding/name');

  return (
    <View className="flex-1 bg-card">
      <Animated.ScrollView
        testID="onboarding-slides"
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((s, i) => (
          <Slide key={s.scene} slide={s} index={i} page={page} width={width} artH={artH} textH={textH} />
        ))}
      </Animated.ScrollView>

      <View className="absolute left-0 right-0 px-8" style={{ bottom: insets.bottom + 56, height: 56 }}>
        <Animated.View
          className="absolute inset-0 px-8 flex-row items-center justify-between"
          style={rowStyle}
          pointerEvents={onLast ? 'none' : 'auto'}
        >
          <Tap onPress={next} haptics="tick" hitSlop={14} testID="onboarding-skip" accessibilityLabel="Skip intro">
            <AppText weight="strong" tone="muted" className="text-xs" style={{ letterSpacing: 1.2 }}>
              SKIP
            </AppText>
          </Tap>
          <PageDots count={SLIDES.length} page={page} />
        </Animated.View>
        <Animated.View
          className="absolute inset-0 items-center justify-center"
          style={startStyle}
          pointerEvents={onLast ? 'auto' : 'none'}
        >
          <PillButton label="Get started" onPress={next} testID="onboarding-start" style={{ minWidth: 200 }} />
        </Animated.View>
      </View>

      {/* Returning players (new phone, reinstall) skip setup and load their city. */}
      <View className="absolute left-0 right-0 flex-row justify-center" style={{ bottom: insets.bottom + 20 }}>
        <AppText tone="muted" className="text-sm">
          Already have an account?{' '}
        </AppText>
        <Tap onPress={() => router.push('/account/sign-in')} haptics="tick" hitSlop={12} testID="onboarding-sign-in">
          <AppText weight="strong" tone="primary" className="text-sm">
            Sign in
          </AppText>
        </Tap>
      </View>
    </View>
  );
}

function Slide({
  slide,
  index,
  page,
  width,
  artH,
  textH,
}: {
  slide: (typeof SLIDES)[number];
  index: number;
  page: SharedValue<number>;
  width: number;
  artH: number;
  /** Room between the art and the bottom controls; the text is centred in it. */
  textH: number;
}) {
  const offset = useDerivedValue(() => page.value - index);
  // Text drifts a little slower than the page, so it settles after the art.
  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(offset.value), [0, 0.7], [1, 0], 'clamp'),
    transform: [{ translateX: offset.value * width * 0.25 }],
  }));
  return (
    <View style={{ width }}>
      <OnboardingArt scene={slide.scene} width={width} height={artH} offset={offset} />
      <Animated.View className="items-center justify-center px-8" style={[{ height: textH }, textStyle]}>
        <AppText weight="heavy" className="text-center" style={{ fontSize: 44, lineHeight: 50, letterSpacing: -0.5 }}>
          {slide.title}
        </AppText>
        <AppText tone="soft" className="text-center mt-3" style={{ fontSize: 19, lineHeight: 26 }}>
          {slide.body}
        </AppText>
      </Animated.View>
    </View>
  );
}
