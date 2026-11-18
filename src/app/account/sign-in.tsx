import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { EmailField } from '../../components/onboarding/EmailField';
import { ErrorNote } from '../../components/onboarding/ErrorNote';
import { SetupScreen } from '../../components/onboarding/SetupScreen';
import { StepDots } from '../../components/onboarding/StepDots';
import { AppText } from '../../components/ui/AppText';
import { PillButton } from '../../components/ui/kit';
import { Tap } from '../../components/ui/Tap';
import { EMAIL_CODE_LENGTH, looksLikeEmail, normalizeEmail } from '../../lib/email';
import { haptic } from '../../lib/haptics';
import { BackendError, sendSignInCode, type BackendReason } from '../../state/backend';
import { hasGuestProgress } from '../../state/gameLogic';
import { accountErrorMessage } from '../../state/messages';
import { useGameStore } from '../../state/useGameStore';
import { colors } from '../../theme/tokens';

/**
 * Sign in, step 1 of 2: the email of an account saved on another phone (or
 * before a reinstall). Sends a code; step 2 (/account/code?mode=signin)
 * confirms it and switches this phone to that account.
 */
export default function SignIn() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<BackendReason | null>(null);
  const onboarded = useGameStore((s) => s.onboarded);
  const guestProgress = useGameStore((s) => !s.accountEmail && hasGuestProgress(s));
  const valid = looksLikeEmail(email);

  const send = async () => {
    if (!valid || sending) return;
    setSending(true);
    setError(null);
    const address = normalizeEmail(email);
    try {
      await sendSignInCode(address);
      router.push({ pathname: '/account/code', params: { email: address, mode: 'signin' } });
    } catch (e) {
      haptic.warning();
      setError(e instanceof BackendError ? e.reason : 'unknown');
    } finally {
      setSending(false);
    }
  };

  // No account yet: offer to save this phone's city to that email (during
  // onboarding the footer's "Start as a guest" already covers it).
  const noAccountAction =
    error === 'no_account' && onboarded
      ? {
          label: 'Save this phone’s city to it',
          onPress: () => router.replace({ pathname: '/account/email', params: { email: normalizeEmail(email) } }),
          testID: 'sign-in-save-instead',
        }
      : undefined;

  return (
    <SetupScreen
      scene="account"
      eyebrow={<StepDots step={1} of={2} />}
      title="Welcome back"
      body={`Sign in with the email your city is saved to. We’ll email you a ${EMAIL_CODE_LENGTH}-digit code.`}
      testID="sign-in"
      backIcon={onboarded ? 'x' : 'arrow-left'}
      footer={
        <View>
          <PillButton
            label={sending ? 'Sending…' : 'Send code'}
            icon="send"
            onPress={send}
            disabled={!valid || sending}
            testID="sign-in-send-code"
          />
          {!onboarded && (
            <View className="flex-row justify-center mt-3.5">
              <AppText tone="muted" className="text-sm">
                New here?{' '}
              </AppText>
              <Tap onPress={() => router.back()} haptics="tick" hitSlop={10} testID="sign-in-new-player">
                <AppText weight="strong" tone="primary" className="text-sm">
                  Start as a guest
                </AppText>
              </Tap>
            </View>
          )}
        </View>
      }
    >
      <EmailField
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (error) setError(null);
        }}
        autoFocus={!params.email}
        testID="sign-in-email-input"
      />
      {error ? <ErrorNote text={accountErrorMessage(error)} action={noAccountAction} /> : null}
      {guestProgress ? <ReplaceWarning /> : null}
      <View className="flex-row items-center justify-center mt-5">
        <Feather name="lock" size={12} color={colors.muted} />
        <AppText tone="muted" className="text-xs ml-1.5">
          No password needed: the code is your key.
        </AppText>
      </View>
    </SetupScreen>
  );
}

/** Shown while this phone has guest progress: signing in replaces it with the account's. */
function ReplaceWarning() {
  return (
    <View
      className="flex-row items-start mt-4 rounded-tile px-4 py-3"
      style={{ backgroundColor: colors.butter.DEFAULT }}
      testID="sign-in-replace-warning"
    >
      <Feather name="alert-triangle" size={15} color={colors.ink.soft} style={{ marginTop: 1 }} />
      <View className="ml-2.5 flex-1">
        <AppText weight="semi" tone="soft" className="text-sm">
          Signing in replaces the guest city on this phone with your account’s.
        </AppText>
        <Tap
          onPress={() => router.replace('/account/email')}
          haptics="tick"
          hitSlop={10}
          testID="sign-in-save-guest"
          className="self-start mt-1.5"
        >
          <AppText weight="strong" tone="primary" className="text-sm">
            Save this city first →
          </AppText>
        </Tap>
      </View>
    </View>
  );
}
