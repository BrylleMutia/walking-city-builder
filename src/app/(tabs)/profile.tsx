import { Feather } from '@expo/vector-icons';
import { Canvas } from '@shopify/react-native-skia';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Alert, Switch, View, useWindowDimensions } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { ItemArt } from '../../components/items/ItemArt';
import { Beaver } from '../../components/mascot/Beaver';
import { AppText } from '../../components/ui/AppText';
import { Avatar } from '../../components/ui/illustrations';
import { Card, SectionHeader, formatNumber, type FeatherName } from '../../components/ui/kit';
import { Screen } from '../../components/ui/Screen';
import { Tap } from '../../components/ui/Tap';
import { toast } from '../../components/ui/toast';
import { RARITY_COLOR } from '../../data/rarity';
import { cozyDowntown } from '../../data/sets/cozyDowntown';
import { foilsOwned, recentDays, streak, uniqueOwned } from '../../state/gameLogic';
import { useGameStore } from '../../state/useGameStore';
import { colors } from '../../theme/tokens';

const DAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CLOUD_LABEL = {
  connecting: 'Connecting…',
  online: 'Connected',
  offline: 'Offline',
  signin_disabled: 'Unavailable',
} as const;
const GRID_COLUMNS = 5;
const GRID_GAP = 8;

/** 1 level per 10,000 lifetime steps. */
const levelOf = (steps: number) => Math.floor(steps / 10000) + 1;

