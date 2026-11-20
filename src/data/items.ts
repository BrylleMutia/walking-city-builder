import { PLAYABLE_SETS } from './sets';
import type { CardSet, ItemDef, ItemId } from './sets/types';

/** Every item from every playable set, by id. */
const ITEM_INDEX = new Map<ItemId, ItemDef>(PLAYABLE_SETS.flatMap((set) => set.items.map((i) => [i.id, i] as const)));
/** Which set each item belongs to. */
const SET_OF = new Map<ItemId, CardSet>(PLAYABLE_SETS.flatMap((set) => set.items.map((i) => [i.id, set] as const)));

/** Every item of every playable set, in set order. */
export const ALL_ITEMS: readonly ItemDef[] = PLAYABLE_SETS.flatMap((set) => set.items);

export function setOf(id: ItemId): CardSet | undefined {
  return SET_OF.get(id);
}

export function getItem(id: ItemId): ItemDef | undefined {
  return ITEM_INDEX.get(id);
}

export function isWalkable(id: ItemId): boolean {
  return ITEM_INDEX.get(id)?.walkable === true;
}

export function tilesPerCard(id: ItemId): number {
  return ITEM_INDEX.get(id)?.tilesPerCard ?? 1;
}

/** A lot offset from an object's anchor: [dx (+x), dy (+y)]. */
export type Cell = readonly [dx: number, dy: number];

const ONE: readonly Cell[] = [[0, 0]];
const CELLS = new Map<ItemId, readonly Cell[]>();

/** The lots an item covers, relative to its anchor (from its `shape` mask). */
export function cellsOf(id: ItemId): readonly Cell[] {
  let cells = CELLS.get(id);
  if (!cells) {
    const shape = ITEM_INDEX.get(id)?.shape;
    const out: Cell[] = [];
    shape?.forEach((row, dy) => [...row].forEach((ch, dx) => ch === '#' && out.push([dx, dy])));
    cells = out.length > 0 ? out : ONE;
    CELLS.set(id, cells);
  }
  return cells;
}

/** Bounding box of an item's footprint in lots: [w (along x), d (along y)]. */
export function sizeOf(id: ItemId): [w: number, d: number] {
  let w = 1;
  let d = 1;
  for (const [dx, dy] of cellsOf(id)) {
    w = Math.max(w, dx + 1);
    d = Math.max(d, dy + 1);
  }
  return [w, d];
}

/** Two items cover the same shape (swapping them keeps the city valid). */
export function sameFootprint(a: ItemId, b: ItemId): boolean {
  const ca = cellsOf(a);
  const cb = cellsOf(b);
  return ca.length === cb.length && ca.every(([x, y], i) => cb[i][0] === x && cb[i][1] === y);
}

/** Short size label for the inventory: "2×1", or "L" style shapes by cell count. */
export function footprintLabel(id: ItemId): string | null {
  const cells = cellsOf(id);
  if (cells.length === 1) return null;
  const [w, d] = sizeOf(id);
  return cells.length === w * d ? `${w}×${d}` : `${cells.length} lots`;
}
