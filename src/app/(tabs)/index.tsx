import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { Avatar, HERO_ASPECT, HomeHeroArt } from '../../components/ui/illustrations';
import {
  ArrowButton,
  Card,
  IconButton,
  Meta,
  SectionHeader,
  StatTile,
  StepsPill,
  formatNumber,
} from '../../components/ui/kit';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { Screen } from '../../components/ui/Screen';
import { Tap } from '../../components/ui/Tap';
import { SET_LISTINGS } from '../../data/sets';
import { recentDays, streak } from '../../state/gameLogic';
import { useGameStore } from '../../state/useGameStore';
import { colors } from '../../theme/tokens';

// Rough averages, good enough for a friendly dashboard.
const KM_PER_STEP = 0.000762;
const KCAL_PER_STEP = 0.04;
const STEPS_PER_ACTIVE_MIN = 100;
/** Empty band above the builder's hat in the artwork, as a fraction of its height. */
const HERO_ART_TOP_PAD = 0.07;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const s = useGameStore();
  const pct = s.goal > 0 ? s.stepsToday / s.goal : 0;
  const toGo = Math.max(0, s.goal - s.stepsToday);
  const cheapest = Math.min(...SET_LISTINGS.filter((l) => l.set).map((l) => l.price));

  const today = useMemo(() => new Date(), []);
  const week = useMemo(() => recentDays(s, today), [s, today]);
  const days = streak(s, today);
  const weekMax = Math.max(s.goal, ...week.map((d) => d.steps));

  // Measured from the hero row itself: `width - 48` (window minus px-6) came
  // out a few dp narrower than the real content box on Android, which left
  // the full-bleed card art short of the right edge.
  const [heroW, setHeroW] = useState(width - 48);
  const heroH = heroW * HERO_ASPECT;

  return (
    <Screen>
      {/* greeting */}
      <View className="flex-row items-center">
        <View className="rounded-full overflow-hidden">
          <Avatar size={52} />
        </View>
        <View className="flex-1 ml-3">
          <AppText tone="muted" className="text-sm">
            Welcome back 👋
          </AppText>
          <AppText weight="heavy" className="text-xl">
            Walker
          </AppText>
        </View>
        <IconButton icon="bell" dot accessibilityLabel="Notifications" />
      </View>

      {/* hero */}
      {/* Pull the block up by the artwork's empty top band so the visible
          gap under the greeting stays ~24dp (mt-6). */}
      {/* The artwork is the whole card (its own rounded edges and pop-out top);
          the steps card floats over its bottom. */}
      <View
        style={{ marginTop: 24 - heroH * HERO_ART_TOP_PAD, height: heroH }}
        onLayout={(e) => setHeroW(e.nativeEvent.layout.width)}
      >
        {/* The transparent top band overlaps the greeting row; don't let it eat taps. */}
        <View className="absolute inset-0" pointerEvents="none">
          <HomeHeroArt width={heroW} />
        </View>
        <Card className="absolute left-3 right-3 bottom-3 p-4 rounded-tile flex-row items-center">
          <ProgressRing size={62} stroke={8} progress={pct}>
            <AppText weight="heavy" className="text-xs">
              {Math.min(999, Math.round(pct * 100))}%
            </AppText>
          </ProgressRing>
          <View className="flex-1 ml-3.5">
            <AppText weight="heavy" className="text-2xl" testID="steps-today">
              {formatNumber(s.stepsToday)}
            </AppText>
            <AppText tone="muted" className="text-xs">
              {toGo > 0
                ? `steps today · ${formatNumber(toGo)} to your goal`
                : 'steps today · goal reached!'}
            </AppText>
          </View>
          <ArrowButton testID="home-to-shop" onPress={() => router.navigate('/shop')} />
        </Card>
      </View>

      {/* simulated steps (Expo Go on Android has no step sensor) */}
      <View className="flex-row items-center justify-between mt-4">
        <SensorNote sensor={s.sensor} />
        <Tap
          onPress={() => s.addSteps(500)}
          testID="walk-500"
          haptics="medium"
          className="flex-row items-center bg-primary-soft rounded-full px-3.5 py-2"
        >
          <MaterialCommunityIcons name="walk" size={16} color={colors.primary.dark} />
          <AppText weight="strong" tone="primary" className="text-xs ml-1">
            Walk +500
          </AppText>
        </Tap>
      </View>

      {/* stats */}
      <View className="flex-row gap-3 mt-4">
        <StatTile icon="map-pin" tint="primary" value={(s.stepsToday * KM_PER_STEP).toFixed(1)} label="km" />
        <StatTile icon="zap" tint="accent" value={formatNumber(s.stepsToday * KCAL_PER_STEP)} label="kcal" />
        <StatTile
          icon="clock"
          tint="sky"
          value={formatNumber(s.stepsToday / STEPS_PER_ACTIVE_MIN)}
          label="active min"
        />
      </View>

      {/* activities */}
      <View className="mt-7">
        <SectionHeader title="Activities" action="View All" onAction={() => router.navigate('/profile')} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-6"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 18, gap: 14 }}
      >
        <ActivityCard
          title="Wallet"
          meta={`${formatNumber(s.balance)} Steps`}
          metaIcon="credit-card"
          badge={s.balance >= cheapest ? 'Buy pack' : undefined}
          bg="bg-accent-soft"
          onPress={() => router.navigate('/shop')}
        >
          <StepsPill balance={s.balance} compact />
        </ActivityCard>

        <ActivityCard
          title="Streak"
          meta={days === 1 ? '1 day' : `${days} days`}
          metaIcon="trending-up"
          bg="bg-sky-soft"
          onPress={() => router.navigate('/profile')}
        >
          <MaterialCommunityIcons name="fire" size={56} color={colors.accent.DEFAULT} />
        </ActivityCard>

        <ActivityCard
          title="This week"
          meta={`${formatNumber(week.reduce((a, d) => a + d.steps, 0))} steps`}
          metaIcon="bar-chart-2"
          bg="bg-mint-soft"
          onPress={() => router.navigate('/profile')}
        >
          <View className="flex-row items-end h-16 gap-1.5">
            {week.map((d, i) => (
              <View
                key={d.key}
                className={`w-3 rounded-full ${i === week.length - 1 ? 'bg-primary' : 'bg-mint-deep'}`}
                style={{ height: 6 + (d.steps / weekMax) * 58 }}
              />
            ))}
          </View>
        </ActivityCard>

        <ActivityCard
          title="My city"
          meta={`${s.city.length} placed`}
          metaIcon="map"
          bg="bg-primary-soft"
          onPress={() => router.navigate('/city')}
        >
          <Feather name="home" size={44} color={colors.primary.dark} />
        </ActivityCard>
      </ScrollView>
    </Screen>
  );
}

