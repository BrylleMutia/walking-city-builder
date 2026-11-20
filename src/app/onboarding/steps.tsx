import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { SetupScreen } from '../../components/onboarding/SetupScreen';
import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import { AppText } from '../../components/ui/AppText';
import { Card, PillButton, type FeatherName } from '../../components/ui/kit';
import { Tap } from '../../components/ui/Tap';
import { useGameStore } from '../../state/useGameStore';
import { colors } from '../../theme/tokens';

/**
 * First useful action: see today's steps. "Count my steps" starts the step
 * tracker, so the system permission prompt shows up here, in context, rather
 * than at launch.
 */
export default function OnboardingSteps() {
  const s = useGameStore(
    useShallow((st) => ({
      requested: st.stepTrackingRequested || st.onboarded,
      name: st.displayName,
      sensor: st.sensor,
      stepsToday: st.stepsToday,
      requestStepTracking: st.requestStepTracking,
      addSteps: st.addSteps,
    })),
  );
  const next = () => router.push('/onboarding/goal');

  if (!s.requested) {
    return (
      <SetupScreen
        scene="steps"
        title="Count my steps"
        body={`Hi ${s.name}! Your phone already counts your steps. Let the app read them, and every step you walk turns into Steps to spend.`}
        testID="onboarding-steps"
        footer={<PillButton label="Count my steps" icon="activity" onPress={s.requestStepTracking} testID="steps-allow" />}
      >
        <Bullet icon="lock" text="We read your step count only" />
        <Bullet icon="battery" text="Uses the counter already in your phone, so it costs no extra battery" />
      </SetupScreen>
    );
  }

  return (
    <SetupScreen
      scene="steps"
      title="Your steps today"
      body={
        s.sensor === 'live'
          ? 'Counting with your phone. Keep walking and watch it climb.'
          : s.sensor === 'denied'
            ? 'No problem. You can turn step counting on later in Settings.'
            : s.sensor === 'checking'
              ? 'Looking for your step sensor…'
              : 'This phone can’t share its step data in this version of the app, so take a test walk instead.'
      }
      testID="onboarding-steps"
      footer={
        <PillButton label="Continue" onPress={next} disabled={s.sensor === 'checking'} testID="steps-continue" />
      }
    >
      <Card className="p-5 items-center">
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-full bg-accent-soft items-center justify-center mr-2.5">
            <MaterialCommunityIcons name="shoe-print" size={18} color={colors.accent.DEFAULT} />
          </View>
          <AnimatedCounter value={s.stepsToday} size={40} testID="onboarding-steps-today" />
        </View>
        <AppText tone="muted" className="text-sm mt-1">
          steps today
        </AppText>
        {(s.sensor === 'unavailable' || s.sensor === 'denied') && (
          <Tap
            onPress={() => s.addSteps(500)}
            haptics="medium"
            testID="steps-test-walk"
            className="flex-row items-center bg-primary-soft rounded-full px-4 py-2 mt-4"
          >
            <MaterialCommunityIcons name="walk" size={16} color={colors.primary.dark} />
            <AppText weight="strong" tone="primary" className="text-sm ml-1.5">
              Take a test walk (+500)
            </AppText>
          </Tap>
        )}
      </Card>
    </SetupScreen>
  );
}

function Bullet({ icon, text }: { icon: FeatherName; text: string }) {
  return (
    <View className="flex-row items-center mb-3 px-2">
      <View className="w-8 h-8 rounded-full bg-mint-soft items-center justify-center mr-3">
        <Feather name={icon} size={15} color={colors.primary.dark} />
      </View>
      <AppText tone="soft" className="text-sm flex-1">
        {text}
      </AppText>
    </View>
  );
}
