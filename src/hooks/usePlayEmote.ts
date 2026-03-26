// ---------------------------------------------------------------------------
// usePlayEmote — local one-shot emotes (wave, cheer, etc.) + network sync.
//
// playEmote('wave') bumps a request id so AvatarGlbMesh replays the clip;
// on complete, clears the request and restores movement animation over the wire.
// ---------------------------------------------------------------------------

import { useRef, useState, useCallback } from 'react';
import type { EmotePlayRequest } from '../animation/emoteTypes';

export type { EmotePlayRequest };

export function usePlayEmote(
  sendAnimation: (anim: string) => void,
  getResumeAnimation: () => string,
) {
  const idRef = useRef(0);
  const [emoteRequest, setEmoteRequest] = useState<EmotePlayRequest | null>(null);

  const playEmote = useCallback(
    (clipName: string) => {
      sendAnimation(clipName);
      idRef.current += 1;
      setEmoteRequest({ clipName, id: idRef.current });
    },
    [sendAnimation],
  );

  const onEmoteComplete = useCallback(() => {
    setEmoteRequest(null);
    sendAnimation(getResumeAnimation());
  }, [sendAnimation, getResumeAnimation]);

  return { playEmote, emoteRequest, onEmoteComplete };
}
