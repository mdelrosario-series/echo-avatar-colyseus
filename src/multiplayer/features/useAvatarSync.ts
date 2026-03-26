// ---------------------------------------------------------------------------
// useAvatarSync — registers playerAvatar handler, exposes sendAvatar.
// ---------------------------------------------------------------------------

import { useEffect, useCallback } from 'react';
import type { MessageRouter } from '../core/MessageRouter';
import type { BroadcastMessage } from '../protocol/echoAvatarProtocol';
import type { PlayerStore } from '../core/PlayerStore';
import type { ConnectionManager } from '../core/ConnectionManager';

export function useAvatarSync(
  broadcastRouter: MessageRouter<BroadcastMessage>,
  store: PlayerStore,
  connection: ConnectionManager,
) {
  useEffect(() => {
    broadcastRouter.register('playerAvatar', (msg) => {
      if (msg.sessionId === connection.myPlayerId) return;
      store.updateAvatar(msg.sessionId, msg.avatarUrl.trim());
    });

    return () => {
      broadcastRouter.unregister('playerAvatar');
    };
  }, [broadcastRouter, store, connection]);

  const sendAvatar = useCallback(
    (avatarUrl: string | null) => {
      connection.send({ type: 'setAvatar', avatarUrl: avatarUrl ?? '' });
    },
    [connection],
  );

  return { sendAvatar };
}
