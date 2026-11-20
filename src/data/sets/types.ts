import type { Rarity } from '../rarity';
import type { CozyDowntownId } from './cozyDowntown';
import type { NeonHarborId } from './neonHarbor';

/** Every item id of every playable set. Item ids are unique across sets (the server keys items by id). */
export type ItemId = CozyDowntownId | NeonHarborId;

/**
 * - path: ground infrastructure (streets, sidewalks, lawns). Walkable, auto-connects
 *   to neighbouring paths, and comes in bundles of several tiles per card.
 * - prop: small street furniture (lamps, benches).
 * - building: everything with walls.
 */
export type ItemKind = 'path' | 'prop' | 'building';

export interface ItemDef {
  id: ItemId;
  name: string;
  rarity: Rarity;
  kind: ItemKind;
  flavor: string;
  /**
   * Lots the item covers on the city grid, as a mask: one string per row (+y,
   * screen down-left), one character per column (+x, screen down-right), `#`
   * covered, `.` free. Row 0 col 0 is the anchor the object is stored at, and
   * must be covered. Items don't rotate. Must match the server's `items.cells`.
   */
  shape: readonly string[];
  /** City tiles granted per card pulled (bundles for paths). Defaults to 1. */
  tilesPerCard?: number;
  /** Townsfolk can walk on it (future NPCs path along these tiles). */
  walkable?: boolean;
}

export interface CardSet {
  id: string;
  name: string;
  tagline: string;
  /** Wrapper palette, top → bottom. */
  wrapper: {
    gradient: [string, string, string];
    skyline: string;
    skylineFar: string;
    window: string;
    ink: string;
    sun: string;
  };
  items: ItemDef[];
}
