// ---------------------------------------------------------------------------
// WaveHandler — validates wave messages.
//
// Checks:
//  1. Player must exist in the manager
// ---------------------------------------------------------------------------

import type { PlayerManager } from '../core/PlayerManager'

export function handleWave(
  senderId: string,
  manager: PlayerManager,
): boolean {
  return manager.has(senderId)
}
