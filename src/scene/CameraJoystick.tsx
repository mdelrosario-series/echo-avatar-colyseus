// ---------------------------------------------------------------------------
// CameraJoystick — virtual stick for camera look: x = yaw, y = pitch (limited in ThirdPersonCamera).
// Ref x in [-1, 1]: push right → orbit clockwise. y: up → look up.
// ---------------------------------------------------------------------------

import { useRef, useState, useCallback } from 'react';

const BASE_SIZE = 120;
const KNOB_SIZE = 44;
const MAX_RADIUS = 40;

interface CameraJoystickProps {
  cameraJoystickRef: React.MutableRefObject<{ x: number; y: number }>;
}

export function CameraJoystick({ cameraJoystickRef }: CameraJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef({ cx: 0, cy: 0 });
  const [active, setActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const base = baseRef.current;
    if (!base) return;
    base.setPointerCapture(e.pointerId);
    const rect = base.getBoundingClientRect();
    centerRef.current = { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
    setActive(true);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!active) return;
      const { cx, cy } = centerRef.current;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > MAX_RADIUS) {
        dx = (dx / dist) * MAX_RADIUS;
        dy = (dy / dist) * MAX_RADIUS;
      }
      setKnobPos({ x: dx, y: dy });
      cameraJoystickRef.current = { x: dx / MAX_RADIUS, y: -dy / MAX_RADIUS };
    },
    [active, cameraJoystickRef],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const base = baseRef.current;
      if (base) base.releasePointerCapture(e.pointerId);
      setActive(false);
      setKnobPos({ x: 0, y: 0 });
      cameraJoystickRef.current = { x: 0, y: 0 };
    },
    [cameraJoystickRef],
  );

  return (
    <div
      ref={baseRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'absolute',
        bottom: 'calc(var(--tab-bar-height) + 16px)',
        right: 16,
        width: BASE_SIZE,
        height: BASE_SIZE,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.12)',
        border: '2px solid rgba(255,255,255,0.25)',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        zIndex: 12,
      }}
      aria-label="Look around"
    >
      <div
        style={{
          position: 'absolute',
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.45)',
          left: BASE_SIZE / 2 - KNOB_SIZE / 2 + knobPos.x,
          top: BASE_SIZE / 2 - KNOB_SIZE / 2 + knobPos.y,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
