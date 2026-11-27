import { Canvas, Path, Skia, type SkPath, type SkPathBuilder } from '@shopify/react-native-skia';
import React, { memo, useMemo } from 'react';

import { cellsOf, getItem } from '../../data/items';
import { RARITY_COLOR } from '../../data/rarity';
import { GRID_SIZE, type Placed } from '../../state/gameLogic';
import { colors } from '../../theme/tokens';

interface Props {
  /** null while the city's tiles aren't known on this phone: the lawn alone. */
  placed: readonly Placed[] | null;
  width: number;
  height: number;
}

/**
 * A city at a glance for the switcher: the lawn as a flat iso diamond, every
 * covered lot one colour (paths sandy, everything else by rarity). Lots are
 * merged into one Skia path per colour, so a full city is ~6 draw calls with no
 * item art: cheap enough for a whole list of cities.
 */
export const MiniMap = memo(function MiniMap({ placed, width, height }: Props) {
  const { lawn, layers } = useMemo(() => {
    // 2:1 iso: the 16×16 lawn is 32 half-tiles wide and 16 tall.
    const tw = Math.min(width / (GRID_SIZE * 2), height / GRID_SIZE);
    const ox = width / 2;
    const oy = (height - GRID_SIZE * tw) / 2;
    const pt = (x: number, y: number) => [ox + (x - y) * tw, oy + ((x + y) * tw) / 2] as const;
    const diamond = (b: SkPathBuilder, x: number, y: number, w = 1, d = 1) => {
      b.moveTo(...pt(x, y)).lineTo(...pt(x + w, y)).lineTo(...pt(x + w, y + d)).lineTo(...pt(x, y + d)).close();
    };

    const lawnPath = Skia.PathBuilder.Make();
    diamond(lawnPath, 0, 0, GRID_SIZE, GRID_SIZE);

    const byColor = new Map<string, SkPathBuilder>();
    for (const p of placed ?? []) {
      const item = getItem(p.itemId);
      if (!item) continue;
      const color = item.kind === 'path' ? colors.butter.deep : RARITY_COLOR[item.rarity].main;
      let b = byColor.get(color);
      if (!b) byColor.set(color, (b = Skia.PathBuilder.Make()));
      for (const [dx, dy] of cellsOf(p.itemId)) diamond(b, p.x + dx, p.y + dy);
    }
    return {
      lawn: lawnPath.detach(),
      layers: [...byColor].map(([color, b]): [string, SkPath] => [color, b.detach()]),
    };
  }, [placed, width, height]);

  return (
    <Canvas style={{ width, height }}>
      <Path path={lawn} color={placed ? colors.mint.deep : colors.line} />
      {layers.map(([color, path]) => (
        <Path key={color} path={path} color={color} />
      ))}
    </Canvas>
  );
});
