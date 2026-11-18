import { router } from 'expo-router';
import React from 'react';

import { NameStep } from '../../components/onboarding/NameStep';

/** Onboarding: what the app should call the player (first step after the slides). */
export default function OnboardingName() {
  return <NameStep mode="onboarding" onDone={() => router.push('/onboarding/steps')} />;
}
