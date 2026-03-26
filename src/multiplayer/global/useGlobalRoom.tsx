import { useState, useEffect, useCallback, useRef, createContext, useContext, type ReactNode } from 'react'
import type { Room } from '@colyseus/sdk'
import RundotGameAPI from '@series-inc/rundot-game-sdk/api'
import type { GlobalPrivateMessage } from '../protocol/globalLobbyProtocol'
import { getColyseusClient } from '../colyseusClient'
import { awaitColyseusLeaves, enqueueColyseusLeave } from '../colyseusLeaveChain'
import { useGame } from '../../context/GameContext'
import { useAudio } from '../../audio'

// ---------------------------------------------------------------------------
// useGlobalRoom — Colyseus `global_lobby`: invites + presence list (profile id).
// Stable myInviteId = getProfile().id for sendInvite / PlayerIdCard.
// ---------------------------------------------------------------------------

const GLOBAL_ROOM_HEARTBEAT_MS = 10_000
const GLOBAL_ROOM_REJOIN_BASE_MS = 1_500
const GLOBAL_ROOM_REJOIN_MAX_MS = 45_000

export interface PendingInvite {
  id: string
  fromId: string
  fromName: string
  roomCode: string
}

export interface GlobalRoomPlayer {
  id: string
  username: string
}

export interface GlobalRoomValue {
  myInviteId: string | null
  pendingInvites: PendingInvite[]
  globalPlayers: GlobalRoomPlayer[]
  acceptInvite: (id: string) => void
  dismissInvite: (id: string) => void
  sendInvite: (toPlayerId: string, roomCode: string) => void
  refreshPlayerList: () => void
}

function useGlobalRoom(): GlobalRoomValue {
  const profileRef = useRef(RundotGameAPI.getProfile())
  const [myInviteId] = useState<string | null>(() =>
    profileRef.current.isAnonymous ? null : profileRef.current.id,
  )
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [globalPlayers, setGlobalPlayers] = useState<GlobalRoomPlayer[]>([])
  const { setPendingJoin } = useGame()
  const { playSfx } = useAudio()
  const roomRef = useRef<Room | null>(null)
  const unsubsRef = useRef<Array<() => void>>([])
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptRef = useRef(0)

  useEffect(() => {
    const profile = RundotGameAPI.getProfile()
    if (profile.isAnonymous) return

    const userId = profile.id
    let cancelled = false

    const stopHeartbeat = () => {
      if (heartbeatIntervalRef.current !== null) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
    }

    const clearUnsubs = () => {
      for (const u of unsubsRef.current) u()
      unsubsRef.current = []
    }

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }

    const startHeartbeat = () => {
      stopHeartbeat()
      heartbeatIntervalRef.current = setInterval(() => {
        roomRef.current?.send('echo', { type: 'requestPlayerList' })
      }, GLOBAL_ROOM_HEARTBEAT_MS)
    }

    const scheduleRejoin = (_reason: string) => {
      if (cancelled) return
      clearReconnectTimer()
      const attempt = reconnectAttemptRef.current
      const delayMs = Math.min(
        GLOBAL_ROOM_REJOIN_MAX_MS,
        GLOBAL_ROOM_REJOIN_BASE_MS * Math.pow(2, attempt),
      )
      reconnectAttemptRef.current = attempt + 1
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null
        if (cancelled) return
        void attachRoom()
      }, delayMs)
    }

    const attachRoom = async () => {
      if (cancelled) return
      try {
        if (roomRef.current) {
          stopHeartbeat()
          clearUnsubs()
          enqueueColyseusLeave(roomRef.current)
          roomRef.current = null
        }
        await awaitColyseusLeaves()

        const client = getColyseusClient()
        const room = await client.joinOrCreate('global_lobby', {
          userId,
          username: profile.username ?? '',
        })

        if (cancelled) {
          enqueueColyseusLeave(room)
          return
        }

        reconnectAttemptRef.current = 0
        clearReconnectTimer()

        roomRef.current = room
        setGlobalPlayers([{ id: userId, username: profile.username ?? 'me' }])

        unsubsRef.current.push(
          room.onMessage('p', (msg: GlobalPrivateMessage) => {
            if (msg.type === 'playerList') {
              setGlobalPlayers((prev) => {
                const selfEntry = prev.find((p) => p.id === userId)
                const others = msg.players.filter((p) => p.id !== userId)
                return selfEntry ? [selfEntry, ...others] : [{ id: userId, username: profile.username ?? 'me' }, ...others]
              })
            } else if (msg.type === 'inviteReceived') {
              const invite: PendingInvite = {
                id: `${Date.now()}-${msg.fromId}`,
                fromId: msg.fromId,
                fromName: msg.fromName,
                roomCode: msg.roomCode,
              }
              setPendingInvites((prev) => [...prev, invite])
              void playSfx('invite')
            } else if (msg.type === 'inviteError') {
              void RundotGameAPI.popups.showToast('Player is not currently online', { variant: 'warning' })
            }
          }),
        )

        const onLeaveCb = () => {
          stopHeartbeat()
          clearUnsubs()
          roomRef.current = null
          setGlobalPlayers([])
          if (!cancelled) scheduleRejoin('onLeave')
        }
        room.onLeave(onLeaveCb)
        unsubsRef.current.push(() => room.onLeave.remove(onLeaveCb))

        const onErrorCb = () => {
          stopHeartbeat()
          clearUnsubs()
          roomRef.current = null
          setGlobalPlayers([])
          if (!cancelled) scheduleRejoin('onError')
        }
        room.onError(onErrorCb)
        unsubsRef.current.push(() => room.onError.remove(onErrorCb))

        room.send('echo', { type: 'requestPlayerList' })
        startHeartbeat()
      } catch {
        if (!cancelled) scheduleRejoin('join failed')
      }
    }

    void attachRoom()

    return () => {
      cancelled = true
      clearReconnectTimer()
      stopHeartbeat()
      clearUnsubs()
      if (roomRef.current) {
        enqueueColyseusLeave(roomRef.current)
        roomRef.current = null
      }
    }
  }, [])

  const acceptInvite = useCallback(
    (id: string) => {
      const invite = pendingInvites.find((i) => i.id === id)
      if (!invite) return
      setPendingJoin(invite.roomCode)
      setPendingInvites((prev) => prev.filter((i) => i.id !== id))
    },
    [pendingInvites, setPendingJoin],
  )

  const dismissInvite = useCallback((id: string) => {
    setPendingInvites((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const sendInvite = useCallback((toPlayerId: string, roomCode: string) => {
    roomRef.current?.send('echo', { type: 'sendInvite', toPlayerId, roomCode })
  }, [])

  const refreshPlayerList = useCallback(() => {
    roomRef.current?.send('echo', { type: 'requestPlayerList' })
  }, [])

  return { myInviteId, pendingInvites, globalPlayers, acceptInvite, dismissInvite, sendInvite, refreshPlayerList }
}

const GlobalRoomContext = createContext<GlobalRoomValue | null>(null)

export function GlobalRoomProvider({ children }: { children: ReactNode }) {
  const value = useGlobalRoom()
  return <GlobalRoomContext.Provider value={value}>{children}</GlobalRoomContext.Provider>
}

export function useGlobalRoomContext(): GlobalRoomValue {
  const ctx = useContext(GlobalRoomContext)
  if (!ctx) throw new Error('useGlobalRoomContext must be used within GlobalRoomProvider')
  return ctx
}
