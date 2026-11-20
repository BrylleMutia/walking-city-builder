import { Canvas, Group, ImageSVG, useSVG } from '@shopify/react-native-skia';
import React, { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/** The Wood currency icon (assets/log-currency.svg, viewBox 0 0 256 256). */
const LOG_SVG = require('../../../assets/log-currency.svg');
const VB = 256;

/**
 * The Wood currency icon, drawn by Skia. ImageSVG doesn't rescale the file's
 * viewBox (see HomeHeroArt), so it's drawn at native size inside a scaled Group.
 */
export const WoodIcon = memo(function WoodIcon({ size = 24, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const svg = useSVG(LOG_SVG);
  return (
    <Canvas style={[{ width: size, height: size }, style]}>
      {svg && (
        <Group transform={[{ scale: size / VB }]}>
          <ImageSVG svg={svg} x={0} y={0} width={VB} height={VB} />
        </Group>
      )}
    </Canvas>
  );
});
