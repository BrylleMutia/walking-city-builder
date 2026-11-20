import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AnimatedCounter } from '../../components/ui/AnimatedCounter';
import { AppText } from '../../components/ui/AppText';
import { DeleteButton } from '../../components/ui/DeleteButton';
import { Card, IconButton, SectionHeader } from '../../components/ui/kit';
import { NotificationBell } from '../../components/ui/NotificationBell';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Screen } from '../../components/ui/Screen';
import { Tap } from '../../components/ui/Tap';
import { toast } from '../../components/ui/toast';

/** Testing gallery for the shared UI components (reached from Profile → Testing). */
export default function ComponentGallery() {
  const [value, setValue] = useState(12480);
  const [unread, setUnread] = useState(3);
  const [deleted, setDeleted] = useState(0);

  return (
    <Screen>
      <View className="flex-row items-center mb-6">
        <IconButton icon="arrow-left" onPress={() => router.back()} testID="gallery-back" accessibilityLabel="Back" />
        <AppText weight="heavy" className="text-2xl ml-4">
          Components
        </AppText>
      </View>

      <SectionHeader title="Animated counter" />
      <Card className="p-5 items-center">
        <AnimatedCounter value={value} size={44} testID="gallery-counter" />
        <AnimatedCounter value={value / 100} size={18} decimals={2} prefix="$" tone="primary" />
        <View className="flex-row flex-wrap justify-center mt-4" style={{ gap: 8 }}>
          {[1, 137, 5000, -50, -9999].map((d) => (
            <Chip key={d} label={d > 0 ? `+${d}` : `${d}`} onPress={() => setValue((v) => Math.max(0, v + d))} />
          ))}
        </View>
      </Card>

      <View className="mt-7">
        <SectionHeader title="Toast" />
      </View>
      <Card className="p-4 flex-row flex-wrap" style={{ gap: 8 }}>
        <Chip label="Default" onPress={() => toast('Pack saved to your collection')} testID="gallery-toast" />
        <Chip
          label="Success"
          onPress={() => toast.success('Cozy Bakery placed', { description: 'Your city grew by one building.' })}
        />
        <Chip label="Error" onPress={() => toast.error('Couldn’t buy pack', { description: 'Not enough Wood.' })} />
        <Chip label="Warning" onPress={() => toast.warning('Offline: changes will sync later')} />
        <Chip label="Info" onPress={() => toast.info('New set coming soon')} />
        <Chip
          label="Promise"
          onPress={() =>
            toast
              .promise(new Promise((res, rej) => setTimeout(Math.random() > 0.3 ? res : rej, 1600)), {
                loading: 'Opening pack…',
                success: '5 new cards!',
                error: 'Connection lost',
              })
              .catch(() => {})
          }
        />
        <Chip
          label="Stack ×3"
          testID="gallery-toast-stack"
          // Long-lived, so the stack can be inspected (and e2e-tested) at leisure.
          onPress={() => {
            toast('Pack saved to your collection', { duration: 15000 });
            toast.success('Cozy Bakery placed', { description: 'Your city grew by one building.', duration: 15000 });
            toast.error('Couldn’t buy pack', { description: 'Not enough Wood.', duration: 15000 });
          }}
        />
        <Chip
          label="Action"
          onPress={() =>
            toast('Bench removed', { action: { label: 'Undo', onPress: () => toast.success('Bench restored') } })
          }
        />
      </Card>

      <View className="mt-7">
        <SectionHeader title="Notification bell" />
      </View>
      <Card className="p-5 flex-row items-center justify-around">
        <Chip label="−" onPress={() => setUnread((n) => Math.max(0, n - 1))} testID="gallery-bell-minus" />
        <NotificationBell count={unread} testID="gallery-bell" />
        <NotificationBell count={unread} variant="dot" color="primary" />
        <NotificationBell count={unread * 37} size={52} color="danger" />
        <Chip label="+" onPress={() => setUnread((n) => n + 1)} testID="gallery-bell-plus" />
      </Card>

      <View className="mt-7">
        <SectionHeader title="Delete button" />
      </View>
      <Card className="p-5 flex-row items-center justify-between">
        <AppText tone="soft" className="text-sm">
          Deleted {deleted} {deleted === 1 ? 'time' : 'times'}
        </AppText>
        <DeleteButton onConfirm={() => setDeleted((n) => n + 1)} testID="gallery-delete" />
      </Card>

      <View className="mt-7">
        <SectionHeader title="Sign-up mockups" />
      </View>
      <Card className="p-4 flex-row flex-wrap" style={{ gap: 8 }}>
        <Chip label="1 · Magic link" onPress={() => router.push('/dev/signup/link')} testID="mockup-link" />
        <Chip label="2 · Password" onPress={() => router.push('/dev/signup/password')} testID="mockup-password" />
        <Chip label="3 · Code" onPress={() => router.push('/dev/signup/code')} testID="mockup-code" />
      </Card>

      <View className="mt-7">
        <SectionHeader title="Password input" />
      </View>
      <PasswordInput strength placeholder="Create a password" testID="gallery-password" textContentType="newPassword" />
      <View className="h-3" />
      <PasswordInput placeholder="Disabled" disabled defaultValue="secret" />
    </Screen>
  );
}

function Chip({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Tap onPress={onPress} testID={testID} haptics="tick" className="bg-primary-soft rounded-chip px-3.5 py-2">
      <AppText weight="strong" tone="primary" className="text-sm">
        {label}
      </AppText>
    </Tap>
  );
}
