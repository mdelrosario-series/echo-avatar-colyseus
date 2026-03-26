// ---------------------------------------------------------------------------
// Animation tuning constants — one place to configure all animation behavior.
// ---------------------------------------------------------------------------

/** Standard clip names — must match the AnimationClip name inside each GLB. */
export const CLIP_NAMES = [
  'idle',
  'walk2',
  'run2',
  'wave',
  'chicken_dance',
  'sitting_idle',
  'sit',
  'idle_to_sit_floor',
  'sitting_floor_idle_loop',
  'wave_hip_hop',
] as const;

/** Duration (seconds) for looping-animation crossfades (idle↔walk2↔run2). */
export const CROSSFADE_DURATION = 0.25;

/** How many seconds before the end of a one-shot clip to trigger the revert
 *  transition back to the looping animation. */
export const ONESHOT_LEAD_TIME = 0.08;
