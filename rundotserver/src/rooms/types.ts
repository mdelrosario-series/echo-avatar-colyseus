// ---------------------------------------------------------------------------
// EchoAvatar Multiplayer Protocol
//
// Split into three direction-typed unions so the compiler catches wrong-
// direction usage.  The combined EchoAvatarProtocol union is still used as
// the SDK generic type parameter.
// ---------------------------------------------------------------------------

// ========================= Client → Server =========================

export interface UpdatePositionMsg { type: 'updatePosition'; x: number; z: number; rotY: number }
export interface SetAvatarMsg      { type: 'setAvatar';      avatarUrl: string }
export interface SetAnimationMsg   { type: 'setAnimation';   animation: string }
export interface ChatMsg           { type: 'chat';           text: string }
export interface WaveMsg           { type: 'wave' }
export interface KickPlayerMsg     { type: 'kickPlayer';     targetPlayerId: string }
export interface RequestSyncMsg    { type: 'requestSync'; clientSeq?: number }
export interface SetPostureMsg     { type: 'setPosture';     postureId: string | null }
/** Client is leaving on purpose — server broadcasts playerLeft before WS teardown (faster for peers). */
export interface GracefulLeaveMsg   { type: 'gracefulLeave' }

/** Messages the client is allowed to send to the server. */
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

// ========================= Server → All (broadcast) =========================

export interface PlayerJoinedMsg    { type: 'playerJoined';    sessionId: string; x: number; z: number; rotY: number; username: string; avatarUrl: string }
export interface PlayerLeftMsg      { type: 'playerLeft';      sessionId: string }
export interface PlayerMovedMsg     { type: 'playerMoved';     sessionId: string; x: number; z: number; rotY: number }
export interface PlayerAvatarMsg    { type: 'playerAvatar';    sessionId: string; avatarUrl: string }
export interface PlayerAnimationMsg { type: 'playerAnimation'; sessionId: string; animation: string }
export interface ChatBroadcastMsg   { type: 'chatMessage';     sessionId: string; username: string; text: string }
export interface PlayerWaveMsg      { type: 'playerWave';      sessionId: string }
export interface PlayerPostureMsg   { type: 'playerPosture';   sessionId: string; postureId: string | null }

/** Messages the server broadcasts to ALL connected players (including sender). */
export type BroadcastMessage =
  | PlayerJoinedMsg
  | PlayerLeftMsg
  | PlayerMovedMsg
  | PlayerAvatarMsg
  | PlayerAnimationMsg
  | ChatBroadcastMsg
  | PlayerWaveMsg
  | PlayerPostureMsg

// ========================= Server → One (private) =========================

export interface PlayerKickedMsg { type: 'playerKicked'; reason?: string }
export interface SyncPlayersMsg  { type: 'syncPlayers';  players: Array<{ sessionId: string; x: number; z: number; rotY: number; username: string; avatarUrl: string; animation: string; posture: string | null }>; clientSeq?: number }
export interface RoomInfoMsg     { type: 'roomInfo';     environmentIndex: number; roomType: EchoRoomType; ownerId: string | null }

/** Messages the server sends privately to a single player via sendTo(). */
export type PrivateMessage =
  | PlayerKickedMsg
  | SyncPlayersMsg
  | RoomInfoMsg

// ========================= Combined (SDK generic) =========================

/** Full protocol union — used as the SDK generic type parameter. */
export type EchoAvatarProtocol = ClientMessage | BroadcastMessage | PrivateMessage

// ========================= Room types =========================

export type EchoRoomType = 'player_room' | 'world_room' | 'avatar_room'

// ========================= Server-side state =========================

/** Per-player position state tracked server-side. */
export interface PlayerPositionState {
  x: number
  z: number
  rotY: number
  avatarUrl: string
}
