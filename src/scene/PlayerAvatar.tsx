// ---------------------------------------------------------------------------
// PlayerAvatar — local player root group + skinned avatar mesh.
//
// Chooses effective animation clip: posture > debug override > movement state.
// ---------------------------------------------------------------------------

import type { Group } from 'three';
import { AvatarGlbMesh } from './AvatarGlbMesh';
import { SpeakingRing } from './SpeakingRing';
import { PlayerNameTag } from './PlayerNameTag';
import { getCdnUrl } from '../lib/cdnAssets';
import type { PostureDefinition } from '../config/postures';
import type { MovementAnimationState } from '../character/usePlayerMovementFrame';
import type { EmotePlayRequest } from '../animation/emoteTypes';

export interface PlayerAvatarProps {
  playerGroupRef: React.RefObject<Group>;
  glbUrl?: string | null;
  animationUrls?: string[];
  animationClipNames?: string[];
  /** Debug / WorldTab override; when set and not in posture, replaces movement-driven clip. */
  activeAnimation?: string;
  movementAnimation: MovementAnimationState;
  activePostureRef: React.MutableRefObject<PostureDefinition | null>;
  emoteRequest?: EmotePlayRequest | null;
  onEmoteComplete?: () => void;
  /** Optional: emote machine broadcasts phase clips (e.g. sit loop) for multiplayer. */
  sendAnimation?: (animation: string) => void;
  isSpeaking?: boolean;
  username?: string;
  showNameTag?: boolean;
  showSkeleton?: boolean;
}

export function PlayerAvatar({
  playerGroupRef,
  glbUrl,
  animationUrls,
  animationClipNames,
  activeAnimation,
  movementAnimation,
  activePostureRef,
  emoteRequest,
  onEmoteComplete,
  sendAnimation,
  isSpeaking,
  username,
  showNameTag,
  showSkeleton,
}: PlayerAvatarProps) {
  const avatarUrl = glbUrl ?? getCdnUrl('DEFAULT_AVATAR');
  const effectiveAnimation = activePostureRef.current
    ? activePostureRef.current.clipName
    : (activeAnimation ?? movementAnimation);

  return (
    <group ref={playerGroupRef} position={[0, 0, 0]}>
      <AvatarGlbMesh
        key={avatarUrl}
        url={avatarUrl}
        animationUrls={animationUrls}
        animationClipNames={animationClipNames}
        activeAnimation={effectiveAnimation}
        locomotionState={movementAnimation}
        emoteRequest={emoteRequest}
        onEmoteComplete={onEmoteComplete}
        broadcastAnimation={sendAnimation}
        showSkeleton={showSkeleton}
      />
      {isSpeaking && <SpeakingRing />}
      {showNameTag && username && <PlayerNameTag username={username} yOffset={2.5} />}
    </group>
  );
}
