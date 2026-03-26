import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../multiplayer/types';
import { playUiClick } from '../audio';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  playerCount: number;
  roomName: string | null;
  roomCode?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}

const MAX_MSG_LEN = 200;

export function ChatPanel({ messages, onSend, playerCount, roomName, roomCode, isOpen: controlledOpen, onClose }: ChatPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const [inputText, setInputText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isOpen) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleToggle = useCallback(() => {
    playUiClick();
    if (isControlled) {
      onClose?.();
    } else {
      setInternalOpen((prev) => !prev);
    }
  }, [isControlled, onClose]);

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    playUiClick();
    onSend(trimmed);
    setInputText('');
  }, [inputText, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.stopPropagation(); // Prevent WASD movement while typing
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Stop pointer events from reaching the camera drag handler
  const stopPropagation = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  const truncateName = (name: string) => (name.length > 12 ? name.slice(0, 12) + '…' : name);

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div
          onPointerDown={stopPropagation}
          onPointerMove={stopPropagation}
          onPointerUp={stopPropagation}
          style={{
            position: 'absolute',
            bottom: 'calc(var(--tab-bar-height) + 10px)',
            right: 0,
            width: 270,
            background: 'rgba(10, 10, 30, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            zIndex: 15,
            overflow: 'hidden',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                {roomName ?? 'World'} · {playerCount} online
              </span>
              {roomCode && (
                <span
                  style={{ color: '#4a7ac8', fontSize: 10, cursor: 'pointer', fontFamily: 'monospace' }}
                  title="Click to copy room code"
                  onClick={() => { void navigator.clipboard.writeText(roomCode); }}
                >
                  Code: {roomCode}
                </span>
              )}
            </div>
            <button
              onClick={handleToggle}
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

          {/* Message list */}
          <div
            ref={listRef}
            style={{
              height: 180,
              overflowY: 'auto',
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {messages.length === 0 && (
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center', marginTop: 60 }}>
                No messages yet
              </span>
            )}
            {messages.map((msg) => (
              <div key={msg.id} style={{ fontSize: 12, lineHeight: 1.4 }}>
                <span style={{ color: '#4a7ac8', fontWeight: 600 }}>{truncateName(msg.senderName)}: </span>
                <span style={{ color: '#fff' }}>{msg.text}</span>
              </div>
            ))}
          </div>

          {/* Input row */}
          <div
            style={{
              display: 'flex',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              padding: 6,
              gap: 6,
            }}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, MAX_MSG_LEN))}
              onKeyDown={handleKeyDown}
              placeholder="Say something…"
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 6,
                color: '#fff',
                fontSize: 12,
                padding: '6px 8px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              style={{
                background: inputText.trim() ? '#4a7ac8' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                padding: '6px 10px',
                cursor: inputText.trim() ? 'pointer' : 'default',
                opacity: inputText.trim() ? 1 : 0.5,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
