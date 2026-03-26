import { BaseRoom } from './BaseRoom'

// Private home room — created fresh each session by the owner.
// Access is controlled by roomCode (6-char) which the owner shares manually.
// maxPlayers: 10 is set in rooms.config.json.
export default class PlayerRoom extends BaseRoom {
  protected readonly echoRoomType = 'player_room' as const
}
