import { useEffect } from 'react';
import { usePlayerMovementFrame } from '../character/usePlayerMovementFrame';
import { usePlayerInteraction } from '../interaction/usePlayerInteraction';
import { InteractionPrompt } from '../interaction/InteractionPrompt';
import { PlayerAvatar } from './PlayerAvatar';
import type { InteractionPoint } from '../interaction/InteractionPoint';
import type { EmotePlayRequest } from '../animation/emoteTypes';
import * as THREE from 'three';

interface LocalPlayerProps {
  /** Log mount/unmount with `[test]` for home duplicate debugging. */
  debugHomeRoom?: boolean;
  playerGroupRef: React.RefObject<THREE.Group>;
  cameraYawRef: React.MutableRefObject<number>;
  joystickRef: React.MutableRefObject<{ x: number; y: number }>;
  onPositionUpdate?: (x: number, z: number, rotY: number) => void;
  glbUrl?: string | null;
  animationUrls?: string[];
  animationClipNames?: string[];
  activeAnimation?: string;
  emoteRequest?: EmotePlayRequest | null;
  onEmoteComplete?: () => void;
  onAnimationChange?: (animation: string) => void;
  interactionPoints?: InteractionPoint[];
  sendPosture?: (postureId: string | null) => void;
  sendAnimation?: (animation: string) => void;
  isSpeaking?: boolean;
  username?: string;
  showNameTag?: boolean;
  showSkeleton?: boolean;
}

export function LocalPlayer({
  debugHomeRoom,
  playerGroupRef,
  cameraYawRef,
  joystickRef,
  onPositionUpdate,
  glbUrl,
  animationUrls,
  animationClipNames,
  activeAnimation,
  emoteRequest,
  onEmoteComplete,
  onAnimationChange,
  interactionPoints = [],
  sendPosture,
  sendAnimation,
  isSpeaking,
  username,
  showNameTag,
  showSkeleton,
}: LocalPlayerProps) {
  useEffect(() => {
    if (!debugHomeRoom) return;
    console.log('[test] LocalPlayer (home_room) mount');
    return () => console.log('[test] LocalPlayer (home_room) unmount');
  }, [debugHomeRoom]);

  const { keysRef, nearestRef, isPostureLockedRef, activePostureRef } = usePlayerInteraction({
    playerGroupRef,
    interactionPoints,
    sendPosture,
    sendAnimation,
  });

  const { movementAnimation } = usePlayerMovementFrame({
    playerGroupRef,
    cameraYawRef,
    joystickRef,
    keysRef,
    isPostureLockedRef,
    onPositionUpdate,
    onAnimationChange,
  });

  return (
    <>
      <PlayerAvatar
        playerGroupRef={playerGroupRef}
        glbUrl={glbUrl}
        animationUrls={animationUrls}
        animationClipNames={animationClipNames}
        activeAnimation={activeAnimation}
        movementAnimation={movementAnimation}
        activePostureRef={activePostureRef}
        emoteRequest={emoteRequest}
        onEmoteComplete={onEmoteComplete}
        sendAnimation={sendAnimation}
        isSpeaking={isSpeaking}
        username={username}
        showNameTag={showNameTag}
        showSkeleton={showSkeleton}
      />

      <InteractionPrompt
        nearestRef={nearestRef}
        isInPosture={activePostureRef.current !== null}
      />
    </>
  );
}
