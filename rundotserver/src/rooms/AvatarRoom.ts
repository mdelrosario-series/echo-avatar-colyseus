import { BaseRoom } from './BaseRoom'

// Player-created public rooms — joinable by roomCode.
// maxPlayers: 25 is set in rooms.config.json.
export default class AvatarRoom extends BaseRoom {
  protected readonly echoRoomType = 'avatar_room' as const
}
