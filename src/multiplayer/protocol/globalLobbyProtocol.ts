// ---------------------------------------------------------------------------
// Global lobby protocol (invites + presence list)
// ---------------------------------------------------------------------------

export interface SendInviteMsg {
  type: 'sendInvite'
  toPlayerId: string
  roomCode: string
}

export interface RequestPlayerListMsg {
  type: 'requestPlayerList'
}

export type GlobalClientMessage = SendInviteMsg | RequestPlayerListMsg

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

export type GlobalPrivateMessage = InviteReceivedMsg | InviteErrorMsg | PlayerListMsg

export type GlobalRoomProtocol = GlobalClientMessage | GlobalPrivateMessage
