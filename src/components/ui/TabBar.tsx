import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colors } from '../../theme/tokens';
import { AppText } from './AppText';
import type { FeatherName } from './kit';
import { Tap } from './Tap';

const ICONS: Record<string, FeatherName> = {
  index: 'home',
  city: 'map',
  shop: 'shopping-bag',
  profile: 'user',
};

const SLIDE = { stiffness: 380, damping: 26, mass: 0.7 } as const;
const BAR_HEIGHT = 66;

/**
 * White rounded tab bar from the reference: four icons, the active one green
 * with a small green tab underneath that slides between items.
 */
export function TabBar({
  state,
  descriptors,
  navigateToTab,
  insets,
  badges = {},
}: BottomTabBarProps & { badges?: Record<string, number> }) {
  const [width, setWidth] = useState(0);
  const slot = width / Math.max(1, state.routes.length);
  const x = useSharedValue(0);

  useEffect(() => {
    if (slot > 0) x.value = withSpring(state.index * slot + slot / 2 - 14, SLIDE);
  }, [state.index, slot, x]);

  const marker = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      className="bg-card rounded-t-card"
      style={{
        paddingBottom: Math.max(insets.bottom, 10),
        shadowColor: '#1B7A5A',
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -6 },
        elevation: 12,
      }}
    >
      <View
        className="flex-row"
        style={{ height: BAR_HEIGHT }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      >
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const label = descriptors[route.key]?.options.title ?? route.name;
          const badge = badges[route.name] ?? 0;
          return (
            <Tap
              key={route.key}
              testID={`tab-${route.name}`}
              style={{ flex: 1 }}
              haptics="tick"
              scaleTo={0.86}
              accessibilityLabel={label}
              className="items-center justify-center"
              surfaceStyle={{ height: BAR_HEIGHT }}
              onPress={() => {
                if (!focused) navigateToTab(route.key);
              }}
            >
              <Feather
                name={ICONS[route.name] ?? 'circle'}
                size={23}
                color={focused ? colors.primary.DEFAULT : colors.muted}
              />
              {badge > 0 && (
                <View
                  className="absolute bg-primary rounded-full items-center justify-center border-2 border-card"
                  style={{ top: 12, left: '52%', minWidth: 20, height: 20, paddingHorizontal: 4 }}
                >
                  <AppText weight="heavy" tone="white" className="text-[10px]">
                    {badge > 99 ? '99+' : badge}
                  </AppText>
                </View>
              )}
            </Tap>
          );
        })}
      </View>
      {width > 0 && (
        <Animated.View
          pointerEvents="none"
          className="absolute bg-primary rounded-t-full"
          style={[{ top: BAR_HEIGHT - 8, left: 0, width: 28, height: 6 }, marker]}
        />
      )}
    </View>
  );
}
