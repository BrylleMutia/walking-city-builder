import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { WeekRings } from '../../components/home/WeekSteps';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import { AppText } from '../../components/ui/AppText';
import { Avatar, HERO_ASPECT, HomeHeroArt } from '../../components/ui/illustrations';
import {
  ArrowButton,
  Card,
  SectionHeader,
  StatTile,
  WoodPill,
  type Stat,
  formatNumber,
} from '../../components/ui/kit';
import { NotificationBell } from '../../components/ui/NotificationBell';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { Screen } from '../../components/ui/Screen';
import { Tap } from '../../components/ui/Tap';
import { SET_LISTINGS } from '../../data/sets';
import { recentDays, streak } from '../../state/gameLogic';
import { unreadCount } from '../../state/notifications';
import { useGameStore } from '../../state/useGameStore';
import { colors, softShadow } from '../../theme/tokens';

// Rough averages, good enough for a friendly dashboard.
const KM_PER_STEP = 0.000762;
const KCAL_PER_STEP = 0.04;
const STEPS_PER_ACTIVE_MIN = 100;
/** Empty band above the builder's hat in the artwork, as a fraction of its height. */
const HERO_ART_TOP_PAD = 0.07;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  // Only the fields this screen shows: a narrow, shallow-compared slice means
  // a change elsewhere in the store (city, collection, cloud status) doesn't
  // re-render Home.
  const s = useGameStore(
    useShallow((st) => ({
      dateKey: st.dateKey,
      stepsToday: st.stepsToday,
      history: st.history,
      goal: st.goal,
      balance: st.balance,
      displayName: st.displayName,
      avatarId: st.avatarId,
      sensor: st.sensor,
      unread: unreadCount(st.notifications),
      addSteps: st.addSteps,
    })),
  );
  const pct = s.goal > 0 ? s.stepsToday / s.goal : 0;
  const toGo = Math.max(0, s.goal - s.stepsToday);
  const cheapest = Math.min(...SET_LISTINGS.filter((l) => l.set).map((l) => l.price));
  const canBuy = s.balance >= cheapest;

  const today = useMemo(() => new Date(), []);
  const week = useMemo(() => recentDays(s, today), [s, today]);
  const days = streak(s, today);
  const toShop = () => router.navigate('/shop');
  const stats: Stat[] = [
    { icon: 'map-pin', tint: 'primary', value: (s.stepsToday * KM_PER_STEP).toFixed(1), unit: 'km', label: 'Distance' },
    { icon: 'zap', tint: 'accent', value: formatNumber(s.stepsToday * KCAL_PER_STEP), unit: 'kcal', label: 'Energy' },
    { icon: 'clock', tint: 'sky', value: formatNumber(s.stepsToday / STEPS_PER_ACTIVE_MIN), unit: 'min', label: 'Active' },
  ];

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
          <Avatar size={52} variant={s.avatarId} />
        </View>
        <View className="flex-1 ml-3">
          <AppText tone="muted" className="text-sm">
            Let’s do this!
          </AppText>
          <AppText weight="heavy" className="text-xl" numberOfLines={1} testID="home-name">
            {s.displayName}
          </AppText>
        </View>
        {/* Wallet: the balance lives in the top bar, like the Shop's header; the bag shows a pack is affordable. */}
        <View className="ml-3">
          <WoodPill
            balance={s.balance}
            compact
            canBuy={canBuy}
            onPress={toShop}
            testID="home-wallet"
            accessibilityLabel={`${formatNumber(s.balance)} Wood${canBuy ? ', enough for a pack' : ''}. Open the shop`}
          />
        </View>
        <View className="ml-2.5">
          <NotificationBell
            count={s.unread}
            variant="dot"
            color="accent"
            glow
            onPress={() => router.push('/notifications')}
            testID="home-notifications"
          />
        </View>
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
        <Card className="absolute left-3 right-3 bottom-3 p-4 rounded-tile flex-row items-center" style={softShadow}>
          <ProgressRing size={62} stroke={8} progress={pct}>
            <AppText weight="heavy" className="text-xs">
              {Math.min(999, Math.round(pct * 100))}%
            </AppText>
          </ProgressRing>
          <View className="flex-1 ml-3.5">
            <AnimatedCounter value={s.stepsToday} size={24} testID="steps-today" />
            <AppText tone="muted" className="text-xs">
              {toGo > 0
                ? `steps today · ${formatNumber(toGo)} to your goal`
                : 'steps today · goal reached!'}
            </AppText>
          </View>
          <ArrowButton testID="home-to-shop" onPress={toShop} />
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
        {stats.map((st) => (
          <StatTile key={st.label} {...st} />
        ))}
      </View>

      {/* week: the header carries the streak; the card itself is display-only */}
      <View className="mt-7">
        <SectionHeader title="This week" right={days > 0 ? <StreakChip days={days} /> : undefined} />
      </View>
      <WeekRings week={week} goal={s.goal} testID="home-week" />
    </Screen>
  );
}

function StreakChip({ days }: { days: number }) {
  return (
    <View
      className="flex-row items-center bg-accent-soft rounded-full px-2.5 py-1"
      accessibilityLabel={`${days}-day streak`}
      testID="home-streak"
    >
      <MaterialCommunityIcons name="fire" size={14} color={colors.accent.DEFAULT} />
      <AppText weight="strong" className="text-xs ml-1">
        {days}-day streak
      </AppText>
    </View>
  );
}

function SensorNote({ sensor }: { sensor: string }) {
  const text =
    sensor === 'live'
      ? 'Counting with your phone'
      : sensor === 'checking'
        ? 'Looking for step sensor…'
        : sensor === 'denied'
          ? 'Step counting is off in Settings'
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
