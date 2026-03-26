// ---------------------------------------------------------------------------
// useMovementInput — merges keyboard + joystick into a single input vector.
//
// Returns a stable ref whose `.current` is updated every call with:
//   ix, iy      — raw input vector
//   magnitude   — length of input vector (0..1+)
//   isMoving    — magnitude > deadzone
//   state       — 'idle' | 'walk2' | 'run2'
// ---------------------------------------------------------------------------

import { useRef } from 'react';
import { RUN_THRESHOLD } from '../config/character';

export interface MovementInput {
  ix: number;
  iy: number;
  magnitude: number;
  isMoving: boolean;
  state: 'idle' | 'walk2' | 'run2';
}

const DEADZONE = 0.01;

/**
 * Sample the current movement input from keyboard keys + joystick.
 * Call this once per frame inside useFrame.
 */
export function sampleMovementInput(
  keysRef: React.RefObject<Set<string>>,
  joystickRef: React.RefObject<{ x: number; y: number }>,
  out: MovementInput,
): MovementInput {
  let ix = 0;
  let iy = 0;

  const joy = joystickRef.current;
  if (joy && (Math.abs(joy.x) > DEADZONE || Math.abs(joy.y) > DEADZONE)) {
    ix = joy.x;
    iy = joy.y;
  } else {
    const keys = keysRef.current;
    if (keys) {
      if (keys.has('KeyW') || keys.has('ArrowUp'))    iy += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown'))  iy -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft'))  ix -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
    }
  }

  const magnitude = Math.sqrt(ix * ix + iy * iy);
  const isMoving = magnitude > DEADZONE;
  const state: 'idle' | 'walk2' | 'run2' = isMoving
    ? (magnitude >= RUN_THRESHOLD ? 'run2' : 'walk2')
    : 'idle';

  out.ix = ix;
  out.iy = iy;
  out.magnitude = magnitude;
  out.isMoving = isMoving;
  out.state = state;
  return out;
}

/** React hook that returns a stable ref for per-frame movement input sampling. */
export function useMovementInput() {
  return useRef<MovementInput>({
    ix: 0, iy: 0,
    magnitude: 0,
    isMoving: false,
    state: 'idle',
  });
}
