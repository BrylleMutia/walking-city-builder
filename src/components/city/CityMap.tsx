import { Canvas, Group, Path, RoundedRect, vec } from '@shopify/react-native-skia';
import React, { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import {
  interpolate,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { getItem } from '../../data/items';
import { RARITY_COLOR } from '../../data/rarity';
import type { ItemId } from '../../data/sets/cozyDowntown';
import { haptic } from '../../lib/haptics';
import { GRID_SIZE, pathMask, type Placed } from '../../state/gameLogic';
import { colors } from '../../theme/tokens';
import { project, shade, type Shape } from '../items/iso';
import { ItemArt } from '../items/ItemArt';
import { getItemArt } from '../items/itemShapes';
import { getPathShapes, isPathId } from '../items/pathShapes';

/** One grid tile spans this many iso units (the item drawings use a 4×4 footprint). */
const TILE = 4;
const C = 0.8660254;
const SLAB = 1.6;
const MIN_ZOOM = 0.7;
// The whole lawn fits the view at zoom 1, so a bigger grid draws smaller tiles:
// 3.5 ≈ 2.6 × 16/12 keeps the biggest building as large as on the old 12×12 lawn.
const MAX_ZOOM = 3.5;
const CAMERA_SPRING = { stiffness: 220, damping: 24, mass: 0.8 } as const;
const VIEW_SPRING = { stiffness: 150, damping: 20, mass: 0.9 } as const;

const GRASS_A = '#A3DC86';
const GRASS_B = '#96D479';
const SOIL = '#C79B6B';

/**
 * Top-down view. The iso projection is the plan squashed to half height, so
 * stretching it back by √3 and turning it −45° (around the lawn centre) lays the
 * lawn flat as an axis-aligned square grid, √2·cos30 per plan unit. Turning it
 * makes it narrower, so it also zooms in by TOP_ZOOM (√2 would fill the iso
 * lawn's full width; a bit less keeps a margin clear of the map controls):
 * plan point (X, Y) lands at centre + K·(X − N/2, Y − N/2).
 */
const N = GRID_SIZE * TILE;
const TOP_ZOOM = 1.3;
const K = Math.SQRT2 * C * TOP_ZOOM;
const TOKEN = TILE * K - 0.6;

/** Plan coordinates (iso units) → top-down canvas coordinates (same space as the iso drawing). */
function toTop(X: number, Y: number): [number, number] {
  'worklet';
  return [(X - N / 2) * K, N / 2 + (Y - N / 2) * K];
}

/** Lot index (y · GRID_SIZE + x) under a top-down canvas point, or -1 off the lawn. */
function topCell(lx: number, ly: number): number {
  'worklet';
  const gx = Math.floor((lx / K + N / 2) / TILE);
  const gy = Math.floor(((ly - N / 2) / K + N / 2) / TILE);
  return gx >= 0 && gy >= 0 && gx < GRID_SIZE && gy < GRID_SIZE ? gy * GRID_SIZE + gx : -1;
}

export interface CityMapHandle {
  zoomBy: (factor: number) => void;
  recenter: () => void;
}

interface Props {
  placed: Placed[];
  selected: { x: number; y: number } | null;
  /** 'top' shows the lawn from above, for editing (tokens + drag to move/swap). */
  view: 'iso' | 'top';
  /** Grid tile that was tapped (may be outside the grid → -1). */
  onTileTap: (x: number, y: number) => void;
  /** Top view: an object was dragged from one lot to another (taken lot = swap). */
  onMove: (fx: number, fy: number, tx: number, ty: number) => void;
}

const fmt = (v: number) => Math.round(v * 1000) / 1000;

function diamond(x: number, y: number): string {
  const p = [
    project(x * TILE, y * TILE, 0),
    project((x + 1) * TILE, y * TILE, 0),
    project((x + 1) * TILE, (y + 1) * TILE, 0),
    project(x * TILE, (y + 1) * TILE, 0),
  ];
  return `M${fmt(p[0][0])} ${fmt(p[0][1])} L${fmt(p[1][0])} ${fmt(p[1][1])} L${fmt(p[2][0])} ${fmt(p[2][1])} L${fmt(p[3][0])} ${fmt(p[3][1])} Z `;
}

/** Static ground geometry: two checker colours plus the slab's side faces. */
function buildGround() {
  let a = '';
  let b = '';
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if ((x + y) % 2 === 0) a += diamond(x, y);
      else b += diamond(x, y);
    }
  }
  const pt = (x: number, y: number, z: number) => project(x, y, z).map(fmt).join(' ');
  const left = `M${pt(0, N, 0)} L${pt(N, N, 0)} L${pt(N, N, -SLAB)} L${pt(0, N, -SLAB)} Z`;
  const right = `M${pt(N, 0, 0)} L${pt(N, N, 0)} L${pt(N, N, -SLAB)} L${pt(N, 0, -SLAB)} Z`;
  return { a, b, left, right };
}

