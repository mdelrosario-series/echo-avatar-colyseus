// ---------------------------------------------------------------------------
// useRemoteInterpolation — exponential-decay lerp + snap threshold.
//
// Reads from a position data source and smoothly moves a THREE.Group toward
// the target. If the distance exceeds SNAP_DISTANCE, snaps instantly.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { SNAP_DISTANCE, INTERP_K } from '../config/network';

export interface InterpolationTarget {
  x: number;
  z: number;
  rotY: number;
}

/**
 * Apply one frame of remote player interpolation.
 * Call this inside useFrame.
 */
export function applyRemoteInterpolation(
  group: THREE.Group,
  target: InterpolationTarget,
  delta: number,
): void {
  const dx = target.x - group.position.x;
  const dz = target.z - group.position.z;
  const distSq = dx * dx + dz * dz;

  if (distSq > SNAP_DISTANCE * SNAP_DISTANCE) {
    // Large jump — snap instantly (teleport / server correction)
    group.position.x = target.x;
    group.position.z = target.z;
    group.rotation.y = target.rotY;
  } else {
    // Smooth exponential-decay interpolation
    const f = 1 - Math.exp(-INTERP_K * delta);
    group.position.x += dx * f;
    group.position.z += dz * f;

    let angleDiff = target.rotY - group.rotation.y;
    while (angleDiff >  Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    group.rotation.y += angleDiff * f;
  }
}
