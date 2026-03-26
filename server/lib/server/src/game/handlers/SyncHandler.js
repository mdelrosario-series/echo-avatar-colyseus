// ---------------------------------------------------------------------------
// SyncHandler — builds the syncPlayers snapshot for a requesting client.
//
// Returns all players currently in the manager (except the requester).
// PlayerManager is the source of truth — players are removed on leave via
// onPlayerLeave, so no extra connection-state filtering is needed here.
// ---------------------------------------------------------------------------
// ---- Handler ----
export function buildSyncSnapshot(requesterId, manager) {
    const players = [];
    for (const [id, state] of manager.entries()) {
        if (id === requesterId)
            continue;
        players.push({
            sessionId: id,
            x: state.x, z: state.z, rotY: state.rotY,
            username: state.username,
            avatarUrl: state.avatarUrl,
            animation: state.animation,
            posture: state.posture,
        });
    }
    return players;
}
