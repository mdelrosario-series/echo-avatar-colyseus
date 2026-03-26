// ---------------------------------------------------------------------------
// ChatHandler — validates and processes chat messages.
//
// Checks:
//  1. Empty text after trim → reject
//  2. Max length clamp (200 chars)
//  3. Rate limit — max 1 message per MIN_INTERVAL_MS
// ---------------------------------------------------------------------------

import type { PlayerManager } from '../core/PlayerManager'

// ---- Tuning constants ----

/** Minimum milliseconds between accepted chat messages (1 msg/sec). */
const MIN_INTERVAL_MS = 1000

/** Maximum characters per chat message. */
const MAX_LENGTH = 200

// ---- Types ----

export interface ChatPayload {
  text: string
}

export interface ChatResult {
  accepted: boolean
  text: string
}

// ---- Handler ----

export function handleChat(
  senderId: string,
  payload: ChatPayload,
  manager: PlayerManager,
): ChatResult {
  const player = manager.get(senderId)
  if (!player) return { accepted: false, text: '' }

  // 1. Trim + empty check
  const text = (payload.text ?? '').trim()
  if (!text) return { accepted: false, text: '' }

  // 2. Rate limit
  const now = Date.now()
  if (now - player.lastChatMs < MIN_INTERVAL_MS) {
    return { accepted: false, text: '' }
  }

  // 3. Accept — clamp length, update timestamp
  player.lastChatMs = now
  return { accepted: true, text: text.slice(0, MAX_LENGTH) }
}
