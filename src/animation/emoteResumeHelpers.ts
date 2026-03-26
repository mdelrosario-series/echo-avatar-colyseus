// ---------------------------------------------------------------------------
// Shared “back to locomotion” setup after emotes / sit exit.
// ---------------------------------------------------------------------------

import type { MutableRefObject } from 'react';
import type { AnimationAction, AnimationMixer } from 'three';
import { LoopRepeat } from 'three';

export function resumeLocomotionAfterEmote(
  mixer: AnimationMixer,
  actions: Record<string, AnimationAction | null>,
  currentActionRef: MutableRefObject<AnimationAction | null>,
  resumeName: string | undefined,
): AnimationAction | null {
  const resumeAction =
    (resumeName ? actions[resumeName] : undefined) ?? Object.values(actions).find(Boolean) ?? null;
  if (!resumeAction) return null;

  const list = (mixer as unknown as { _actions?: AnimationAction[] })._actions;
  if (list) {
    for (const a of [...list]) {
      if (a.getClip().name !== resumeName) a.stop();
    }
  }
  resumeAction.reset();
  resumeAction.setLoop(LoopRepeat, Infinity);
  resumeAction.enabled = true;
  resumeAction.paused = false;
  resumeAction.setEffectiveWeight(1);
  resumeAction.time = 0;
  resumeAction.timeScale = 1;
  resumeAction.play();
  currentActionRef.current = resumeAction;
  mixer.update(0);
  return resumeAction;
}
