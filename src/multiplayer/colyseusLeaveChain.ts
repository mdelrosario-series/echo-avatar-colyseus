import type { Room } from '@colyseus/sdk';

/**
 * Serializes `room.leave()` across the app. React StrictMode remounts hooks with new
 * instances while the previous Colyseus session is still closing; without this, two
 * connections can exist in the same room (duplicate avatars, duplicate global_lobby users).
 */
let chain: Promise<void> = Promise.resolve();

export async function awaitColyseusLeaves(): Promise<void> {
  await chain;
}

export function enqueueColyseusLeave(room: Room): void {
  const rid = room.roomId;
  const sid = room.sessionId;
  console.log('[test] colyseusLeaveChain enqueue leave', { roomId: rid, sessionId: sid });
  chain = chain.then(async () => {
    try {
      await room.leave(true);
      console.log('[test] colyseusLeaveChain leave done', { roomId: rid, sessionId: sid });
    } catch {
      /* noop */
    }
  });
}
