import type { PendingInvite } from '../multiplayer/global/useGlobalRoom'

interface InviteToastProps {
  invite: PendingInvite
  onAccept: () => void
  onDismiss: () => void
}

export function InviteToast({ invite, onAccept, onDismiss }: InviteToastProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'rgba(24, 24, 32, 0.95)',
        color: '#fff',
        borderRadius: 14,
        padding: '14px 20px',
        minWidth: 260,
        maxWidth: 340,
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'sans-serif',
      }}
    >
      <span style={{ fontSize: 14, textAlign: 'center', lineHeight: 1.4 }}>
        <strong>{invite.fromName}</strong> invited you to join their room
      </span>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onAccept}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#4f8cff',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Join
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'transparent',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
