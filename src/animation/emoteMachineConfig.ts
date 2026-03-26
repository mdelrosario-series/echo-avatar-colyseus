// ---------------------------------------------------------------------------
// Emote state machine — how each menu / network clip name is played locally.
// ---------------------------------------------------------------------------

/** Sit pipeline clip names (GLB stems must match after rename-anim-clips). */
export const SIT_ENTRY_CLIP = 'idle_to_sit_floor';
export const SIT_LOOP_CLIP = 'sitting_floor_idle_loop';

export type EmoteMachineMode = 'one_shot' | 'hold_loop' | 'sit_sequence';

const DEFAULT_MODE: EmoteMachineMode = 'one_shot';

/** Menu / wire clip → playback mode. Unknown clips default to one_shot. */
const MODE_BY_CLIP: Record<string, EmoteMachineMode> = {
  wave: 'one_shot',
  wave_hip_hop: 'one_shot',
  chicken_dance: 'hold_loop',
  sit: 'sit_sequence',
  sitting_idle: 'hold_loop',
};

export function getEmoteMachineMode(clipName: string): EmoteMachineMode {
  return MODE_BY_CLIP[clipName] ?? DEFAULT_MODE;
}
