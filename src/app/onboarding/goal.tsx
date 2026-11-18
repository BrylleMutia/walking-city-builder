import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { SetupScreen } from '../../components/onboarding/SetupScreen';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import { AppText } from '../../components/ui/AppText';
import { Card, PillButton, formatNumber } from '../../components/ui/kit';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { Tap } from '../../components/ui/Tap';
import { useGameStore } from '../../state/useGameStore';
import { colors } from '../../theme/tokens';

const PRESETS = [5000, 8000, 10000, 12000];
const STEP = 500;
// Same bounds the store and the server enforce.
const MIN = 1000;
const MAX = 30000;

/** Second useful action: pick a daily goal and see today's progress against it. */
export default function OnboardingGoal() {
  const stepsToday = useGameStore((s) => s.stepsToday);
  const setGoal = useGameStore((s) => s.setGoal);
  const [goal, setLocal] = useState(() => useGameStore.getState().goal);

  const change = (g: number) => setLocal(Math.min(MAX, Math.max(MIN, g)));
  const toGo = Math.max(0, goal - stepsToday);

  return (
    <SetupScreen
      scene="goal"
      title="Set my daily goal"
      body="Pick a number of steps to aim for each day. You can change it anytime in Profile."
      testID="onboarding-goal"
      footer={
        <PillButton
          label="Continue"
          testID="goal-continue"
          onPress={() => {
            setGoal(goal);
            router.push('/save-progress');
          }}
        />
      }
    >
      <Card className="p-5 flex-row items-center">
        <ProgressRing size={84} stroke={10} progress={stepsToday / goal}>
          <AppText weight="heavy" className="text-sm">
            {Math.min(999, Math.round((stepsToday / goal) * 100))}%
          </AppText>
        </ProgressRing>
        <View className="flex-1 ml-4">
          <View className="flex-row items-center justify-between">
            <Round icon="minus" onPress={() => change(goal - STEP)} testID="goal-minus" />
            <AnimatedCounter value={goal} size={28} testID="goal-value" />
            <Round icon="plus" onPress={() => change(goal + STEP)} testID="goal-plus" />
          </View>
          <AppText tone="muted" className="text-xs text-center mt-1.5" testID="goal-to-go">
            {toGo > 0 ? `${formatNumber(toGo)} steps to go today` : 'Goal reached today!'}
          </AppText>
        </View>
      </Card>

      <View className="flex-row justify-between mt-4" style={{ gap: 8 }}>
        {PRESETS.map((p) => {
          const on = p === goal;
          return (
            <Tap
              key={p}
              onPress={() => change(p)}
              haptics="tick"
              style={{ flex: 1 }}
              testID={`goal-preset-${p}`}
              accessibilityLabel={`${formatNumber(p)} steps`}
              className={`rounded-chip py-2.5 items-center ${on ? 'bg-primary' : 'bg-mint-soft'}`}
            >
              <AppText weight="strong" tone={on ? 'white' : 'primary'} className="text-sm">
                {p / 1000}k
              </AppText>
            </Tap>
          );
        })}
      </View>
    </SetupScreen>
  );
}

function Round({ icon, onPress, testID }: { icon: 'minus' | 'plus'; onPress: () => void; testID: string }) {
  return (
    <Tap
      onPress={onPress}
      haptics="tick"
      testID={testID}
      accessibilityLabel={icon === 'minus' ? 'Lower goal' : 'Raise goal'}
      className="w-9 h-9 rounded-full bg-mint-soft items-center justify-center"
    >
      <Feather name={icon} size={16} color={colors.primary.dark} />
    </Tap>
  );
}