function SensorNote({ sensor }: { sensor: string }) {
  const text =
    sensor === 'live'
      ? 'Counting with your phone'
      : sensor === 'checking'
        ? 'Looking for step sensor…'
        : 'Step sensor unavailable here';
  return (
    <View className="flex-row items-center flex-1 mr-3">
      <View
        className={`w-2 h-2 rounded-full mr-2 ${sensor === 'live' ? 'bg-primary' : 'bg-muted'}`}
      />
      <AppText tone="muted" className="text-xs" numberOfLines={1}>
        {text}
      </AppText>
    </View>
  );
}

/** "Popular Now" style card: tinted picture area, title, meta row, optional tag. */
function ActivityCard({
  title,
  meta,
  metaIcon,
  badge,
  bg,
  onPress,
  children,
}: {
  title: string;
  meta: string;
  metaIcon: React.ComponentProps<typeof Feather>['name'];
  badge?: string;
  bg: string;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tap onPress={onPress} className="bg-card rounded-card p-2.5" surfaceStyle={CARD_SHADOW}>
      <View className={`w-40 h-28 rounded-tile items-center justify-center ${bg}`}>{children}</View>
      {badge && (
        <View className="absolute top-4 right-4 bg-card rounded-chip px-2 py-1">
          <AppText weight="strong" tone="accent" className="text-[10px]">
            {badge}
          </AppText>
        </View>
      )}
      <View className="px-1.5 pt-2.5 pb-1">
        <AppText weight="strong" className="text-base">
          {title}
        </AppText>
        <View className="mt-1">
          <Meta icon={metaIcon} label={meta} />
        </View>
      </View>
    </Tap>
  );
}

const CARD_SHADOW = {
  shadowColor: '#1B7A5A',
  shadowOpacity: 0.1,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};
