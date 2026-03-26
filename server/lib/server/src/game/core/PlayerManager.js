// ---------------------------------------------------------------------------
// PlayerManager — server-side player state store.
//
// Wraps Map<playerId, PlayerState> with convenience methods.
// Keeps position + avatar + rate-limit timestamps per player.
// ---------------------------------------------------------------------------
export class PlayerManager {
    players = new Map();
    add(id, username, avatarUrl) {
        const entry = {
            x: 0, z: 0, rotY: 0,
            avatarUrl, username,
            animation: 'idle',
            posture: null,
            lastPositionMs: 0,
            lastChatMs: 0,
        };
        this.players.set(id, entry);
        return entry;
    }
    updateAnimation(id, animation) {
        const p = this.players.get(id);
        if (p)
            p.animation = animation;
    }
    updatePosture(id, posture) {
        const p = this.players.get(id);
        if (p)
            p.posture = posture;
    }
    remove(id) {
        return this.players.delete(id);
    }
    get(id) {
        return this.players.get(id);
    }
    has(id) {
        return this.players.has(id);
    }
    get size() {
        return this.players.size;
    }
    /** Iterate all players (id, state). */
    entries() {
        return this.players.entries();
    }
    keys() {
        return this.players.keys();
    }
}
