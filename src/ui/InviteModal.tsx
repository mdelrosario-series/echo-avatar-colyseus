import { useState, useCallback } from 'react';
import { PlayerIdCard } from './PlayerIdCard';
import { playUiClick } from '../audio';

interface InviteModalProps {
  roomCode: string | null;
  playerId: string;
  onSendInvite: (toPlayerId: string, roomCode: string) => void;
  onClose: () => void;
}

export function InviteModal({ roomCode, playerId, onSendInvite, onClose }: InviteModalProps) {
  const [targetId, setTargetId] = useState('');
  const [sent, setSent] = useState(false);

  const stopProp = useCallback((e: React.PointerEvent) => e.stopPropagation(), []);

  const handleSend = useCallback(() => {
    const id = targetId.trim();
    if (!id || !roomCode || sent) return;
    playUiClick();
    onSendInvite(id, roomCode);
    setTargetId('');
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  }, [targetId, roomCode, sent, onSendInvite]);

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

      {/* Centered column: Player ID card stacked above the invite panel */}
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
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Player ID card */}
        <PlayerIdCard playerId={playerId} />

        {/* Invite panel */}
        <div
          style={{
            background: 'rgba(28, 28, 45, 0.97)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 16,
            overflow: 'hidden',
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
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Invite a Player</span>
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

          {/* Body */}
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
              }}
              placeholder="Enter Friend's Player ID"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                color: '#fff',
                fontSize: 13,
                fontFamily: 'monospace',
                padding: '10px 12px',
                outline: 'none',
                textAlign: 'center',
              }}
            />

            <button
              onClick={handleSend}
              disabled={!targetId.trim() || !roomCode || sent}
              style={{
                width: '100%',
                padding: '11px',
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.2)',
                background: sent ? '#2ecc71' : 'rgba(255,255,255,0.1)',
                color: '#fff',
                cursor: targetId.trim() && roomCode && !sent ? 'pointer' : 'default',
                opacity: targetId.trim() && roomCode && !sent ? 1 : 0.5,
                transition: 'background 0.2s',
              }}
            >
              {sent ? 'Invite Sent!' : 'Send Invite'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
