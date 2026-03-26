// ---------------------------------------------------------------------------
// EmoteMenuButton — tap toggles radial menu; press-hold also opens it.
// Wave (and other emotes) only fire from sub-buttons, not the main 🎭 control.
// Sub-buttons fan left/up (dock is on the right edge) and scale in/out.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';
import { RADIAL_EMOTES } from './emoteMenuConfig';

const MAIN_SIZE = 72;
const RADIAL_RADIUS = 92;
const LONG_PRESS_MS = 420;
const MOVE_CANCEL_PX = 14;
const TRANS_MS = 280;
const STAGGER_MS = 48;
/** ease-in-out */
const EASE = 'cubic-bezier(0.42, 0, 0.58, 1)';

/**
 * Main control is on the right — fan sub-buttons into the screen (left) and up.
 * Angles in degrees: 0 = +x right, 90 = +y down (CSS-style trig on placement).
 */
function emoteAngles(count: number): number[] {
  if (count === 1) return [-130];
  const startDeg = -178;
  const endDeg = -102;
  const step = (endDeg - startDeg) / (count - 1);
  return Array.from({ length: count }, (_, i) => startDeg + i * step);
}

interface EmoteMenuButtonProps {
  playEmote: (clipName: string) => void;
}

export function EmoteMenuButton({ playEmote }: EmoteMenuButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [subExpanded, setSubExpanded] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const openedViaHoldRef = useRef(false);
  const isClosingRef = useRef(false);
  const startRef = useRef({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current != null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeMenu = useCallback(() => {
    clearCloseTimer();
    isClosingRef.current = true;
    setSubExpanded(false);
    const n = RADIAL_EMOTES.length;
    const wait = TRANS_MS + (n > 1 ? (n - 1) * STAGGER_MS : 0);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      isClosingRef.current = false;
      setMenuOpen(false);
    }, wait);
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!menuOpen) {
      setSubExpanded(false);
      return;
    }
    isClosingRef.current = false;
    setSubExpanded(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSubExpanded(true));
    });
    return () => cancelAnimationFrame(id);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, closeMenu]);

  const pickEmote = useCallback(
    (clipName: string) => {
      playEmote(clipName);
      closeMenu();
      openedViaHoldRef.current = false;
    },
    [playEmote, closeMenu],
  );

  const handleBasePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      openedViaHoldRef.current = false;
      startRef.current = { x: e.clientX, y: e.clientY };
      clearLongPress();
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTimerRef.current = null;
        openedViaHoldRef.current = true;
        clearCloseTimer();
        setMenuOpen(true);
      }, LONG_PRESS_MS);
    },
    [clearLongPress, clearCloseTimer],
  );

  const handleBasePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (menuOpen) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
        clearLongPress();
      }
    },
    [menuOpen, clearLongPress],
  );

  const handleBasePointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      clearLongPress();
      const heldMenu = openedViaHoldRef.current;
      openedViaHoldRef.current = false;
      if (heldMenu) return;
      if (menuOpen) {
        closeMenu();
      } else {
        clearCloseTimer();
        setMenuOpen(true);
      }
    },
    [clearLongPress, menuOpen, closeMenu, clearCloseTimer],
  );

  const handleBasePointerCancel = useCallback(() => {
    clearLongPress();
    openedViaHoldRef.current = false;
  }, [clearLongPress]);

  useEffect(
    () => () => {
      clearCloseTimer();
    },
    [clearCloseTimer],
  );

  const angles = emoteAngles(RADIAL_EMOTES.length);
  const pad = menuOpen ? RADIAL_RADIUS : 0;
  const outerW = MAIN_SIZE + 2 * pad;
  const outerH = MAIN_SIZE + 2 * pad;
  const nEmotes = RADIAL_EMOTES.length;

  return (
    <>
      {menuOpen && (
        <div
          role="presentation"
          aria-hidden
          onPointerDown={(e) => {
            e.stopPropagation();
            closeMenu();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 19,
            background: 'rgba(0,0,0,0.25)',
            opacity: subExpanded ? 1 : 0,
            transition: `opacity ${TRANS_MS}ms ${EASE}`,
            touchAction: 'none',
          }}
        />
      )}

      <div
        ref={baseRef}
        style={{
          position: 'absolute',
          top: `calc(184px + env(safe-area-inset-top, 0px) - ${pad}px)`,
          right: 16 - pad,
          width: outerW,
          height: outerH,
          zIndex: menuOpen ? 20 : 12,
          touchAction: 'none',
        }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Emotes. Tap to open menu; hold to open; choose wave, dance, or sit."
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onPointerDown={handleBasePointerDown}
          onPointerMove={handleBasePointerMove}
          onPointerUp={handleBasePointerUp}
          onPointerCancel={handleBasePointerCancel}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (menuOpen) closeMenu();
              else {
                clearCloseTimer();
                setMenuOpen(true);
              }
            }
          }}
          style={{
            position: 'absolute',
            top: pad,
            right: pad,
            width: MAIN_SIZE,
            height: MAIN_SIZE,
            borderRadius: '50%',
            background: menuOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)',
            border: '2px solid rgba(255,255,255,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            cursor: 'pointer',
            fontSize: 28,
            lineHeight: 1,
            zIndex: 1,
          }}
        >
          🎭
        </div>

        {menuOpen &&
          RADIAL_EMOTES.map((emote, i) => {
            const rad = (angles[i]! * Math.PI) / 180;
            const x = Math.cos(rad) * RADIAL_RADIUS;
            const y = Math.sin(rad) * RADIAL_RADIUS;
            const cx = pad + MAIN_SIZE / 2;
            const cy = pad + MAIN_SIZE / 2;
            const staggerOut = (nEmotes - 1 - i) * STAGGER_MS;
            const delayMs = subExpanded
              ? i * STAGGER_MS
              : isClosingRef.current
                ? staggerOut
                : 0;
            return (
              <button
                key={emote.clipName}
                type="button"
                role="menuitem"
                aria-label={emote.label}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  pickEmote(emote.clipName);
                }}
                style={{
                  position: 'absolute',
                  left: cx + x - 26,
                  top: cy + y - 26,
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.35)',
                  background: 'rgba(40,40,48,0.95)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                  fontSize: 26,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  touchAction: 'manipulation',
                  userSelect: 'none',
                  zIndex: 2,
                  transform: subExpanded ? 'scale(1)' : 'scale(0)',
                  opacity: subExpanded ? 1 : 0,
                  transformOrigin: 'center center',
                  transition: `transform ${TRANS_MS}ms ${EASE}, opacity ${TRANS_MS}ms ${EASE}`,
                  transitionDelay: `${delayMs}ms`,
                  willChange: 'transform, opacity',
                }}
              >
                {emote.emoji}
              </button>
            );
          })}
      </div>
    </>
  );
}