export default function ProfileScreen() {
  // A shallow-compared slice of what Profile shows (pendingCity as a count,
  // so a new queue array with the same length doesn't re-render).
  const s = useGameStore(
    useShallow((st) => ({
      dateKey: st.dateKey,
      stepsToday: st.stepsToday,
      history: st.history,
      lifetimeSteps: st.lifetimeSteps,
      goal: st.goal,
      collection: st.collection,
      packsOpened: st.packsOpened,
      cloud: st.cloud,
      pendingCount: st.pendingCity.length,
      sensor: st.sensor,
      hapticsOn: st.hapticsOn,
      forceLegendary: st.forceLegendary,
      forceFoil: st.forceFoil,
      addSteps: st.addSteps,
      setGoal: st.setGoal,
      setSetting: st.setSetting,
      reset: st.reset,
      replayOnboarding: st.replayOnboarding,
      displayName: st.displayName,
      avatarId: st.avatarId,
      accountEmail: st.accountEmail,
    })),
  );
  const { width } = useWindowDimensions();
  // Screen padding 24×2, card padding 12×2, 4 gaps of 8 between 5 columns.
  const tile = Math.floor((width - 48 - 24 - 4 * GRID_GAP) / GRID_COLUMNS);
  const today = useMemo(() => new Date(), []);
  const week = useMemo(() => recentDays(s, today), [s, today]);
  const peak = Math.max(s.goal, ...week.map((d) => d.steps));
  const level = levelOf(s.lifetimeSteps);
  const levelPct = (s.lifetimeSteps % 10000) / 10000;
  const owned = uniqueOwned(s);
  const total = cozyDowntown.items.length;

  const confirmReset = () =>
    Alert.alert('Reset all data?', 'This clears your steps, Steps balance, cards and city. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          if (!(await s.reset())) {
            toast.error('Couldn’t reset', { description: 'Reset needs a connection to the game server.' });
          }
        },
      },
    ]);

  return (
    <Screen>
      <AppText weight="heavy" className="text-2xl">
        Profile
      </AppText>

      {/* account */}
      <Card className="mt-5 p-4 flex-row items-center">
        <Tap
          onPress={() => router.push('/edit-name')}
          haptics="tick"
          accessibilityLabel="Change avatar"
          testID="edit-avatar"
          className="rounded-full overflow-hidden"
        >
          <Avatar size={64} variant={s.avatarId} />
        </Tap>
        <View className="flex-1 ml-4">
          <Tap
            onPress={() => router.push('/edit-name')}
            haptics="tick"
            testID="edit-name"
            accessibilityLabel={`Name: ${s.displayName}. Change name`}
            className="flex-row items-center self-start"
          >
            <AppText weight="heavy" className="text-lg" numberOfLines={1} testID="profile-name">
              {s.displayName}
            </AppText>
            <Feather name="edit-2" size={13} color={colors.muted} style={{ marginLeft: 6 }} />
          </Tap>
          <AppText tone="muted" className="text-xs">
            Level {level} · {formatNumber(10000 - (s.lifetimeSteps % 10000))} steps to next
          </AppText>
          <View className="h-2 rounded-full bg-line mt-2 overflow-hidden">
            <View className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(3, levelPct * 100)}%` }} />
          </View>
        </View>
      </Card>

      {/* lifetime stats */}
      <View className="flex-row mt-4" style={{ gap: 12 }}>
        <MiniStat value={formatNumber(s.lifetimeSteps)} label="Lifetime steps" />
        <MiniStat value={`${streak(s, today)}`} label="Day streak" />
        <MiniStat value={`${s.packsOpened}`} label="Packs opened" />
      </View>

      {/* history */}
      <View className="mt-7">
        <SectionHeader title="Steps history" action="Last 7 days" />
      </View>
      <Card className="p-4">
        <View className="flex-row items-end justify-between" style={{ height: 130 }}>
          {week.map((d, i) => {
            const isToday = i === week.length - 1;
            const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (week.length - 1 - i));
            return (
              <View key={d.key} className="items-center flex-1">
                <AppText tone="muted" className="text-[10px] mb-1">
                  {d.steps >= 1000 ? `${(d.steps / 1000).toFixed(1)}k` : d.steps || ''}
                </AppText>
                <View
                  className={`w-5 rounded-full ${isToday ? 'bg-primary' : d.steps >= s.goal ? 'bg-primary-dark' : 'bg-mint-deep'}`}
                  style={{ height: 6 + (d.steps / peak) * 92 }}
                />
                <AppText weight={isToday ? 'heavy' : 'semi'} tone={isToday ? 'ink' : 'muted'} className="text-xs mt-2">
                  {DAY[date.getDay()]}
                </AppText>
              </View>
            );
          })}
        </View>
        <View className="flex-row items-center mt-3 pt-3 border-t border-line">
          <View className="w-2 h-2 rounded-full bg-primary-dark mr-1.5" />
          <AppText tone="muted" className="text-xs flex-1">
            Goal reached
          </AppText>
          <AppText weight="strong" className="text-xs">
            Daily goal {formatNumber(s.goal)}
          </AppText>
        </View>
      </Card>

      {/* collection */}
      <View className="mt-7">
        <SectionHeader title="Collection" action={`${owned}/${total} · ${foilsOwned(s)} foil`} />
      </View>
      <Card className="p-3">
        <View className="flex-row flex-wrap justify-center" style={{ gap: GRID_GAP }}>
          {[...cozyDowntown.items].reverse().map((item) => {
            const have = s.collection[item.id]?.count ?? 0;
            return (
              <View
                key={item.id}
                className="rounded-chip items-center justify-center"
                style={{
                  width: tile,
                  height: tile,
                  backgroundColor: have ? RARITY_COLOR[item.rarity].light + '88' : colors.line,
                  opacity: have ? 1 : 0.5,
                }}
              >
                {have ? (
                  <Canvas style={{ width: tile, height: tile }}>
                    <ItemArt id={item.id} x={4} y={4} width={tile - 8} height={tile - 8} />
                  </Canvas>
                ) : (
                  <Feather name="help-circle" size={20} color={colors.muted} />
                )}
              </View>
            );
          })}
        </View>
      </Card>

      {/* settings */}
      <View className="mt-7">
        <SectionHeader title="Settings" />
      </View>
      <Card className="px-4">
        <Row icon="target" label="Daily goal">
          <Stepper
            value={formatNumber(s.goal)}
            onMinus={() => s.setGoal(s.goal - 1000)}
            onPlus={() => s.setGoal(s.goal + 1000)}
          />
        </Row>
        <Row icon="smartphone" label="Haptic feedback">
          <Switch
            value={s.hapticsOn}
            onValueChange={(v) => s.setSetting('hapticsOn', v)}
            trackColor={{ true: colors.primary.DEFAULT, false: colors.line }}
            thumbColor="#FFFFFF"
          />
        </Row>
        <Row icon="user" label="Account">
          <Tap
            onPress={() => router.push('/save-progress')}
            testID="open-save-progress"
            haptics="tick"
            className="flex-row items-center bg-primary-soft rounded-chip px-3 py-1.5"
          >
            {s.accountEmail ? (
              <>
                <Feather name="check-circle" size={12} color={colors.primary.dark} style={{ marginRight: 5 }} />
                <AppText weight="strong" tone="primary" className="text-xs" numberOfLines={1} style={{ maxWidth: 170 }}>
                  {s.accountEmail}
                </AppText>
              </>
            ) : (
              <>
                <AppText weight="semi" tone="muted" className="text-xs mr-1.5">
                  Guest ·
                </AppText>
                <AppText weight="strong" tone="primary" className="text-xs">
                  Save progress
                </AppText>
              </>
            )}
          </Tap>
        </Row>
        <Row icon="cloud" label="Cloud save">
          <AppText weight="semi" tone={s.cloud === 'online' ? 'primary' : 'muted'} className="text-sm" testID="cloud-status">
            {CLOUD_LABEL[s.cloud]}
            {s.pendingCount > 0
              ? ` · ${s.pendingCount} change${s.pendingCount === 1 ? '' : 's'} to sync`
              : ''}
          </AppText>
        </Row>
        <Row icon="activity" label="Step sensor" last>
          <AppText weight="semi" tone={s.sensor === 'live' ? 'primary' : 'muted'} className="text-sm">
            {s.sensor === 'live'
              ? 'Connected'
              : s.sensor === 'checking'
                ? 'Checking…'
                : s.sensor === 'denied'
                  ? 'Off in Settings'
                  : 'Not available'}
          </AppText>
        </Row>
      </Card>

      <View className="mt-7">
        <SectionHeader title="Testing" />
      </View>
      <Card className="px-4">
        <Row icon="star" label="Guarantee a legendary">
          <Switch
            value={s.forceLegendary}
            onValueChange={(v) => s.setSetting('forceLegendary', v)}
            trackColor={{ true: colors.accent.DEFAULT, false: colors.line }}
            thumbColor="#FFFFFF"
          />
        </Row>
        <Row icon="aperture" label="Every card foil">
          <Switch
            value={s.forceFoil}
            onValueChange={(v) => s.setSetting('forceFoil', v)}
            trackColor={{ true: colors.accent.DEFAULT, false: colors.line }}
            thumbColor="#FFFFFF"
          />
        </Row>
        <Row icon="plus-circle" label="Add 5,000 steps">
          <Tap onPress={() => s.addSteps(5000)} testID="add-5000" haptics="medium" className="bg-primary-soft rounded-chip px-3 py-1.5">
            <AppText weight="strong" tone="primary" className="text-xs">
              Add
            </AppText>
          </Tap>
        </Row>
        <Row icon="play-circle" label="Replay onboarding">
          <Tap
            onPress={s.replayOnboarding}
            testID="replay-onboarding"
            haptics="tick"
            className="bg-primary-soft rounded-chip px-3 py-1.5"
          >
            <AppText weight="strong" tone="primary" className="text-xs">
              Replay
            </AppText>
          </Tap>
        </Row>
        <Row icon="grid" label="UI components">
          <Tap
            onPress={() => router.push('/dev/components')}
            testID="open-components"
            haptics="tick"
            className="bg-primary-soft rounded-chip px-3 py-1.5"
          >
            <AppText weight="strong" tone="primary" className="text-xs">
              Open
            </AppText>
          </Tap>
        </Row>
        <Row icon="trash-2" label="Reset all data" last danger>
          <Tap onPress={confirmReset} testID="reset-data" haptics="medium" className="bg-accent-soft rounded-chip px-3 py-1.5">
            <AppText weight="strong" tone="accent" className="text-xs">
              Reset
            </AppText>
          </Tap>
        </Row>
      </Card>

      {/* Mascot design review (Phase 1): full size and avatar size side by side. */}
      <Card className="mt-3 p-4 flex-row items-end justify-around" testID="mascot-preview">
        <Beaver size={160} />
        <View className="items-center">
          <Beaver size={56} />
          <AppText tone="muted" className="text-xs mt-1">
            Timber
          </AppText>
        </View>
      </Card>
    </Screen>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <Card className="flex-1 p-3.5 rounded-tile">
      <AppText weight="heavy" className="text-lg" numberOfLines={1}>
        {value}
      </AppText>
      <AppText tone="muted" className="text-xs">
        {label}
      </AppText>
    </Card>
  );
}

function Row({
  icon,
  label,
  last,
  danger,
  children,
}: {
  icon: FeatherName;
  label: string;
  last?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className={`flex-row items-center py-3.5 ${last ? '' : 'border-b border-line'}`}>
      <View className={`w-9 h-9 rounded-full items-center justify-center ${danger ? 'bg-accent-soft' : 'bg-mint-soft'}`}>
        <Feather name={icon} size={16} color={danger ? colors.accent.DEFAULT : colors.primary.dark} />
      </View>
      <AppText weight="semi" className="text-sm flex-1 ml-3">
        {label}
      </AppText>
      {children}
    </View>
  );
}

function Stepper({ value, onMinus, onPlus }: { value: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View className="flex-row items-center">
      <Tap onPress={onMinus} haptics="tick" className="w-8 h-8 rounded-full bg-mint-soft items-center justify-center">
        <Feather name="minus" size={15} color={colors.primary.dark} />
      </Tap>
      {/* Wide enough for "30,000" (the max goal) on one line. */}
      <AppText weight="strong" className="text-sm mx-2.5 text-center" numberOfLines={1} style={{ minWidth: 56 }}>
        {value}
      </AppText>
      <Tap onPress={onPlus} haptics="tick" className="w-8 h-8 rounded-full bg-mint-soft items-center justify-center">
        <Feather name="plus" size={15} color={colors.primary.dark} />
      </Tap>
    </View>
  );
}
