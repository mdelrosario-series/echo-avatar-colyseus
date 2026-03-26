import React from 'react';

interface VoiceMuteButtonProps {
  isMuted: boolean;
  isConnected: boolean;
  onToggle: () => void;
  style?: React.CSSProperties;
}

const BASE_STYLE: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: '50%',
  border: '2px solid rgba(255,255,255,0.25)',
  color: '#fff',
  fontSize: 22,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  transition: 'background 0.15s, border-color 0.15s',
};

export const VoiceMuteButton: React.FC<VoiceMuteButtonProps> = ({
  isMuted,
  isConnected,
  onToggle,
  style,
}) => {
  const bg = isMuted
    ? 'rgba(231, 76, 60, 0.55)'   // red tint when muted
    : 'rgba(255,255,255,0.12)';   // default glass

  return (
    <button
      type="button"
      style={{
        ...BASE_STYLE,
        background: bg,
        opacity: isConnected ? 1 : 0.55,
        ...style,
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onToggle}
      title={
        !isConnected
          ? 'Voice not connected yet (check room / mic permission / Agora app id)'
          : isMuted
            ? 'Unmute mic'
            : 'Mute mic'
      }
      aria-disabled={!isConnected}
    >
      {isMuted ? '🔇' : '🎙️'}
    </button>
  );
};
