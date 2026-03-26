// ---------------------------------------------------------------------------
// EchoAvatar multiplayer protocol (shared client + Colyseus server)
// ---------------------------------------------------------------------------

export interface UpdatePositionMsg {
  type: 'updatePosition'
  x: number
  z: number
  rotY: number
}
export interface SetAvatarMsg {
  type: 'setAvatar'
  avatarUrl: string
}
export interface SetAnimationMsg {
  type: 'setAnimation'
  animation: string
}
export interface ChatMsg {
  type: 'chat'
  text: string
}
export interface WaveMsg {
  type: 'wave'
}
export interface KickPlayerMsg {
  type: 'kickPlayer'
  targetPlayerId: string
}
export interface RequestSyncMsg {
  type: 'requestSync'
  clientSeq?: number
}
export interface SetPostureMsg {
  type: 'setPosture'
  postureId: string | null
}
export interface GracefulLeaveMsg {
  type: 'gracefulLeave'
}

export type ClientMessage =
  | UpdatePositionMsg
  | SetAvatarMsg
  | SetAnimationMsg
  | ChatMsg
  | WaveMsg
  | KickPlayerMsg
  | RequestSyncMsg
  | SetPostureMsg
  | GracefulLeaveMsg

export interface PlayerJoinedMsg {
  type: 'playerJoined'
  sessionId: string
  x: number
  z: number
  rotY: number
  username: string
  avatarUrl: string
}
export interface PlayerLeftMsg {
  type: 'playerLeft'
  sessionId: string
}
export interface PlayerMovedMsg {
  type: 'playerMoved'
  sessionId: string
  x: number
  z: number
  rotY: number
}
export interface PlayerAvatarMsg {
  type: 'playerAvatar'
  sessionId: string
  avatarUrl: string
}
export interface PlayerAnimationMsg {
  type: 'playerAnimation'
  sessionId: string
  animation: string
}
export interface ChatBroadcastMsg {
  type: 'chatMessage'
  sessionId: string
  username: string
  text: string
}
export interface PlayerWaveMsg {
  type: 'playerWave'
  sessionId: string
}
export interface PlayerPostureMsg {
  type: 'playerPosture'
  sessionId: string
  postureId: string | null
}

export type BroadcastMessage =
  | PlayerJoinedMsg
  | PlayerLeftMsg
  | PlayerMovedMsg
  | PlayerAvatarMsg
  | PlayerAnimationMsg
  | ChatBroadcastMsg
  | PlayerWaveMsg
  | PlayerPostureMsg

export interface PlayerKickedMsg {
  type: 'playerKicked'
  reason?: string
}
export interface SyncPlayersMsg {
  type: 'syncPlayers'
  players: Array<{
    sessionId: string
    x: number
    z: number
    rotY: number
    username: string
    avatarUrl: string
    animation: string
    posture: string | null
  }>
  clientSeq?: number
}
export interface RoomInfoMsg {
  type: 'roomInfo'
  environmentIndex: number
  roomType: EchoRoomType
  ownerId: string | null
}

export type PrivateMessage = PlayerKickedMsg | SyncPlayersMsg | RoomInfoMsg

export type EchoAvatarProtocol = ClientMessage | BroadcastMessage | PrivateMessage

export type EchoRoomType = 'player_room' | 'world_room' | 'avatar_room'

export interface PlayerPositionState {
  x: number
  z: number
  rotY: number
  avatarUrl: string
}
