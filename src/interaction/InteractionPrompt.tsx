// ---------------------------------------------------------------------------
// InteractionPrompt — a 3D billboard that appears above the nearest
// InteractionPoint when the player is within range.
//
// Shows the posture's promptText (e.g. "Press E to sit") as a floating
// HTML overlay anchored in world-space.
// ---------------------------------------------------------------------------

import { Html } from '@react-three/drei';
import type { NearestInteraction } from './useInteractionDetection';
import { getPosture } from '../config/postures';

interface InteractionPromptProps {
  /** Ref updated each frame by useInteractionDetection. */
  nearestRef: React.RefObject<NearestInteraction>;
  /** Whether the player is currently in a posture (hide prompt while active). */
  isInPosture: boolean;
}

/**
 * Renders a floating prompt above the nearest interaction point.
 * Because `nearestRef` changes every frame without triggering React renders,
 * this component uses a simple inner component that reads the ref and
 * renders only when there's a valid point.
 */
export function InteractionPrompt({ nearestRef, isInPosture }: InteractionPromptProps) {
  // We read the ref directly — this means the prompt will appear/disappear
  // based on the latest ref value. Because the parent (LocalPlayer or the
  // scene root) re-renders on other state changes, the prompt will update
  // naturally. For more responsive updates, the parent could add a
  // useFrame-driven state trigger, but for a prompt this is fine.

  const nearest = nearestRef.current;
  if (!nearest?.point || isInPosture) return null;

  const posture = getPosture(nearest.point.postureId);
  if (!posture) return null;

  return (
    <group position={[nearest.point.x, nearest.point.y + 2.2, nearest.point.z]}>
      <Html
        center
        distanceFactor={8}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            background: 'rgba(10, 10, 30, 0.85)',
            color: '#fff',
            padding: '6px 16px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'system-ui, sans-serif',
            border: '1px solid rgba(255,255,255,0.15)',
            textAlign: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          {posture.promptText}
        </div>
      </Html>
    </group>
  );
}
