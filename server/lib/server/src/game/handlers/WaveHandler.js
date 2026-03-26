// ---------------------------------------------------------------------------
// WaveHandler — validates wave messages.
//
// Checks:
//  1. Player must exist in the manager
// ---------------------------------------------------------------------------
export function handleWave(senderId, manager) {
    return manager.has(senderId);
}
