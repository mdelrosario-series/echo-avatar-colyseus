import { describe, it, expect } from 'vitest';
import { InteractionPoint } from '../../src/interaction/InteractionPoint';

function makePoint(overrides: Partial<Parameters<typeof InteractionPoint.prototype.isInRange>[0]> & Record<string, any> = {}) {
  return new InteractionPoint({
    id: 'bench-1',
    postureId: 'sit',
    position: { x: 5, y: 0, z: 10 },
    rotationY: Math.PI / 2,
    interactionRadius: 2,
    capacity: 1,
    ...overrides,
  });
}

describe('InteractionPoint', () => {
  // ---------- Construction ----------

  it('stores config values correctly', () => {
    const pt = makePoint();
    expect(pt.id).toBe('bench-1');
    expect(pt.postureId).toBe('sit');
    expect(pt.x).toBe(5);
    expect(pt.y).toBe(0);
    expect(pt.z).toBe(10);
    expect(pt.rotationY).toBeCloseTo(Math.PI / 2);
    expect(pt.interactionRadius).toBe(2);
    expect(pt.capacity).toBe(1);
  });

  // ---------- Range detection ----------

  describe('isInRange', () => {
    it('returns true when player is inside radius', () => {
      const pt = makePoint();
      expect(pt.isInRange(5, 10)).toBe(true);        // exact center
      expect(pt.isInRange(5, 11)).toBe(true);         // 1 unit away
      expect(pt.isInRange(6, 10)).toBe(true);         // 1 unit away
      expect(pt.isInRange(6, 11)).toBe(true);         // sqrt(2) ≈ 1.41
    });

    it('returns true when player is exactly on radius boundary', () => {
      const pt = makePoint();
      expect(pt.isInRange(5, 12)).toBe(true);         // exactly 2 units away
      expect(pt.isInRange(7, 10)).toBe(true);         // exactly 2 units away
    });

    it('returns false when player is outside radius', () => {
      const pt = makePoint();
      expect(pt.isInRange(5, 13)).toBe(false);        // 3 units away
      expect(pt.isInRange(0, 0)).toBe(false);          // far away
      expect(pt.isInRange(100, 100)).toBe(false);      // very far
    });
  });

  describe('distanceSqXZ', () => {
    it('returns squared XZ distance', () => {
      const pt = makePoint();
      expect(pt.distanceSqXZ(5, 10)).toBe(0);          // at center
      expect(pt.distanceSqXZ(8, 14)).toBe(9 + 16);     // 3² + 4² = 25
    });
  });

  // ---------- Occupancy ----------

  describe('occupy / vacate', () => {
    it('starts empty (not full)', () => {
      const pt = makePoint();
      expect(pt.isFull).toBe(false);
    });

    it('can occupy a spot', () => {
      const pt = makePoint();
      expect(pt.occupy('player-1')).toBe(true);
      expect(pt.isOccupiedBy('player-1')).toBe(true);
    });

    it('is full after reaching capacity', () => {
      const pt = makePoint({ capacity: 1 });
      pt.occupy('player-1');
      expect(pt.isFull).toBe(true);
    });

    it('rejects new players when full', () => {
      const pt = makePoint({ capacity: 1 });
      pt.occupy('player-1');
      expect(pt.occupy('player-2')).toBe(false);
      expect(pt.isOccupiedBy('player-2')).toBe(false);
    });

    it('allows re-occupying by the same player even when full', () => {
      const pt = makePoint({ capacity: 1 });
      pt.occupy('player-1');
      expect(pt.occupy('player-1')).toBe(true);  // idempotent
    });

    it('vacate frees a spot', () => {
      const pt = makePoint({ capacity: 1 });
      pt.occupy('player-1');
      pt.vacate('player-1');
      expect(pt.isFull).toBe(false);
      expect(pt.isOccupiedBy('player-1')).toBe(false);
    });

    it('vacate is safe to call on a non-occupant', () => {
      const pt = makePoint();
      pt.vacate('nobody');  // should not throw
      expect(pt.isFull).toBe(false);
    });

    it('supports multi-capacity', () => {
      const pt = makePoint({ capacity: 3 });
      expect(pt.occupy('a')).toBe(true);
      expect(pt.occupy('b')).toBe(true);
      expect(pt.occupy('c')).toBe(true);
      expect(pt.isFull).toBe(true);
      expect(pt.occupy('d')).toBe(false);

      pt.vacate('b');
      expect(pt.isFull).toBe(false);
      expect(pt.occupy('d')).toBe(true);
      expect(pt.isFull).toBe(true);
    });
  });
});
