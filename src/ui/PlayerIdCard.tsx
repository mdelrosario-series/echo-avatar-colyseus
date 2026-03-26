import { useState, useCallback } from 'react';

interface PlayerIdCardProps {
  playerId: string;
}

export function PlayerIdCard({ playerId }: PlayerIdCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(playerId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [playerId]);

  return (
    <div
      style={{
        background: 'rgba(10, 10, 30, 0.92)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Your Player ID:
        </span>
        <span
          style={{
            fontSize: 11,
            fontFamily: 'monospace',
            color: 'rgba(255,255,255,0.85)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {playerId}
        </span>
      </div>
      <button
        onClick={handleCopy}
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8,
          padding: '5px 8px',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 16 }}>📋</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>{copied ? '✓' : 'Copy'}</span>
      </button>
    </div>
  );
}
