import { router } from 'expo-router';
import React from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';

import { AppText } from '../../components/ui/AppText';
import { PackThumb } from '../../components/ui/illustrations';
import { ArrowButton, Card, Meta, SectionHeader, WoodPill, formatNumber } from '../../components/ui/kit';
import { Screen } from '../../components/ui/Screen';
import { Tap } from '../../components/ui/Tap';
import { SET_LISTINGS, type SetListing } from '../../data/sets';
import { useGameStore } from '../../state/useGameStore';
import { cardShadow } from '../../theme/tokens';

export default function ShopScreen() {
  const { width } = useWindowDimensions();
  const balance = useGameStore((s) => s.balance);
  const featured = SET_LISTINGS[0];
  const cardW = Math.min(190, width * 0.46);

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <View>
          <AppText tone="muted" className="text-sm">
            Spend your Wood
          </AppText>
          <AppText weight="heavy" className="text-2xl">
            Pack shop
          </AppText>
        </View>
        <WoodPill balance={balance} />
      </View>

      {/* featured banner, like "Explore The Beauty" */}
      <View className="bg-mint rounded-card mt-6 p-3 overflow-hidden">
        <View className="flex-row items-end justify-center pt-3" style={{ gap: 14 }}>
          <View style={{ transform: [{ rotate: '-8deg' }, { translateY: 8 }] }}>
            <PackThumb listing={featured} width={64} />
          </View>
          <View style={{ transform: [{ translateY: -4 }] }}>
            <PackThumb listing={featured} width={84} />
          </View>
          <View style={{ transform: [{ rotate: '8deg' }, { translateY: 8 }] }}>
            <PackThumb listing={featured} width={64} />
          </View>
        </View>
        <Card className="mt-5 p-4 rounded-tile flex-row items-center">
          <View className="flex-1">
            <AppText weight="strong" className="text-base">
              {featured.name} is out now
            </AppText>
            <AppText tone="muted" className="text-xs mt-0.5">
              10 buildings · 5 cards a pack · 2% legendary
            </AppText>
          </View>
          <ArrowButton onPress={() => router.push(`/set/${featured.id}`)} />
        </Card>
      </View>

      <View className="mt-7">
        <SectionHeader title="Booster Packs" action={`${SET_LISTINGS.length} sets`} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-6"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20, gap: 14 }}
      >
        {SET_LISTINGS.map((l) => (
          <SetCard key={l.id} listing={l} width={cardW} affordable={balance >= l.price} />
        ))}
      </ScrollView>

      <Card className="mt-2 p-4 rounded-tile">
        <AppText weight="strong" className="text-sm">
          How it works
        </AppText>
        <AppText tone="muted" className="text-xs mt-1 leading-5">
          Each step you walk has a 1 in 10 chance to turn up 1 Wood. Spend Wood on booster packs,
          then place what you pull in your city.
        </AppText>
      </Card>
    </Screen>
  );
}

function SetCard({
  listing,
  width,
  affordable,
}: {
  listing: SetListing;
  width: number;
  affordable: boolean;
}) {
  const live = !!listing.set;
  const picH = width * 0.82;
  return (
    <Tap
      onPress={() => router.push(`/set/${listing.id}`)}
      testID={`set-card-${listing.id}`}
      className="bg-card rounded-card p-2.5"
      surfaceStyle={cardShadow}
    >
      <View
        className="rounded-tile items-center justify-center overflow-hidden"
        style={{ width, height: picH, backgroundColor: listing.wrapper.gradient[0] + '40' }}
      >
        <View style={{ transform: [{ rotate: '-6deg' }], opacity: live ? 1 : 0.55 }}>
          <PackThumb listing={listing} width={picH * 0.52} />
        </View>
        <View className="absolute top-2.5 right-2.5">
          {live ? (
            <View className="bg-card rounded-chip px-2.5 py-1">
              <AppText weight="heavy" tone="accent" className="text-xs">
                {formatNumber(listing.price)}
              </AppText>
            </View>
          ) : (
            <View className="bg-ink rounded-chip px-2.5 py-1">
              <AppText weight="strong" tone="white" className="text-[10px]">
                Coming soon
              </AppText>
            </View>
          )}
        </View>
      </View>
      <View className="px-1.5 pt-2.5 pb-1" style={{ width }}>
        <AppText weight="strong" className="text-base" numberOfLines={1}>
          {listing.name}
        </AppText>
        <View className="flex-row items-center justify-between mt-1">
          <Meta icon="layers" label={listing.tagline.split(' · ')[0]} />
          {live && <Meta icon="star" label={affordable ? 'Ready' : 'Walk more'} color="#9AA0B4" />}
        </View>
      </View>
    </Tap>
  );
}
