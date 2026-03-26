// ---------------------------------------------------------------------------
// useMultiplayer — thin composer hook.
//
// Creates the core infrastructure (PlayerStore, MessageRouters,
// ConnectionManager) and composes feature hooks.  All message handling
// lives in the feature hooks — this file is just plumbing.
//
// Return API is identical to the previous monolithic version so
// HomeTab / WorldTab / RemotePlayers need zero changes.
// ---------------------------------------------------------------------------

import { useState, useEffect, useCallback, useReducer, useMemo } from 'react';
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import type { BroadcastMessage, PrivateMessage } from './protocol/echoAvatarProtocol';
import type { RemotePlayerState } from './types';
import { PlayerStore } from './core/PlayerStore';
import { MessageRouter } from './core/MessageRouter';
import { ConnectionManager } from './core/ConnectionManager';
import { useMovementSync } from './features/useMovementSync';
import { useChatSync } from './features/useChatSync';
import { useAvatarSync } from './features/useAvatarSync';
import { useAnimationSync } from './features/useAnimationSync';
import { usePostureSync } from './features/usePostureSync';

// ---------------------------------------------------------------------------
// Modes (re-exported so consumers keep the same import path)
// ---------------------------------------------------------------------------
export type UseMultiplayerOptions =
  | { mode: 'create';       roomType: 'player_room' | 'avatar_room'; roomName?: string }
  | { mode: 'joinOrCreate'; roomType: 'world_room' }
  | { mode: 'joinById'; roomId: string };

/** Matches `ConnectionManager.supportsAutoRejoin` — Plaza + private home (10s heartbeat, backoff rejoin). */
export function multiplayerSessionUsesAutoRejoin(opts: UseMultiplayerOptions): boolean {
  return (
    (opts.mode === 'joinOrCreate' && opts.roomType === 'world_room') ||
    (opts.mode === 'create' && opts.roomType === 'player_room')
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useMultiplayer(options?: UseMultiplayerOptions, avatarUrlRef?: React.RefObject<string | null>) {
  // ---- Core infrastructure (stable across renders) ----
  const [broadcastRouter] = useState(() => new MessageRouter<BroadcastMessage>());
  const [privateRouter]   = useState(() => new MessageRouter<PrivateMessage>());
  const [store]           = useState(() => new PlayerStore());
  const [connection]      = useState(() => new ConnectionManager(broadcastRouter, privateRouter));

  // ---- React re-render triggers ----
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Subscribe to both store and connection changes
  useEffect(() => {
    const unsub1 = store.subscribe(forceUpdate);
    const unsub2 = connection.subscribe(forceUpdate);
    return () => { unsub1(); unsub2(); };
  }, [store, connection]);

  // Stable ref to the store's internal Map for RemotePlayers useFrame reads
  const positionsRef = useMemo(
    () => ({ current: store._map }) as React.MutableRefObject<Map<string, RemotePlayerState>>,
    [store],
  );

  // ---- Connection lifecycle ----
  const shouldConnect = options !== undefined;
  const optionsKey    = options ? JSON.stringify(options) : '';

  useEffect(() => {
    if (!shouldConnect) return;

    store.clear();

    const avatarUrl = avatarUrlRef?.current ?? '';
    void connection.connect(options!, avatarUrl || undefined);

    return () => {
      connection.disconnect();
    };
  }, [shouldConnect, optionsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic re-sync heartbeat — reconciles state drift on long-lived connections.
  // Plaza + private home: shorter interval (like global_room) to reduce idle eviction.
  useEffect(() => {
    if (!shouldConnect || !options) return;
    const intervalMs = multiplayerSessionUsesAutoRejoin(options) ? 10_000 : 60_000;
    const id = setInterval(() => {
      if (connection.isConnected) {
        connection.sendSyncRequest();
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [shouldConnect, optionsKey, connection]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on tab close
  useEffect(() => {
    const cleanup = () => connection.disconnect();
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    return () => {
      window.removeEventListener('beforeunload', cleanup);
      window.removeEventListener('pagehide', cleanup);
    };
  }, [connection]);

  // ---- Feature hooks ----
  const { sendPosition }  = useMovementSync(broadcastRouter, privateRouter, store, connection);
  const { messages, sendChat } = useChatSync(broadcastRouter, connection);
  const { sendAvatar }    = useAvatarSync(broadcastRouter, store, connection);
  const { sendAnimation } = useAnimationSync(broadcastRouter, store, connection);
  const { sendPosture }   = usePostureSync(broadcastRouter, store, connection);

  // ---- Kick (simple enough to stay inline) ----
  const kickPlayer = useCallback(
    (targetPlayerId: string) => connection.send({ type: 'kickPlayer', targetPlayerId }),
    [connection],
  );

  const prepareForNewJoinIntent = useCallback(() => {
    connection.prepareForNewJoinIntent();
  }, [connection]);

  // ---- Read connection snapshot ----
  const snap = connection.snapshot;
  const isConnecting = snap.state === 'connecting' || snap.state === 'reconnecting';
  const isReconnecting = snap.state === 'reconnecting';

  // ---- Derived state from store ----
  const ownerId = snap.ownerId;
  const myId = snap.myPlayerId;
  const allIds = store.getIds();
  const remotePlayerIds =
    myId.length > 0 ? allIds.filter((id) => String(id) !== String(myId)) : allIds;
  const playerCount = connection.isConnected ? 1 + remotePlayerIds.length : 0;
  const remotePlayerAvatarUrls = store.getAvatarUrls();
  const remotePlayerAnimations = store.getAnimations();
  const remotePlayerPostures   = store.getPostures();
  const remotePlayerNames      = store.getNames();

  return {
    // Connection
    isConnecting,
    isReconnecting,
    error: snap.error,
    wasKicked: snap.wasKicked,
    roomName: snap.roomName,
    roomCode: snap.roomCode,
    homeRoomToken: snap.roomCode,
    playerCount,
    environmentIndex: snap.environmentIndex,
    serverRoomType: snap.serverRoomType,
    ownerId,
    /** Colyseus session id for this room — use for protocol, kick targets, voice channel uid. */
    myProfileId: snap.myPlayerId,
    /** RUN.game profile id — stable across rooms; use for "your player id" / invites UI. */
    stableProfileId: RundotGameAPI.getProfile().id ?? '',

    // Players
    remotePlayerIds,
    remotePlayerPositions: positionsRef,
    remotePlayerAvatarUrls,
    remotePlayerNames,
    remotePlayerAnimations,
    remotePlayerPostures,

    // Actions
    sendPosition,
    sendAvatar,
    sendAnimation,
    sendPosture,
    sendChat,
    kickPlayer,
    prepareForNewJoinIntent,

    // Chat
    messages,
  };
}
