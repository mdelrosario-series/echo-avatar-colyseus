// ---------------------------------------------------------------------------
// useLoopingAnimation — locomotion state driven by activeAnimation.
//
// All idle↔walk2↔run2 transitions go through crossFadeLocomotion (no temporal
// warp — see crossFadeLocomotion.ts).
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import type { AnimationAction, AnimationClip } from 'three';
import { LoopRepeat } from 'three';
import { CROSSFADE_DURATION } from '../config/animation';
import { crossFadeLocomotion } from './crossFadeLocomotion';
import { animDeployOk, animDeployWarn } from '../debug/animDeployDebug';
import type { EmotePlayRequest } from './emoteTypes';

export function useLoopingAnimation(
  actions: Record<string, AnimationAction | null>,
  allClips: AnimationClip[],
  activeAnimation: string | undefined,
  emoteRequest: EmotePlayRequest | null | undefined,
  /** Shared ref tracking the currently-playing action. */
  currentActionRef: React.MutableRefObject<AnimationAction | null>,
) {
  const loopLogSigRef = useRef<string>('');

  useEffect(() => {
    if (emoteRequest != null || allClips.length === 0) return undefined;

    const firstKey = Object.keys(actions)[0] as string | undefined;
    const direct = activeAnimation ? actions[activeAnimation] : undefined;
    const nextAction = direct ?? (firstKey ? actions[firstKey] : undefined);

    const sig = `${emoteRequest ?? ''}|${activeAnimation ?? ''}|${firstKey ?? ''}|${direct ? 'd' : 'f'}|${nextAction?.getClip().name ?? 'none'}`;
    if (sig !== loopLogSigRef.current) {
      loopLogSigRef.current = sig;
      const actionKeys = Object.keys(actions).sort();

      if (activeAnimation && !direct && nextAction && firstKey) {
        animDeployWarn('useLoopingAnimation', `activeAnimation "${activeAnimation}" has no action — falling back to "${firstKey}"`, {
          activeAnimation,
          actionKeys,
          playingClip: nextAction.getClip().name,
        });
      } else if (activeAnimation && !direct && !nextAction) {
        animDeployWarn('useLoopingAnimation', `activeAnimation "${activeAnimation}" but no usable action (mixer stuck)`, {
          activeAnimation,
          actionKeys,
        });
      } else if (activeAnimation && direct) {
        animDeployOk('useLoopingAnimation', `playing locomotion "${activeAnimation}"`, {
          clip: direct.getClip().name,
          duration: direct.getClip().duration,
        });
      } else if (!activeAnimation && nextAction) {
        animDeployOk('useLoopingAnimation', 'no activeAnimation prop; using first available action', {
          firstKey,
          clip: nextAction.getClip().name,
        });
      }
    }

    if (!nextAction) return undefined;

    nextAction.setLoop(LoopRepeat, Infinity);
    nextAction.timeScale = 1;
    const prevAction = currentActionRef.current;

    if (prevAction && prevAction !== nextAction) {
      crossFadeLocomotion(prevAction, nextAction, CROSSFADE_DURATION);
    } else if (prevAction === nextAction) {
      nextAction.play();
    } else {
      nextAction.reset().fadeIn(CROSSFADE_DURATION).play();
    }
    currentActionRef.current = nextAction;
  }, [emoteRequest, actions, allClips.length, activeAnimation, currentActionRef]);
}
