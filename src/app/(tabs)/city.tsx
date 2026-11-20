import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Canvas } from '@shopify/react-native-skia';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { CityMap, type CityMapHandle } from '../../components/city/CityMap';
import { ItemArt } from '../../components/items/ItemArt';
import { AppText } from '../../components/ui/AppText';
import { Card, Meta } from '../../components/ui/kit';
import { Tap } from '../../components/ui/Tap';
import { RARITY_COLOR, RARITY_LABEL } from '../../data/rarity';
import { cozyDowntown, type ItemDef, type ItemId } from '../../data/sets/cozyDowntown';
import { haptic } from '../../lib/haptics';
import { GRID_SIZE, available, tileAt } from '../../state/gameLogic';
import { useGameStore } from '../../state/useGameStore';
import { cardShadow, colors } from '../../theme/tokens';

const ITEMS: Record<ItemId, ItemDef> = Object.fromEntries(
  cozyDowntown.items.map((i) => [i.id, i]),
) as Record<ItemId, ItemDef>;

type Selection =
  | { kind: 'item'; itemId: ItemId }
  | { kind: 'tile'; x: number; y: number }
  /** "Move" was tapped for the object on this lot: the next lot tap moves (or swaps) it. */
  | { kind: 'moving'; x: number; y: number }
  | null;

