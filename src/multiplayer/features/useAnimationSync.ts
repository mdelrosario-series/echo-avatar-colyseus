// ---------------------------------------------------------------------------
// useAnimationSync — registers playerAnimation handler, exposes sendAnimation.
// ---------------------------------------------------------------------------

import { useEffect, useCallback } from 'react';
import type { MessageRouter } from '../core/MessageRouter';
import type { BroadcastMessage } from '../protocol/echoAvatarProtocol';
import type { PlayerStore } from '../core/PlayerStore';
import type { ConnectionManager } from '../core/ConnectionManager';

export function useAnimationSync(
  broadcastRouter: MessageRouter<BroadcastMessage>,
  store: PlayerStore,
  connection: ConnectionManager,
) {
  useEffect(() => {
    broadcastRouter.register('playerAnimation', (msg) => {
      if (msg.sessionId === connection.myPlayerId) return;
      store.updateAnimation(msg.sessionId, msg.animation);
    });

    return () => {
      broadcastRouter.unregister('playerAnimation');
    };
  }, [broadcastRouter, store, connection]);

  const sendAnimation = useCallback(
    (animation: string) => {
      connection.send({ type: 'setAnimation', animation });
    },
    [connection],
  );

  return { sendAnimation };
}
