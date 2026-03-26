import { BaseRoom } from './BaseRoom'

// Singleton public plaza — one instance shared by all players.
// singleton: true and maxPlayers: 50 are set in rooms.config.json.
export default class WorldRoom extends BaseRoom {
  protected readonly echoRoomType = 'world_room' as const
}
