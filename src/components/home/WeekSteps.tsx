import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View } from 'react-native';

import { weekSummary } from '../../state/gameLogic';
import { colors, softShadow } from '../../theme/tokens';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import { AppText } from '../ui/AppText';
import { formatNumber } from '../ui/kit';
import { ProgressRing } from '../ui/ProgressRing';
import { dayLetter } from './weekChart';

type Day = { key: string; steps: number };

interface Props {
  /** Oldest first, today last (`recentDays`). */
  week: Day[];
  goal: number;
  testID?: string;
}

const RING_GAP = 6;

/** The week at a glance: total, goals reached, and one ring per day filling toward the daily goal. */
export function WeekRings({ week, goal, testID }: Props) {
  const sum = weekSummary(week, goal);
  // Rings share the card's full width, so their size comes from the measured row.
  const [w, setW] = useState(0);
  const size = w ? Math.floor((w - RING_GAP * (week.length - 1)) / week.length) : 0;
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`This week: ${formatNumber(sum.total)} steps, ${sum.goalsHit} of ${week.length} goals reached`}
      className="bg-card rounded-card p-4"
      style={softShadow}
    >
      <View className="flex-row items-end justify-between">
        <View>
          <AppText tone="soft" className="text-xs">
            Steps this week
          </AppText>
          <AnimatedCounter value={sum.total} size={24} />
        </View>
        <View className="items-end">
          <AppText weight="strong" className="text-xs">
            {sum.goalsHit} of {week.length} goals
          </AppText>
          <AppText tone="soft" className="text-xs">
            avg {formatNumber(sum.average)}/day
          </AppText>
        </View>
      </View>
      <View className="flex-row mt-4" style={{ gap: RING_GAP }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {size > 0 &&
          week.map((d, i) => {
            const today = i === week.length - 1;
            const met = d.steps >= goal;
            return (
              <View key={d.key} className="items-center" style={{ width: size }}>
                <ProgressRing
                  size={size}
                  stroke={Math.max(4, Math.round(size * 0.13))}
                  progress={d.steps / goal}
                  color={met ? colors.primary.dark : colors.primary.DEFAULT}
                  track={colors.primary.soft}
                >
                  {met ? (
                    <Feather name="check" size={Math.round(size * 0.38)} color={colors.primary.dark} />
                  ) : today ? (
                    <AppText weight="heavy" className="text-[10px]">
                      {Math.round((d.steps / goal) * 100)}%
                    </AppText>
                  ) : null}
                </ProgressRing>
                <AppText weight={today ? 'heavy' : 'semi'} tone={today ? 'ink' : 'soft'} className="text-xs mt-1.5">
                  {dayLetter(d.key)}
                </AppText>
              </View>
            );
          })}
      </View>
    </View>
  );
}
