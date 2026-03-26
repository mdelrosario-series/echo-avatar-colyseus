// ---------------------------------------------------------------------------
// GLB / scene debug panel visibility (World + Home tabs).
//
// Dev: panel on by default.
// Production: hidden until:
//   __ECHO_GLB_DEBUG__.show()   — show panel
//   __ECHO_GLB_DEBUG__.hide()   — hide
//   __ECHO_GLB_DEBUG__.reset()  — follow dev/prod default again
//
// Iframe: select the game frame in DevTools before running commands.
// ---------------------------------------------------------------------------

let forcedVisible: boolean | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

export function getGlbSceneDebugPanelVisible(): boolean {
  return forcedVisible !== null ? forcedVisible : import.meta.env.DEV;
}

export function subscribeGlbSceneDebugPanel(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function showGlbSceneDebugPanel(): void {
  forcedVisible = true;
  notify();
}

export function hideGlbSceneDebugPanel(): void {
  forcedVisible = false;
  notify();
}

/** Clear override — use DEV default (visible in dev, hidden in prod). */
export function resetGlbSceneDebugPanel(): void {
  forcedVisible = null;
  notify();
}

type GlbDebugApi = {
  show: () => void;
  hide: () => void;
  reset: () => void;
  isVisible: () => boolean;
};

if (typeof globalThis !== 'undefined') {
  try {
    (globalThis as unknown as { __ECHO_GLB_DEBUG__?: GlbDebugApi }).__ECHO_GLB_DEBUG__ = {
      show: showGlbSceneDebugPanel,
      hide: hideGlbSceneDebugPanel,
      reset: resetGlbSceneDebugPanel,
      isVisible: getGlbSceneDebugPanelVisible,
    };
  } catch {
    /* ignore */
  }
}
