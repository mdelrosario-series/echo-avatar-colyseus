// ---------------------------------------------------------------------------
// MovementHandler — validates and processes updatePosition messages.
//
// Checks:
//  1. NaN / Infinity guard on x, z, rotY
//  2. Rate limit — max 1 update per MIN_INTERVAL_MS (≈20 Hz cap)
//  3. Speed check — player can't move farther than MAX_SPEED * elapsed time
//  4. World bounds — clamp position to [-WORLD_HALF, WORLD_HALF]
// ---------------------------------------------------------------------------
// ---- Tuning constants ----
/** Minimum milliseconds between accepted position updates (~20 Hz). */
const MIN_INTERVAL_MS = 45;
/** Maximum world-units per second a client is allowed to move. */
const MAX_SPEED = 8.0; // 2× the client's SPEED (4.0) to allow for latency bursts
/** Half-size of the square world bounds (±WORLD_HALF on X and Z). */
const WORLD_HALF = 200;
// ---- Handler ----
export function handleMovement(senderId, payload, manager) {
    const player = manager.get(senderId);
    if (!player)
        return { accepted: false, x: 0, z: 0, rotY: 0 };
    // 1. NaN / Infinity guard
    if (!isFinite(payload.x) || !isFinite(payload.z) || !isFinite(payload.rotY)) {
        return { accepted: false, x: player.x, z: player.z, rotY: player.rotY };
    }
    const now = Date.now();
    // 2. Rate limit
    if (now - player.lastPositionMs < MIN_INTERVAL_MS) {
        return { accepted: false, x: player.x, z: player.z, rotY: player.rotY };
    }
    // 3. Speed check (skip on first update where lastPositionMs is 0)
    if (player.lastPositionMs > 0) {
        const elapsed = (now - player.lastPositionMs) / 1000; // seconds
        const dx = payload.x - player.x;
        const dz = payload.z - player.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const maxDist = MAX_SPEED * Math.max(elapsed, 0.05); // floor at 50ms to avoid div-by-zero-like spikes
        if (dist > maxDist) {
            // Clamp movement to max allowed distance along the same direction
            const scale = maxDist / dist;
            payload.x = player.x + dx * scale;
            payload.z = player.z + dz * scale;
        }
    }
    // 4. World bounds clamp
    payload.x = clamp(payload.x, -WORLD_HALF, WORLD_HALF);
    payload.z = clamp(payload.z, -WORLD_HALF, WORLD_HALF);
    // Accept and update state
    player.x = payload.x;
    player.z = payload.z;
    player.rotY = payload.rotY;
    player.lastPositionMs = now;
    return { accepted: true, x: player.x, z: player.z, rotY: player.rotY };
}
function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
}
