import { Client, Room } from '@colyseus/core'
import type {
  EchoAvatarProtocol,
  EchoRoomType,
  PrivateMessage,
  BroadcastMessage,
} from '../../../src/multiplayer/protocol/echoAvatarProtocol'
import { PlayerManager } from '../game/core/PlayerManager'
import { handleMovement } from '../game/handlers/MovementHandler'
import { handleChat } from '../game/handlers/ChatHandler'
import { handleKick } from '../game/handlers/KickHandler'
import { handleAvatar } from '../game/handlers/AvatarHandler'
import { handleAnimation } from '../game/handlers/AnimationHandler'
import { handleWave } from '../game/handlers/WaveHandler'
import { handlePosture } from '../game/handlers/PostureHandler'
import { buildSyncSnapshot } from '../game/handlers/SyncHandler'

const CLIENT_MSG = new Set<string>([
  'updatePosition',
  'setAvatar',
  'setAnimation',
  'chat',
  'wave',
  'kickPlayer',
  'requestSync',
  'setPosture',
  'gracefulLeave',
])

/**
 * Game rooms: world_room, player_room, avatar_room (echoRoomType from defineRoom defaults + join options).
 */
type EchoClient = Client & { echoProfileId?: string }

export class EchoGameRoom extends Room {
  private manager = new PlayerManager()
  private ownerId: string | null = null
  /** RUN.game profile id → connection; second join with same id evicts the first (StrictMode / reconnect races). */
  private byProfileId = new Map<string, Client>()
  private echoRoomType: EchoRoomType = 'player_room'
  private environmentIndex = 2

  onCreate(options: {
    echoRoomType?: EchoRoomType
    maxClients?: number
    plazaId?: string
    ownerProfileId?: string
  }) {
    this.echoRoomType = options.echoRoomType ?? 'player_room'
    this.maxClients = options.maxClients ?? 50
    console.log(`[EchoGameRoom] created type=${this.echoRoomType} maxClients=${this.maxClients}`)
  }

  onJoin(
    client: Client,
    options: { username?: string; avatarUrl?: string; profileId?: string; ownerProfileId?: string },
  ) {
    const username = options.username ?? 'player'
    const avatarUrl = options.avatarUrl ?? ''

    const profileId = typeof options.profileId === 'string' ? options.profileId.trim() : ''
    if (profileId) {
      const prev = this.byProfileId.get(profileId)
      if (prev && prev !== client) {
        try {
          prev.leave(4003, 'duplicate_profile')
        } catch {
          /* ignore */
        }
      }
      this.byProfileId.set(profileId, client)
      ;(client as EchoClient).echoProfileId = profileId
    }

    if (this.ownerId === null) {
      this.ownerId = client.sessionId
    }

    this.manager.add(client.sessionId, username, avatarUrl)

    const roomInfo: PrivateMessage = {
      type: 'roomInfo',
      environmentIndex: this.environmentIndex,
      roomType: this.echoRoomType,
      ownerId: this.ownerId,
    }
    client.send('p', roomInfo)

    const joined: BroadcastMessage = {
      type: 'playerJoined',
      sessionId: client.sessionId,
      x: 0,
      z: 0,
      rotY: 0,
      username,
      avatarUrl,
    }
    this.broadcast('b', joined)
  }

  onLeave(client: Client) {
    const sid = client.sessionId
    const pid = (client as EchoClient).echoProfileId
    if (pid && this.byProfileId.get(pid) === client) {
      this.byProfileId.delete(pid)
    }

    const removed = this.manager.remove(sid)
    if (removed) {
      this.broadcast('b', { type: 'playerLeft', sessionId: sid })
    }

    if (this.ownerId === sid) {
      const next = [...this.clients].find((c) => c.sessionId !== sid)
      this.ownerId = next?.sessionId ?? null
    }
  }

  messages = {
    echo: (client: Client, payload: EchoAvatarProtocol) => {
      if (!payload || typeof payload !== 'object' || !('type' in payload)) return
      const t = payload.type
      if (!CLIENT_MSG.has(t)) return

      const senderId = client.sessionId
      const senderName = this.manager.get(senderId)?.username ?? 'player'

      switch (t) {
        case 'updatePosition': {
          const result = handleMovement(senderId, payload, this.manager)
          if (!result.accepted) return
          this.broadcast('b', {
            type: 'playerMoved',
            sessionId: senderId,
            x: result.x,
            z: result.z,
            rotY: result.rotY,
          })
          break
        }
        case 'setAvatar': {
          const result = handleAvatar(senderId, payload, this.manager)
          if (!result.accepted) return
          this.broadcast('b', {
            type: 'playerAvatar',
            sessionId: senderId,
            avatarUrl: result.avatarUrl,
          })
          break
        }
        case 'chat': {
          const result = handleChat(senderId, payload, this.manager)
          if (!result.accepted) return
          this.broadcast('b', {
            type: 'chatMessage',
            sessionId: senderId,
            username: senderName,
            text: result.text,
          })
          break
        }
        case 'setAnimation': {
          const result = handleAnimation(payload)
          if (!result.accepted) return
          this.manager.updateAnimation(senderId, result.animation)
          this.broadcast('b', {
            type: 'playerAnimation',
            sessionId: senderId,
            animation: result.animation,
          })
          break
        }
        case 'wave': {
          if (!handleWave(senderId, this.manager)) return
          this.broadcast('b', { type: 'playerWave', sessionId: senderId })
          break
        }
        case 'gracefulLeave': {
          const removed = this.manager.remove(senderId)
          if (removed) {
            this.broadcast('b', { type: 'playerLeft', sessionId: senderId })
          }
          break
        }
        case 'requestSync': {
          const players = buildSyncSnapshot(senderId, this.manager)
          const clientSeq = payload.clientSeq
          const sync: PrivateMessage = {
            type: 'syncPlayers',
            players,
            ...(typeof clientSeq === 'number' ? { clientSeq } : {}),
          }
          client.send('p', sync)
          client.send('p', {
            type: 'roomInfo',
            environmentIndex: this.environmentIndex,
            roomType: this.echoRoomType,
            ownerId: this.ownerId,
          } satisfies PrivateMessage)
          break
        }
        case 'setPosture': {
          const result = handlePosture(payload)
          if (!result.accepted) return
          this.manager.updatePosture(senderId, result.postureId)
          this.broadcast('b', {
            type: 'playerPosture',
            sessionId: senderId,
            postureId: result.postureId,
          })
          break
        }
        case 'kickPlayer': {
          const result = handleKick(senderId, this.ownerId, payload, this.manager)
          if (!result.accepted) return
          const targetClient = this.clients.find((c) => c.sessionId === result.targetId)
          targetClient?.send('p', { type: 'playerKicked', reason: 'Kicked by room owner' })
          this.broadcast('b', { type: 'playerLeft', sessionId: result.targetId })
          targetClient?.leave(4002, 'kicked')
          break
        }
        default:
          break
      }
    },
  }
}
