import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { EmailField } from '../../../components/onboarding/EmailField';
import { SetupScreen } from '../../../components/onboarding/SetupScreen';
import { StepDots } from '../../../components/onboarding/StepDots';
import { AppText } from '../../../components/ui/AppText';
import { PillButton } from '../../../components/ui/kit';
import { OtpInput } from '../../../components/ui/OtpInput';
import { PasswordInput } from '../../../components/ui/PasswordInput';
import { Tap } from '../../../components/ui/Tap';
import { toast } from '../../../components/ui/toast';
import { colors } from '../../../theme/tokens';

// MOCKUPS of the email sign-up screen behind "Continue with email" on
// /save-progress. Three approaches, pre-filled with demo values so a
// screenshot shows them mid-use. Nothing here talks to Supabase.

const DEMO_EMAIL = 'bry@example.com';
const mockOnly = () => toast.info('Mockup only', { description: 'Sign-up isn’t connected yet.' });

export default function SignupMockup() {
  const { variant } = useLocalSearchParams<{ variant: string }>();
  if (variant === 'password') return <PasswordVariant />;
  if (variant === 'code') return <CodeVariant />;
  return <MagicLinkVariant />;
}

/** 1. Passwordless: one field, we email a link. */
function MagicLinkVariant() {
  const [email, setEmail] = useState(DEMO_EMAIL);
  return (
    <SetupScreen
      scene="email"
      title="Save with your email"
      body="We'll send you a link. Tap it and your city is saved. No password to remember."
      testID="signup-mockup-link"
      footer={
        <View>
          <PillButton label="Send my link" icon="send" onPress={mockOnly} />
          <Reassure />
        </View>
      }
    >
      <EmailField value={email} onChangeText={setEmail} />
      <Perk icon="smartphone" text="Open the app on any phone with this email" />
      <Perk icon="shield" text="Your steps, cards and city stay exactly as they are" />
    </SetupScreen>
  );
}

/** 2. Classic: email + password with the strength meter, optional newsletter. */
function PasswordVariant() {
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [news, setNews] = useState(true);
  return (
    <SetupScreen
      scene="account"
      title="Create your account"
      body="Keep your steps, cards and city safe on every phone."
      testID="signup-mockup-password"
      footer={
        <View>
          <PillButton label="Create account" onPress={mockOnly} />
          <View className="flex-row justify-center mt-3.5">
            <AppText tone="muted" className="text-sm">
              Already have an account?{' '}
            </AppText>
            <Tap onPress={mockOnly} haptics="tick" hitSlop={10}>
              <AppText weight="strong" tone="primary" className="text-sm">
                Sign in
              </AppText>
            </Tap>
          </View>
        </View>
      }
    >
      <EmailField value={email} onChangeText={setEmail} />
      <View className="h-3" />
      <PasswordInput strength defaultValue="WalkingCity7!" placeholder="Create a password" textContentType="newPassword" />
      <Tap onPress={() => setNews((v) => !v)} haptics="tick" scaleTo={0.98} className="flex-row items-center mt-4 px-1">
        <View
          className="w-6 h-6 rounded-md items-center justify-center"
          style={{
            borderWidth: 2,
            borderColor: news ? colors.primary.DEFAULT : colors.muted,
            backgroundColor: news ? colors.primary.DEFAULT : 'transparent',
          }}
        >
          {news && <Feather name="check" size={14} color="#FFFFFF" />}
        </View>
        <AppText tone="soft" className="text-sm ml-3 flex-1">
          Email me walking tips and new sets (optional)
        </AppText>
      </Tap>
    </SetupScreen>
  );
}

/** 3. Code: step 2 of 2, type the 6-digit code from the email. Stays in the app. */
function CodeVariant() {
  const [code, setCode] = useState('4815');
  const complete = code.length === 6;
  return (
    <SetupScreen
      scene="code"
      eyebrow={<StepDots step={2} of={2} />}
      title="Check your inbox"
      body={`We sent a 6-digit code to ${DEMO_EMAIL}. It's valid for 10 minutes.`}
      testID="signup-mockup-code"
      footer={<PillButton label="Verify & save" icon="check" onPress={mockOnly} disabled={!complete} />}
    >
      <OtpInput defaultValue="4815" onChange={setCode} />
      <View className="flex-row items-center justify-between mt-5 px-1">
        <AppText tone="muted" className="text-sm">
          Resend code in 0:42
        </AppText>
        <Tap onPress={mockOnly} haptics="tick" hitSlop={10}>
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

function Perk({ icon, text }: { icon: React.ComponentProps<typeof Feather>['name']; text: string }) {
  return (
    <View className="flex-row items-center mt-4 px-2">
      <View className="w-8 h-8 rounded-full bg-mint-soft items-center justify-center mr-3">
        <Feather name={icon} size={15} color={colors.primary.dark} />
      </View>
      <AppText tone="soft" className="text-sm flex-1">
        {text}
      </AppText>
    </View>
  );
}

function Reassure() {
  return (
    <View className="flex-row items-center justify-center mt-3">
      <Feather name="lock" size={12} color={colors.muted} />
      <AppText tone="muted" className="text-xs ml-1.5">
        We’ll only email you about your account.
      </AppText>
    </View>
  );
}

