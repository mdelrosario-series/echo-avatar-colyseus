// ---------------------------------------------------------------------------
// AvatarHandler — validates and processes setAvatar messages.
//
// Checks:
//  1. avatarUrl must be a string
//  2. avatarUrl length capped at 512 chars
// ---------------------------------------------------------------------------

import type { PlayerManager } from '../core/PlayerManager'

// ---- Types ----

export interface AvatarPayload {
  avatarUrl: string
}

export interface AvatarResult {
  accepted: boolean
  avatarUrl: string
}

// ---- Handler ----

export function handleAvatar(
  senderId: string,
  payload: AvatarPayload,
  manager: PlayerManager,
): AvatarResult {
  const player = manager.get(senderId)
  if (!player) return { accepted: false, avatarUrl: '' }

  const url = typeof payload.avatarUrl === 'string'
    ? payload.avatarUrl.slice(0, 512)
    : ''

  player.avatarUrl = url
  return { accepted: true, avatarUrl: url }
}
