// ---------------------------------------------------------------------------
// useNetworkBroadcast — throttled position send + final "stopped" update.
//
// Call `tick(group, isMoving, delta)` every frame. It accumulates time and
// calls `onPositionUpdate` at ~12 Hz while moving, plus one final update
// when the player stops.
// ---------------------------------------------------------------------------

import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { BROADCAST_INTERVAL } from '../config/network';

export function useNetworkBroadcast(
  onPositionUpdate?: (x: number, z: number, rotY: number) => void,
) {
  const timerRef     = useRef(0);
  const wasMovingRef = useRef(false);

  const tick = useCallback((group: THREE.Group, isMoving: boolean, delta: number) => {
    timerRef.current += delta;

    if (isMoving) {
      if (timerRef.current >= BROADCAST_INTERVAL) {
        timerRef.current = 0;
        onPositionUpdate?.(group.position.x, group.position.z, group.rotation.y);
      }
      wasMovingRef.current = true;
    } else if (wasMovingRef.current) {
      // Player just stopped — send one final position
      wasMovingRef.current = false;
      timerRef.current = 0;
      onPositionUpdate?.(group.position.x, group.position.z, group.rotation.y);
    }
  }, [onPositionUpdate]);

  return { tick };
}
