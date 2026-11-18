import '../../global.css';

import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Toaster } from '../components/ui/Toaster';
import { useGameStore } from '../state/useGameStore';
import { useCloudSync } from '../state/useCloudSync';
import { useStepTracker } from '../state/useStepTracker';
import { colors } from '../theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const hydrated = useGameStore((s) => s.hydrated);
  const onboarded = useGameStore((s) => s.onboarded);
  const ready = (fontsLoaded || !!fontError) && hydrated;

  useStepTracker();
  useCloudSync();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.canvas },
          animation: 'slide_from_right',
        }}
      >
        {/*
          Route guards (Stack.Protected): until the first-run flow is done only
          onboarding is reachable, afterwards only the game. Flipping
          `onboarded` moves the player across by itself and drops the other
          side's history. Onboarding comes first so it is the screen a blocked
          "/" falls back to.
        */}
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="set/[id]" />
          <Stack.Screen
            name="open-pack"
            options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen name="dev/components" />
          <Stack.Screen name="dev/signup/[variant]" options={{ contentStyle: { backgroundColor: colors.card } }} />
          <Stack.Screen name="edit-name" options={{ contentStyle: { backgroundColor: colors.card } }} />
        </Stack.Protected>
        {/* Last step of onboarding, and reachable from Profile later. */}
        <Stack.Screen name="save-progress" options={{ contentStyle: { backgroundColor: colors.card } }} />
        <Stack.Screen name="account/email" options={{ contentStyle: { backgroundColor: colors.card } }} />
        <Stack.Screen name="account/code" options={{ contentStyle: { backgroundColor: colors.card } }} />
        {/* Returning players: from the intro slides, a taken email, or Profile. */}
        <Stack.Screen name="account/sign-in" options={{ contentStyle: { backgroundColor: colors.card } }} />
      </Stack>
      {/* Global toasts, above every screen of the stack. */}
      <Toaster />
    </GestureHandlerRootView>
  );
}
