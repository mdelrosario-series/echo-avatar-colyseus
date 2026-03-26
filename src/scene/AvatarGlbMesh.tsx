// ---------------------------------------------------------------------------
// AvatarGlbMesh — thin shell that composes:
//   - useAvatarModel      (GLB load + skeleton clone)
//   - useAnimationLoader  (multi-GLB clip loading + rename)
//   - useLoopingAnimation (crossfade idle↔walk2↔run2)
//   - useEmoteAnimationMachine (one-shot / hold-loop / sit sequence)
//
// Also provides fallback layers:
//   1. BaseAvatarFallback (renders base.glb)
//   2. CapsuleFallback    (absolute last resort)
// ---------------------------------------------------------------------------

import { Suspense, useRef, useMemo, useEffect, Component, type ReactNode } from 'react';
import * as THREE from 'three';
import type { AnimationAction } from 'three';
// import { GLB_SCALE } from '../config/character';
import { getCdnUrl } from '../lib/cdnAssets';
import { useAvatarModel } from './AvatarModel';
import { useAnimationLoader } from '../animation/useAnimationLoader';
import { useLoopingAnimation } from '../animation/useLoopingAnimation';
import { useEmoteAnimationMachine } from '../animation/useEmoteAnimationMachine';
import type { EmotePlayRequest } from '../animation/emoteTypes';
import type { MovementAnimationState } from '../character/usePlayerMovementFrame';

// Re-export preload helper for main.tsx
export { preloadDefaultAvatar } from './AvatarModel';

// ---- Error boundary ----

class GlbErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError = () => ({ hasError: true });
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// ---- Fallbacks ----

/** Absolute last-resort fallback if even base.glb can't load. */
function CapsuleFallback() {
  return (
    <>
      <mesh>
        <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
        <meshStandardMaterial color="#888888" roughness={1} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color="#888888" roughness={1} metalness={0.1} />
      </mesh>
    </>
  );
}

function BaseAvatarMesh({ url }: { url: string }) {
  const clone = useAvatarModel(url);
  return <primitive object={clone} /* scale={[GLB_SCALE, GLB_SCALE, GLB_SCALE]} */ />;
}

/** Renders the default base.glb as the loading/error fallback. */
function BaseAvatarFallback() {
  const url = getCdnUrl('DEFAULT_AVATAR');
  return (
    <GlbErrorBoundary fallback={<CapsuleFallback />}>
      <Suspense fallback={<CapsuleFallback />}>
        <BaseAvatarMesh url={url} />
      </Suspense>
    </GlbErrorBoundary>
  );
}

// ---- Props ----

interface AvatarGlbMeshProps {
  url: string;
  /** Separate animation GLBs (one per clip, one URL per clip). */
  animationUrls?: string[];
  /** Clip names aligned with `animationUrls` (idle, walk2, wave, …). Use `getAnimationClipNames()` when URLs are content-hashed. */
  animationClipNames?: string[];
  /** Clip name to play (idle / walk2 / run2). */
  activeAnimation?: string;
  /** Current locomotion; walk/run interrupts hold-loop and sit (sit plays reverse exit first). */
  locomotionState?: MovementAnimationState;
  /** When set (id bumps per play), runs emote state machine until session ends. */
  emoteRequest?: EmotePlayRequest | null;
  /** After the emote session finishes and crossfades back to looping animation. */
  onEmoteComplete?: () => void;
  /** Broadcast clip changes for multiplayer (e.g. sit loop phase). */
  broadcastAnimation?: (clipName: string) => void;
  /** Draw THREE.SkeletonHelper on first skinned mesh (debug). */
  showSkeleton?: boolean;
}

function AvatarSkeletonHelper({ root }: { root: THREE.Object3D }) {
  const helper = useMemo(() => {
    let skinned: THREE.SkinnedMesh | null = null;
    root.traverse((c) => {
      if ((c as THREE.SkinnedMesh).isSkinnedMesh) skinned = c as THREE.SkinnedMesh;
    });
    return skinned ? new THREE.SkeletonHelper(skinned) : null;
  }, [root]);

  useEffect(() => {
    return () => {
      helper?.dispose();
    };
  }, [helper]);

  if (!helper) return null;
  return <primitive object={helper} />;
}

// ---- Inner component (does the real work) ----

function AvatarGlbMeshInner({
  url,
  animationUrls,
  animationClipNames,
  activeAnimation,
  locomotionState = 'idle',
  emoteRequest,
  onEmoteComplete,
  broadcastAnimation,
  showSkeleton = false,
}: AvatarGlbMeshProps) {
  // 1. Load + clone avatar model
  const clone = useAvatarModel(url);

  // 2. Load animation clips and bind to clone
  const { actions, mixer, allClips } = useAnimationLoader(animationUrls, clone, animationClipNames);

  // 3. Shared ref tracking the currently-playing action
  const currentActionRef = useRef<AnimationAction | null>(null);

  // 4. Emote state machine (looping skips while emoteRequest is set)
  useEmoteAnimationMachine(
    actions,
    mixer,
    allClips,
    currentActionRef,
    activeAnimation,
    emoteRequest ?? null,
    locomotionState,
    onEmoteComplete,
    broadcastAnimation,
  );

  // 5. Looping animation (idle / walk2 / run2)
  useLoopingAnimation(actions, allClips, activeAnimation, emoteRequest ?? null, currentActionRef);

  return (
    <>
      <primitive object={clone} /* scale={[GLB_SCALE, GLB_SCALE, GLB_SCALE]} */ />
      {showSkeleton ? <AvatarSkeletonHelper root={clone} /> : null}
    </>
  );
}

// ---- Public component (wraps in Suspense + ErrorBoundary) ----

export function AvatarGlbMesh({
  url,
  animationUrls,
  animationClipNames,
  activeAnimation,
  locomotionState,
  emoteRequest,
  onEmoteComplete,
  broadcastAnimation,
  showSkeleton,
}: AvatarGlbMeshProps) {
  return (
    <GlbErrorBoundary fallback={<BaseAvatarFallback />}>
      <Suspense fallback={<BaseAvatarFallback />}>
        {/*
          Drei's useAnimations caches clipAction(root) in a ref and only clears it when `clips`
          change — not when the avatar root Object3D changes. After default → custom GLB (or any
          URL swap), we must remount so the mixer/actions bind to the new skeleton; otherwise T-pose.
        */}
        <AvatarGlbMeshInner
          key={url}
          url={url}
          animationUrls={animationUrls}
          animationClipNames={animationClipNames}
          activeAnimation={activeAnimation}
          locomotionState={locomotionState}
          emoteRequest={emoteRequest}
          onEmoteComplete={onEmoteComplete}
          broadcastAnimation={broadcastAnimation}
          showSkeleton={showSkeleton}
        />
      </Suspense>
    </GlbErrorBoundary>
  );
}
