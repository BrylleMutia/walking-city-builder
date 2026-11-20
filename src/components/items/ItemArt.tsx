import { Group, Path } from '@shopify/react-native-skia';
import React, { memo, useMemo } from 'react';

import type { ItemId } from '../../data/sets/types';
import { project } from './iso';
import { getItemArt } from './itemShapes';

interface Props {
  id: ItemId;
  /** Box (in canvas coordinates) the illustration is fitted into. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Iso units per lot (the drawings use a 4×4 footprint per lot). */
const LOT = 4;
const COS30 = 0.8660254;
/** Breathing room around the footprint, in iso units. */
const MARGIN_W = 0.5;
/** Slab thickness plus the contact shadow below it. */
const BELOW = 0.55;

/**
 * Draws an item's isometric illustration. Must be rendered inside a Skia
 * <Canvas>. The shapes live in tile units, so one group transform scales the
 * whole drawing to fit the requested box. Multi-lot items are fitted by their
 * whole footprint, so a 3×2 theater shows smaller than a 1×1 lamp: its size
 * is part of what the card says.
 */
export const ItemArt = memo(function ItemArt({ id, x, y, width, height }: Props) {
  const art = getItemArt(id);
  const W = art.size[0] * LOT;
  const D = art.size[1] * LOT;

  const { transform, shadow } = useMemo(() => {
    // The footprint diamond spans x from −D·cos30 to W·cos30 and y from 0 to (W + D)/2.
    const spanW = (W + D) * COS30 + MARGIN_W * 2;
    const spanH = art.height + (W + D) / 2 + BELOW;
    const unit = Math.min(width / spanW, height / spanH);
    const centreX = ((W - D) / 2) * COS30;
    const originX = x + width / 2 - centreX * unit;
    const originY = y + (height - spanH * unit) / 2 + art.height * unit;
    const pt = (px: number, py: number) => {
      const [sx, sy] = project(px, py, 0);
      return `${sx.toFixed(2)} ${(sy + 0.4).toFixed(2)}`;
    };
    return {
      transform: [{ translateX: originX }, { translateY: originY }, { scale: unit }],
      // contact shadow under the slab: the footprint's bounding diamond, nudged down
      shadow: `M${pt(0, 0)} L${pt(W, 0)} L${pt(W, D)} L${pt(0, D)} Z`,
    };
  }, [art.height, W, D, x, y, width, height]);

  return (
    <Group transform={transform}>
      <Path path={shadow} color="rgba(30,20,10,0.16)" />
      {art.pieces.map((piece, p) =>
        piece.shapes.map((s, i) => <Path key={`${p}-${i}`} path={s.d} color={s.color} />),
      )}
    </Group>
  );
});
