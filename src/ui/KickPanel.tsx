import { useState, useCallback } from 'react';

interface KickPanelProps {
  remotePlayerIds: string[];
  remotePlayerNames: Record<string, string>;
  onKick: (playerId: string) => void;
}

export function KickPanel({ remotePlayerIds, remotePlayerNames, onKick }: KickPanelProps) {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const stopPropagation = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  const handleKick = useCallback((id: string) => {
    if (confirmId === id) {
      onKick(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
    }
  }, [confirmId, onKick]);

  if (remotePlayerIds.length === 0) return null;

  return (
    <div
      onPointerDown={stopPropagation}
      onPointerMove={stopPropagation}
      onPointerUp={stopPropagation}
      style={{
        position: 'absolute',
        top: 12,
        right: 120,
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
      }}
    >
      <button
        onClick={() => { setOpen(o => !o); setConfirmId(null); }}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(10, 10, 30, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#fff',
          fontSize: 20,
          cursor: 'pointer',
          display: open ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        👢
      </button>

      {open && (
        <div
          style={{
            background: 'rgba(10, 10, 30, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 12,
            width: 220,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
              Players ({remotePlayerIds.length})
            </span>
            <button
              onClick={() => { setOpen(false); setConfirmId(null); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 16,
                cursor: 'pointer',
                padding: '0 4px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: '6px 0', maxHeight: 200, overflowY: 'auto' }}>
            {remotePlayerIds.map(id => {
              const name = remotePlayerNames[id] || id.slice(0, 8);
              const isConfirming = confirmId === id;

              return (
                <div
                  key={id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      color: '#fff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {name}
                  </span>
                  <button
                    onClick={() => handleKick(id)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: 'none',
                      background: isConfirming ? '#e74c3c' : 'rgba(255,255,255,0.12)',
                      color: '#fff',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'background 0.2s',
                    }}
                  >
                    {isConfirming ? 'Confirm' : 'Kick'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
