export type RoomType = 'avatar_room' | 'world_room' | 'player_room';

export interface RoomInfo {
  roomId: string;
  roomName: string;
  roomType: RoomType;
  playerCount: number;
  maxClients: number;
  isPublic: boolean;
}

// ---------------------------------------------------------------------------
// RemotePlayer — single source of truth for everything we know about a
// remote player.  Replaces the old scattered state:
//   remotePlayerIds[]
//   remotePlayerAvatarUrls{}
//   remotePlayerAnimations{}
//   remotePlayerNames{}
//   remotePlayerPositions Map<string, RemotePlayerState>
// ---------------------------------------------------------------------------

export interface RemotePlayer {
  id: string;
  username: string;
  avatarUrl: string;
  animation: string;
  /** Current posture ID, or null if the player is in no posture (standing). */
  posture: string | null;

  // Position — latest received snapshot
  x: number;
  z: number;
  rotY: number;
  lastUpdate: number;

  // Position — previous snapshot (interpolation start point)
  prevX: number;
  prevZ: number;
  prevRotY: number;
  prevUpdate: number;
}

// ---------------------------------------------------------------------------
// Legacy type — used by remotePlayerPositions Map and RemotePlayers.tsx.
// [TECH DEBT] Remove once PlayerStore replaces the scattered state in step 1.4.
// ---------------------------------------------------------------------------

export interface RemotePlayerState {
  x: number;
  z: number;
  rotY: number;
  lastUpdate: number;
  prevX: number;
  prevZ: number;
  prevRotY: number;
  prevUpdate: number;
  username: string;
  avatarUrl?: string;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}
