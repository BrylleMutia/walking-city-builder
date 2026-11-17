import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors } from '../../theme/tokens';

interface Props {
  size: number;
  stroke?: number;
  /** 0..1; values above 1 are shown as a full ring. */
  progress: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}

/** Circular progress that eases to its new value whenever `progress` changes. */
export function ProgressRing({
  size,
  stroke = 10,
  progress,
  color = colors.primary.DEFAULT,
  track = colors.line,
  children,
}: Props) {
  const path = useMemo(() => {
    const r = (size - stroke) / 2;
    const p = Skia.PathBuilder.Make();
    // Start at 12 o'clock and go clockwise.
    p.addArc({ x: stroke / 2, y: stroke / 2, width: r * 2, height: r * 2 }, -90, 359.999);
    return p.build();
  }, [size, stroke]);

  const end = useSharedValue(0);
  useEffect(() => {
    end.value = withTiming(Math.min(1, Math.max(0, progress)), {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, end]);

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Canvas style={{ position: 'absolute', width: size, height: size }}>
        <Path path={path} style="stroke" strokeWidth={stroke} color={track} />
        <Path path={path} style="stroke" strokeWidth={stroke} strokeCap="round" color={color} start={0} end={end} />
      </Canvas>
      {children}
    </View>
  );
}
