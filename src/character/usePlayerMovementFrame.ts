// ---------------------------------------------------------------------------
// usePlayerMovementFrame — per-frame input → movement → position broadcast.
//
// Extracted from LocalPlayer (Architecture Refactor #4). Owns movement-driven
// idle/walk2/run2 state for the avatar layer.
// ---------------------------------------------------------------------------

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { animDeployOk } from '../debug/animDeployDebug';
import { useMovementInput, sampleMovementInput } from '../input/useMovementInput';
import { applyCharacterMovement } from './useCharacterMovement';
import { useNetworkBroadcast } from './useNetworkBroadcast';

export type MovementAnimationState = 'idle' | 'walk2' | 'run2';

export interface UsePlayerMovementFrameOptions {
  playerGroupRef: React.RefObject<THREE.Group | null>;
  cameraYawRef: React.MutableRefObject<number>;
  joystickRef: React.RefObject<{ x: number; y: number }>;
  keysRef: React.RefObject<Set<string>>;
  isPostureLockedRef: React.RefObject<boolean>;
  onPositionUpdate?: (x: number, z: number, rotY: number) => void;
  onAnimationChange?: (animation: string) => void;
}

export function usePlayerMovementFrame({
  playerGroupRef,
  cameraYawRef,
  joystickRef,
  keysRef,
  isPostureLockedRef,
  onPositionUpdate,
  onAnimationChange,
}: UsePlayerMovementFrameOptions): { movementAnimation: MovementAnimationState } {
  const inputRef = useMovementInput();
  const { tick: broadcastTick } = useNetworkBroadcast(onPositionUpdate);
  const lastMovementStateRef = useRef<MovementAnimationState>('idle');
  const [movementAnimation, setMovementAnimation] = useState<MovementAnimationState>('idle');

  useFrame((_state, delta) => {
    const group = playerGroupRef.current;
    if (!group) return;
    if (isPostureLockedRef.current) return;

    sampleMovementInput(keysRef, joystickRef, inputRef.current);
    const input = inputRef.current;

    if (input.state !== lastMovementStateRef.current) {
      lastMovementStateRef.current = input.state;
      setMovementAnimation(input.state);
      onAnimationChange?.(input.state);
      animDeployOk('movement', `locomotion state → ${input.state}`, {
        isMoving: input.isMoving,
        magnitude: input.magnitude,
        ix: input.ix,
        iy: input.iy,
      });
    }

    applyCharacterMovement(group, input, cameraYawRef.current, delta);
    broadcastTick(group, input.isMoving, delta);
  });

  return { movementAnimation };
}
