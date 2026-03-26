import { useRef, useState, useCallback } from 'react';

const BASE_SIZE = 120;
const KNOB_SIZE = 44;
const MAX_RADIUS = 40;

interface JoystickProps {
  joystickRef: React.MutableRefObject<{ x: number; y: number }>;
}

export function Joystick({ joystickRef }: JoystickProps) {
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

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
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
    // Normalize to [-1, 1]; negate Y because screen Y is inverted from game forward
    joystickRef.current = { x: dx / MAX_RADIUS, y: -dy / MAX_RADIUS };
  }, [active, joystickRef]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const base = baseRef.current;
    if (base) base.releasePointerCapture(e.pointerId);
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    joystickRef.current = { x: 0, y: 0 };
  }, [joystickRef]);

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
        left: 16,
        width: BASE_SIZE,
        height: BASE_SIZE,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.12)',
        border: '2px solid rgba(255,255,255,0.25)',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Knob */}
      <div
        style={{
          position: 'absolute',
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.5)',
          left: BASE_SIZE / 2 - KNOB_SIZE / 2 + knobPos.x,
          top: BASE_SIZE / 2 - KNOB_SIZE / 2 + knobPos.y,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
