import { cozyDowntown, type ItemDef, type ItemId } from './sets/cozyDowntown';

/** Every item from every playable set, by id. */
const ITEM_INDEX = new Map<ItemId, ItemDef>(cozyDowntown.items.map((i) => [i.id, i]));

export function getItem(id: ItemId): ItemDef | undefined {
  return ITEM_INDEX.get(id);
}

export function isWalkable(id: ItemId): boolean {
  return ITEM_INDEX.get(id)?.walkable === true;
}

export function tilesPerCard(id: ItemId): number {
  return ITEM_INDEX.get(id)?.tilesPerCard ?? 1;
}
