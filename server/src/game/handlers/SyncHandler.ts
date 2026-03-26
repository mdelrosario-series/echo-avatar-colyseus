// ---------------------------------------------------------------------------
// SyncHandler — builds the syncPlayers snapshot for a requesting client.
//
// Returns all players currently in the manager (except the requester).
// PlayerManager is the source of truth — players are removed on leave via
// onPlayerLeave, so no extra connection-state filtering is needed here.
// ---------------------------------------------------------------------------

import type { PlayerManager } from '../core/PlayerManager'

// ---- Types ----

export interface SyncPlayerEntry {
  sessionId: string
  x: number
  z: number
  rotY: number
  username: string
  avatarUrl: string
  animation: string
  posture: string | null
}

// ---- Handler ----

export function buildSyncSnapshot(
  requesterId: string,
  manager: PlayerManager,
): SyncPlayerEntry[] {
  const players: SyncPlayerEntry[] = []

  for (const [id, state] of manager.entries()) {
    if (id === requesterId) continue
    players.push({
      sessionId: id,
      x: state.x, z: state.z, rotY: state.rotY,
      username: state.username,
      avatarUrl: state.avatarUrl,
      animation: state.animation,
      posture: state.posture,
    })
  }

  return players
}
