import './glbSceneDebug';

export type GlbSceneDebugPanelProps = {
  /** When false, nothing is rendered (dev off + no console show). */
  visible: boolean;
  debugOpen: boolean;
  onToggleOpen: () => void;
  useDebugAvatar: boolean;
  onUseDebugAvatar: (v: boolean) => void;
  debugGround: boolean;
  onDebugGround: (v: boolean) => void;
  showSkeleton: boolean;
  onShowSkeleton: (v: boolean) => void;
  activeAnimation: string | undefined;
  onSetActiveAnimation: (v: string | undefined) => void;
  /** World lobby: quick solo room */
  soloRoom?: { inLobby: boolean; onSolo: () => void };
};

export function GlbSceneDebugPanel({
  visible,
  debugOpen,
  onToggleOpen,
  useDebugAvatar,
  onUseDebugAvatar,
  debugGround,
  onDebugGround,
  showSkeleton,
  onShowSkeleton,
  activeAnimation,
  onSetActiveAnimation,
  soloRoom,
}: GlbSceneDebugPanelProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'monospace',
        fontSize: 12,
        zIndex: 9999,
      }}
    >
      <button
        type="button"
        onClick={onToggleOpen}
        style={{
          background: '#111',
          color: '#0f0',
          border: '1px solid #0f0',
          padding: '2px 8px',
          cursor: 'pointer',
          borderRadius: 3,
          width: '100%',
        }}
      >
        DBG {debugOpen ? '▲' : '▼'}
      </button>
      {debugOpen && (
        <div
          style={{
            marginTop: 4,
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid #444',
            borderRadius: 4,
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minWidth: 120,
          }}
        >
          {soloRoom?.inLobby && (
            <button
              type="button"
              onClick={soloRoom.onSolo}
              style={{
                background: '#111',
                color: '#0f0',
                border: '1px solid #0f0',
                padding: '3px 10px',
                cursor: 'pointer',
                borderRadius: 3,
              }}
            >
              solo
            </button>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ccc', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useDebugAvatar}
              onChange={(e) => onUseDebugAvatar(e.target.checked)}
              style={{ accentColor: '#0f0' }}
            />
            base.glb
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ccc', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={debugGround}
              onChange={(e) => onDebugGround(e.target.checked)}
              style={{ accentColor: '#0f0' }}
            />
            ground plane
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ccc', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showSkeleton}
              onChange={(e) => onShowSkeleton(e.target.checked)}
              style={{ accentColor: '#0f0' }}
            />
            skeleton
          </label>
          <div style={{ borderTop: '1px solid #333', paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button
              type="button"
              onClick={() => onSetActiveAnimation(undefined)}
              style={{
                background: activeAnimation === undefined ? '#0f0' : '#111',
                color: activeAnimation === undefined ? '#000' : '#0f0',
                border: '1px solid #0f0',
                padding: '3px 10px',
                cursor: 'pointer',
                borderRadius: 3,
              }}
            >
              auto (idle/walk2/run2)
            </button>
            {(['idle', 'walk2', 'run2', 'wave'] as const).map((clip) => (
              <button
                key={clip}
                type="button"
                onClick={() => onSetActiveAnimation(clip)}
                style={{
                  background: activeAnimation === clip ? '#0f0' : '#111',
                  color: activeAnimation === clip ? '#000' : '#0f0',
                  border: '1px solid #0f0',
                  padding: '3px 10px',
                  cursor: 'pointer',
                  borderRadius: 3,
                }}
              >
                {clip}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
