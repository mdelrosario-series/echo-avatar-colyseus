// ---------------------------------------------------------------------------
// useChatSync — registers chatMessage handler, exposes sendChat + messages.
// ---------------------------------------------------------------------------

import { useEffect, useCallback, useState } from 'react';
import type { MessageRouter } from '../core/MessageRouter';
import type { BroadcastMessage } from '../protocol/echoAvatarProtocol';
import type { ConnectionManager } from '../core/ConnectionManager';
import type { ChatMessage } from '../types';

const MAX_MESSAGES = 50;

export function useChatSync(
  broadcastRouter: MessageRouter<BroadcastMessage>,
  connection: ConnectionManager,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    broadcastRouter.register('chatMessage', (msg) => {
      if (msg.sessionId === connection.myPlayerId) return;
      setMessages(prev => [
        ...prev.slice(-(MAX_MESSAGES - 1)),
        {
          id: `${msg.sessionId}-${Date.now()}`,
          senderId: msg.sessionId,
          senderName: msg.username,
          text: msg.text,
          timestamp: Date.now(),
        },
      ]);
    });

    return () => {
      broadcastRouter.unregister('chatMessage');
    };
  }, [broadcastRouter, connection]);

  const sendChat = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    connection.send({ type: 'chat', text: trimmed });
    setMessages(prev => [
      ...prev.slice(-(MAX_MESSAGES - 1)),
      {
        id: `me-${Date.now()}`,
        senderId: connection.myPlayerId,
        senderName: 'You',
        text: trimmed,
        timestamp: Date.now(),
      },
    ]);
  }, [connection]);

  /** Clear messages (e.g. on reconnect). */
  const clearMessages = useCallback(() => setMessages([]), []);

  return { messages, sendChat, clearMessages };
}
