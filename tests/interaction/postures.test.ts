import { describe, it, expect } from 'vitest';
import { POSTURES, getPosture } from '../../src/config/postures';

describe('config/postures', () => {
  it('has the four default posture entries', () => {
    expect(Object.keys(POSTURES)).toEqual(
      expect.arrayContaining(['sit', 'sleep', 'meditate', 'dance']),
    );
    expect(Object.keys(POSTURES)).toHaveLength(4);
  });

  describe.each(Object.values(POSTURES))('posture "$id"', (posture) => {
    it('has all required fields', () => {
      expect(posture.id).toBeTruthy();
      expect(posture.label).toBeTruthy();
      expect(posture.clipName).toBeTruthy();
      expect(typeof posture.loopClip).toBe('boolean');
      expect(typeof posture.locksMovement).toBe('boolean');
      expect(typeof posture.requiresAnchor).toBe('boolean');
      expect(typeof posture.exitOnInput).toBe('boolean');
      expect(posture.promptText).toBeTruthy();
    });

    it('id matches registry key', () => {
      expect(POSTURES[posture.id]).toBe(posture);
    });
  });

  describe('getPosture', () => {
    it('returns posture definition by id', () => {
      expect(getPosture('sit')).toBe(POSTURES['sit']);
      expect(getPosture('dance')).toBe(POSTURES['dance']);
    });

    it('returns undefined for unknown id', () => {
      expect(getPosture('unknown')).toBeUndefined();
      expect(getPosture('')).toBeUndefined();
    });
  });

  describe('posture-specific config', () => {
    it('sit requires anchor', () => {
      expect(POSTURES['sit']!.requiresAnchor).toBe(true);
    });

    it('dance does NOT require anchor', () => {
      expect(POSTURES['dance']!.requiresAnchor).toBe(false);
    });

    it('meditate does NOT require anchor', () => {
      expect(POSTURES['meditate']!.requiresAnchor).toBe(false);
    });

    it('all postures lock movement', () => {
      for (const p of Object.values(POSTURES)) {
        expect(p.locksMovement).toBe(true);
      }
    });

    it('all postures exit on input', () => {
      for (const p of Object.values(POSTURES)) {
        expect(p.exitOnInput).toBe(true);
      }
    });
  });
});
