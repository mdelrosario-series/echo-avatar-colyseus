/**
 * CDN Asset URL Resolver
 *
 * In production (Rundot), assets in public/cdn-assets/ are served from the CDN
 * under content-hashed filenames. The SDK's `cdn.resolveAssetUrl()` looks up the
 * deploy-time manifest and returns the real hashed URL.
 *
 * In dev mode (Vite), the MockCdnApi serves files straight from public/.
 *
 * This module resolves every CDN asset URL at boot and exposes getCdnUrl() so
 * components can obtain a usable URL synchronously.
 */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { animDeployOk, animDeployWarn } from '../debug/animDeployDebug';

// ---------------------------------------------------------------------------
// Registry — all CDN asset paths relative to the cdn-assets/ folder
// ---------------------------------------------------------------------------

export const CDN_ASSET_PATHS = {
  // Characters
  DEFAULT_AVATAR: 'characters/base.glb',
  ERROR_AVATAR: 'characters/base_error.glb',

  // Animations
  ANIM_IDLE: 'animations/idle.glb',
  ANIM_WALK: 'animations/walk2.glb',
  ANIM_RUN: 'animations/run2.glb',
  ANIM_WAVE: 'animations/wave.glb',
  ANIM_CHICKEN_DANCE: 'animations/chicken_dance.glb',
  ANIM_SITTING_IDLE: 'animations/sitting_idle.glb',
  ANIM_SITTING: 'animations/sit.glb',
  /** Sit state machine: transition down (same file can hold clip `idle_to_sit_floor`). */
  ANIM_IDLE_TO_SIT_FLOOR: 'animations/idle_to_sit_floor.glb',
  /** Sit state machine: floor idle loop (`sitting_floor_idle_loop`). */
  ANIM_SIT_FLOOR_IDLE_LOOP: 'animations/sitting_floor_idle_loop.glb',
  ANIM_WAVE_HIP_HOP: 'animations/wave_hip_hop.glb',

  // Levels
  LEVEL_COZY_TEST: 'levels/cozy_test.json',

  // Environments
  ENV_GDC: 'environments/gdc.glb',
  ENV_COZY01: 'environments/cozy01.glb',
  ENV_COZY02: 'environments/cozy02.glb',
  ENV_COZY03: 'environments/cozy03.glb',
  ENV_CONFERENCE01: 'environments/conference_room_01.glb',

  // Fonts
  FONT_MIKODACS: 'fonts/mikodacs/Mikodacs.otf',

  // UI assets
  AVATAR_BOX: 'AvatarBox.png',
  CREATE_AVATAR_BTN: 'UI/create_avatar_button.png',

  // Audio
  AUDIO_BG_MUSIC: 'audio/Soft Current Field.mp3',
  AUDIO_INVITE_SFX: 'audio/Invite SFX.mp3',
  AUDIO_UI_SFX: 'audio/Ui SFX.mp3',
} as const;

export type CdnAssetKey = keyof typeof CDN_ASSET_PATHS;

// Convenience: all animation asset keys in the standard order
export const ANIMATION_KEYS: CdnAssetKey[] = [
  'ANIM_IDLE',
  'ANIM_WALK',
  'ANIM_RUN',
  'ANIM_WAVE',
  'ANIM_CHICKEN_DANCE',
  'ANIM_SITTING_IDLE',
  'ANIM_SITTING',
  'ANIM_IDLE_TO_SIT_FLOOR',
  'ANIM_SIT_FLOOR_IDLE_LOOP',
  'ANIM_WAVE_HIP_HOP',
];

// ---------------------------------------------------------------------------
// Resolved URL cache (populated by resolveCdnAssets)
// ---------------------------------------------------------------------------

const resolvedUrls = new Map<CdnAssetKey, string>();

/**
 * Resolve every registered CDN asset path to a usable URL and cache it.
 *
 * - **Dev mode (Vite):** The SDK's MockCdnApi resolves to local dev-server paths.
 * - **Production (Rundot):** The SDK's HostCdnApi looks up the deploy-time
 *   manifest and returns the content-hashed CDN URL for each asset.
 *
 * Call this **once** before the first React render.
 */
export async function preloadCdnAssets(): Promise<void> {
  const entries = Object.entries(CDN_ASSET_PATHS) as [CdnAssetKey, string][];

  // Resolve all asset paths through the SDK (works in both dev and production)
  const results = await Promise.allSettled(
    entries.map(async ([key, path]) => {
      const url = await RundotGameAPI.cdn.resolveAssetUrl(path);
      return { key, url };
    }),
  );

  results.forEach((r, i) => {
    const [key, path] = entries[i]!;
    if (r.status === 'fulfilled') {
      const { url } = r.value;
      resolvedUrls.set(key, url);
      console.log(`[CDN] Resolved ${key} → ${url}`);
      if (key === 'ANIM_IDLE' || key === 'ANIM_WALK' || key === 'ANIM_RUN') {
        animDeployOk('cdn.preload', `resolved ${key}`, {
          logicalPath: path,
          url,
        });
      }
    } else {
      console.error('[CDN] Failed to resolve asset:', key, r.reason);
      animDeployWarn('cdn.preload', `resolveAssetUrl rejected for ${key} (check manifest / deploy)`, {
        key,
        logicalPath: path,
        reason: String(r.reason),
      });
    }
  });
}

/**
 * Return a usable URL for a CDN asset.
 *
 * Must be called **after** `preloadCdnAssets()` has resolved.
 */
export function getCdnUrl(key: CdnAssetKey): string {
  const url = resolvedUrls.get(key);
  if (url) return url;

  // Fallback — should only happen if preload was skipped or an asset failed.
  // In dev this still works; in production this path won't resolve.
  animDeployWarn('cdn.getCdnUrl', `asset not in preload cache — relative fallback (often breaks in iframe)`, {
    key,
    logicalPath: CDN_ASSET_PATHS[key],
    fallbackUrl: `cdn-assets/${CDN_ASSET_PATHS[key]}`,
  });
  return `cdn-assets/${CDN_ASSET_PATHS[key]}`;
}

/**
 * Convenience: return the array of resolved animation URLs in standard order.
 */
export function getAnimationUrls(): string[] {
  return ANIMATION_KEYS.map(getCdnUrl);
}

/**
 * Clip stem from a logical cdn-assets path (e.g. `animations/walk2.glb` → `walk2`).
 * Use with {@link getAnimationClipNames} when binding animations: production CDN
 * URLs are content-hashed (`…/ABCD123….glb`), so clip names must not be derived from the URL.
 */
export function logicalPathToClipStem(logicalPath: string): string {
  const base = logicalPath.split('/').pop() ?? logicalPath;
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(0, dot) : base;
}

/** Standard clip names in the same order as {@link getAnimationUrls} / {@link ANIMATION_KEYS}. */
export function getAnimationClipNames(): string[] {
  return ANIMATION_KEYS.map((key) => logicalPathToClipStem(CDN_ASSET_PATHS[key]));
}
