// ---------------------------------------------------------------------------
// usePostureSync — registers playerPosture handler, exposes sendPosture.
// ---------------------------------------------------------------------------

import { useEffect, useCallback } from 'react';
import type { MessageRouter } from '../core/MessageRouter';
import type { BroadcastMessage } from '../protocol/echoAvatarProtocol';
import type { PlayerStore } from '../core/PlayerStore';
import type { ConnectionManager } from '../core/ConnectionManager';

export function usePostureSync(
  broadcastRouter: MessageRouter<BroadcastMessage>,
  store: PlayerStore,
  connection: ConnectionManager,
) {
  useEffect(() => {
    broadcastRouter.register('playerPosture', (msg) => {
      if (msg.sessionId === connection.myPlayerId) return;
      store.updatePosture(msg.sessionId, msg.postureId);
    });

    return () => {
      broadcastRouter.unregister('playerPosture');
    };
  }, [broadcastRouter, store, connection]);

  const sendPosture = useCallback(
    (postureId: string | null) => {
      connection.send({ type: 'setPosture', postureId });
    },
    [connection],
  );

  return { sendPosture };
}
