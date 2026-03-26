// ---------------------------------------------------------------------------
// On-screen tail of [AnimDeploy] logs — visible when host strips console or
// when DevTools is attached to the wrong frame (parent vs iframe).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import { getAnimDeployLogTail, subscribeAnimDeployLog, type AnimDeployEntry } from './animDeployDebug';

const TAIL = 24;

function formatEntry(e: AnimDeployEntry): string {
  const time = new Date(e.t).toLocaleTimeString([], { hour12: false });
  const tag = e.level === 'warn' ? 'WARN' : 'OK  ';
  const detail =
    e.detail === undefined
      ? ''
      : (() => {
          try {
            const s = JSON.stringify(e.detail);
            return s.length > 120 ? ` ${s.slice(0, 117)}…` : ` ${s}`;
          } catch {
            return ' [detail]';
          }
        })();
  return `${time} ${tag} [${e.scope}] ${e.message}${detail}`;
}

export function AnimDeployHud() {
  const [entries, setEntries] = useState<AnimDeployEntry[]>(() => getAnimDeployLogTail(TAIL));
  const [open, setOpen] = useState(false);

  const refresh = useCallback(() => {
    setEntries(getAnimDeployLogTail(TAIL));
  }, []);

  useEffect(() => refresh(), [refresh]);
  useEffect(() => subscribeAnimDeployLog(refresh), [refresh]);

  return (
    <div
      style={{
        position: 'fixed',
        right: 0,
        bottom: 0,
        zIndex: 2147483000,
        maxWidth: 'min(96vw, 420px)',
        width: 'max-content',
        marginLeft: 'auto',
        fontFamily: 'ui-monospace, Menlo, Monaco, Consolas, monospace',
        fontSize: 10,
        /* Let taps pass through empty margin; only the bar + panel capture input. */
        pointerEvents: 'none',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'block',
          width: '100%',
          minWidth: 200,
          pointerEvents: 'auto',
          padding: '6px 10px',
          background: 'rgba(0,0,0,0.82)',
          color: '#9cf0a8',
          border: '1px solid rgba(100, 200, 140, 0.4)',
          borderBottom: open ? 'none' : undefined,
          borderRadius: open ? '6px 6px 0 0' : '6px 0 0 0',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        AnimDeploy · __ECHO_ANIM_DEPLOY__.tail() · {open ? '▼ hide' : '▲ show'} ({entries.length})
      </button>
      {open && (
        <div
          style={{
            maxHeight: '38vh',
            overflow: 'auto',
            padding: '8px 10px',
            pointerEvents: 'auto',
            background: 'rgba(0,0,0,0.88)',
            border: '1px solid rgba(100, 200, 140, 0.35)',
            borderTop: 'none',
            borderRadius: '0 0 0 6px',
            color: '#c8e8cc',
            lineHeight: 1.35,
          }}
        >
          {entries.length === 0 ? (
            <span style={{ color: '#666' }}>Waiting for first log… · filter console: [AnimDeploy]</span>
          ) : (
            entries.map((e, i) => (
              <div
                key={`${e.t}-${i}-${e.scope}`}
                style={{
                  marginBottom: 4,
                  wordBreak: 'break-word',
                  color: e.level === 'warn' ? '#ffb080' : '#9ee8c4',
                }}
              >
                {formatEntry(e)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
