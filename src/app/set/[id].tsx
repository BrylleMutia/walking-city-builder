import { Canvas, Circle, Group, LinearGradient, Oval, Path, Rect, vec } from '@shopify/react-native-skia';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemArt } from '../../components/items/ItemArt';
import { AppText } from '../../components/ui/AppText';
import { PackThumb } from '../../components/ui/illustrations';
import {
  Card,
  IconButton,
  Meta,
  PillButton,
  PriceTag,
  SquareButton,
  formatNumber,
} from '../../components/ui/kit';
import { Tap } from '../../components/ui/Tap';
import { toast } from '../../components/ui/toast';
import { RARITY_COLOR, RARITY_LABEL, RARITY_ORDER, RARITY_WEIGHTS, FOIL_CHANCE } from '../../data/rarity';
import { getListing, type SetListing } from '../../data/sets';
import type { ItemDef } from '../../data/sets/cozyDowntown';
import { buyErrorMessage } from '../../state/messages';
import { useGameStore } from '../../state/useGameStore';
import { cardShadow, colors } from '../../theme/tokens';

export default function SetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = getListing(id);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const balance = useGameStore((s) => s.balance);
  const collection = useGameStore((s) => s.collection);
  const buyPack = useGameStore((s) => s.buyPack);
  const cloud = useGameStore((s) => s.cloud);
  const [buying, setBuying] = useState(false);
  const [showOdds, setShowOdds] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!listing) {
    return (
      <View className="flex-1 bg-canvas items-center justify-center">
        <AppText weight="strong">Set not found</AppText>
      </View>
    );
  }

  const live = !!listing.set;
  const short = Math.max(0, listing.price - balance);
  const heroH = Math.round(width * 0.92);

  const buy = async () => {
    if (!live || buying) return;
    setBuying(true);
    // The server takes the Steps and rolls the cards, so this needs a connection.
    const result = await buyPack(listing.id);
    setBuying(false);
    if (result.ok) {
      router.push('/open-pack');
    } else {
      // Same id: tapping Buy again updates the toast instead of stacking copies.
      toast.error("Couldn't buy pack", { id: 'buy-error', description: buyErrorMessage(result.reason) });
    }
  };
  const offline = cloud === 'offline' || cloud === 'signin_disabled';

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        {/* illustrated header */}
        <View className="mx-3 rounded-card overflow-hidden" style={{ marginTop: insets.top + 4, height: heroH }}>
          <SetScene listing={listing} width={width - 24} height={heroH} />
          <View className="absolute left-4 right-4 flex-row justify-between" style={{ top: 14 }}>
            <IconButton icon="chevron-left" onPress={() => router.back()} accessibilityLabel="Back" testID="set-back" />
            <IconButton icon="bell" accessibilityLabel="Notify me" />
          </View>
        </View>

        {/* name card overlapping the picture, price tag on the right */}
        <View className="flex-row items-start px-6 -mt-14">
          <Card className="flex-1 px-5 py-4 mr-3 rounded-tile">
            <AppText weight="heavy" className="text-xl">
              {listing.name}
            </AppText>
            <View className="flex-row mt-1.5" style={{ gap: 14 }}>
              <Meta icon="layers" label={listing.tagline} />
            </View>
          </Card>
          <View className="pt-6">
            <PriceTag label={live ? formatNumber(listing.price) : 'Soon'} sub={live ? 'steps / pack' : undefined} />
          </View>
        </View>

        <View className="px-6 mt-6">
          <AppText weight="heavy" className="text-base">
            About this set
          </AppText>
          <AppText tone="muted" className="text-sm mt-2 leading-6" numberOfLines={expanded ? undefined : 3}>
            {listing.blurb}{' '}
            {live
              ? 'Each pack holds 5 cards. Every card is a building for your city, and any card has a 10% chance to be a shiny foil.'
              : 'This set is still being built. Keep walking: your Steps will be waiting.'}
          </AppText>
          <Tap onPress={() => setExpanded((v) => !v)} haptics="tick" style={{ alignSelf: 'flex-start' }}>
            <AppText weight="strong" tone="accent" className="text-sm mt-1">
              {expanded ? 'Show less' : 'See More'}
            </AppText>
          </Tap>
        </View>

        {live && showOdds && <OddsCard />}

        {live && listing.set && (
          <View className="mt-6">
            <View className="px-6 flex-row items-center justify-between mb-3">
              <AppText weight="heavy" className="text-base">
                In this set
              </AppText>
              <AppText tone="muted" className="text-xs">
                {listing.set.items.filter((i) => (collection[i.id]?.count ?? 0) > 0).length} of{' '}
                {listing.set.items.length} collected
              </AppText>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 16, gap: 12 }}
            >
              {[...listing.set.items].reverse().map((item) => (
                <ItemTile
                  key={item.id}
                  item={item}
                  owned={collection[item.id]?.count ?? 0}
                  poolSize={listing.set!.items.filter((i) => i.rarity === item.rarity).length}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>


      {/* sticky actions, like "🔖 Book Now" */}
      <View
        className="absolute left-0 right-0 bottom-0 px-6 pt-3 bg-canvas flex-row items-center"
        style={{ paddingBottom: Math.max(insets.bottom, 14) + 6, gap: 12 }}
      >
        <SquareButton
          icon="percent"
          active={showOdds}
          testID="toggle-odds"
          onPress={() => setShowOdds((v) => !v)}
          accessibilityLabel="Show drop rates"
        />
        <View className="flex-1">
          {live ? (
            <PillButton
              label={
                short > 0
                  ? `Walk ${formatNumber(short)} more steps`
                  : buying
                    ? 'Opening the shop…'
                    : offline
                      ? 'Offline · tap to retry'
                      : 'Buy pack'
              }
              icon={short > 0 ? 'lock' : offline ? 'wifi-off' : 'shopping-bag'}
              disabled={short > 0 || buying}
              onPress={buy}
              testID="buy-pack"
            />
          ) : (
            <PillButton label="Coming soon" disabled />
          )}
        </View>
      </View>
    </View>
  );
}

function OddsCard() {
  return (
    <Card className="mx-6 mt-5 p-4 rounded-tile">
      <AppText weight="strong" className="text-sm mb-2">
        Drop rates per card
      </AppText>
      {RARITY_ORDER.map((r) => (
        <View key={r} className="flex-row items-center py-1">
          <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: RARITY_COLOR[r].main }} />
          <AppText className="text-sm flex-1">{RARITY_LABEL[r]}</AppText>
          <AppText weight="strong" className="text-sm">
            {Math.round(RARITY_WEIGHTS[r] * 100)}%
          </AppText>
        </View>
      ))}
      <View className="flex-row items-center pt-2 mt-1 border-t border-line">
        <AppText className="text-sm flex-1">Foil (any card)</AppText>
        <AppText weight="strong" className="text-sm">
          {Math.round(FOIL_CHANCE * 100)}%
        </AppText>
      </View>
    </Card>
  );
}

