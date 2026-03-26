// ---------------------------------------------------------------------------
// useKeyboardInput — tracks currently held keys via window keydown/keyup.
// Returns a stable ref to the live Set<string> of held key codes.
// ---------------------------------------------------------------------------

import { useRef, useEffect } from 'react';

export function useKeyboardInput() {
  const keysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.code);
    const onKeyUp   = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  return keysRef;
}
