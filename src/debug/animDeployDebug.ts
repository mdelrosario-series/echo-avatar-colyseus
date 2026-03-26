// ---------------------------------------------------------------------------
// Deploy / iframe animation debugging (always on)
//
// 1) Console — filter: [AnimDeploy]  (some hosts strip console.*; see below)
// 2) globalThis.__ECHO_ANIM_DEPLOY__ — { tail(n), entries, clear }  (iframe console)
// 3) CustomEvent 'echo-anim-deploy' on window (optional listeners)
// 4) AnimDeployHud — on-screen tail (see AnimDeployHud.tsx)
//
//   OK   — routine checkpoints (expected)
//   WARN — unexpected; fix these first
// ---------------------------------------------------------------------------

export type AnimDeployLevel = 'ok' | 'warn';

export type AnimDeployEntry = {
  t: number;
  level: AnimDeployLevel;
  scope: string;
  message: string;
  detail?: Record<string, unknown>;
};

const MAX_BUFFER = 400;
const buffer: AnimDeployEntry[] = [];
const listeners = new Set<() => void>();

function notifyListeners(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

function exposeGlobalApi(): void {
  try {
    (
      globalThis as unknown as {
        __ECHO_ANIM_DEPLOY__?: {
          entries: () => AnimDeployEntry[];
          tail: (n?: number) => AnimDeployEntry[];
          clear: () => void;
        };
      }
    ).__ECHO_ANIM_DEPLOY__ = {
      entries: () => [...buffer],
      tail: (n = 50) => buffer.slice(-n),
      clear: () => {
        buffer.length = 0;
        notifyListeners();
      },
    };
  } catch {
    /* ignore */
  }
}

function pushEntry(entry: AnimDeployEntry): void {
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) {
    buffer.splice(0, buffer.length - MAX_BUFFER);
  }
  exposeGlobalApi();
  notifyListeners();
  try {
    globalThis.dispatchEvent(new CustomEvent('echo-anim-deploy', { detail: entry }));
  } catch {
    /* ignore */
  }
}

/** Indirect console call — survives some dumb console strippers; still fails if host replaces console. */
function emitConsole(level: 'log' | 'warn', prefix: string, message: string, detail?: Record<string, unknown>): void {
  try {
    const c = globalThis.console as Console | undefined;
    if (!c) return;
    const fn = level === 'warn' ? c.warn : c.log;
    if (typeof fn !== 'function') return;
    if (detail !== undefined) fn.call(c, prefix, message, detail);
    else fn.call(c, prefix, message);
  } catch {
    /* ignore */
  }
}

export function subscribeAnimDeployLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAnimDeployLogTail(n = 50): AnimDeployEntry[] {
  return buffer.slice(-n);
}

/** Expected path — search: [AnimDeploy] OK */
export function animDeployOk(scope: string, message: string, detail?: Record<string, unknown>): void {
  const prefix = `[AnimDeploy] OK   [${scope}]`;
  pushEntry({ t: Date.now(), level: 'ok', scope, message, detail });
  emitConsole('log', prefix, message, detail);
}

/** Unexpected — search: [AnimDeploy] WARN */
export function animDeployWarn(scope: string, message: string, detail?: Record<string, unknown>): void {
  const prefix = `[AnimDeploy] WARN [${scope}]`;
  pushEntry({ t: Date.now(), level: 'warn', scope, message, detail });
  emitConsole('warn', prefix, message, detail);
}

// Prime global API so DevTools autocomplete works before first log
exposeGlobalApi();