/**
 * A placed item that springs up out of the ground. Shapes come from the parent
 * so path tiles can change shape (re-connect) without remounting or re-popping.
 * Dimmed while it is being dragged in the top view.
 */
const Building = memo(function Building({
  shapes,
  x,
  y,
  dragFrom,
}: {
  shapes: Shape[];
  x: number;
  y: number;
  dragFrom: SharedValue<number>;
}) {
  const [ox, oy] = project(x * TILE, y * TILE, 0);
  const index = y * GRID_SIZE + x;
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.set(withSpring(1, { stiffness: 260, damping: 11, mass: 0.7 }));
  }, [grow]);
  const transform = useDerivedValue(() => [
    { scaleX: 0.6 + 0.4 * grow.value },
    { scaleY: grow.value },
  ]);
  const opacity = useDerivedValue(() => (dragFrom.value === index ? 0.3 : 1));
  return (
    <Group transform={[{ translateX: ox }, { translateY: oy }]} opacity={opacity}>
      {/* grow from the tile's front corner so it rises out of the ground */}
      <Group origin={vec(0, TILE)} transform={transform}>
        {shapes.map((s, i) => (
          <Path key={i} path={s.d} color={s.color} />
        ))}
      </Group>
    </Group>
  );
});

/** The tile behind a token: rarity-tinted rounded square with a soft drop shadow. */
function TokenFace({ itemId }: { itemId: ItemId }) {
  const tint = RARITY_COLOR[getItem(itemId)?.rarity ?? 'common'];
  return (
    <>
      <RoundedRect x={0.1} y={0.35} width={TOKEN} height={TOKEN} r={1} color="rgba(30,50,30,0.18)" />
      <RoundedRect x={0} y={0} width={TOKEN} height={TOKEN} r={1} color={tint.light} />
      <RoundedRect x={0} y={0} width={TOKEN} height={TOKEN} r={1} style="stroke" strokeWidth={0.16} color={tint.main} />
      {/* The art stands on its token and may rise above it: bigger, so it reads at map size. */}
      <ItemArt id={itemId} x={-0.1 * TOKEN} y={-0.3 * TOKEN} width={1.2 * TOKEN} height={1.25 * TOKEN} />
    </>
  );
}

/** Top view: a building or prop as a flat token on its lot. Pops in when it lands. */
const Token = memo(function Token({
  itemId,
  x,
  y,
  dragFrom,
}: {
  itemId: ItemId;
  x: number;
  y: number;
  dragFrom: SharedValue<number>;
}) {
  const [cx, cy] = toTop(x * TILE + TILE / 2, y * TILE + TILE / 2);
  const index = y * GRID_SIZE + x;
  const pop = useSharedValue(0.75);
  useEffect(() => {
    pop.set(withSpring(1, { stiffness: 320, damping: 12, mass: 0.6 }));
  }, [pop]);
  const transform = useDerivedValue(() => [
    { translateX: cx },
    { translateY: cy },
    { scale: pop.value },
    { translateX: -TOKEN / 2 },
    { translateY: -TOKEN / 2 },
  ]);
  const opacity = useDerivedValue(() => (dragFrom.value === index ? 0.3 : 1));
  return (
    <Group transform={transform} opacity={opacity}>
      <TokenFace itemId={itemId} />
    </Group>
  );
});

/**
 * The player's isometric city: a GRID_SIZE×GRID_SIZE lawn drawn in one Skia canvas, with
 * camera pan (drag), zoom (pinch or the +/- buttons) and tile taps. The camera
 * lives in shared values and is applied as a Skia transform, so moving around
 * never re-renders React and stays sharp at any zoom.
 *
 * `view="top"` morphs the same drawing into a top-down editing view (one shared
 * value drives the ground transform and the cross-fade to tokens). There, a
 * press-and-hold on an object picks it up: drag it to another lot, drop it on a
 * taken lot to swap the two.
 */
