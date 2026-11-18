import { router } from 'expo-router';
import React from 'react';

import { NameStep } from '../components/onboarding/NameStep';

/** Change the player's name later (opened from Profile). */
export default function EditName() {
  return <NameStep mode="edit" onDone={() => router.back()} />;
}
