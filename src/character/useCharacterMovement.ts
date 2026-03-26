// ---------------------------------------------------------------------------
// useCharacterMovement — camera-relative movement + exponential-decay rotation.
//
// Pure physics — no networking, no animation, no input handling.
// Reads from a MovementInput ref and applies to a THREE.Group.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { SPEED, ROTATION_SMOOTHING } from '../config/character';
import type { MovementInput } from '../input/useMovementInput';

/**
 * Apply one frame of character movement to a group.
 * Call this inside useFrame.
 */
export function applyCharacterMovement(
  group: THREE.Group,
  input: MovementInput,
  cameraYaw: number,
  delta: number,
): void {
  if (!input.isMoving) return;

  const { ix, iy, magnitude } = input;
  const len = magnitude;

  // Normalize input direction
  const nix = ix / len;
  const niy = iy / len;

  // Camera-relative direction vectors
  const fwdX   = -Math.sin(cameraYaw);
  const fwdZ   = -Math.cos(cameraYaw);
  const rightX =  Math.cos(cameraYaw);
  const rightZ = -Math.sin(cameraYaw);

  // World-space movement direction
  const moveX = fwdX * niy + rightX * nix;
  const moveZ = fwdZ * niy + rightZ * nix;

  // Apply position
  const clampedInput = Math.min(len, 1);
  group.position.x += moveX * SPEED * clampedInput * delta;
  group.position.z += moveZ * SPEED * clampedInput * delta;

  // Rotate avatar to face movement direction (exponential-decay smoothing)
  const targetFacing = Math.atan2(moveX, moveZ);
  let angleDiff = targetFacing - group.rotation.y;
  while (angleDiff >  Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  const rotF = 1 - Math.exp(-ROTATION_SMOOTHING * delta);
  group.rotation.y += angleDiff * rotF;
}
