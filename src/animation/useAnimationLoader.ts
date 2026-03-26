// ---------------------------------------------------------------------------
// useAnimationLoader — loads multiple animation GLBs, renames clips to
// standard names, and binds them to a clone via drei's useAnimations.
//
// Returns { actions, mixer } ready for the looping and one-shot hooks.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';
import { animDeployOk, animDeployWarn } from '../debug/animDeployDebug';

// Stable empty array so useGLTF([]) gets the same reference every render.
const EMPTY: string[] = [];

function urlStemLooksContentHashed(url: string): boolean {
  const stem = (url.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
  return /^[0-9a-f]{40,}$/i.test(stem);
}

function resolveClipStateName(
  index: number,
  urls: readonly string[],
  animationClipNames: readonly string[] | undefined,
  fallbackFromGltf: string,
): string {
  if (animationClipNames && animationClipNames.length === urls.length) {
    const n = animationClipNames[index]?.trim();
    if (n) return n;
  }
  // Dev URLs often end with real filenames; production URLs are content-hashed — then clipNames must be passed.
  return (urls[index] ?? '').split('/').pop()?.replace(/\.[^.]+$/, '') ?? fallbackFromGltf;
}

/**
 * Load animation GLBs and bind their clips to the given clone root.
 *
 * @param animationClipNames — Required when `animationUrls` are content-hashed CDN URLs
 *   (same length as urls, stems from logical paths: idle, walk2, wave, …). See `getAnimationClipNames()`.
 */
export function useAnimationLoader(
  animationUrls: string[] | undefined,
  cloneRoot: THREE.Object3D,
  animationClipNames?: string[],
) {
  const urls = animationUrls ?? EMPTY;
  const animResults = useGLTF(urls) as GLTF | GLTF[];

  const namesKey = animationClipNames?.join('\0') ?? '';

  const allClips = useMemo(() => {
    if (urls.length === 0) return [];
    const results = Array.isArray(animResults) ? animResults : [animResults];
    return results.flatMap((r, i) => {
      // Pick the first clip whose name isn't the Blender default take name.
      const clip = r.animations.find((a) => !a.name.includes('BaseLayer')) ?? r.animations[0];
      if (!clip) return [];
      const stateName = resolveClipStateName(i, urls, animationClipNames, clip.name);
      const renamed = clip.clone();
      renamed.name = stateName;
      // Strip any "namespace:" prefix from track names so PropertyBinding can
      // resolve them against the stripped bone names on the clone.
      renamed.tracks = renamed.tracks.map((track) => {
        const t = track.clone();
        t.name = t.name.replace(/^[^.:]+:/, '');
        return t;
      });
      return [renamed];
    });
  }, [animResults, urls.join('|'), namesKey]);

  const { actions, mixer } = useAnimations(allClips, cloneRoot);

  const loaderLogSigRef = useRef<string>('');

  useEffect(() => {
    const sig = [
      urls.join('|'),
      allClips.map((c) => `${c.name}:${c.tracks.length}`).join(','),
      Object.keys(actions)
        .sort()
        .map((k) => `${k}:${actions[k] ? '1' : '0'}`)
        .join(','),
    ].join('#');
    if (sig === loaderLogSigRef.current) return;
    loaderLogSigRef.current = sig;

    if (urls.length === 0) {
      animDeployOk('useAnimationLoader', 'no external animation URLs');
      return;
    }

    const hashedUrlsWithoutNames =
      urls.some(urlStemLooksContentHashed) &&
      (!animationClipNames || animationClipNames.length !== urls.length);
    if (hashedUrlsWithoutNames) {
      animDeployWarn(
        'useAnimationLoader',
        'content-hashed animation URLs need animationClipNames (same length as urls) — see getAnimationClipNames()',
        { urlCount: urls.length, clipNameCount: animationClipNames?.length ?? 0 },
      );
    }

    if (animationClipNames != null && animationClipNames.length !== urls.length) {
      animDeployWarn('useAnimationLoader', 'animationClipNames.length !== animationUrls.length', {
        urlCount: urls.length,
        clipNameCount: animationClipNames.length,
      });
    }

    const expectedStems = allClips.map((c) => c.name);

    if (allClips.length < urls.length) {
      animDeployWarn('useAnimationLoader', 'fewer clips than URL count (some GLBs may have no animation)', {
        urlCount: urls.length,
        clipCount: allClips.length,
        urls,
        clipNames: allClips.map((c) => c.name),
      });
    }

    const clipSummary = allClips.map((c) => ({
      name: c.name,
      duration: c.duration,
      tracks: c.tracks.length,
    }));
    const actionKeys = Object.keys(actions).sort();
    const actionPresence = Object.fromEntries(
      actionKeys.map((k) => [k, actions[k] != null]),
    ) as Record<string, boolean>;

    animDeployOk('useAnimationLoader', 'clips + mixer actions snapshot', {
      expectedStems,
      clipSummary,
      actionKeys,
      actionPresence,
    });

    for (const stem of expectedStems) {
      if (!actionPresence[stem]) {
        animDeployWarn('useAnimationLoader', `no AnimationAction for expected clip "${stem}"`, {
          expectedStems,
          actionKeys,
        });
      }
    }

    for (const c of allClips) {
      if (c.tracks.length === 0) {
        animDeployWarn('useAnimationLoader', `clip "${c.name}" has zero tracks (will not move bones)`, {
          clipName: c.name,
        });
      }
    }
  }, [urls.join('|'), animationClipNames, actions, allClips]);

  return { actions, mixer, allClips };
}
