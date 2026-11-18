import { Stack } from 'expo-router';
import React from 'react';

import { colors } from '../../theme/tokens';

/** First-run flow: intro slides → name → steps → goal (then /save-progress). */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.card },
      }}
    >
      {/* Nothing to go back to from the first slide. */}
      <Stack.Screen name="index" options={{ gestureEnabled: false }} />
      <Stack.Screen name="name" />
      <Stack.Screen name="steps" />
      <Stack.Screen name="goal" />
    </Stack>
  );
}
