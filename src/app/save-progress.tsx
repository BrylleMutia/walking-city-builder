import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { SetupScreen } from '../components/onboarding/SetupScreen';
import { AppText } from '../components/ui/AppText';
import { PillButton, type FeatherName } from '../components/ui/kit';
import { Tap } from '../components/ui/Tap';
import { useGameStore } from '../state/useGameStore';
import { colors } from '../theme/tokens';

/**
 * Last onboarding step, and the "save your progress" reminder opened from
 * Profile. Email (6-digit code) is live; Apple and Google are still "Soon".
 * Skipping keeps the anonymous account the app already created. Guests can
 * also sign in to an account saved elsewhere (/account/sign-in).
 */
export default function SaveProgress() {
  const onboarded = useGameStore((s) => s.onboarded);
  const completeOnboarding = useGameStore((s) => s.completeOnboarding);
  const accountEmail = useGameStore((s) => s.accountEmail);
  // Opened from Profile (already playing) vs. as the last onboarding step.
  const [fromProfile] = useState(onboarded);
  const [finishing, setFinishing] = useState(false);

  // Finishing flips the route guards; go Home once the game routes exist again.
  useEffect(() => {
    if (finishing && onboarded) router.replace('/');
  }, [finishing, onboarded]);

  const finish = () => {
    if (fromProfile) {
      router.back();
      return;
    }
    setFinishing(true);
    completeOnboarding();
  };

  return (
    <SetupScreen
      scene="save"
      title={accountEmail ? 'Your city is safe' : 'Keep your city safe'}
      body={
        accountEmail
          ? 'Your steps, cards and city are saved to your email. Sign in with it on any phone to pick up where you left off.'
          : "You're playing as a guest: your progress is tied to this install. Save it to your email to keep it safe."
      }
      testID="save-progress"
      backIcon={fromProfile ? 'x' : 'arrow-left'}
      footer={
        <PillButton
          label={fromProfile ? 'Close' : 'Skip for now'}
          variant={fromProfile ? 'soft' : 'primary'}
          onPress={finish}
          testID="save-skip"
        />
      }
    >
      <Benefit icon="shield" text="Your steps, cards and city tied to your email, not just this phone" />
      <Benefit icon="mail" text="No password to remember: we email you a code" />
      <Benefit icon="smartphone" text="Sign in on another phone with the same email" />

      <View className="mt-3" style={{ gap: 10 }}>
        <Provider label="Continue with Apple" icon={<MaterialCommunityIcons name="apple" size={19} color={colors.muted} />} />
        <Provider label="Continue with Google" icon={<MaterialCommunityIcons name="google" size={18} color={colors.muted} />} />
        {accountEmail ? (
          <SavedEmail email={accountEmail} />
        ) : (
          <Tap
            onPress={() => router.push('/account/email')}
            haptics="tick"
            testID="continue-with-email"
            className="h-12 rounded-tile bg-primary flex-row items-center px-4"
          >
            <Feather name="mail" size={17} color="#FFFFFF" />
            <AppText weight="strong" tone="white" className="text-sm flex-1 ml-3">
              Continue with email
            </AppText>
            <Feather name="chevron-right" size={18} color="#FFFFFF" />
          </Tap>
        )}
      </View>
      {!accountEmail && (
        <View className="flex-row justify-center mt-4">
          <AppText tone="muted" className="text-sm">
            Saved a city on another phone?{' '}
          </AppText>
          <Tap onPress={() => router.push('/account/sign-in')} haptics="tick" hitSlop={10} testID="save-sign-in">
            <AppText weight="strong" tone="primary" className="text-sm">
              Sign in
            </AppText>
          </Tap>
        </View>
      )}
      {!fromProfile && (
        <AppText tone="muted" className="text-xs text-center mt-4 mb-2">
          You can save your progress anytime from Profile.
        </AppText>
      )}
    </SetupScreen>
  );
}

/** One benefit row. `soon` marks a promise that isn't built yet (same tag as the providers). */
function Benefit({ icon, text, soon }: { icon: FeatherName; text: string; soon?: boolean }) {
  return (
    <View className="flex-row items-center mb-3 px-2">
      <View className="w-8 h-8 rounded-full bg-mint-soft items-center justify-center mr-3">
        <Feather name={icon} size={15} color={soon ? colors.muted : colors.primary.dark} />
      </View>
      <AppText tone={soon ? 'muted' : 'soft'} className="text-sm flex-1">
        {text}
      </AppText>
      {soon && <SoonTag />}
    </View>
  );
}

function SoonTag() {
  return (
    <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: colors.butter.DEFAULT }}>
      <AppText weight="strong" tone="soft" className="text-xs">
        Soon
      </AppText>
    </View>
  );
}

/** A sign-in option that isn't available yet: shown, but not tappable. */
function Provider({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <View
      className="h-12 rounded-tile border border-line flex-row items-center px-4"
      accessibilityState={{ disabled: true }}
      accessibilityLabel={`${label}, coming soon`}
    >
      {icon}
      <AppText weight="semi" tone="muted" className="text-sm flex-1 ml-3">
        {label}
      </AppText>
      <SoonTag />
    </View>
  );
}

/** Shown instead of the email button once the progress is saved to an email. */
function SavedEmail({ email }: { email: string }) {
  return (
    <View className="h-12 rounded-tile flex-row items-center px-4 bg-primary-soft" testID="saved-email">
      <Feather name="check-circle" size={17} color={colors.primary.dark} />
      <AppText weight="semi" tone="primary" className="text-sm flex-1 ml-3" numberOfLines={1}>
        Saved as {email}
      </AppText>
    </View>
  );
}
