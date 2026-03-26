// ---------------------------------------------------------------------------
// usePostureState — manages the local player's posture lifecycle.
//
// Responsibilities:
//  - Enter / exit posture based on user input (E key)
//  - Lock movement while in posture (via isPostureLocked ref)
//  - Snap player to anchor position/rotation when posture requires anchor
//  - Exit posture when movement keys are pressed (if exitOnInput)
//  - Broadcast posture changes to the network via sendPosture
// ---------------------------------------------------------------------------

import { useRef, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { getPosture, type PostureDefinition } from '../config/postures';
import type { InteractionPoint } from './InteractionPoint';
import type { NearestInteraction } from './useInteractionDetection';

interface UsePostureStateOptions {
  /** Ref to the local player group. */
  playerGroupRef: React.RefObject<THREE.Group | null>;
  /** Nearest interaction point ref (from useInteractionDetection). */
  nearestRef: React.RefObject<NearestInteraction>;
  /** Keys currently held (from useKeyboardInput). */
  keysRef: React.RefObject<Set<string>>;
  /** Network callback to broadcast posture changes. */
  sendPosture: (postureId: string | null) => void;
  /** Callback to broadcast the animation change. */
  sendAnimation?: (animation: string) => void;
}

const MOVEMENT_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
]);

export function usePostureState({
  playerGroupRef,
  nearestRef,
  keysRef,
  sendPosture,
  sendAnimation,
}: UsePostureStateOptions) {
  /** Currently active posture, or null. */
  const activePostureRef = useRef<PostureDefinition | null>(null);
  /** The InteractionPoint currently being used, or null. */
  const anchorRef = useRef<InteractionPoint | null>(null);
  /** Whether movement is currently locked by a posture. */
  const isPostureLockedRef = useRef(false);
  /** Debounce flag to prevent re-triggering on held key. */
  const interactPressedRef = useRef(false);

  // ---- Enter posture ----
  const enterPosture = useCallback(
    (definition: PostureDefinition, anchor: InteractionPoint | null) => {
      activePostureRef.current = definition;
      anchorRef.current = anchor;
      isPostureLockedRef.current = definition.locksMovement;

      // Snap to anchor position/rotation if applicable
      if (anchor && definition.requiresAnchor) {
        const group = playerGroupRef.current;
        if (group) {
          group.position.x = anchor.x;
          group.position.z = anchor.z;
          group.rotation.y = anchor.rotationY;
        }
        anchor.occupy('local');
      }

      // Broadcast
      sendPosture(definition.id);
      sendAnimation?.(definition.clipName);
    },
    [playerGroupRef, sendPosture, sendAnimation],
  );

  // ---- Exit posture ----
  const exitPosture = useCallback(() => {
    const anchor = anchorRef.current;
    if (anchor) {
      anchor.vacate('local');
    }
    activePostureRef.current = null;
    anchorRef.current = null;
    isPostureLockedRef.current = false;

    sendPosture(null);
    sendAnimation?.('idle');
  }, [sendPosture, sendAnimation]);

  // ---- Per-frame checks ----
  useFrame(() => {
    const keys = keysRef.current;
    if (!keys) return;

    const ePressed = keys.has('KeyE');

    // --- Toggle logic: press E to enter/exit ---
    if (ePressed && !interactPressedRef.current) {
      interactPressedRef.current = true;

      if (activePostureRef.current) {
        // Already in a posture — exit
        exitPosture();
      } else {
        // Not in a posture — try to enter one
        const nearest = nearestRef.current;
        if (nearest?.point) {
          const def = getPosture(nearest.point.postureId);
          if (def) {
            enterPosture(def, nearest.point);
          }
        }
      }
    } else if (!ePressed) {
      interactPressedRef.current = false;
    }

    // --- Exit on movement input ---
    if (activePostureRef.current?.exitOnInput) {
      for (const key of MOVEMENT_KEYS) {
        if (keys.has(key)) {
          exitPosture();
          break;
        }
      }
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (anchorRef.current) {
        anchorRef.current.vacate('local');
      }
    };
  }, []);

  return {
    /** Ref: whether the player is currently posture-locked (read in useFrame). */
    isPostureLockedRef,
    /** Ref: current posture definition (read in useFrame). */
    activePostureRef,
    /** Imperative enter (e.g. from emote menu). */
    enterPosture,
    /** Imperative exit. */
    exitPosture,
  };
}
