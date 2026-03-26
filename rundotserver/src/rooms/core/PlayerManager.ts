// ---------------------------------------------------------------------------
// PlayerManager — server-side player state store.
//
// Wraps Map<playerId, PlayerState> with convenience methods.
// Keeps position + avatar + rate-limit timestamps per player.
// ---------------------------------------------------------------------------

import type { PlayerPositionState } from '../types'

export interface ManagedPlayer extends PlayerPositionState {
  username: string
  animation: string
  posture: string | null
  /** Timestamp (ms) of last accepted updatePosition. Used for rate limiting. */
  lastPositionMs: number
  /** Timestamp (ms) of last accepted chat message. Used for rate limiting. */
  lastChatMs: number
}

export class PlayerManager {
  private players = new Map<string, ManagedPlayer>()

  add(id: string, username: string, avatarUrl: string): ManagedPlayer {
    const entry: ManagedPlayer = {
      x: 0, z: 0, rotY: 0,
      avatarUrl, username,
      animation: 'idle',
      posture: null,
      lastPositionMs: 0,
      lastChatMs: 0,
    }
    this.players.set(id, entry)
    return entry
  }

  updateAnimation(id: string, animation: string): void {
    const p = this.players.get(id)
    if (p) p.animation = animation
  }

  updatePosture(id: string, posture: string | null): void {
    const p = this.players.get(id)
    if (p) p.posture = posture
  }

  remove(id: string): boolean {
    return this.players.delete(id)
  }

  get(id: string): ManagedPlayer | undefined {
    return this.players.get(id)
  }

  has(id: string): boolean {
    return this.players.has(id)
  }

  get size(): number {
    return this.players.size
  }

  /** Iterate all players (id, state). */
  entries(): IterableIterator<[string, ManagedPlayer]> {
    return this.players.entries()
  }

  keys(): IterableIterator<string> {
    return this.players.keys()
  }
}
