// ---------------------------------------------------------------------------
// AnimationHandler — validates setAnimation messages.
//
// Checks:
//  1. animation must be a non-empty string
//  2. animation name capped at 64 chars
// ---------------------------------------------------------------------------
// ---- Handler ----
export function handleAnimation(payload) {
    if (typeof payload.animation !== 'string' || !payload.animation) {
        return { accepted: false, animation: '' };
    }
    const animation = payload.animation.slice(0, 64);
    return { accepted: true, animation };
}
