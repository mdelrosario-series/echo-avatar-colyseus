import { GameRoom, type GameMessage } from '@series-inc/rundot-game-sdk/mp-server'
import type { GlobalRoomProtocol } from './globalTypes'

// ---------------------------------------------------------------------------
// GlobalRoom — singleton presence + invite-routing room.
//
// Every client joins this room on app start. Its sole responsibility is
// routing sendInvite messages from one player to another via sendTo().
// No avatar, position, or game-state logic lives here.
// ---------------------------------------------------------------------------

export default class GlobalRoom extends GameRoom<GlobalRoomProtocol> {
  onCreate() {
    this.log.info('[GlobalRoom] created')
  }

  onGameMessage(message: GameMessage<GlobalRoomProtocol>) {
    const { sender, payload } = message

    if (payload.type === 'requestPlayerList') {
      const players = Array.from(this.players.values()).map(p => ({ id: p.id, username: p.username }))
      this.log.info(`[GlobalRoom] requestPlayerList from ${sender.username} — players in map: ${players.map(p => p.username).join(', ')}`)
      this.sendTo(sender.id, { type: 'playerList', players })
      return
    }

    if (payload.type !== 'sendInvite') return

    const { toPlayerId, roomCode } = payload

    if (!this.players.has(toPlayerId)) {
      this.sendTo(sender.id, { type: 'inviteError', reason: 'playerOffline' })
      this.log.info(`[GlobalRoom] invite failed — target offline: ${toPlayerId}`)
      return
    }

    this.sendTo(toPlayerId, {
      type: 'inviteReceived',
      fromId: sender.id,
      fromName: sender.username,
      roomCode,
    })

    this.log.info(`[GlobalRoom] invite routed from ${sender.id} to ${toPlayerId}`)
  }
}
