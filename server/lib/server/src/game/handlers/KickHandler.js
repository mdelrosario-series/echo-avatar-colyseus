// ---------------------------------------------------------------------------
// KickHandler — validates and processes kickPlayer messages.
//
// Checks:
//  1. Sender must be the room owner
//  2. Target must exist in the room
//  3. Cannot kick yourself
// ---------------------------------------------------------------------------
// ---- Handler ----
export function handleKick(senderId, ownerId, payload, manager) {
    const targetId = payload.targetPlayerId;
    // 1. Only owner can kick
    if (senderId !== ownerId) {
        return { accepted: false, targetId };
    }
    // 2. Target must exist
    if (!manager.has(targetId)) {
        return { accepted: false, targetId };
    }
    // 3. Cannot kick yourself
    if (targetId === senderId) {
        return { accepted: false, targetId };
    }
    // Accept — remove from manager
    manager.remove(targetId);
    return { accepted: true, targetId };
}