function ItemTile({ item, owned, poolSize }: { item: ItemDef; owned: number; poolSize: number }) {
  const c = RARITY_COLOR[item.rarity];
  const chance = (RARITY_WEIGHTS[item.rarity] / poolSize) * 100;
  return (
    <View className="bg-card rounded-tile p-2" style={[cardShadow, { width: 128 }]}>
      <View className="rounded-chip overflow-hidden" style={{ height: 104, backgroundColor: c.light + '66' }}>
        <Canvas style={{ width: 112, height: 104 }}>
          <ItemArt id={item.id} x={6} y={6} width={100} height={92} />
        </Canvas>
        {owned > 0 && (
          <View className="absolute top-1.5 right-1.5 bg-primary rounded-full px-1.5 py-0.5">
            <AppText weight="heavy" tone="white" className="text-[10px]">
              ×{owned}
            </AppText>
          </View>
        )}
      </View>
      <AppText weight="strong" className="text-xs mt-2" numberOfLines={1}>
        {item.name}
      </AppText>
      <View className="flex-row items-center mt-0.5">
        <View className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: c.main }} />
        <AppText tone="muted" className="text-[10px]">
          {RARITY_LABEL[item.rarity]} · {chance < 1 ? chance.toFixed(1) : Math.round(chance)}%
        </AppText>
      </View>
    </View>
  );
}

/** Header picture: sky, hills and a few of the set's buildings, with the pack in front. */
function SetScene({ listing, width, height }: { listing: SetListing; width: number; height: number }) {
  const showcase = useMemo(() => {
    const items = listing.set?.items ?? [];
    const pick = (id: string) => items.find((i) => i.id === id);
    return [pick('bakery'), pick('clock-tower'), pick('grand-theater')].filter(Boolean) as ItemDef[];
  }, [listing]);
  const w = width;
  const h = height;
  const ground = h * 0.66;
  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        <Rect x={0} y={0} width={w} height={h}>
          <LinearGradient start={vec(0, 0)} end={vec(0, h)} colors={['#58B9F2', '#BDE8FF', '#E6F8F0']} />
        </Rect>
        <Circle cx={w * 0.8} cy={h * 0.18} r={w * 0.07} color={colors.sun} />
        {[
          [0.12, 0.2, 1],
          [0.62, 0.3, 0.8],
        ].map(([x, y, s], i) => (
          <Group key={i} transform={[{ translateX: w * x }, { translateY: h * y }, { scale: s }]}>
            <Oval x={0} y={10} width={70} height={22} color="#FFFFFF" />
            <Circle cx={24} cy={12} r={14} color="#FFFFFF" />
            <Circle cx={44} cy={8} r={17} color="#FFFFFF" />
          </Group>
        ))}
        <Path
          path={`M0 ${ground} Q${w * 0.3} ${ground - h * 0.16} ${w * 0.55} ${ground - h * 0.05} Q${w * 0.8} ${ground - h * 0.14} ${w} ${ground - h * 0.04} L${w} ${h} L0 ${h} Z`}
          color="#8CCB6A"
        />
        {showcase.map((item, i) => {
          const bw = w * (i === 1 ? 0.34 : 0.3);
          const bh = h * (i === 1 ? 0.5 : 0.36);
          const x = [w * 0.02, w * 0.33, w * 0.66][i];
          const y = ground - bh * 0.78 - (i === 1 ? h * 0.06 : 0);
          return <ItemArt key={item.id} id={item.id} x={x} y={y} width={bw} height={bh} />;
        })}
        <Path
          path={`M0 ${h * 0.86} Q${w * 0.5} ${h * 0.76} ${w} ${h * 0.86} L${w} ${h} L0 ${h} Z`}
          color="#62B86B"
        />
      </Canvas>
      <View
        className="absolute"
        style={{ left: w * 0.5 - w * 0.12, top: h * 0.5, transform: [{ rotate: '-7deg' }] }}
      >
        <PackThumb listing={listing} width={w * 0.24} />
      </View>
    </View>
  );
}
