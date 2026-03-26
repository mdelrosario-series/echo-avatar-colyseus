import { GameRoom, type GameMessage } from '@series-inc/rundot-game-sdk/mp-server'
import type { Player, LeaveReason } from '@series-inc/rundot-game-sdk/mp-server'
import type { EchoAvatarProtocol } from './types'
import { PlayerManager } from './core/PlayerManager'
import { handleMovement } from './handlers/MovementHandler'
import { handleChat } from './handlers/ChatHandler'
import { handleKick } from './handlers/KickHandler'
import { handleAvatar } from './handlers/AvatarHandler'
import { handleAnimation } from './handlers/AnimationHandler'
import { handleWave } from './handlers/WaveHandler'
import { handlePosture } from './handlers/PostureHandler'
import { buildSyncSnapshot } from './handlers/SyncHandler'

// ---------------------------------------------------------------------------
// BaseRoom — shared logic for all EchoAvatar room types.
// WorldRoom, PlayerRoom, and AvatarRoom all extend this.
//
// Delegates message handling to focused handler functions in /handlers.
// Player state is managed by PlayerManager in /core.
//
// NOTE: The Rundot API does not support broadcast({ except: playerId }).
// We broadcast to all players including sender. The client filters out
// messages where sessionId === room.playerId.
// ---------------------------------------------------------------------------

export abstract class BaseRoom extends GameRoom<EchoAvatarProtocol> {
  private manager = new PlayerManager()
  private ownerId: string | null = null

  /** Subclasses set this so clients know which environment preset to render. */
  protected abstract readonly echoRoomType: 'world_room' | 'player_room' | 'avatar_room'

  /** Index of the environment variant: 0=cozy01, 1=cozy02, 2=cozy03. Fixed so every
   *  client in the room matches (including late invite joins). */
  private environmentIndex = 2

  onCreate() {
    this.log.info(`[${this.constructor.name}] created — environmentIndex=${this.environmentIndex}`)
  }

  onPlayerJoin(player: Player) {
    if (this.ownerId === null) this.ownerId = player.id

    this.log.info(`[${this.constructor.name}] playerJoin — id=${player.id} username=${player.username}`)

    this.manager.add(player.id, player.username, player.avatarUrl ?? '')

    // Tell the joining player which environment this room uses
    this.sendTo(player.id, {
      type: 'roomInfo',
      environmentIndex: this.environmentIndex,
      roomType: this.echoRoomType,
      ownerId: this.ownerId,
    })

    // Broadcast join to all
    this.broadcast({
      type: 'playerJoined',
      sessionId: player.id,
      x: 0,
      z: 0,
      rotY: 0,
      username: player.username,
      avatarUrl: player.avatarUrl ?? '',
    })

    this.log.info(`[${this.constructor.name}] ${player.username} joined (${this.playerCount} total)`)
  }

  onGameMessage(message: GameMessage<EchoAvatarProtocol>) {
    const { sender, payload } = message

    switch (payload.type) {
      // ---------- Movement ----------
      case 'updatePosition': {
        const result = handleMovement(sender.id, payload, this.manager)
        if (!result.accepted) return
        this.broadcast({
          type: 'playerMoved',
          sessionId: sender.id,
          x: result.x,
          z: result.z,
          rotY: result.rotY,
        })
        break
      }

      // ---------- Avatar ----------
      case 'setAvatar': {
        const result = handleAvatar(sender.id, payload, this.manager)
        if (!result.accepted) return
        this.broadcast({
          type: 'playerAvatar',
          sessionId: sender.id,
          avatarUrl: result.avatarUrl,
        })
        break
      }

      // ---------- Chat ----------
      case 'chat': {
        const result = handleChat(sender.id, payload, this.manager)
        if (!result.accepted) return
        this.broadcast({
          type: 'chatMessage',
          sessionId: sender.id,
          username: sender.username,
          text: result.text,
        })
        break
      }

      // ---------- Animation ----------
      case 'setAnimation': {
        const result = handleAnimation(payload)
        if (!result.accepted) return
        this.manager.updateAnimation(sender.id, result.animation)
        this.broadcast({
          type: 'playerAnimation',
          sessionId: sender.id,
          animation: result.animation,
        })
        break
      }

      // ---------- Wave ----------
      case 'wave': {
        if (!handleWave(sender.id, this.manager)) return
        this.broadcast({
          type: 'playerWave',
          sessionId: sender.id,
        })
        break
      }

      // ---------- Voluntary leave (before socket close) ----------
      case 'gracefulLeave': {
        const removed = this.manager.remove(sender.id)
        if (removed) {
          this.broadcast({ type: 'playerLeft', sessionId: sender.id })
          this.log.info(`[${this.constructor.name}] gracefulLeave — ${sender.username} (${sender.id})`)
        }
        break
      }

      // ---------- Sync ----------
      case 'requestSync': {
        this.log.info(`[${this.constructor.name}] requestSync from ${sender.id}`)
        const players = buildSyncSnapshot(sender.id, this.manager)
        const clientSeq = payload.clientSeq
        this.sendTo(sender.id, {
          type: 'syncPlayers',
          players,
          ...(typeof clientSeq === 'number' ? { clientSeq } : {}),
        })
        // Re-send roomInfo — the initial sendTo fires before the client
        // registers its onPrivateMessage listener, so this guarantees delivery.
        this.sendTo(sender.id, {
          type: 'roomInfo',
          environmentIndex: this.environmentIndex,
          roomType: this.echoRoomType,
          ownerId: this.ownerId,
        })
        break
      }

      // ---------- Posture ----------
      case 'setPosture': {
        const result = handlePosture(payload)
        if (!result.accepted) return
        this.manager.updatePosture(sender.id, result.postureId)
        this.broadcast({
          type: 'playerPosture',
          sessionId: sender.id,
          postureId: result.postureId,
        })
        break
      }

      // ---------- Kick ----------
      case 'kickPlayer': {
        const result = handleKick(sender.id, this.ownerId, payload, this.manager)
        if (!result.accepted) return
        this.sendTo(result.targetId, { type: 'playerKicked', reason: 'Kicked by room owner' })
        this.broadcast({ type: 'playerLeft', sessionId: result.targetId })
        this.log.info(`[${this.constructor.name}] ${sender.username} kicked ${result.targetId}`)
        break
      }
    }
  }

  onPlayerLeave(player: Player, reason: LeaveReason) {
    // Avoid duplicate playerLeft if gracefulLeave already removed this player.
    const removed = this.manager.remove(player.id)
    if (removed) {
      this.broadcast({ type: 'playerLeft', sessionId: player.id })
    }
    this.log.info(`[${this.constructor.name}] ${player.username} left (reason: ${reason})`)
  }

  onDispose() {
    this.log.info(`[${this.constructor.name}] disposed`)
  }
}
