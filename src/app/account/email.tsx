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
import { EMAIL_CODE_LENGTH, looksLikeEmail, normalizeEmail } from '../../lib/email';
import { haptic } from '../../lib/haptics';
import { BackendError, sendEmailCode, type BackendReason } from '../../state/backend';
import { accountErrorMessage } from '../../state/messages';
import { useGameStore } from '../../state/useGameStore';
import { colors } from '../../theme/tokens';

/**
 * Save progress, step 1 of 2: the player's email. Sends a code to it;
 * step 2 (/account/code) confirms the code. The guest account itself is kept,
 * so steps, cards and city carry over untouched.
 */
export default function AccountEmail() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<BackendReason | null>(null);
  const valid = looksLikeEmail(email);

  const send = async () => {
    if (!valid || sending) return;
    setSending(true);
    setError(null);
    const address = normalizeEmail(email);
    try {
      // The guest session must exist before an email can be attached to it.
      if (useGameStore.getState().cloud !== 'online') await useGameStore.getState().connect();
      await sendEmailCode(address);
      router.push({ pathname: '/account/code', params: { email: address } });
    } catch (e) {
      haptic.warning();
      setError(e instanceof BackendError ? e.reason : 'unknown');
    } finally {
      setSending(false);
    }
  };

  return (
    <SetupScreen
      scene="email"
      eyebrow={<StepDots step={1} of={2} />}
      title="Save with your email"
      body={`We’ll email you a ${EMAIL_CODE_LENGTH}-digit code. Your steps, cards and city stay exactly as they are.`}
      testID="account-email"
      footer={
        <PillButton
          label={sending ? 'Sending…' : 'Send code'}
          icon="send"
          onPress={send}
          disabled={!valid || sending}
          testID="account-send-code"
        />
      }
    >
      <EmailField
        value={email}
        onChangeText={(v) => {
          setEmail(v);
          if (error) setError(null);
        }}
        autoFocus={!params.email}
        testID="account-email-input"
      />
      {error ? (
        <ErrorNote
          text={accountErrorMessage(error)}
          action={
            error === 'email_taken'
              ? {
                  label: 'Sign in instead',
                  onPress: () => router.replace({ pathname: '/account/sign-in', params: { email: normalizeEmail(email) } }),
                  testID: 'account-sign-in-instead',
                }
              : undefined
          }
        />
      ) : null}
      <View className="flex-row items-center justify-center mt-5">
        <Feather name="lock" size={12} color={colors.muted} />
        <AppText tone="muted" className="text-xs ml-1.5">
          We’ll only email you about your account.
        </AppText>
      </View>
    </SetupScreen>
  );
}

