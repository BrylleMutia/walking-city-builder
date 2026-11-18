import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../components/ui/AppText';
import { IconButton, PillButton, StepsPill, formatNumber } from '../components/ui/kit';
import { toast } from '../components/ui/toast';
import { getListing } from '../data/sets';
import { PackSession } from '../screens/PackSession';
import { buyErrorMessage } from '../state/messages';
import { useGameStore } from '../state/useGameStore';

/**
 * Full-screen pack opening. The pack was already paid for and its cards
 * already added to the collection by the server in `buyPack`, so closing early
 * loses nothing.
 */
/** Close button / title / balance row, plus its top margin. */
const HEADER_HEIGHT = 64;

export default function OpenPackScreen() {
  const insets = useSafeAreaInsets();
  const pending = useGameStore((s) => s.pendingPack);
  const balance = useGameStore((s) => s.balance);
  const buyPack = useGameStore((s) => s.buyPack);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  const listing = getListing(pending?.setId);
  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);

  if (!pending || !listing?.set) {
    return (
      <View className="flex-1 bg-mint-soft items-center justify-center px-10">
        <AppText weight="strong" className="text-base text-center">
          No pack to open
        </AppText>
        <PillButton label="Back to the shop" onPress={close} style={{ marginTop: 16, alignSelf: 'stretch' }} />
      </View>
    );
  }

  const canAfford = balance >= listing.price;

  return (
    <View className="flex-1 bg-mint-soft" onLayout={onLayout}>
      {size && (
        <PackSession
          // A new key per purchase remounts the session and resets every animation.
          key={pending.nonce}
          set={listing.set}
          cards={pending.cards}
          width={size.width}
          height={size.height}
          bottomInset={insets.bottom}
          topInset={insets.top + HEADER_HEIGHT}
          onDone={() => {
            // Close the pack screen (and the set page under it) first, then switch
            // tabs. Navigating straight to /city would stack a second copy of the
            // tabs on top of this modal.
            if (router.canDismiss()) router.dismissAll();
            router.navigate('/city');
          }}
          onOpenAnother={
            canAfford
              ? async () => {
                  const result = await buyPack(listing.id);
                  if (!result.ok) {
                    toast.error("Couldn't open another", {
                      id: 'buy-error',
                      description: buyErrorMessage(result.reason),
                    });
                  }
                }
              : undefined
          }
          anotherLabel={`Open another · ${formatNumber(listing.price)}`}
        />
      )}

      <View
        className="absolute left-6 right-6 flex-row items-center"
        style={{ top: insets.top + 10 }}
        pointerEvents="box-none"
      >
        <IconButton icon="x" onPress={close} accessibilityLabel="Close" testID="close-pack" />
        <View className="flex-1 items-center" pointerEvents="none">
          <AppText tone="muted" className="text-xs">
            Booster pack
          </AppText>
          <AppText weight="heavy" className="text-lg">
            {listing.name}
          </AppText>
        </View>
        <StepsPill balance={balance} compact />
      </View>
    </View>
  );
}
