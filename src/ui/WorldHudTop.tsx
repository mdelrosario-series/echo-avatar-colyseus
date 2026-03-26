// ---------------------------------------------------------------------------
// WorldHudTop — top HUD overlay shown while in a world room.
//
// Layout matches the design mockup:
//   Left:  RoomName (bold large) / By [ownerId] / N 👥
//   Right: [Invite icon btn] [Inbox icon btn]
// ---------------------------------------------------------------------------

import { useCallback } from 'react';
import { playUiClick } from '../audio';

interface WorldHudTopProps {
  roomName: string | null;
  ownerId: string | null;
  myPlayerId: string;
  playerCount: number;
  hasPendingInvite: boolean;
  onLeave?: () => void;
  onInvite: () => void;
  onInbox: () => void;
}

export function WorldHudTop({
  roomName,
  ownerId,
  myPlayerId,
  playerCount,
  hasPendingInvite,
  onLeave,
  onInvite,
  onInbox,
}: WorldHudTopProps) {
  const stopProp = useCallback((e: React.PointerEvent) => e.stopPropagation(), []);

  const showOwner = ownerId !== null && ownerId !== myPlayerId;

  return (
    <div
      onPointerDown={stopProp}
      onPointerMove={stopProp}
      onPointerUp={stopProp}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '12px 14px 0',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      {/* ---- Left: room info ---- */}
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {/* Room name */}
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.2,
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          }}
        >
          {roomName ?? '…'}
        </span>

        {/* Owner */}
        {showOwner && (
          <span
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.65)',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}
          >
            By {ownerId}
          </span>
        )}

        {/* Player count */}
        <span
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.75)',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 1,
          }}
        >
          {playerCount} 👥
        </span>

        {/* Leave — small, unobtrusive; hidden on home tab */}
        {onLeave && (
          <button
            onClick={() => {
              playUiClick();
              onLeave();
            }}
            style={{
              marginTop: 6,
              alignSelf: 'flex-start',
              padding: '3px 10px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(10,10,30,0.7)',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
            }}
          >
            ← Leave
          </button>
        )}
      </div>

      {/* ---- Right: action buttons ---- */}
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        {/* Invite */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <button
            onClick={() => {
              playUiClick();
              onInvite();
            }}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(10,10,30,0.75)',
              color: '#fff',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            👤
          </button>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            Invite
          </span>
        </div>

        {/* Inbox */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                playUiClick();
                onInbox();
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(10,10,30,0.75)',
                color: '#fff',
                fontSize: 20,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              ✉️
            </button>
            {hasPendingInvite && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#e74c3c',
                  border: '2px solid rgba(10,10,30,0.9)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            Inbox
          </span>
        </div>
      </div>
    </div>
  );
}