export const CityMap = memo(
  forwardRef<CityMapHandle, Props>(function CityMap({ placed, selected, view, onTileTap, onMove }, ref) {
    const [size, setSize] = useState({ w: 0, h: 0 });
    const ground = useMemo(() => buildGround(), []);

    const tx = useSharedValue(0);
    const ty = useSharedValue(0);
    const zoom = useSharedValue(1);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const startZoom = useSharedValue(1);
    const pulse = useSharedValue(0.4);

    // 0 = isometric, 1 = top-down.
    const top = useSharedValue(view === 'top' ? 1 : 0);
    useEffect(() => {
      top.set(withSpring(view === 'top' ? 1 : 0, VIEW_SPRING));
    }, [view, top]);

    // Drag-to-move (top view): which lot is lifted, where the finger is, which lot it's over.
    const dragFrom = useSharedValue(-1);
    const hover = useSharedValue(-1);
    const dragX = useSharedValue(0);
    const dragY = useSharedValue(0);
    const lift = useSharedValue(0);
    const [dragItem, setDragItem] = useState<ItemId | null>(null);

    // Which lots are taken, readable from gesture worklets.
    const occupied = useSharedValue<number[]>([]);
    useEffect(() => {
      const lots = new Array<number>(GRID_SIZE * GRID_SIZE).fill(0);
      for (const p of placed) lots[p.y * GRID_SIZE + p.x] = 1;
      occupied.set(lots);
    }, [placed, occupied]);

    useEffect(() => {
      pulse.set(
        withRepeat(
          withSequence(withTiming(0.85, { duration: 600 }), withTiming(0.35, { duration: 600 })),
          -1,
        ),
      );
    }, [pulse]);

    // Fit the whole lawn (plus room for tall buildings) into the view.
    const fit = useMemo(() => {
      const worldW = 2 * GRID_SIZE * TILE * C;
      const worldH = GRID_SIZE * TILE + SLAB + 10;
      const unit = size.w > 0 ? Math.min((size.w * 0.94) / worldW, (size.h * 0.86) / worldH) : 1;
      return {
        unit,
        ox: size.w / 2,
        oy: (size.h - (GRID_SIZE * TILE + SLAB) * unit) / 2 + 4 * unit,
      };
    }, [size]);

    const camera = useDerivedValue(() => [
      { translateX: size.w / 2 + tx.value },
      { translateY: size.h / 2 + ty.value },
      { scale: zoom.value },
      { translateX: -size.w / 2 },
      { translateY: -size.h / 2 },
    ]);

    // The lawn (and everything flat on it) lies down: scale Y by √3, turn −45°, zoom in, around the centre.
    const groundMorph = useDerivedValue(() => [
      { translateY: N / 2 },
      { scale: 1 + (TOP_ZOOM - 1) * top.value },
      { rotate: (-Math.PI / 4) * top.value },
      { scaleY: 1 + (Math.sqrt(3) - 1) * top.value },
      { translateY: -N / 2 },
    ]);
    const isoLayer = useDerivedValue(() => interpolate(top.value, [0, 0.45], [1, 0], 'clamp'));
    const sideFaces = useDerivedValue(() => interpolate(top.value, [0, 0.6], [1, 0], 'clamp'));
    const tokenLayer = useDerivedValue(() => interpolate(top.value, [0.5, 1], [0, 1], 'clamp'));

    useImperativeHandle(
      ref,
      () => ({
        zoomBy: (f) => {
          zoom.set(withSpring(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value * f)), CAMERA_SPRING));
        },
        recenter: () => {
          tx.set(withSpring(0, CAMERA_SPRING));
          ty.set(withSpring(0, CAMERA_SPRING));
          zoom.set(withSpring(1, CAMERA_SPRING));
        },
      }),
      [tx, ty, zoom],
    );

    const clampPan = (v: number, extent: number) => {
      'worklet';
      const limit = extent * 0.5 * zoom.value;
      return Math.min(limit, Math.max(-limit, v));
    };

    /** Screen point → drawing coordinates: undo the camera, then the fit. */
    const toLocal = (x: number, y: number): [number, number] => {
      'worklet';
      const qx = (x - size.w / 2 - tx.value) / zoom.value + size.w / 2;
      const qy = (y - size.h / 2 - ty.value) / zoom.value + size.h / 2;
      return [(qx - fit.ox) / fit.unit, (qy - fit.oy) / fit.unit];
    };

    const pan = usePanGesture({
      minDistance: 6,
      onBegin: () => {
        'worklet';
        startX.set(tx.value);
        startY.set(ty.value);
      },
      onUpdate: (e) => {
        'worklet';
        tx.set(clampPan(startX.value + e.translationX, size.w));
        ty.set(clampPan(startY.value + e.translationY, size.h));
      },
      onDeactivate: (e) => {
        'worklet';
        // A short glide in the flick direction, then settle.
        tx.set(withSpring(clampPan(tx.value + e.velocityX * 0.08, size.w), CAMERA_SPRING));
        ty.set(withSpring(clampPan(ty.value + e.velocityY * 0.08, size.h), CAMERA_SPRING));
      },
    });

    const pinch = usePinchGesture({
      onBegin: () => {
        'worklet';
        startZoom.set(zoom.value);
      },
      onUpdate: (e) => {
        'worklet';
        // Soft limits: you can push a little past min/max, it springs back on release.
        const raw = startZoom.value * e.scale;
        const lo = MIN_ZOOM * 0.85;
        const hi = MAX_ZOOM * 1.15;
        zoom.set(Math.min(hi, Math.max(lo, raw)));
      },
      onDeactivate: () => {
        'worklet';
        zoom.set(withSpring(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value)), CAMERA_SPRING));
      },
    });

    const tap = useTapGesture({
      maxDistance: 10,
      onActivate: (e) => {
        'worklet';
        const [lx, ly] = toLocal(e.x, e.y);
        scheduleOnRN(resolveTap, lx, ly, top.value > 0.5);
      },
    });

    // Top view only: hold still on an object to pick it up, then drag. Moving
    // before the hold lets the camera pan win instead (competing gestures).
    const drag = usePanGesture({
      enabled: view === 'top',
      activateAfterLongPress: 280,
      onActivate: (e) => {
        'worklet';
        const [lx, ly] = toLocal(e.x, e.y);
        const lot = topCell(lx, ly);
        if (lot >= 0 && occupied.value[lot] === 1) {
          dragFrom.set(lot);
          hover.set(lot);
          dragX.set(lx);
          dragY.set(ly);
          lift.set(withSpring(1, { stiffness: 380, damping: 18 }));
          scheduleOnRN(beginDrag, lot);
        } else {
          // Long press on bare lawn: behave like a normal camera drag.
          dragFrom.set(-1);
          startX.set(tx.value - e.translationX);
          startY.set(ty.value - e.translationY);
        }
      },
      onUpdate: (e) => {
        'worklet';
        if (dragFrom.value < 0) {
          tx.set(clampPan(startX.value + e.translationX, size.w));
          ty.set(clampPan(startY.value + e.translationY, size.h));
          return;
        }
        const [lx, ly] = toLocal(e.x, e.y);
        dragX.set(lx);
        dragY.set(ly);
        const lot = topCell(lx, ly);
        if (lot !== hover.value) {
          hover.set(lot);
          scheduleOnRN(haptic.tick);
        }
      },
      onDeactivate: (e) => {
        'worklet';
        if (dragFrom.value < 0) return;
        const from = dragFrom.value;
        const to = e.canceled ? -1 : hover.value;
        dragFrom.set(-1);
        lift.set(withSpring(0, { stiffness: 380, damping: 22 }));
        scheduleOnRN(endDrag, from, to);
      },
    });

    const gesture = useCompetingGestures(drag, tap, useSimultaneousGestures(pan, pinch));

    function beginDrag(lot: number) {
      const item = placed.find((p) => p.y * GRID_SIZE + p.x === lot);
      if (!item) return;
      haptic.medium();
      setDragItem(item.itemId);
    }

    function endDrag(from: number, to: number) {
      setDragItem(null);
      if (to < 0) {
        haptic.warning();
        return;
      }
      if (to === from) return;
      onMove(from % GRID_SIZE, Math.floor(from / GRID_SIZE), to % GRID_SIZE, Math.floor(to / GRID_SIZE));
    }

    // Buildings are tall, so a tap on a roof should hit that building rather
    // than the ground tile behind it. Check buildings front-to-back first.
    function resolveTap(lx: number, ly: number, topView: boolean) {
      if (topView) {
        const lot = topCell(lx, ly);
        onTileTap(lot < 0 ? -1 : lot % GRID_SIZE, lot < 0 ? -1 : Math.floor(lot / GRID_SIZE));
        return;
      }
      const front = [...placed].sort((p, q) => q.x + q.y - (p.x + p.y));
      for (const p of front) {
        const [cx, cy] = project(p.x * TILE + TILE / 2, p.y * TILE + TILE / 2, 0);
        const h = getItemArt(p.itemId).height;
        if (Math.abs(lx - cx) <= TILE * C * 0.8 && ly <= cy + TILE / 2 && ly >= cy - TILE / 2 - h) {
          onTileTap(p.x, p.y);
          return;
        }
      }
      const X = (lx / C + 2 * ly) / 2;
      const Y = (2 * ly - lx / C) / 2;
      const gx = Math.floor(X / TILE);
      const gy = Math.floor(Y / TILE);
      const inside = gx >= 0 && gy >= 0 && gx < GRID_SIZE && gy < GRID_SIZE;
      onTileTap(inside ? gx : -1, inside ? gy : -1);
    }

    // Back-to-front, with each path tile shaped by its walkable neighbours.
    // Paths are flat, so they ride the ground morph; everything else fades to tokens.
    const { paths, objects } = useMemo(() => {
      const city = { city: placed };
      const sorted = [...placed].sort((p, q) => p.x + p.y - (q.x + q.y) || p.x - q.x);
      return {
        paths: sorted
          .flatMap((p) =>
            isPathId(p.itemId) ? [{ ...p, shapes: getPathShapes(p.itemId, pathMask(city, p.x, p.y)) }] : [],
          ),
        objects: sorted
          .filter((p) => !isPathId(p.itemId))
          .map((p) => ({ ...p, shapes: getItemArt(p.itemId).shapes })),
      };
    }, [placed]);
    const selPath = selected ? diamond(selected.x, selected.y) : null;

    // The lifted object follows the finger; the lot under it is outlined
    // green (free), blue (swap) or red (off the lawn).
    const liftTransform = useDerivedValue(() => [
      { translateX: dragX.value },
      // Held a little above the finger, so the outlined target lot stays visible.
      { translateY: dragY.value - 0.6 * TOKEN * lift.value },
      { scale: 1 + 0.18 * lift.value },
      { translateX: -TOKEN / 2 },
      { translateY: -TOKEN / 2 },
    ]);
    const hoverTransform = useDerivedValue(() => {
      const lot = Math.max(0, hover.value);
      const [cx, cy] = toTop((lot % GRID_SIZE) * TILE + TILE / 2, Math.floor(lot / GRID_SIZE) * TILE + TILE / 2);
      return [{ translateX: cx - (TILE * K) / 2 }, { translateY: cy - (TILE * K) / 2 }];
    });
    const hoverColor = useDerivedValue(() =>
      hover.value < 0
        ? colors.danger.DEFAULT
        : hover.value !== dragFrom.value && occupied.value[hover.value] === 1
          ? colors.sky.DEFAULT
          : colors.primary.DEFAULT,
    );
    const hoverOpacity = useDerivedValue(() => (hover.value < 0 ? 0 : 1));

    return (
      <GestureDetector gesture={gesture}>
        <View
          testID="city-map"
          className="flex-1"
          onLayout={(e: LayoutChangeEvent) =>
            setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
          }
        >
          {size.w > 0 && (
            <Canvas style={{ width: size.w, height: size.h }}>
              <Group transform={camera}>
                <Group transform={[{ translateX: fit.ox }, { translateY: fit.oy }, { scale: fit.unit }]}>
                  <Group transform={groundMorph}>
                    <Group opacity={sideFaces}>
                      <Path path={ground.left} color={shade(SOIL, 0.08)} />
                      <Path path={ground.right} color={shade(SOIL, -0.15)} />
                    </Group>
                    <Path path={ground.a} color={GRASS_A} />
                    <Path path={ground.b} color={GRASS_B} />
                    {paths.map((p) => (
                      <Building key={`${p.x}-${p.y}-${p.itemId}`} shapes={p.shapes} x={p.x} y={p.y} dragFrom={dragFrom} />
                    ))}
                    {selPath && (
                      <>
                        <Path path={selPath} color="#FFFFFF" opacity={pulse} />
                        <Path path={selPath} style="stroke" strokeWidth={0.35} color="#FF8A3C" />
                      </>
                    )}
                  </Group>

                  <Group opacity={isoLayer}>
                    {objects.map((p) => (
                      <Building key={`${p.x}-${p.y}-${p.itemId}`} shapes={p.shapes} x={p.x} y={p.y} dragFrom={dragFrom} />
                    ))}
                  </Group>

                  <Group opacity={tokenLayer}>
                    {objects.map((p) => (
                      <Token key={`t${p.x}-${p.y}-${p.itemId}`} itemId={p.itemId} x={p.x} y={p.y} dragFrom={dragFrom} />
                    ))}
                  </Group>

                  {dragItem && (
                    <>
                      <Group transform={hoverTransform} opacity={hoverOpacity}>
                        <RoundedRect
                          x={0.15}
                          y={0.15}
                          width={TILE * K - 0.3}
                          height={TILE * K - 0.3}
                          r={1.1}
                          style="stroke"
                          strokeWidth={0.45}
                          color={hoverColor}
                        />
                      </Group>
                      <Group transform={liftTransform}>
                        <TokenFace itemId={dragItem} />
                      </Group>
                    </>
                  )}
                </Group>
              </Group>
            </Canvas>
          )}
        </View>
      </GestureDetector>
    );
  }),
);
