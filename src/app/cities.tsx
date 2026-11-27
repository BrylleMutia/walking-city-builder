import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { MiniMap } from '../components/city/MiniMap';
import { AppText } from '../components/ui/AppText';
import { DeleteButton } from '../components/ui/DeleteButton';
import { Card, IconButton, PillButton, formatNumber } from '../components/ui/kit';
import { Tap } from '../components/ui/Tap';
import { toast } from '../components/ui/toast';
import { haptic } from '../lib/haptics';
import { cityErrorMessage } from '../state/messages';
import {
  CITY_NAME_MAX,
  GRID_SIZE,
  MAX_CITIES,
  activeCityOf,
  cityDisplayName,
  cityPrice,
  lotsCovered,
  stepsForWood,
  type CitySummary,
} from '../state/gameLogic';
import { useGameStore } from '../state/useGameStore';
import { colors, fonts } from '../theme/tokens';

const MAP_W = 88;
const MAP_H = 52;

/**
 * The city switcher (opened from the town name on the City tab): every city with
 * a mini-map, rename and delete, and "New city" for Wood. Only the active city
 * is ever drawn in full; the others are mini-maps from cached tiles.
 */
export default function CitiesSheet() {
  const insets = useSafeAreaInsets();
  const s = useGameStore(
    useShallow((st) => ({
      cities: st.cities,
      active: activeCityOf(st),
      city: st.city,
      cityTiles: st.cityTiles,
      balance: st.balance,
      displayName: st.displayName,
    })),
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Previews of cities this phone hasn't seen yet, fetched in parallel.
  useEffect(() => {
    const st = useGameStore.getState();
    for (const c of st.cities) {
      if (c.id !== activeCityOf(st) && !st.cityTiles[c.id] && c.lots > 0) void st.loadCityTiles(c.id);
    }
  }, []);

  const price = cityPrice(Math.max(1, s.cities.length));
  const atCap = s.cities.length >= MAX_CITIES;
  const short = price - s.balance;

  const pick = (id: string) => {
    if (editing) return;
    if (id !== s.active) {
      haptic.medium();
      useGameStore.getState().switchCity(id);
    }
    router.back();
  };

  const create = async () => {
    setCreating(true);
    const res = await useGameStore.getState().createCity(null);
    setCreating(false);
    if (!res.ok) {
      haptic.warning();
      toast.error('Couldn’t build a new city', { description: cityErrorMessage(res.reason) });
      return;
    }
    haptic.success();
    toast.success('A fresh lawn is ready', { description: 'Your cards are shared between all your cities.' });
    router.back();
  };

  const rename = async (id: string, text: string) => {
    setEditing(null);
    const res = await useGameStore.getState().renameCity(id, text);
    if (!res.ok) toast.error('Couldn’t rename the city', { description: cityErrorMessage(res.reason) });
  };

  const remove = async (c: CitySummary, name: string) => {
    const res = await useGameStore.getState().deleteCity(c.id);
    if (!res.ok) {
      toast.error('Couldn’t remove the city', { description: cityErrorMessage(res.reason) });
      return;
    }
    toast.success(`${name} is gone`, { description: 'Its buildings are back in your inventory.' });
  };

  return (
    <View className="flex-1 bg-canvas" style={{ paddingBottom: insets.bottom + 12 }}>
      <View className="flex-row items-center px-6 pt-6">
        <View className="flex-1">
          <AppText weight="heavy" className="text-2xl">
            Your cities
          </AppText>
          <AppText tone="muted" className="text-sm mt-0.5">
            Every city builds from the same cards.
          </AppText>
        </View>
        <IconButton icon="x" onPress={() => router.back()} accessibilityLabel="Close" testID="cities-close" />
      </View>

      <ScrollView className="flex-1 mt-4" contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}>
        {s.cities.map((c, i) => {
          const name = cityDisplayName(s.cities, c.id, s.displayName);
          const isActive = c.id === s.active;
          const lots = isActive ? lotsCovered(s.city) : c.lots;
          const tiles = isActive ? s.city : (s.cityTiles[c.id] ?? (c.lots === 0 ? [] : null));
          return (
            <Animated.View key={c.id} entering={FadeIn.duration(200)} layout={LinearTransition.springify()}>
              <Tap onPress={() => pick(c.id)} testID={`city-row-${i}`} haptics="tick" accessibilityLabel={`${name}, ${lots} lots built`}>
                <Card className={`p-2.5 flex-row items-center border-2 ${isActive ? 'border-primary' : 'border-card'}`}>
                  <View className="rounded-tile bg-mint-soft items-center justify-center" style={{ width: MAP_W + 8, height: MAP_H + 8 }}>
                    <MiniMap placed={tiles} width={MAP_W} height={MAP_H} />
                  </View>
                  <View className="flex-1 ml-3">
                    {editing === c.id ? (
                      <TextInput
                        testID={`city-name-input-${i}`}
                        autoFocus
                        defaultValue={c.name ?? ''}
                        placeholder={cityDisplayName([{ ...c, name: null }], c.id, s.displayName)}
                        placeholderTextColor={colors.muted}
                        maxLength={CITY_NAME_MAX}
                        autoCapitalize="words"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={(e) => void rename(c.id, e.nativeEvent.text)}
                        onBlur={() => setEditing(null)}
                        style={{ fontFamily: fonts.strong, fontSize: 16, color: colors.ink.DEFAULT, paddingVertical: 2 }}
                      />
                    ) : (
                      <AppText weight="strong" className="text-base" numberOfLines={1} testID={`city-row-name-${i}`}>
                        {name}
                      </AppText>
                    )}
                    <AppText tone="muted" className="text-xs mt-0.5">
                      {`${lots} of ${GRID_SIZE * GRID_SIZE} lots built`}
                    </AppText>
                    {isActive && (
                      <View className="flex-row items-center mt-1">
                        <Feather name="check-circle" size={12} color={colors.primary.dark} />
                        <AppText weight="semi" tone="primary" className="text-xs ml-1">
                          You’re here
                        </AppText>
                      </View>
                    )}
                  </View>
                  <IconButton
                    icon="edit-2"
                    size={36}
                    onPress={() => setEditing(editing === c.id ? null : c.id)}
                    accessibilityLabel={`Rename ${name}`}
                    testID={`city-rename-${i}`}
                  />
                  {s.cities.length > 1 && (
                    <View className="ml-1.5">
                      <DeleteButton
                        size={36}
                        onConfirm={() => void remove(c, name)}
                        accessibilityLabel={`Remove ${name}`}
                        testID={`city-delete-${i}`}
                      />
                    </View>
                  )}
                </Card>
              </Tap>
            </Animated.View>
          );
        })}

        {/* Right after the list rather than pinned to the bottom: a form sheet
            lays its content out at full-screen height and shows only its detent
            (75%), so a bottom-pinned button would sit off-screen on Android. */}
        <View className="px-2 pt-3">
          <PillButton
            label={creating ? 'Building…' : 'New city'}
            icon="plus"
            price={atCap || creating ? undefined : price}
            disabled={atCap || creating || short > 0}
            onPress={() => void create()}
            testID="city-create"
          />
          <AppText tone="muted" className="text-xs text-center mt-2" testID="city-create-hint">
            {atCap
              ? `You have all ${MAX_CITIES} cities you can build.`
              : short > 0
                ? `~${formatNumber(stepsForWood(short))} more steps to go`
                : 'Each new city costs 1,000 Wood more than the last.'}
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}
