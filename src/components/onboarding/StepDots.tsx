import React from 'react';
import { View } from 'react-native';

import { colors } from '../../theme/tokens';
import { AppText } from '../ui/AppText';

/** "Step 2 of 2" with a dot per step (the current one stretched), matching the onboarding page dots. */
export function StepDots({ step, of }: { step: number; of: number }) {
  return (
    <View className="flex-row items-center" accessibilityLabel={`Step ${step} of ${of}`}>
      {Array.from({ length: of }, (_, i) => (
        <View
          key={i}
          className="rounded-full mr-1.5"
          style={{
            width: i + 1 === step ? 22 : 8,
            height: 8,
            backgroundColor: i + 1 <= step ? colors.primary.DEFAULT : colors.line,
          }}
        />
      ))}
      <AppText weight="strong" tone="muted" className="text-xs ml-1">
        Step {step} of {of}
      </AppText>
    </View>
  );
}
