import { useEffect, useSyncExternalStore } from 'react'
import { useGlobalRoomContext } from '../multiplayer/global/useGlobalRoom'
import {
  getGlobalRoomMembersUiVisible,
  subscribeGlobalRoomMembersUi,
} from './globalRoomMembersUi'

const POLL_INTERVAL_MS = 3_000

/**
 * Renders the members panel only when toggled via `globalThis.__ECHO_GLOBAL_ROOM_UI__`.
 * Must stay under `GlobalRoomProvider`.
 */
export function GlobalRoomMembersUiGate() {
  const visible = useSyncExternalStore(
    subscribeGlobalRoomMembersUi,
    getGlobalRoomMembersUiVisible,
    getGlobalRoomMembersUiVisible,
  )
  if (!visible) return null
  return <GlobalRoomDebugOverlay />
}

/** Left-edge, vertically centered list of global_room member IDs (all environments). */
export function GlobalRoomDebugOverlay() {
  const { myInviteId, globalPlayers, refreshPlayerList } = useGlobalRoomContext()

  useEffect(() => {
    refreshPlayerList()
    const id = setInterval(refreshPlayerList, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refreshPlayerList])

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 99999,
        maxWidth: 'min(42vw, 280px)',
        padding: '10px 10px 10px 8px',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 10,
        lineHeight: 1.35,
        color: '#b8f5c0',
        background: 'rgba(0, 0, 0, 0.78)',
        border: '1px solid rgba(80, 200, 120, 0.45)',
        borderLeft: 'none',
        borderRadius: '0 6px 6px 0',
        pointerEvents: 'none',
        boxShadow: '2px 0 12px rgba(0,0,0,0.35)',
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: '#6ecf8a',
          marginBottom: 6,
        }}
      >
        Global_room members
      </div>

      {globalPlayers.length === 0 ? (
        <div style={{ color: '#666', fontStyle: 'italic' }}>No members (anonymous or not connected)</div>
      ) : (
        <ol
          style={{
            margin: 0,
            paddingLeft: 18,
            paddingRight: 0,
          }}
        >
          {globalPlayers.map((p) => (
            <li key={p.id} style={{ marginBottom: 4, wordBreak: 'break-all' }}>
              <span style={{ color: '#e8ffe8' }}>{p.id}</span>
              {p.username ? (
                <span style={{ color: '#7a9e7a', display: 'block', fontSize: 9 }}>
                  {p.username}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      <div
        style={{
          marginTop: 8,
          paddingTop: 6,
          borderTop: '1px solid rgba(80, 200, 120, 0.25)',
          fontSize: 9,
          color: '#5a8a5a',
          wordBreak: 'break-all',
        }}
      >
        My room id: {myInviteId ?? '—'}
      </div>
    </div>
  )
}
