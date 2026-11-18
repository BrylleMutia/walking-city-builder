import { router } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../ui/AppText';
import { IconButton } from '../ui/kit';
import { OnboardingArt, type OnboardingScene } from './OnboardingArt';

/** Share of the screen the illustration takes on the setup steps (smaller than the slides). */
const ART_SHARE = 0.36;

/**
 * Shared layout for the onboarding setup steps: curved art panel with a back
 * button, title and body, the step's own content, and a footer pinned to the
 * bottom (the primary action).
 */
export function SetupScreen({
  scene,
  eyebrow,
  title,
  body,
  children,
  footer,
  onBack = () => router.back(),
  backIcon = 'arrow-left',
  testID,
}: {
  scene: OnboardingScene;
  /** Small line above the title (e.g. a step indicator). */
  eyebrow?: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
  footer: React.ReactNode;
  onBack?: () => void;
  backIcon?: 'arrow-left' | 'x';
  testID?: string;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return (
    // Keeps the footer button above the keyboard (the name step has a text field).
    <KeyboardAvoidingView
      className="flex-1 bg-card"
      testID={testID}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <OnboardingArt scene={scene} width={width} height={Math.round(height * ART_SHARE)} />
        <View className="px-7 mt-5">
          {eyebrow ? <View className="items-center mb-2">{eyebrow}</View> : null}
          <AppText weight="heavy" className="text-center" style={{ fontSize: 28, lineHeight: 36 }}>
            {title}
          </AppText>
          <AppText tone="soft" className="text-base text-center mt-2" style={{ lineHeight: 23 }}>
            {body}
          </AppText>
          <View className="mt-6">{children}</View>
        </View>
      </ScrollView>
      <View className="px-7 pt-3" style={{ paddingBottom: insets.bottom + 20 }}>
        {footer}
      </View>
      <View className="absolute left-5" style={{ top: insets.top + 8 }}>
        <IconButton icon={backIcon} onPress={onBack} accessibilityLabel={backIcon === 'x' ? 'Close' : 'Back'} testID="onboarding-back" />
      </View>
    </KeyboardAvoidingView>
  );
}
