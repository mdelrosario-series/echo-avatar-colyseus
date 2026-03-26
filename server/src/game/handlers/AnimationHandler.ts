// ---------------------------------------------------------------------------
// AnimationHandler — validates setAnimation messages.
//
// Checks:
//  1. animation must be a non-empty string
//  2. animation name capped at 64 chars
// ---------------------------------------------------------------------------

// ---- Types ----

export interface AnimationPayload {
  animation: string
}

export interface AnimationResult {
  accepted: boolean
  animation: string
}

// ---- Handler ----

export function handleAnimation(
  payload: AnimationPayload,
): AnimationResult {
  if (typeof payload.animation !== 'string' || !payload.animation) {
    return { accepted: false, animation: '' }
  }

  const animation = payload.animation.slice(0, 64)
  return { accepted: true, animation }
}
