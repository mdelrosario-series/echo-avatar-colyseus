// ---------------------------------------------------------------------------
// useInteractionDetection — finds the nearest InteractionPoint within range
// of the local player every frame.
//
// Runs inside useFrame so it's zero-allocation on the hot path (reuses the
// result ref).
// ---------------------------------------------------------------------------

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import type { InteractionPoint } from './InteractionPoint';

export interface NearestInteraction {
  point: InteractionPoint | null;
  distanceSq: number;
}

/**
 * Each frame, scan `points` and find the closest one that is in range and
 * not full.  Returns a stable ref whose `.current` is updated every frame.
 */
export function useInteractionDetection(
  playerGroupRef: React.RefObject<THREE.Group | null>,
  points: InteractionPoint[],
) {
  const nearestRef = useRef<NearestInteraction>({ point: null, distanceSq: Infinity });

  useFrame(() => {
    const group = playerGroupRef.current;
    if (!group || points.length === 0) {
      nearestRef.current.point = null;
      nearestRef.current.distanceSq = Infinity;
      return;
    }

    const px = group.position.x;
    const pz = group.position.z;

    let closestPoint: InteractionPoint | null = null;
    let closestDist = Infinity;

    for (const pt of points) {
      if (pt.isFull) continue;
      const d2 = pt.distanceSqXZ(px, pz);
      if (d2 < closestDist && pt.isInRange(px, pz)) {
        closestDist = d2;
        closestPoint = pt;
      }
    }

    nearestRef.current.point = closestPoint;
    nearestRef.current.distanceSq = closestDist;
  });

  return nearestRef;
}
