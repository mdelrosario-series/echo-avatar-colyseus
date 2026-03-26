// ---------------------------------------------------------------------------
// GlobalRoom Protocol
//
// Lightweight invite-routing protocol for the global_room singleton.
// Entirely separate from EchoAvatarProtocol — no avatar/position logic.
// ---------------------------------------------------------------------------

// ========================= Client → Server =========================

export interface SendInviteMsg {
  type: 'sendInvite'
  toPlayerId: string
  roomCode: string
}

export interface RequestPlayerListMsg {
  type: 'requestPlayerList'
}

/** Messages the client is allowed to send to the GlobalRoom. */
export type GlobalClientMessage = SendInviteMsg | RequestPlayerListMsg

// ========================= Server → One (private) =========================

export interface InviteReceivedMsg {
  type: 'inviteReceived'
  fromId: string
  fromName: string
  roomCode: string
}

export interface InviteErrorMsg {
  type: 'inviteError'
  reason: 'playerOffline'
}

export interface PlayerListMsg {
  type: 'playerList'
  players: Array<{ id: string; username: string }>
}

/** Messages the server sends privately to a single player via sendTo(). */
export type GlobalPrivateMessage = InviteReceivedMsg | InviteErrorMsg | PlayerListMsg

// ========================= Combined (SDK generic) =========================

/** Full protocol union — used as the SDK generic type parameter. */
export type GlobalRoomProtocol = GlobalClientMessage | GlobalPrivateMessage
