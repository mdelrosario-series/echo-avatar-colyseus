// ---------------------------------------------------------------------------
// useMovementSync — registers handlers for player join/leave/move/sync.
//
// Manages the PlayerStore lifecycle (add/remove/updatePosition) and
// exposes sendPosition.
// ---------------------------------------------------------------------------

import { useEffect, useCallback } from 'react';
import type { MessageRouter } from '../core/MessageRouter';
import type { BroadcastMessage, PrivateMessage } from '../protocol/echoAvatarProtocol';
import type { PlayerStore } from '../core/PlayerStore';
import type { ConnectionManager } from '../core/ConnectionManager';
import { makePlayer } from '../helpers';

export function useMovementSync(
  broadcastRouter: MessageRouter<BroadcastMessage>,
  privateRouter: MessageRouter<PrivateMessage>,
  store: PlayerStore,
  connection: ConnectionManager,
) {
  useEffect(() => {
    broadcastRouter.register('playerJoined', (msg) => {
      const my = connection.myPlayerId;
      const sid = msg.sessionId;
      if (String(sid) === String(my)) {
        console.log('[test] movementSync playerJoined SKIP (self)', {
          sessionId: sid,
          myPlayerId: my,
          strictEqual: sid === my,
          stringEqual: true,
        });
        return;
      }
      // Always upsert — same sessionId can reappear after leave/rejoin; old `store.has` skip
      // left peers blind if a stale syncPlayers had already removed them.
      console.log('[MovementSync] playerJoined upsert', msg.sessionId, msg.username);
      console.log('[test] movementSync playerJoined ADD remote', { sessionId: sid, username: msg.username, myPlayerId: my });
      store.addPlayer(makePlayer(msg.sessionId, msg.x, msg.z, msg.rotY, msg.username, msg.avatarUrl));
    });

    broadcastRouter.register('playerLeft', (msg) => {
      store.removePlayer(msg.sessionId);
    });

    broadcastRouter.register('playerMoved', (msg) => {
      const my = connection.myPlayerId;
      if (String(msg.sessionId) === String(my)) return;
      store.updatePosition(msg.sessionId, msg.x, msg.z, msg.rotY);
    });

    privateRouter.register('syncPlayers', (msg) => {
      if (!connection.acceptSyncPlayersResponse(msg.clientSeq)) {
        console.log('[MovementSync] syncPlayers dropped (stale clientSeq)', msg.clientSeq);
        return;
      }
      const players = msg.players ?? [];
      console.log('[MovementSync] syncPlayers received, count:', players.length, 'seq', msg.clientSeq);
      const myId = connection.myPlayerId;
      console.log('[test] movementSync syncPlayers', {
        seq: msg.clientSeq,
        myPlayerId: myId,
        serverSessionIds: players.map((p) => p.sessionId),
      });
      const serverIds = new Set(
        players.map((p) => p.sessionId).filter((id) => String(id) !== String(myId)),
      );
      for (const id of [...store.getIds()]) {
        if (!serverIds.has(id)) {
          store.removePlayer(id);
        }
      }
      for (const p of players) {
        if (String(p.sessionId) === String(myId)) continue;
        console.log('[MovementSync] hydrating:', p.sessionId, p.username);
        store.addPlayer(makePlayer(p.sessionId, p.x, p.z, p.rotY, p.username, p.avatarUrl, p.animation, p.posture));
      }
    });

    return () => {
      broadcastRouter.unregister('playerJoined');
      broadcastRouter.unregister('playerLeft');
      broadcastRouter.unregister('playerMoved');
      privateRouter.unregister('syncPlayers');
    };
  }, [broadcastRouter, privateRouter, store, connection]);

  const sendPosition = useCallback(
    (x: number, z: number, rotY: number) => connection.sendPositionThrottled(x, z, rotY),
    [connection],
  );

  return { sendPosition };
}
