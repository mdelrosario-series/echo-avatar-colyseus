// ---------------------------------------------------------------------------
// useEmoteAnimationMachine — emotes as a small state machine:
//   • one_shot — play once, revert to locomotion (wave, …)
//   • hold_loop — loop until movement (walk/run) or a new emote request
//   • sit_sequence — entry once → loop → on interrupt, reverse entry; only then resume
//
// Locomotion (useLoopingAnimation) stays suppressed while emoteRequest is non-null;
// clear the request in onComplete after the session fully ends.
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { AnimationAction, AnimationClip, AnimationMixer } from 'three';
import { LoopOnce, LoopRepeat } from 'three';
import { CROSSFADE_DURATION, ONESHOT_LEAD_TIME } from '../config/animation';
import type { MovementAnimationState } from '../character/usePlayerMovementFrame';
import {
  getEmoteMachineMode,
  SIT_ENTRY_CLIP,
  SIT_LOOP_CLIP,
} from './emoteMachineConfig';
import { resumeLocomotionAfterEmote } from './emoteResumeHelpers';
import type { EmotePlayRequest } from './emoteTypes';

type Phase =
  | { kind: 'off' }
  | { kind: 'one_shot'; action: AnimationAction }
  | { kind: 'hold_loop'; action: AnimationAction }
  | { kind: 'sit_entry'; action: AnimationAction; entryClipName: string }
  | { kind: 'sit_loop'; action: AnimationAction; entryClipName: string }
  | { kind: 'sit_exit'; action: AnimationAction };

function clipByName(allClips: AnimationClip[], name: string): AnimationClip | undefined {
  return allClips.find((c) => c.name === name);
}

function firstResolvedClip(
  allClips: AnimationClip[],
  candidates: string[],
): { clip: AnimationClip; name: string } | null {
  for (const name of candidates) {
    const clip = clipByName(allClips, name);
    if (clip) return { clip, name };
  }
  return null;
}

