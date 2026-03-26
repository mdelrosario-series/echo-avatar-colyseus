import type { UseMultiplayerOptions } from '../multiplayer/useMultiplayer';
import { playUiClick } from '../audio';

// ---------------------------------------------------------------------------
// Shared inline-style helpers
// ---------------------------------------------------------------------------
const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: 1.2,
  color: 'rgba(255,255,255,0.5)',
  marginBottom: 8,
};

const divider: React.CSSProperties = {
  width: '100%',
  height: 1,
  background: 'rgba(255,255,255,0.1)',
  margin: '16px 0',
};

// ---------------------------------------------------------------------------
// Component — public plaza only; home visits use global invites (no manual code).
// ---------------------------------------------------------------------------
interface RoomBrowserProps {
  onJoin: (opts: UseMultiplayerOptions) => void;
  /** If the user was just returned from a failed join, show why. */
  lastError?: string | null;
}

export function RoomBrowser({ onJoin, lastError }: RoomBrowserProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        zIndex: 5,
        color: '#fff',
        overflowY: 'auto',
        padding: '24px 20px',
        gap: 0,
      }}
    >
      <h2 style={{ fontSize: 22, fontWeight: 700, textAlign: 'center', marginBottom: 20 }}>
        EchoAvatar
      </h2>

      {lastError && (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: 12,
            borderRadius: 8,
            background: 'rgba(231, 76, 60, 0.15)',
            border: '1px solid rgba(231, 76, 60, 0.4)',
            color: '#e74c3c',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          {lastError}
        </div>
      )}

      <div style={sectionTitle}>Public Worlds</div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          marginBottom: 6,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Central Plaza</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
            Public world
          </div>
        </div>
        <button
          onClick={() => {
            playUiClick();
            onJoin({ mode: 'joinOrCreate', roomType: 'world_room' });
          }}
          style={{
            padding: '6px 14px',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 6,
            border: 'none',
            background: '#4a7ac8',
            color: '#fff',
            cursor: 'pointer',
            flexShrink: 0,
            marginLeft: 10,
          }}
        >
          Join
        </button>
      </div>

      <div style={divider} />

      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, margin: 0 }}>
        To visit a friend&apos;s home, accept an invite from the inbox on the Home tab (global lobby).
      </p>
    </div>
  );
}
