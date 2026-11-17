import { Group, Path } from '@shopify/react-native-skia';
import React, { memo, useMemo } from 'react';

import type { ItemId } from '../../data/sets/cozyDowntown';
import { getItemArt } from './itemShapes';

interface Props {
  id: ItemId;
  /** Box (in canvas coordinates) the illustration is fitted into. */
  x: number;
  y: number;
  width: number;
  height: number;
}

// Projected width of the 4×4 footprint, in tile units (8 · cos30) plus a margin.
const FOOTPRINT_W = 7.4;
// Projected depth of the footprint plus the slab thickness.
const FOOTPRINT_H = 4.35;

/**
 * Draws an item's isometric illustration. Must be rendered inside a Skia
 * <Canvas>. The shapes live in tile units, so one group transform scales the
 * whole drawing to fit the requested box.
 */
export const ItemArt = memo(function ItemArt({ id, x, y, width, height }: Props) {
  const art = getItemArt(id);

  const transform = useMemo(() => {
    const totalH = art.height + FOOTPRINT_H;
    const unit = Math.min(width / FOOTPRINT_W, height / totalH);
    const originX = x + width / 2;
    const originY = y + (height - totalH * unit) / 2 + art.height * unit;
    return [{ translateX: originX }, { translateY: originY }, { scale: unit }];
  }, [art.height, x, y, width, height]);

  return (
    <Group transform={transform}>
      {/* contact shadow under the slab */}
      <Path
        path="M-3.6 2.45 L0 4.55 L3.6 2.45 L0 0.4 Z"
        color="rgba(30,20,10,0.16)"
      />
      {art.shapes.map((s, i) => (
        <Path key={i} path={s.d} color={s.color} />
      ))}
    </Group>
  );
});