export default function CityScreen() {
  const insets = useSafeAreaInsets();
  const map = useRef<CityMapHandle>(null);
  // City and inventory only: step syncs and other store changes don't touch
  // this screen (the Skia map is its most expensive render).
  const state = useGameStore(useShallow((s) => ({ city: s.city, collection: s.collection })));
  const removeAt = useGameStore((s) => s.removeAt);
  const [sel, setSel] = useState<Selection>(null);
  const [view, setView] = useState<'iso' | 'top'>('iso');

  const inventory = useMemo(
    () =>
      // Paths first (what you place most), then buildings and props, rarest first.
      [...cozyDowntown.items]
        .reverse()
        .sort((a, b) => Number(b.kind === 'path') - Number(a.kind === 'path'))
        .filter((i) => (state.collection[i.id]?.count ?? 0) > 0)
        .map((i) => ({ item: i, free: available(state, i.id) })),
    [state],
  );

  const selectedTile = sel?.kind === 'tile' || sel?.kind === 'moving' ? { x: sel.x, y: sel.y } : null;
  const tileBuilding = selectedTile ? tileAt(state, selectedTile.x, selectedTile.y) : undefined;

  const onTileTap = useCallback(
    (x: number, y: number) => {
      if (x < 0) {
        setSel(null);
        return;
      }
      const s = useGameStore.getState();
      if (sel?.kind === 'moving') {
        if (x === sel.x && y === sel.y) {
          setSel({ kind: 'tile', x, y });
          return;
        }
        if (s.moveItem(sel.x, sel.y, x, y)) {
          haptic.medium();
          setSel({ kind: 'tile', x, y });
        } else {
          haptic.warning();
        }
        return;
      }
      const occupant = tileAt(s, x, y);
      if (occupant) {
        haptic.tick();
        setSel({ kind: 'tile', x, y });
        return;
      }
      if (sel?.kind === 'item') {
        if (s.placeItem(sel.itemId, x, y)) {
          // Paths are stamped many times in a row: keep their feedback light.
          if (ITEMS[sel.itemId].kind === 'path') haptic.light();
          else haptic.medium();
          // Keep the same building selected while copies remain, for quick stamping.
          if (available(useGameStore.getState(), sel.itemId) <= 0) setSel(null);
        } else {
          haptic.warning();
        }
        return;
      }
      setSel(null);
    },
    [sel],
  );

  /** Drag-and-drop in the top view (a taken lot swaps the two objects). */
  const onMove = useCallback((fx: number, fy: number, tx: number, ty: number) => {
    if (!useGameStore.getState().moveItem(fx, fy, tx, ty)) {
      haptic.warning();
      return;
    }
    haptic.medium();
    // Keep a selected object selected where it landed.
    setSel((cur) => (cur?.kind === 'tile' && cur.x === fx && cur.y === fy ? { kind: 'tile', x: tx, y: ty } : cur));
  }, []);

  const toggleView = () => {
    haptic.medium();
    setView((v) => (v === 'iso' ? 'top' : 'iso'));
  };

  const removeSelected = () => {
    if (!selectedTile) return;
    if (removeAt(selectedTile.x, selectedTile.y)) {
      haptic.light();
      setSel(null);
    }
  };

  const focusItem: ItemDef | undefined =
    sel?.kind === 'item' ? ITEMS[sel.itemId] : tileBuilding ? ITEMS[tileBuilding.itemId] : undefined;
  const moving = sel?.kind === 'moving';

  return (
    <View className="flex-1 bg-canvas">
      {/* header, like "My Route · Eco Camping · Patagonia" */}
      <View className="flex-row items-center px-6" style={{ paddingTop: insets.top + 12 }}>
        <View className="w-12 h-12 rounded-full bg-accent-soft items-center justify-center">
          <Feather name="map-pin" size={20} color={colors.accent.DEFAULT} />
        </View>
        <View className="flex-1 ml-3">
          <AppText tone="muted" className="text-xs">
            My city
          </AppText>
          <AppText weight="heavy" className="text-xl">
            {cozyDowntown.name}
          </AppText>
          <Meta
            icon="grid"
            label={`${state.city.length} of ${GRID_SIZE * GRID_SIZE} lots built`}
          />
        </View>
      </View>

      {/* map */}
      <View className="flex-1 mt-4 mx-3 rounded-card overflow-hidden bg-mint-soft">
        <CityMap
          ref={map}
          placed={state.city}
          selected={selectedTile}
          view={view}
          onTileTap={onTileTap}
          onMove={onMove}
        />

        {/* zoom control */}
        <View
          className="absolute right-3 top-3 bg-card rounded-chip overflow-hidden"
          style={cardShadow}
        >
          <Tap
            onPress={toggleView}
            testID="city-view-toggle"
            accessibilityLabel={view === 'iso' ? 'Top-down view' : '3D view'}
            className="w-11 h-11 items-center justify-center"
          >
            <MaterialCommunityIcons
              name={view === 'iso' ? 'view-grid-outline' : 'cube-outline'}
              size={21}
              color={colors.primary.dark}
            />
          </Tap>
          <View className="h-px bg-line mx-2" />
          <Tap onPress={() => map.current?.zoomBy(1.3)} testID="city-zoom-in" haptics="tick" className="w-11 h-11 items-center justify-center">
            <Feather name="plus" size={20} color={colors.ink.DEFAULT} />
          </Tap>
          <View className="h-px bg-line mx-2" />
          <Tap onPress={() => map.current?.zoomBy(1 / 1.3)} testID="city-zoom-out" haptics="tick" className="w-11 h-11 items-center justify-center">
            <Feather name="minus" size={20} color={colors.ink.DEFAULT} />
          </Tap>
        </View>

        {/* recenter: back to the whole lawn, centred, at the default zoom (map-app style) */}
        <Tap
          onPress={() => map.current?.recenter()}
          testID="city-recenter"
          accessibilityLabel="Recenter the city"
          haptics="tick"
          // Below the control column: 12 inset + 3 buttons × 44 + 2 dividers, then a 10 gap.
          style={{ position: 'absolute', right: 12, top: 12 + 3 * 44 + 2 + 10 }}
          className="bg-card rounded-full w-11 h-11 items-center justify-center"
          surfaceStyle={cardShadow}
        >
          <Feather name="crosshair" size={20} color={colors.primary.dark} />
        </Tap>

        {/* "You" style hint bubble */}
        {(sel?.kind === 'item' || sel?.kind === 'moving' || (view === 'top' && !sel)) && (
          <Animated.View
            entering={FadeInDown.springify().damping(16)}
            exiting={FadeOutDown.duration(150)}
            className="absolute left-3 top-3 bg-card rounded-chip px-3 py-2"
            style={cardShadow}
          >
            <AppText weight="semi" className="text-xs">
              {sel?.kind === 'item'
                ? 'Tap an empty lot to build'
                : sel?.kind === 'moving'
                  ? 'Tap a lot to move it here, or a building to swap'
                  : 'Hold and drag to move · drop on a building to swap'}
            </AppText>
          </Animated.View>
        )}

        {/* floating detail card, like the "Eco Camping" card */}
        <View className="absolute left-3 right-3 bottom-3">
          {focusItem ? (
            <Animated.View
              key={sel?.kind === 'tile' || sel?.kind === 'moving' ? `t${sel.x}-${sel.y}` : `i${focusItem.id}`}
              entering={FadeInDown.springify().damping(15)}
              layout={LinearTransition.springify()}
            >
              <Card className="p-2.5 flex-row items-center">
                <View
                  className="rounded-tile overflow-hidden"
                  style={{ width: 84, height: 84, backgroundColor: RARITY_COLOR[focusItem.rarity].light + '88' }}
                >
                  <Canvas style={{ width: 84, height: 84 }}>
                    <ItemArt id={focusItem.id} x={4} y={4} width={76} height={76} />
                  </Canvas>
                </View>
                <View className="flex-1 ml-3">
                  <AppText weight="strong" className="text-base" numberOfLines={1}>
                    {focusItem.name}
                  </AppText>
                  <AppText tone="muted" className="text-xs mt-0.5" numberOfLines={2}>
                    {RARITY_LABEL[focusItem.rarity]} · {focusItem.flavor}
                  </AppText>
                  <View className="flex-row mt-2">
                    {moving ? (
                      <Chip icon="x" label="Cancel move" onPress={() => selectedTile && setSel({ kind: 'tile', ...selectedTile })} testID="cancel-move" />
                    ) : tileBuilding ? (
                      <>
                        <Chip
                          icon="move"
                          label="Move"
                          onPress={() => selectedTile && setSel({ kind: 'moving', ...selectedTile })}
                          testID="move-building"
                        />
                        <View className="w-2" />
                        <Chip icon="corner-up-left" label="Put away" onPress={removeSelected} testID="remove-building" />
                      </>
                    ) : (
                      <Chip
                        icon="map-pin"
                        label={`${available(state, focusItem.id)}${focusItem.kind === 'path' ? ' tiles' : ''} left to place`}
                        onPress={() => setSel(null)}
                      />
                    )}
                  </View>
                </View>
              </Card>
            </Animated.View>
          ) : inventory.length === 0 ? (
            <Card className="p-4 flex-row items-center">
              <View className="flex-1">
                <AppText weight="strong" className="text-base">
                  An empty lawn, for now
                </AppText>
                <AppText tone="muted" className="text-xs mt-0.5">
                  Open a booster pack to get your first buildings.
                </AppText>
              </View>
              <Chip icon="shopping-bag" label="Shop" onPress={() => router.navigate('/shop')} />
            </Card>
          ) : null}
        </View>
      </View>

      {/* inventory */}
      {inventory.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 10 }}
        >
          {inventory.map(({ item, free }) => {
            const active = sel?.kind === 'item' && sel.itemId === item.id;
            return (
              <Tap
                key={item.id}
                testID={`inventory-${item.id}`}
                haptics="tick"
                disabled={free <= 0}
                onPress={() => setSel(active ? null : { kind: 'item', itemId: item.id })}
                className={`rounded-tile bg-card p-1 border-2 ${active ? 'border-primary' : 'border-card'}`}
                surfaceStyle={[cardShadow, { opacity: free > 0 ? 1 : 0.45 }]}
              >
                <Canvas style={{ width: 58, height: 58 }}>
                  <ItemArt id={item.id} x={2} y={2} width={54} height={54} />
                </Canvas>
                <View
                  className="absolute -top-1 -right-1 rounded-full px-1.5 border-2 border-card"
                  style={{ backgroundColor: free > 0 ? RARITY_COLOR[item.rarity].dark : colors.muted }}
                >
                  <AppText weight="heavy" tone="white" className="text-[10px]">
                    {free}
                  </AppText>
                </View>
              </Tap>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/** Orange outline chip from the reference ("◎ Set Location"). */
function Chip({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Tap onPress={onPress} testID={testID} haptics="tick" className="flex-row items-center bg-accent-soft rounded-chip px-3 py-1.5">
      <Feather name={icon} size={13} color={colors.accent.DEFAULT} />
      <AppText weight="strong" tone="accent" className="text-xs ml-1.5">
        {label}
      </AppText>
    </Tap>
  );
}
