import { Room } from '@colyseus/core';
/**
 * Presence + invite routing. Clients join with stable profile userId (not Colyseus sessionId).
 */
export class GlobalLobbyRoom extends Room {
    byUserId = new Map();
    onCreate() {
        console.log('[GlobalLobbyRoom] created');
    }
    onJoin(client, options) {
        const userId = options.userId;
        if (!userId) {
            throw new Error('global_lobby: userId required');
        }
        const prev = this.byUserId.get(userId);
        if (prev && prev !== client) {
            try {
                prev.leave(4001, 'duplicate_login');
            }
            catch {
                /* ignore */
            }
        }
        this.byUserId.set(userId, client);
        client.echoUserId = userId;
        client.echoUsername = options.username ?? userId;
    }
    onLeave(client) {
        const uid = client.echoUserId;
        if (uid && this.byUserId.get(uid) === client) {
            this.byUserId.delete(uid);
        }
    }
    messages = {
        echo: (client, payload) => {
            if (!payload || typeof payload !== 'object' || !('type' in payload))
                return;
            if (payload.type === 'requestPlayerList') {
                const players = this.clients.map((c) => ({
                    id: c.echoUserId ?? c.sessionId,
                    username: c.echoUsername ?? 'player',
                }));
                client.send('p', { type: 'playerList', players });
                return;
            }
            if (payload.type !== 'sendInvite')
                return;
            const { toPlayerId, roomCode } = payload;
            const target = this.byUserId.get(toPlayerId);
            if (!target) {
                client.send('p', { type: 'inviteError', reason: 'playerOffline' });
                return;
            }
            const fromId = client.echoUserId ?? client.sessionId;
            const fromName = client.echoUsername ?? 'player';
            target.send('p', {
                type: 'inviteReceived',
                fromId,
                fromName,
                roomCode,
            });
        },
    };
}
