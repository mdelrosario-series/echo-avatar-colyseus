// ---------------------------------------------------------------------------
// PostureHandler — validates setPosture messages.
//
// Checks:
//  1. postureId is null (exit posture) or a non-empty string ≤ 32 chars
// ---------------------------------------------------------------------------
// ---- Handler ----
export function handlePosture(payload) {
    // null means "exit posture" — always valid
    if (payload.postureId === null) {
        return { accepted: true, postureId: null };
    }
    if (typeof payload.postureId !== 'string' || !payload.postureId) {
        return { accepted: false, postureId: null };
    }
    const postureId = payload.postureId.slice(0, 32);
    return { accepted: true, postureId };
}
