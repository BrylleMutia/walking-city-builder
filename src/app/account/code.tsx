import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { ErrorNote } from '../../components/onboarding/ErrorNote';
import { SetupScreen } from '../../components/onboarding/SetupScreen';
import { StepDots } from '../../components/onboarding/StepDots';
import { AppText } from '../../components/ui/AppText';
import { PillButton } from '../../components/ui/kit';
import { OtpInput, type OtpStatus } from '../../components/ui/OtpInput';
import { Tap } from '../../components/ui/Tap';
import { toast } from '../../components/ui/toast';
import { EMAIL_CODE_LENGTH, RESEND_SECONDS, formatCountdown } from '../../lib/email';
import { BackendError, sendEmailCode, sendSignInCode, verifyEmailCode } from '../../state/backend';
import { accountErrorMessage } from '../../state/messages';
import { useGameStore } from '../../state/useGameStore';
import { colors } from '../../theme/tokens';

const CODE_LENGTH = EMAIL_CODE_LENGTH;
/** Let the green success ring finish before leaving the screen. */
const SUCCESS_PAUSE_MS = 900;

/**
 * Step 2 of 2 of both email flows: the code from the email (EMAIL_CODE_LENGTH digits).
 * - `mode=save` (default): turns the guest account into an email account (same id, same progress).
 * - `mode=signin`: switches this phone to an existing account (its city replaces the guest's).
 * A full code submits by itself; the button is there for a second try.
 */
export default function AccountCode() {
  const { email = '', mode } = useLocalSearchParams<{ email: string; mode?: 'save' | 'signin' }>();
  const signingIn = mode === 'signin';
  const onboarded = useGameStore((s) => s.onboarded);

  const [code, setCode] = useState('');
  const [status, setStatus] = useState<OtpStatus>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [wait, setWait] = useState(RESEND_SECONDS);
  // Finishing from onboarding flips the route guards; leave once that's done.
  const [finishing, setFinishing] = useState(false);
  const verifying = useRef(false);

  // Resend countdown (Supabase allows one code per minute).
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => {
    if (!finishing || !onboarded) return;
    // Back to the bottom of the stack, then Home: no way "back" into the sign-up.
    router.dismissAll();
    router.replace('/');
  }, [finishing, onboarded]);

  const done = (saved: string) => {
    toast.success(signingIn ? 'Welcome back' : 'Progress saved', { description: `Signed in as ${saved}` });
    void useGameStore.getState().refreshAccount();
    if (useGameStore.getState().onboarded) {
      router.dismissAll(); // opened from Profile: back to the game
    } else {
      setFinishing(true);
      useGameStore.getState().completeOnboarding();
    }
  };

  const verify = async (value: string) => {
    if (value.length !== CODE_LENGTH || verifying.current) return;
    verifying.current = true;
    setBusy(true);
    setError(null);
    try {
      // Signing in also loads the account's city before the success ring shows.
      const saved = signingIn
        ? await useGameStore.getState().signIn(email, value).then(() => email)
        : await verifyEmailCode(email, value);
      setStatus('success');
      setTimeout(() => done(saved), SUCCESS_PAUSE_MS);
    } catch (e) {
      setStatus('error');
      setError(accountErrorMessage(e instanceof BackendError ? e.reason : 'unknown'));
      // Let the shake play, then clear the slots for another try.
      setTimeout(() => {
        setStatus('idle');
        setCode('');
        setResetKey((k) => k + 1);
      }, 700);
    } finally {
      verifying.current = false;
      setBusy(false);
    }
  };

  const resend = async () => {
    if (wait > 0) return;
    setError(null);
    try {
      await (signingIn ? sendSignInCode(email) : sendEmailCode(email));
      setWait(RESEND_SECONDS);
      toast.info('New code sent', { description: email });
    } catch (e) {
      setError(accountErrorMessage(e instanceof BackendError ? e.reason : 'unknown'));
    }
  };

  return (
    <SetupScreen
      scene="code"
      eyebrow={<StepDots step={2} of={2} />}
      title="Check your inbox"
      body={`We sent a ${CODE_LENGTH}-digit code to ${email}.`}
      testID="account-code"
      footer={
        <PillButton
          label={busy ? 'Checking…' : signingIn ? 'Verify & sign in' : 'Verify & save'}
          icon="check"
          onPress={() => verify(code)}
          disabled={code.length !== CODE_LENGTH || busy || status === 'success'}
          testID="account-verify"
        />
      }
    >
      <OtpInput
        length={CODE_LENGTH}
        size="md"
        autoFocus
        status={status}
        resetKey={resetKey}
        disabled={busy || status === 'success'}
        onChange={(v) => {
          setCode(v);
          if (error) setError(null);
        }}
        onComplete={verify}
        testID="account-code-input"
      />
      {error ? <ErrorNote text={error} /> : null}

      <View className="flex-row items-center justify-between mt-5 px-1">
        {wait > 0 ? (
          <AppText tone="muted" className="text-sm">
            Resend code in {formatCountdown(wait)}
          </AppText>
        ) : (
          <Tap onPress={resend} haptics="tick" hitSlop={10} testID="account-resend">
            <AppText weight="strong" tone="primary" className="text-sm">
              Resend code
            </AppText>
          </Tap>
        )}
        <Tap onPress={() => router.back()} haptics="tick" hitSlop={10} testID="account-change-email">
          <AppText weight="strong" tone="primary" className="text-sm">
            Change email
          </AppText>
        </Tap>
      </View>
      <View className="flex-row items-center mt-5 rounded-tile px-4 py-3" style={{ backgroundColor: colors.butter.DEFAULT }}>
        <Feather name="inbox" size={16} color={colors.ink.soft} />
        <AppText tone="soft" className="text-xs ml-2.5 flex-1">
          Can’t find it? Check your spam or promotions folder.
        </AppText>
      </View>
    </SetupScreen>
  );
}
