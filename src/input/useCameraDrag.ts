// ---------------------------------------------------------------------------
// useCameraDrag — pointer-based camera yaw drag.
//
// Returns { containerRef, handlers } to spread onto the container div.
// Touch: only drags from the right half of the container (left half is joystick).
// ---------------------------------------------------------------------------

import { useRef, useCallback } from 'react';
/** @deprecated Prefer CameraJoystick + ThirdPersonCamera; kept for reference. */
const CAM_DRAG_SENSITIVITY = 0.005;

export function useCameraDrag(cameraYawRef: React.MutableRefObject<number>) {
  const isDraggingRef    = useRef(false);
  const lastPointerXRef  = useRef(0);
  const containerRef     = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    // Touch: ignore left half (reserved for joystick)
    if (e.pointerType === 'touch') {
      if (e.clientX <= container.getBoundingClientRect().left + container.clientWidth / 2) return;
    }
    isDraggingRef.current = true;
    lastPointerXRef.current = e.clientX;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastPointerXRef.current;
    cameraYawRef.current -= dx * CAM_DRAG_SENSITIVITY;
    lastPointerXRef.current = e.clientX;
  }, [cameraYawRef]);

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return {
    containerRef,
    isDraggingRef,
    dragHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerUp,
    },
  };
}