export function useEmoteAnimationMachine(
  actions: Record<string, AnimationAction | null>,
  mixer: AnimationMixer,
  allClips: AnimationClip[],
  currentActionRef: MutableRefObject<AnimationAction | null>,
  resumeAnimation: string | undefined,
  emoteRequest: EmotePlayRequest | null | undefined,
  /** When walk/run, hold-loop and sit sessions interrupt (sit runs reverse exit first). */
  locomotionState: MovementAnimationState,
  onComplete?: () => void,
  /** Optional: sync visible clip to multiplayer (sit loop, etc.). */
  broadcastAnimation?: (clipName: string) => void,
) {
  const resumeRef = useRef(resumeAnimation);
  resumeRef.current = resumeAnimation;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const broadcastRef = useRef(broadcastAnimation);
  broadcastRef.current = broadcastAnimation;
  const locomotionRef = useRef(locomotionState);
  locomotionRef.current = locomotionState;

  const machineRef = useRef<Phase>({ kind: 'off' });
  const lastStartedIdRef = useRef<number | null>(null);
  const emoteActiveRef = useRef(false);
  emoteActiveRef.current = emoteRequest != null;

  const finishSessionRef = useRef<() => void>(() => {});

  /** Stop the previous session when request id changes (new emote) or request clears — no onComplete. */
  useEffect(() => {
    return () => {
      const st = machineRef.current;
      if (st.kind === 'off') return;
      st.action.stop();
      machineRef.current = { kind: 'off' };
    };
  }, [emoteRequest?.id]);

  const crossFadeToAction = (
    next: AnimationAction,
    prev: AnimationAction | null,
  ): void => {
    next.enabled = true;
    next.play();
    if (prev && prev !== next) {
      prev.crossFadeTo(next, CROSSFADE_DURATION, true);
    }
    next.fadeIn(CROSSFADE_DURATION);
    currentActionRef.current = next;
  };

  const finishSession = () => {
    const st = machineRef.current;
    if (st.kind === 'off') return;

    if (st.kind === 'one_shot' || st.kind === 'hold_loop') {
      st.action.stop();
      mixer.uncacheAction(st.action.getClip());
    } else if (st.kind === 'sit_entry' || st.kind === 'sit_loop') {
      st.action.stop();
    } else if (st.kind === 'sit_exit') {
      st.action.stop();
      try {
        mixer.uncacheAction(st.action.getClip());
      } catch {
        /* ignore */
      }
    }

    machineRef.current = { kind: 'off' };
    resumeLocomotionAfterEmote(mixer, actions, currentActionRef, resumeRef.current);
    onCompleteRef.current?.();
  };

  finishSessionRef.current = finishSession;

  const startSitExit = (fromAction: AnimationAction, entryClipName: string) => {
    const clip = clipByName(allClips, entryClipName);
    if (!clip) {
      finishSession();
      return;
    }
    const a = mixer.clipAction(clip);
    const duration = Math.max(clip.duration, 1e-6);
    a.reset();
    a.setLoop(LoopOnce, 1);
    a.clampWhenFinished = true;
    a.time = duration;
    a.timeScale = -1;
    a.enabled = true;
    a.play();
    fromAction.crossFadeTo(a, CROSSFADE_DURATION, true);
    a.fadeIn(CROSSFADE_DURATION);
    currentActionRef.current = a;
    machineRef.current = { kind: 'sit_exit', action: a };
  };

  const tryInterrupt = () => {
    const st = machineRef.current;
    if (st.kind === 'off' || st.kind === 'one_shot' || st.kind === 'sit_exit') return;
    if (st.kind === 'hold_loop') {
      finishSession();
      return;
    }
    if (st.kind === 'sit_loop' || st.kind === 'sit_entry') {
      startSitExit(st.action, st.entryClipName);
    }
  };

  // Mixer "finished" for reverse sit exit (backup to useFrame time check)
  useEffect(() => {
    const onFinished = (e: { action?: AnimationAction }) => {
      const st = machineRef.current;
      if (st.kind !== 'sit_exit' || !e.action || e.action !== st.action) return;
      finishSessionRef.current();
    };
    mixer.addEventListener('finished', onFinished as never);
    return () => mixer.removeEventListener('finished', onFinished as never);
  }, [mixer]);

  const clipsKey = allClips.map((c) => c.name).join(',');

  useEffect(() => {
    if (!emoteRequest) {
      lastStartedIdRef.current = null;
      machineRef.current = { kind: 'off' };
      return undefined;
    }

    if (allClips.length === 0) return undefined;

    if (lastStartedIdRef.current === emoteRequest.id) return undefined;

    const { clipName, id } = emoteRequest;
    const mode = getEmoteMachineMode(clipName);
    const prevAction = currentActionRef.current;

    const fail = () => {
      onCompleteRef.current?.();
    };

    if (mode === 'one_shot') {
      const clip = clipByName(allClips, clipName);
      if (!clip) {
        fail();
        return undefined;
      }
      const a = mixer.clipAction(clip);
      a.reset();
      a.setLoop(LoopOnce, 1);
      a.timeScale = 1;
      a.clampWhenFinished = true;
      crossFadeToAction(a, prevAction);
      machineRef.current = { kind: 'one_shot', action: a };
      lastStartedIdRef.current = id;
      return undefined;
    }

    if (mode === 'hold_loop') {
      const clip = clipByName(allClips, clipName);
      if (!clip) {
        fail();
        return undefined;
      }
      const a = mixer.clipAction(clip);
      a.reset();
      a.setLoop(LoopRepeat, Infinity);
      a.timeScale = 1;
      a.clampWhenFinished = false;
      crossFadeToAction(a, prevAction);
      machineRef.current = { kind: 'hold_loop', action: a };
      lastStartedIdRef.current = id;
      return undefined;
    }

    // sit_sequence — menu still sends clipName "sit"
    const entry = firstResolvedClip(allClips, [SIT_ENTRY_CLIP, 'sit']);
    const loop = firstResolvedClip(allClips, [SIT_LOOP_CLIP, 'sitting_idle', 'sit']);
    if (!entry || !loop) {
      fail();
      return undefined;
    }

    const a = mixer.clipAction(entry.clip);
    a.reset();
    a.setLoop(LoopOnce, 1);
    a.timeScale = 1;
    a.clampWhenFinished = true;
    crossFadeToAction(a, prevAction);
    machineRef.current = { kind: 'sit_entry', action: a, entryClipName: entry.name };
    broadcastRef.current?.(entry.name);
    lastStartedIdRef.current = id;

    return undefined;
  }, [emoteRequest, emoteRequest?.id, emoteRequest?.clipName, clipsKey, mixer, currentActionRef]);

  useFrame(() => {
    if (!emoteActiveRef.current) return;

    const loc = locomotionRef.current;
    if (loc !== 'idle') {
      tryInterrupt();
    }

    const st = machineRef.current;
    if (st.kind === 'one_shot') {
      const d = st.action.getClip().duration;
      if (st.action.time >= d - ONESHOT_LEAD_TIME) {
        finishSession();
      }
      return;
    }

    if (st.kind === 'hold_loop') {
      return;
    }

    if (st.kind === 'sit_entry') {
      const d = st.action.getClip().duration;
      if (st.action.time >= d - ONESHOT_LEAD_TIME) {
        const loopResolved = firstResolvedClip(allClips, [SIT_LOOP_CLIP, 'sitting_idle', 'sit']);
        if (!loopResolved) {
          finishSession();
          return;
        }
        const loopAction = mixer.clipAction(loopResolved.clip);
        loopAction.reset();
        loopAction.setLoop(LoopRepeat, Infinity);
        loopAction.timeScale = 1;
        loopAction.clampWhenFinished = false;
        crossFadeToAction(loopAction, st.action);
        machineRef.current = {
          kind: 'sit_loop',
          action: loopAction,
          entryClipName: st.entryClipName,
        };
        broadcastRef.current?.(loopResolved.name);
      }
      return;
    }

    if (st.kind === 'sit_loop') {
      return;
    }

    if (st.kind === 'sit_exit') {
      if (st.action.timeScale < 0 && st.action.time <= ONESHOT_LEAD_TIME) {
        finishSession();
      }
    }
  });

  return;
}
