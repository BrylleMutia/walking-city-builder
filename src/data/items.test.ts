import { cellsOf, footprintLabel, sameFootprint, sizeOf } from './items';

// Must match the server's items.cells (migration item_footprints).
describe('item footprints', () => {
  it('reads every shape mask into lots', () => {
    expect(cellsOf('lamp-post')).toEqual([[0, 0]]);
    expect(cellsOf('brick-townhouse')).toEqual([[0, 0], [0, 1]]);
    expect(cellsOf('bakery')).toEqual([[0, 0], [1, 0]]);
    expect(cellsOf('bookshop')).toEqual([[0, 0], [1, 0]]);
    expect(cellsOf('corner-cafe')).toEqual([[0, 0], [1, 0], [0, 1]]);
    expect(cellsOf('fountain-plaza')).toEqual([[0, 0], [1, 0], [0, 1], [1, 1]]);
    expect(cellsOf('grand-theater')).toEqual([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]);
  });

  it('knows sizes, labels and matching shapes', () => {
    expect(sizeOf('grand-theater')).toEqual([3, 2]);
    expect(sizeOf('brick-townhouse')).toEqual([1, 2]);
    expect(footprintLabel('lamp-post')).toBeNull();
    expect(footprintLabel('bakery')).toBe('2×1');
    expect(footprintLabel('corner-cafe')).toBe('3 lots');
    expect(sameFootprint('bakery', 'bookshop')).toBe(true);
    expect(sameFootprint('bakery', 'brick-townhouse')).toBe(false);
  });
});

describe('Neon Harbor (Series 2)', () => {
  it('pins the new footprint shapes (must match the server)', () => {
    expect(cellsOf('neon-diner')).toEqual([[0, 0], [1, 0], [1, 1]]); // mirrored L, notch front-left
    expect(cellsOf('retro-arcade')).toEqual([[0, 0], [1, 0], [2, 0]]);
    expect(cellsOf('boathouse')).toEqual([[0, 0], [0, 1]]);
    expect(cellsOf('fish-market')).toEqual([[0, 0], [1, 0]]);
    expect(cellsOf('cargo-crane')).toEqual([[0, 0], [1, 0], [0, 1], [1, 1]]);
    expect(sizeOf('ferris-wheel')).toEqual([2, 3]);
    expect(cellsOf('ferris-wheel')).toHaveLength(6);
    expect(footprintLabel('retro-arcade')).toBe('3×1');
    expect(footprintLabel('ferris-wheel')).toBe('2×3');
  });
});
