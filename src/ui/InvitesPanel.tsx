import { useState, useCallback } from 'react';
import { useGlobalRoomContext } from '../multiplayer/global/useGlobalRoom';

interface InvitesPanelProps {
  roomCode?: string | null;
  /** When true, only the "Invite a player" section is shown (no room code, no join). */
  inviteOnly?: boolean;
  /** Send an invite to the given player ID for the current room code. */
  onSendInvite?: (toPlayerId: string, roomCode: string) => void;
  /** Controlled open state. When provided, the internal toggle button is hidden. */
  isOpen?: boolean;
  /** Called when the panel requests to close itself. */
  onClose?: () => void;
}

export function InvitesPanel({ roomCode, inviteOnly, onSendInvite, isOpen: controlledOpen, onClose }: InvitesPanelProps) {
  const { myInviteId } = useGlobalRoomContext();
  const [idCopied, setIdCopied] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (val: boolean | ((prev: boolean) => boolean)) => {
        const next = typeof val === 'function' ? val(open) : val;
        if (!next) onClose?.();
      }
    : setInternalOpen;
  const [copied, setCopied] = useState(false);
  const [inviteTargetId, setInviteTargetId] = useState('');
  const [inviteSent, setInviteSent] = useState(false);

  const stopPropagation = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  const handleCopy = useCallback(() => {
    if (!roomCode) return;
    void navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [roomCode]);

  const handleSendInvite = useCallback(() => {
    const targetId = inviteTargetId.trim();
    if (!targetId || !roomCode || inviteSent) return;
    onSendInvite?.(targetId, roomCode);
    setInviteTargetId('');
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 2000);
  }, [inviteTargetId, roomCode, inviteSent, onSendInvite]);

  return (
    <div
      onPointerDown={stopPropagation}
      onPointerMove={stopPropagation}
      onPointerUp={stopPropagation}
      style={{
        position: 'absolute',
        top: isControlled ? 80 : 12,
        right: isControlled ? 12 : 64,
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
      }}
    >
      {/* Toggle button — only shown in uncontrolled mode */}
      {!isControlled && (
        <button
          onClick={() => setOpen((o) => !o)}
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
          🔗
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          style={{
            background: 'rgba(10, 10, 30, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 12,
            width: 260,
          }}
        >
          {/* Header */}
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
              {inviteOnly ? 'Invite' : 'Room Code'}
            </span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(255,255,255,0.5)', fontSize: 16,
                cursor: 'pointer', padding: '0 4px', lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Share your code (hidden in inviteOnly mode) */}
            {!inviteOnly && roomCode && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  Your room
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: 'monospace',
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#fff',
                      letterSpacing: 3,
                      background: 'rgba(255,255,255,0.07)',
                      borderRadius: 6,
                      padding: '5px 8px',
                      textAlign: 'center',
                    }}
                  >
                    {roomCode}
                  </span>
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: '5px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      borderRadius: 6,
                      border: 'none',
                      background: copied ? '#2ecc71' : 'rgba(255,255,255,0.12)',
                      color: '#fff',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'background 0.2s',
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* Your invite ID */}
            {myInviteId && (
              <>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Your invite ID
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      flex: 1,
                      fontFamily: 'monospace',
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.7)',
                      background: 'rgba(255,255,255,0.07)',
                      borderRadius: 6,
                      padding: '5px 8px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {myInviteId}
                    </span>
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(myInviteId).then(() => {
                          setIdCopied(true);
                          setTimeout(() => setIdCopied(false), 2000);
                        });
                      }}
                      style={{
                        padding: '5px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: 'none',
                        background: idCopied ? '#2ecc71' : 'rgba(255,255,255,0.12)',
                        color: '#fff',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'background 0.2s',
                      }}
                    >
                      {idCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Invite a player */}
            {roomCode && (
              <>
                {!inviteOnly && <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Invite a player
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      value={inviteTargetId}
                      onChange={(e) => setInviteTargetId(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') { e.preventDefault(); void handleSendInvite(); }
                      }}
                      placeholder="Player ID"
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 6,
                        color: '#fff',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        padding: '6px 8px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleSendInvite}
                      disabled={!inviteTargetId.trim() || inviteSent}
                      style={{
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: 'none',
                        background: inviteTargetId.trim() && !inviteSent ? '#4a7ac8' : 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        cursor: inviteTargetId.trim() && !inviteSent ? 'pointer' : 'default',
                        opacity: inviteTargetId.trim() && !inviteSent ? 1 : 0.4,
                        flexShrink: 0,
                      }}
                    >
                      {inviteSent ? '✓' : 'Invite'}
                    </button>
                  </div>
                  {inviteSent && (
                    <span style={{ fontSize: 10, color: '#2ecc71' }}>Invite sent!</span>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
