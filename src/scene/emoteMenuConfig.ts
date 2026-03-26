// ---------------------------------------------------------------------------
// Emote menu — clip names must match AnimationClip names from getAnimationClipNames() / logical GLB stems
// (see config/animation.ts CLIP_NAMES). Playback mode is defined in animation/emoteMachineConfig.ts
// (e.g. sit → sit_sequence: idle_to_sit_floor → sitting_floor_idle_loop → reverse exit on move).
// ---------------------------------------------------------------------------

export interface EmoteMenuItem {
  /** Animation clip name passed to playEmote / sendAnimation */
  clipName: string;
  emoji: string;
  /** Screen reader label */
  label: string;
}

/** Shown in the radial menu (order = placement angle, see EmoteMenuButton). */
export const RADIAL_EMOTES: EmoteMenuItem[] = [
  { clipName: 'wave', emoji: '👋', label: 'Wave' },
  { clipName: 'chicken_dance', emoji: '💃', label: 'Dance' },
  { clipName: 'sit', emoji: '🪑', label: 'Sit' },
];
