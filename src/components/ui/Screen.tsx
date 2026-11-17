import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Scrollable page body with the app background and safe-area top padding. */
export function Screen({
  children,
  scroll = true,
  padded = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const pad = padded ? 'px-6' : '';
  if (!scroll) {
    return (
      <View className={`flex-1 bg-canvas ${pad}`} style={{ paddingTop: insets.top + 12 }}>
        {children}
      </View>
    );
  }
  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className={pad}>{children}</View>
      </ScrollView>
      {/* Opaque strip behind the status bar so scrolled content doesn't collide with the clock. */}
      <View className="absolute top-0 left-0 right-0 bg-canvas" style={{ height: insets.top }} pointerEvents="none" />
    </View>
  );
}
