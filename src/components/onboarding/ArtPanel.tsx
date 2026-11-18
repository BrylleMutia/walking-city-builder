import { Canvas, Group, Rect, Skia } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { View } from 'react-native';

/** How far the middle of the bottom edge hangs below its ends, as a share of the width. */
const CURVE = 0.09;

/**
 * The coloured illustration area of an onboarding screen: full width, with a
 * bottom edge that bulges downward in a shallow arc (the white text area
 * below shows through at the corners).
 *
 * `children` are Skia elements drawn inside the shape; `overlay` is ordinary
 * React Native content centred on top of it.
 */
export function ArtPanel({
  width,
  height,
  color,
  children,
  overlay,
}: {
  width: number;
  height: number;
  color: string;
  children?: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  const clip = useMemo(() => {
    const c = width * CURVE;
    // A quadratic through (0, h-c) and (w, h-c) whose control point sits at
    // h+c reaches exactly h in the middle.
    return Skia.Path.MakeFromSVGString(
      `M0 0 H${width} V${height - c} Q${width / 2} ${height + c} 0 ${height - c} Z`,
    );
  }, [width, height]);

  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        {clip && (
          <Group clip={clip}>
            <Rect x={0} y={0} width={width} height={height} color={color} />
            {children}
          </Group>
        )}
      </Canvas>
      {overlay && (
        <View className="absolute inset-0 items-center justify-center" pointerEvents="box-none">
          {overlay}
        </View>
      )}
    </View>
  );
}
