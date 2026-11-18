import { Feather } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';

import { colors } from '../../theme/tokens';
import { AppText } from '../ui/AppText';
import { Tap } from '../ui/Tap';

/**
 * Inline error under a form field (soft red box, read out by screen readers).
 * `action` adds a way out of the error (e.g. "Sign in instead").
 */
export function ErrorNote({
  text,
  action,
  testID = 'account-error',
}: {
  text: string;
  action?: { label: string; onPress: () => void; testID?: string };
  testID?: string;
}) {
  return (
    <View
      className="flex-row items-start mt-3 rounded-tile px-4 py-3"
      style={{ backgroundColor: colors.danger.soft }}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <Feather name="alert-circle" size={15} color={colors.danger.DEFAULT} style={{ marginTop: 1 }} />
      <View className="ml-2.5 flex-1">
        <AppText weight="semi" className="text-sm" style={{ color: colors.danger.DEFAULT }}>
          {text}
        </AppText>
        {action ? (
          <Tap onPress={action.onPress} haptics="tick" hitSlop={10} testID={action.testID} className="self-start mt-1.5">
            <AppText weight="strong" tone="primary" className="text-sm">
              {action.label} →
            </AppText>
          </Tap>
        ) : null}
      </View>
    </View>
  );
}
