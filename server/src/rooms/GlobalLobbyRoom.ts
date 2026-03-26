import { Client, Room } from '@colyseus/core'
import type { GlobalRoomProtocol } from '../../../src/multiplayer/protocol/globalLobbyProtocol'

/**
 * Presence + invite routing. Clients join with stable profile userId (not Colyseus sessionId).
 */
export class GlobalLobbyRoom extends Room {
  private byUserId = new Map<string, Client>()

  onCreate() {
    console.log('[GlobalLobbyRoom] created')
  }

  onJoin(client: Client, options: { userId: string; username?: string }) {
    const userId = options.userId
    if (!userId) {
      throw new Error('global_lobby: userId required')
    }
    const prev = this.byUserId.get(userId)
    if (prev && prev !== client) {
      try {
        prev.leave(4001, 'duplicate_login')
      } catch {
        /* ignore */
      }
    }
    this.byUserId.set(userId, client)
    ;(client as Client & { echoUserId?: string }).echoUserId = userId
    ;(client as Client & { echoUsername?: string }).echoUsername = options.username ?? userId
  }

  onLeave(client: Client) {
    const uid = (client as Client & { echoUserId?: string }).echoUserId
    if (uid && this.byUserId.get(uid) === client) {
      this.byUserId.delete(uid)
    }
  }

  messages = {
    echo: (client: Client, payload: GlobalRoomProtocol) => {
      if (!payload || typeof payload !== 'object' || !('type' in payload)) return

      if (payload.type === 'requestPlayerList') {
        const players = this.clients.map((c) => ({
          id: (c as Client & { echoUserId?: string }).echoUserId ?? c.sessionId,
          username: (c as Client & { echoUsername?: string }).echoUsername ?? 'player',
        }))
        client.send('p', { type: 'playerList', players } satisfies GlobalRoomProtocol)
        return
      }

      if (payload.type !== 'sendInvite') return

      const { toPlayerId, roomCode } = payload
      const target = this.byUserId.get(toPlayerId)
      if (!target) {
        client.send('p', { type: 'inviteError', reason: 'playerOffline' })
        return
      }

      const fromId = (client as Client & { echoUserId?: string }).echoUserId ?? client.sessionId
      const fromName = (client as Client & { echoUsername?: string }).echoUsername ?? 'player'

      target.send('p', {
        type: 'inviteReceived',
        fromId,
        fromName,
        roomCode,
      })
    },
  }
}
