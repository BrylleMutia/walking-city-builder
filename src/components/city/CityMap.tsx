import { Canvas, Group, Path, vec } from '@shopify/react-native-skia';
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
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { GRID_SIZE, pathMask, type Placed } from '../../state/gameLogic';
import { project, shade, type Shape } from '../items/iso';
import { getItemArt } from '../items/itemShapes';
import { getPathShapes, isPathId } from '../items/pathShapes';

/** One grid tile spans this many iso units (the item drawings use a 4×4 footprint). */
const TILE = 4;
const C = 0.8660254;
const SLAB = 1.6;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.6;
const CAMERA_SPRING = { stiffness: 220, damping: 24, mass: 0.8 } as const;

const GRASS_A = '#A3DC86';
const GRASS_B = '#96D479';
const SOIL = '#C79B6B';

export interface CityMapHandle {
  zoomBy: (factor: number) => void;
  recenter: () => void;
}

interface Props {
  placed: Placed[];
  selected: { x: number; y: number } | null;
  /** Grid tile that was tapped (may be outside the grid → -1). */
  onTileTap: (x: number, y: number) => void;
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
  const N = GRID_SIZE * TILE;
  const pt = (x: number, y: number, z: number) => project(x, y, z).map(fmt).join(' ');
  const left = `M${pt(0, N, 0)} L${pt(N, N, 0)} L${pt(N, N, -SLAB)} L${pt(0, N, -SLAB)} Z`;
  const right = `M${pt(N, 0, 0)} L${pt(N, N, 0)} L${pt(N, N, -SLAB)} L${pt(N, 0, -SLAB)} Z`;
  return { a, b, left, right };
}

/** A building that springs up out of the ground when it's placed. */
/**
 * A placed item that springs up out of the ground. Shapes come from the parent
 * so path tiles can change shape (re-connect) without remounting or re-popping.
 */
const Building = memo(function Building({ shapes, x, y }: { shapes: Shape[]; x: number; y: number }) {
  const [ox, oy] = project(x * TILE, y * TILE, 0);
  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = withSpring(1, { stiffness: 260, damping: 11, mass: 0.7 });
  }, [grow]);
  const transform = useDerivedValue(() => [
    { scaleX: 0.6 + 0.4 * grow.value },
    { scaleY: grow.value },
  ]);
  return (
    <Group transform={[{ translateX: ox }, { translateY: oy }]}>
      {/* grow from the tile's front corner so it rises out of the ground */}
      <Group origin={vec(0, TILE)} transform={transform}>
        {shapes.map((s, i) => (
          <Path key={i} path={s.d} color={s.color} />
        ))}
      </Group>
    </Group>
  );
});

/**
 * The player's isometric city: an 8×8 lawn drawn in one Skia canvas, with
 * camera pan (drag), zoom (pinch or the +/- buttons) and tile taps. The camera
 * lives in shared values and is applied as a Skia transform, so moving around
 * never re-renders React and stays sharp at any zoom.
 */
export const CityMap = memo(
  forwardRef<CityMapHandle, Props>(function CityMap({ placed, selected, onTileTap }, ref) {
    const [size, setSize] = useState({ w: 0, h: 0 });
    const ground = useMemo(buildGround, []);

    const tx = useSharedValue(0);
    const ty = useSharedValue(0);
    const zoom = useSharedValue(1);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const startZoom = useSharedValue(1);
    const pulse = useSharedValue(0.4);

    useEffect(() => {
      pulse.value = withRepeat(
        withSequence(withTiming(0.85, { duration: 600 }), withTiming(0.35, { duration: 600 })),
        -1,
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

    useImperativeHandle(
      ref,
      () => ({
        zoomBy: (f) => {
          zoom.value = withSpring(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value * f)), CAMERA_SPRING);
        },
        recenter: () => {
          tx.value = withSpring(0, CAMERA_SPRING);
          ty.value = withSpring(0, CAMERA_SPRING);
          zoom.value = withSpring(1, CAMERA_SPRING);
        },
      }),
      [tx, ty, zoom],
    );

    const clampPan = (v: number, extent: number) => {
      'worklet';
      const limit = extent * 0.5 * zoom.value;
      return Math.min(limit, Math.max(-limit, v));
    };

    const pan = usePanGesture({
      minDistance: 6,
      onBegin: () => {
        'worklet';
        startX.value = tx.value;
        startY.value = ty.value;
      },
      onUpdate: (e) => {
        'worklet';
        tx.value = clampPan(startX.value + e.translationX, size.w);
        ty.value = clampPan(startY.value + e.translationY, size.h);
      },
      onDeactivate: (e) => {
        'worklet';
        // A short glide in the flick direction, then settle.
        tx.value = withSpring(clampPan(tx.value + e.velocityX * 0.08, size.w), CAMERA_SPRING);
        ty.value = withSpring(clampPan(ty.value + e.velocityY * 0.08, size.h), CAMERA_SPRING);
      },
    });

    const pinch = usePinchGesture({
      onBegin: () => {
        'worklet';
        startZoom.value = zoom.value;
      },
      onUpdate: (e) => {
        'worklet';
        // Soft limits: you can push a little past min/max, it springs back on release.
        const raw = startZoom.value * e.scale;
        const lo = MIN_ZOOM * 0.85;
        const hi = MAX_ZOOM * 1.15;
        zoom.value = Math.min(hi, Math.max(lo, raw));
      },
      onDeactivate: () => {
        'worklet';
        zoom.value = withSpring(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value)), CAMERA_SPRING);
      },
    });

    const tap = useTapGesture({
      maxDistance: 10,
      onActivate: (e) => {
        'worklet';
        // Undo the camera, then the fit, then the isometric projection.
        const qx = (e.x - size.w / 2 - tx.value) / zoom.value + size.w / 2;
        const qy = (e.y - size.h / 2 - ty.value) / zoom.value + size.h / 2;
        const lx = (qx - fit.ox) / fit.unit;
        const ly = (qy - fit.oy) / fit.unit;
        scheduleOnRN(resolveTap, lx, ly);
      },
    });

    const gesture = useCompetingGestures(tap, useSimultaneousGestures(pan, pinch));

    // Buildings are tall, so a tap on a roof should hit that building rather
    // than the ground tile behind it. Check buildings front-to-back first.
    function resolveTap(lx: number, ly: number) {
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
    const drawList = useMemo(() => {
      const city = { city: placed };
      return [...placed]
        .sort((p, q) => p.x + p.y - (q.x + q.y) || p.x - q.x)
        .map((p) => ({
          ...p,
          shapes: isPathId(p.itemId)
            ? getPathShapes(p.itemId, pathMask(city, p.x, p.y))
            : getItemArt(p.itemId).shapes,
        }));
    }, [placed]);
    const selPath = selected ? diamond(selected.x, selected.y) : null;

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
                  <Path path={ground.left} color={shade(SOIL, 0.08)} />
                  <Path path={ground.right} color={shade(SOIL, -0.15)} />
                  <Path path={ground.a} color={GRASS_A} />
                  <Path path={ground.b} color={GRASS_B} />
                  {selPath && (
                    <>
                      <Path path={selPath} color="#FFFFFF" opacity={pulse} />
                      <Path path={selPath} style="stroke" strokeWidth={0.35} color="#FF8A3C" />
                    </>
                  )}
                  {drawList.map((p) => (
                    <Building key={`${p.x}-${p.y}-${p.itemId}`} shapes={p.shapes} x={p.x} y={p.y} />
                  ))}
                </Group>
              </Group>
            </Canvas>
          )}
        </View>
      </GestureDetector>
    );
  }),
);
