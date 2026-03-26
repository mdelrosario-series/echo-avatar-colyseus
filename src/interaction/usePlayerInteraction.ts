// ---------------------------------------------------------------------------
// usePlayerInteraction — keyboard + nearest interactable + posture lifecycle.
//
// Bundles hooks that were previously wired manually in LocalPlayer (#4).
// ---------------------------------------------------------------------------

import { useRef } from 'react';
import * as THREE from 'three';
import { useKeyboardInput } from '../input/useKeyboardInput';
import { useInteractionDetection } from './useInteractionDetection';
import { usePostureState } from './usePostureState';
import type { InteractionPoint } from './InteractionPoint';

export interface UsePlayerInteractionOptions {
  playerGroupRef: React.RefObject<THREE.Group | null>;
  interactionPoints: InteractionPoint[];
  sendPosture?: (postureId: string | null) => void;
  sendAnimation?: (animation: string) => void;
}

export function usePlayerInteraction({
  playerGroupRef,
  interactionPoints,
  sendPosture,
  sendAnimation,
}: UsePlayerInteractionOptions) {
  const keysRef = useKeyboardInput();
  const nearestRef = useInteractionDetection(playerGroupRef, interactionPoints);

  const noopPosture = useRef(((_id: string | null) => {}) as (id: string | null) => void).current;
  const { isPostureLockedRef, activePostureRef } = usePostureState({
    playerGroupRef,
    nearestRef,
    keysRef,
    sendPosture: sendPosture ?? noopPosture,
    sendAnimation,
  });

  return {
    keysRef,
    nearestRef,
    isPostureLockedRef,
    activePostureRef,
  };
}
