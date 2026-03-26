// ---------------------------------------------------------------------------
// Summon global_room member list from the iframe console (panel is hidden by default).
//
//   __ECHO_GLOBAL_ROOM_UI__.show()
//   __ECHO_GLOBAL_ROOM_UI__.hide()
//   __ECHO_GLOBAL_ROOM_UI__.toggle()
//   __ECHO_GLOBAL_ROOM_UI__.isVisible()
//
// Use DevTools with the game iframe selected, not only the parent shell.
// ---------------------------------------------------------------------------

let visible = false;
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

export function subscribeGlobalRoomMembersUi(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getGlobalRoomMembersUiVisible(): boolean {
  return visible;
}

export function showGlobalRoomMembersUi(): void {
  if (visible) return;
  visible = true;
  notify();
}

export function hideGlobalRoomMembersUi(): void {
  if (!visible) return;
  visible = false;
  notify();
}

export function toggleGlobalRoomMembersUi(): void {
  visible = !visible;
  notify();
}

type GlobalRoomUiApi = {
  show: () => void;
  hide: () => void;
  toggle: () => void;
  isVisible: () => boolean;
};

function installGlobalApi(): void {
  try {
    (globalThis as unknown as { __ECHO_GLOBAL_ROOM_UI__?: GlobalRoomUiApi }).__ECHO_GLOBAL_ROOM_UI__ = {
      show: showGlobalRoomMembersUi,
      hide: hideGlobalRoomMembersUi,
      toggle: toggleGlobalRoomMembersUi,
      isVisible: () => visible,
    };
  } catch {
    /* ignore */
  }
}

installGlobalApi();
