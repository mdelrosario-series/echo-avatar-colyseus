// ---------------------------------------------------------------------------
// Posture definitions — config-driven. Add new postures here, zero code
// changes needed elsewhere.
//
// Each posture describes:
//  - clipName:        animation clip to play while in this posture
//  - loopClip:        whether the clip should loop (true) or play once (false)
//  - locksMovement:   prevents WASD / joystick movement while active
//  - requiresAnchor:  can only be entered near an InteractionPoint with this type
//  - exitOnInput:     pressing a movement key exits the posture
//  - promptText:      shown in the InteractionPrompt 3D billboard
// ---------------------------------------------------------------------------

export interface PostureDefinition {
  /** Unique posture key. */
  id: string;
  /** Display name shown in the prompt. */
  label: string;
  /** Animation clip to play while in this posture. */
  clipName: string;
  /** Whether the animation loops. */
  loopClip: boolean;
  /** Prevents movement input while active. */
  locksMovement: boolean;
  /** If true, the posture can only be entered near a matching InteractionPoint. */
  requiresAnchor: boolean;
  /** Whether pressing any movement key will exit the posture. */
  exitOnInput: boolean;
  /** Text shown on the InteractionPrompt (e.g. "Press E to sit"). */
  promptText: string;
}

// ---------------------------------------------------------------------------
// Registry — add new postures as entries here
// ---------------------------------------------------------------------------

export const POSTURES: Record<string, PostureDefinition> = {
  sit: {
    id: 'sit',
    label: 'Sit',
    clipName: 'sit',
    loopClip: true,
    locksMovement: true,
    requiresAnchor: true,
    exitOnInput: true,
    promptText: 'Press E to sit',
  },
  sleep: {
    id: 'sleep',
    label: 'Sleep',
    clipName: 'sleep',
    loopClip: true,
    locksMovement: true,
    requiresAnchor: true,
    exitOnInput: true,
    promptText: 'Press E to sleep',
  },
  meditate: {
    id: 'meditate',
    label: 'Meditate',
    clipName: 'meditate',
    loopClip: true,
    locksMovement: true,
    requiresAnchor: false,       // can meditate anywhere
    exitOnInput: true,
    promptText: 'Press E to meditate',
  },
  dance: {
    id: 'dance',
    label: 'Dance',
    clipName: 'dance',
    loopClip: true,
    locksMovement: true,
    requiresAnchor: false,       // can dance anywhere
    exitOnInput: true,
    promptText: 'Press E to dance',
  },
};

/** Get a posture definition by ID, or undefined if not found. */
export function getPosture(id: string): PostureDefinition | undefined {
  return POSTURES[id];
}
