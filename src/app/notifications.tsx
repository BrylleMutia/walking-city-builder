import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useShallow } from 'zustand/react/shallow';

import { AppText } from '../components/ui/AppText';
import { IconButton, PillButton, formatNumber } from '../components/ui/kit';
import { Screen } from '../components/ui/Screen';
import { Tap } from '../components/ui/Tap';
import { SET_LISTINGS } from '../data/sets';
import { stepsForWood } from '../state/gameLogic';
import { timeAgo, unreadCount, welcomeNextStep, type Notice } from '../state/notifications';
import { useGameStore } from '../state/useGameStore';
import { cardShadow, colors } from '../theme/tokens';

type MciName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Opening and closing a card: a short ease-out, no overshoot. The card resizes
// while its content fades, so it reads as one calm motion rather than a bounce.
const EASE = Easing.out(Easing.cubic);
const RESIZE = LinearTransition.duration(220).easing(EASE);
const CONTENT_IN = FadeIn.duration(180).delay(60).easing(EASE);
const CONTENT_OUT = FadeOut.duration(100);

/**
 * The bell's list (from Home). Each notification stays unread until it's
 * tapped; tapping opens it in place and marks it read. The welcome opens into
 * a short walkthrough of the game loop and one suggested next step.
 */
export default function NotificationsScreen() {
  const { notifications, markRead } = useGameStore(
    useShallow((s) => ({ notifications: s.notifications, markRead: s.markNotificationRead })),
  );
  const [open, setOpen] = useState<string | null>(null);
  const unread = unreadCount(notifications);

  const toggle = (n: Notice) => {
    setOpen((cur) => (cur === n.id ? null : n.id));
    markRead(n.id);
  };

  return (
    <Screen>
      <View className="flex-row items-center">
        <IconButton icon="chevron-left" onPress={() => router.back()} accessibilityLabel="Back" testID="notifications-back" />
        <View className="flex-1 ml-3">
          <AppText weight="heavy" className="text-2xl">
            Notifications
          </AppText>
          <AppText tone="muted" className="text-sm" testID="notifications-unread">
            {unread === 0 ? 'You’re all caught up' : unread === 1 ? '1 new' : `${unread} new`}
          </AppText>
        </View>
      </View>

      {notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <View className="mt-6 gap-3">
          {notifications.map((n) => (
            <NoticeCard key={n.id} notice={n} expanded={open === n.id} onToggle={() => toggle(n)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function NoticeCard({ notice, expanded, onToggle }: { notice: Notice; expanded: boolean; onToggle: () => void }) {
  const unread = !notice.readAt;
  const welcome = notice.kind === 'welcome';
  return (
    <Animated.View layout={RESIZE} className="bg-card rounded-card" style={cardShadow}>
      <Tap
        onPress={onToggle}
        haptics="tick"
        testID={`notice-${notice.kind}`}
        accessibilityLabel={`${notice.title}${unread ? ', unread' : ''}, ${expanded ? 'tap to close' : 'tap to open'}`}
        className="flex-row p-4"
      >
        <View
          className={`w-11 h-11 rounded-full items-center justify-center ${welcome ? 'bg-accent-soft' : 'bg-primary-soft'}`}
        >
          <MaterialCommunityIcons
            name={welcome ? 'hand-wave' : 'bell-outline'}
            size={22}
            color={welcome ? colors.accent.dark : colors.primary.dark}
          />
        </View>
        <View className="flex-1 ml-3">
          <View className="flex-row items-center">
            <AppText weight={unread ? 'heavy' : 'strong'} className="text-base flex-1" numberOfLines={1}>
              {notice.title}
            </AppText>
            {unread && <View className="w-2.5 h-2.5 rounded-full bg-accent ml-2" testID="notice-unread-dot" />}
          </View>
          <AppText tone="muted" className="text-xs mt-0.5">
            {timeAgo(notice.createdAt)}
          </AppText>
          {/* The welcome's body becomes the walkthrough when open; other kinds show it all. */}
          {!(welcome && expanded) && (
            <AppText tone="soft" className="text-sm mt-2 leading-5" numberOfLines={expanded ? undefined : 2}>
              {notice.body}
            </AppText>
          )}
        </View>
        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.muted}
          style={{ marginLeft: 8, marginTop: 2 }}
        />
      </Tap>

      {welcome && expanded && (
        <Animated.View entering={CONTENT_IN} exiting={CONTENT_OUT} className="px-4 pb-4">
          <WelcomeGuide />
        </Animated.View>
      )}
    </Animated.View>
  );
}

const STEPS: { icon: MciName; title: string; body: string; bg: string; tint: string }[] = [
  {
    icon: 'walk',
    title: 'Walk',
    body: 'Every step has a chance to drop Wood, the town’s currency.',
    bg: 'bg-primary-soft',
    tint: colors.primary.dark,
  },
  {
    icon: 'shopping-outline',
    title: 'Buy a booster pack',
    body: 'Spend Wood in the Shop. Each set has its own buildings.',
    bg: 'bg-accent-soft',
    tint: colors.accent.dark,
  },
  {
    icon: 'package-variant-closed',
    title: 'Open it',
    body: 'Tilt the pack, tear the top and flip through five cards.',
    bg: 'bg-sky-soft',
    tint: colors.ink.DEFAULT,
  },
  {
    icon: 'home-city-outline',
    title: 'Build your town',
    body: 'Place every card on your lawn in the City tab.',
    bg: 'bg-mint-soft',
    tint: colors.primary.dark,
  },
];

function WelcomeGuide() {
  const s = useGameStore(
    useShallow((st) => ({
      balance: st.balance,
      packsOpened: st.packsOpened,
      placed: st.city.length + Object.values(st.placedElsewhere).reduce((a, n) => a + (n ?? 0), 0),
    })),
  );
  const cheapestPack = Math.min(...SET_LISTINGS.filter((l) => l.set).map((l) => l.price));
  const next = welcomeNextStep({ ...s, cheapestPack });

  const cta =
    next.step === 'buy'
      ? {
          text: `You have ${formatNumber(next.balance)} Wood, enough for your first pack.`,
          label: 'Open the shop',
          icon: 'shopping-bag' as const,
          go: () => router.navigate('/shop'),
        }
      : next.step === 'walk'
        ? {
            text: `Walk about ${formatNumber(stepsForWood(next.woodShort))} more steps to afford your first pack.`,
            label: 'Start walking',
            icon: 'activity' as const,
            go: () => router.navigate('/'),
          }
        : next.step === 'build'
          ? {
              text: 'Your cards are waiting. Put your first building on the lawn.',
              label: 'Go to my city',
              icon: 'map' as const,
              go: () => router.navigate('/city'),
            }
          : {
              text: 'Keep walking: your next pack is a few thousand steps away.',
              label: 'See the shop',
              icon: 'shopping-bag' as const,
              go: () => router.navigate('/shop'),
            };

  return (
    <View testID="welcome-guide">
      <AppText tone="soft" className="text-sm leading-5">
        Here’s how your town grows:
      </AppText>
      <View className="mt-3 gap-3">
        {STEPS.map((step, i) => (
          <Animated.View
            key={step.title}
            entering={FadeIn.delay(80 + i * 40).duration(160).easing(EASE)}
            className="flex-row items-center"
          >
            <View className={`w-10 h-10 rounded-tile items-center justify-center ${step.bg}`}>
              <MaterialCommunityIcons name={step.icon} size={20} color={step.tint} />
            </View>
            <View className="flex-1 ml-3">
              <AppText weight="strong" className="text-sm">
                {i + 1}. {step.title}
              </AppText>
              <AppText tone="muted" className="text-xs leading-4">
                {step.body}
              </AppText>
            </View>
          </Animated.View>
        ))}
      </View>

      <View className="mt-4 rounded-tile bg-mint-soft p-3.5">
        <AppText weight="strong" tone="primary" className="text-xs">
          What to do next
        </AppText>
        <AppText className="text-sm mt-1 leading-5" testID="welcome-next">
          {cta.text}
        </AppText>
        <PillButton label={cta.label} icon={cta.icon} onPress={cta.go} style={{ marginTop: 12 }} testID="welcome-cta" />
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="items-center mt-24 px-6" testID="notifications-empty">
      <View className="w-20 h-20 rounded-full bg-accent-soft items-center justify-center">
        <MaterialCommunityIcons name="bell-sleep-outline" size={38} color={colors.accent.dark} />
      </View>
      <AppText weight="heavy" className="text-lg mt-5">
        No notifications yet
      </AppText>
      <AppText tone="muted" className="text-sm text-center mt-1.5 leading-5">
        We’ll let you know when something happens in your town.
      </AppText>
    </View>
  );
}
