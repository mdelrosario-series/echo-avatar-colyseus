import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SpeakingRing } from './SpeakingRing';
import type { RemotePlayerState } from '../multiplayer/types';
import { AvatarGlbMesh } from './AvatarGlbMesh';
import { PlayerNameTag } from './PlayerNameTag';
import { getAnimationClipNames, getAnimationUrls, getCdnUrl } from '../lib/cdnAssets';
import { applyRemoteInterpolation } from '../character/useRemoteInterpolation';
import { usePreferences } from '../context/PreferencesContext';

/** Until we receive a real `playerAnimation` / sync value, treat missing or empty as idle (avoids T-pose / wrong fallback). */
function remoteLocomotionClip(name: string | undefined): string {
  const t = name?.trim();
  return t || 'idle';
}

interface RemotePlayerMeshProps {
  profileId: string;
  positionsRef: React.MutableRefObject<Map<string, RemotePlayerState>>;
  avatarUrl?: string | null;
  animationUrls: string[];
  animationClipNames: string[];
  activeAnimation?: string;
  username?: string;
  isSpeaking?: boolean;
  showSkeleton?: boolean;
}

function RemotePlayerMesh({
  profileId,
  positionsRef,
  avatarUrl,
  animationUrls,
  animationClipNames,
  activeAnimation,
  username,
  isSpeaking,
  showSkeleton,
}: RemotePlayerMeshProps) {
  const groupRef = useRef<THREE.Group>(null!);

  const effectiveUrl = avatarUrl || getCdnUrl('DEFAULT_AVATAR');

  useFrame((_, delta) => {
    const data = positionsRef.current.get(profileId);
    if (!data || !groupRef.current) return;
    if (!Number.isFinite(Number(data.x)) || !Number.isFinite(Number(data.z)) || !Number.isFinite(Number(data.rotY))) return;
    applyRemoteInterpolation(groupRef.current, data, delta);
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <AvatarGlbMesh
        url={effectiveUrl}
        animationUrls={animationUrls}
        animationClipNames={animationClipNames}
        activeAnimation={remoteLocomotionClip(activeAnimation)}
        showSkeleton={showSkeleton}
      />
      {username && <PlayerNameTag username={username} />}
      {isSpeaking && <SpeakingRing />}
    </group>
  );
}

interface RemotePlayersProps {
  /** Log remote mesh list changes with `[test]` (home duplicate debugging). */
  debugHomeRoom?: boolean;
  playerIds: string[];
  positionsRef: React.MutableRefObject<Map<string, RemotePlayerState>>;
  avatarUrls: Record<string, string>;
  /** Optional per-player URL lists; omit to use one stable shared CDN pack (fixes WorldTab / useGLTF churn). */
  avatarAnimationUrls?: Record<string, string[]>;
  avatarActiveAnimations?: Record<string, string>;
  playerNames?: Record<string, string>;
  speakingUsers?: Set<string>;
  showSkeleton?: boolean;
}

export function RemotePlayers({
  debugHomeRoom,
  playerIds,
  positionsRef,
  avatarUrls,
  avatarAnimationUrls,
  avatarActiveAnimations,
  playerNames,
  speakingUsers,
  showSkeleton,
}: RemotePlayersProps) {
  const { showNameTags } = usePreferences();

  /** Stable references — new arrays every parent render made drei's useGLTF reload and T-pose remotes (WorldTab). */
  const defaultAnimUrls = useMemo(() => getAnimationUrls(), []);
  const defaultClipNames = useMemo(() => getAnimationClipNames(), []);

  useEffect(() => {
    if (!debugHomeRoom) return;
    console.log('[test] RemotePlayers (home_room) mesh list', {
      count: playerIds.length,
      ids: [...playerIds],
    });
  }, [debugHomeRoom, playerIds.join('\0')]);

  return (
    <>
      {playerIds.map((id) => (
        <RemotePlayerMesh
          key={id}
          profileId={id}
          positionsRef={positionsRef}
          avatarUrl={avatarUrls[id] || null}
          animationUrls={avatarAnimationUrls?.[id] ?? defaultAnimUrls}
          animationClipNames={defaultClipNames}
          activeAnimation={avatarActiveAnimations?.[id]}
          username={showNameTags ? playerNames?.[id] : undefined}
          isSpeaking={speakingUsers?.has(id)}
          showSkeleton={showSkeleton}
        />
      ))}
    </>
  );
}
