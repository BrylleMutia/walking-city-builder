import { Tabs } from 'expo-router/js-tabs';
import React, { useMemo } from 'react';

import { TabBar } from '../../components/ui/TabBar';
import { useGameStore } from '../../state/useGameStore';
import { colors } from '../../theme/tokens';

export default function TabsLayout() {
  const collection = useGameStore((s) => s.collection);
  const city = useGameStore((s) => s.city);

  // Buildings owned but not yet placed: a nudge to visit the City tab.
  const unplaced = useMemo(() => {
    const owned = Object.values(collection).reduce((a, o) => a + (o?.count ?? 0), 0);
    return Math.max(0, owned - city.length);
  }, [collection, city]);

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} badges={{ city: unplaced }} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.canvas } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="city" options={{ title: 'City' }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
