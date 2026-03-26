// ---------------------------------------------------------------------------
// Locomotion crossfades (idle / walk2 / run2)
//
// Three.js crossFadeTo(..., warp: true) warps each clip's *time scale* during
// the blend so cycle phases align. When durations differ a lot (idle ~3× walk2),
// the shorter clip is played back at huge effective speed → distorted,
// "blown up" silhouettes in BOTH directions (walk2→idle and idle→walk2).
//
// Global rule: never warp between locomotion clips; phase-sync the incoming
// clip to the outgoing clip's cycle phase, crossfade with warp: false.
// ---------------------------------------------------------------------------

import type { AnimationAction } from 'three';

/** Clips driven by useLoopingAnimation (not emotes). */
const LOCOMOTION = new Set<string>(['idle', 'walk2', 'run2']);

export function isLocomotionClip(name: string): boolean {
  return LOCOMOTION.has(name);
}

/**
 * Crossfade from prev to next. For idle/walk2/run2 pairs: phase-aligned, no warp.
 * For anything else (should be rare here): falls back to Three's warp blend.
 */
export function crossFadeLocomotion(
  prev: AnimationAction,
  next: AnimationAction,
  duration: number,
): void {
  const p = prev.getClip().name;
  const n = next.getClip().name;

  if (!LOCOMOTION.has(p) || !LOCOMOTION.has(n)) {
    prev.crossFadeTo(next, duration, true);
    next.play();
    return;
  }

  const pd = Math.max(prev.getClip().duration, 1e-6);
  const nd = Math.max(next.getClip().duration, 1e-6);
  const phase = (((prev.time % pd) + pd) % pd) / pd;

  next.reset();
  next.time = phase * nd;
  prev.crossFadeTo(next, duration, false);
  next.play();
}
