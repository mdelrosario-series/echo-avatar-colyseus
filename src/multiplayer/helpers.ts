// ---------------------------------------------------------------------------
// Shared helpers for the multiplayer module.
// ---------------------------------------------------------------------------

import type { RemotePlayer } from './types';

function normalizeIncomingAnimation(animation: string | undefined): string {
  const t = animation?.trim();
  return t || 'idle';
}

/** Create a RemotePlayer entry from join / sync data. */
export function makePlayer(
  id: string,
  x: number, z: number, rotY: number,
  username: string, avatarUrl: string,
  animation?: string,
  posture: string | null = null,
): RemotePlayer {
  const now = Date.now();
  return {
    id,
    username,
    avatarUrl: avatarUrl ?? '',
    animation: normalizeIncomingAnimation(animation),
    posture,
    x, z, rotY,
    lastUpdate: now,
    prevX: x, prevZ: z, prevRotY: rotY, prevUpdate: now,
  };
}
