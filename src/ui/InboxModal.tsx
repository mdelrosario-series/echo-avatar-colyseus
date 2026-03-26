import { useCallback } from 'react';
import type { PendingInvite } from '../multiplayer/global/useGlobalRoom';
import { playUiClick } from '../audio';

interface InboxModalProps {
  invites: PendingInvite[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}

export function InboxModal({ invites, onAccept, onDismiss, onClose }: InboxModalProps) {
  const stopProp = useCallback((e: React.PointerEvent) => e.stopPropagation(), []);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => {
          playUiClick();
          onClose();
        }}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 20,
        }}
      />

      {/* Modal */}
      <div
        onPointerDown={stopProp}
        onPointerMove={stopProp}
        onPointerUp={stopProp}
        style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 21,
          width: 'min(300px, calc(100% - 32px))',
          background: 'rgba(28, 28, 45, 0.97)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 16,
          overflow: 'hidden',
          maxHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Inbox</span>
          <button
            onClick={() => {
              playUiClick();
              onClose();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 18,
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Invite list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {invites.length === 0 ? (
            <div
              style={{
                padding: '40px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <span style={{ fontSize: 40 }}>☹️</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>No Invites yet</span>
            </div>
          ) : (
            invites.map((invite) => (
              <div
                key={invite.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.07)',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#fff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: 'monospace',
                    }}
                  >
                    {invite.fromName || invite.fromId}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                    sent you an invite
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      playUiClick();
                      onDismiss(invite.id);
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.08)',
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: 16,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => {
                      playUiClick();
                      onAccept(invite.id);
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      border: '1px solid rgba(100,200,100,0.4)',
                      background: 'rgba(46,204,113,0.15)',
                      color: '#2ecc71',
                      fontSize: 16,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    ✓
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
