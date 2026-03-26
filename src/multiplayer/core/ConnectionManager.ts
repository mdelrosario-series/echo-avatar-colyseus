// ---------------------------------------------------------------------------
// ConnectionManager — Colyseus room lifecycle + app-level rejoin (plaza/home).
// ---------------------------------------------------------------------------

import type { Room } from '@colyseus/sdk';
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import type { EchoAvatarProtocol, BroadcastMessage, PrivateMessage } from '../protocol/echoAvatarProtocol';
import type { UseMultiplayerOptions } from '../useMultiplayer';
import { getColyseusClient } from '../colyseusClient';
import { awaitColyseusLeaves, enqueueColyseusLeave } from '../colyseusLeaveChain';
import { MessageRouter } from './MessageRouter';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface ConnectionSnapshot {
  state: ConnectionState;
  roomCode: string | null;
  roomName: string | null;
  myPlayerId: string;
  error: string | null;
  wasKicked: boolean;
  environmentIndex: number | null;
  serverRoomType: string | null;
  ownerId: string | null;
}

export type ConnectionListener = () => void;

const AUTO_REJOIN_BASE_MS = 1_500;
const AUTO_REJOIN_MAX_MS = 45_000;

/** Dev-only aid: React StrictMode runs connect twice — successful join count > 1 is normal in development. */
let cmSuccessfulJoinCounter = 0;

export class ConnectionManager {
  private room: Room | null = null;
  private unsubs: Array<() => void> = [];
  private _state: ConnectionState = 'disconnected';
  private _roomCode: string | null = null;
  private _roomName: string | null = null;
  private _myPlayerId = '';
  private _error: string | null = null;
  private _wasKicked = false;
  private _environmentIndex: number | null = null;
  private _serverRoomType: string | null = null;
  private _ownerId: string | null = null;
  private _cancelled = false;
  private _hadSuccessfulJoin = false;
  private persistedAutoRejoinOptions: UseMultiplayerOptions | null = null;
  private persistedAutoRejoinAvatarUrl: string | undefined;
  private autoRejoinAttempt = 0;
  private autoRejoinTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: ConnectionListener[] = [];
  private lastEmitTime = 0;
  private syncRequestSeq = 0;
  private lastAcceptedSyncResponseSeq = 0;

  private broadcastRouter: MessageRouter<BroadcastMessage>;
  private privateRouter: MessageRouter<PrivateMessage>;

  constructor(
    broadcastRouter: MessageRouter<BroadcastMessage>,
    privateRouter: MessageRouter<PrivateMessage>,
  ) {
    this.broadcastRouter = broadcastRouter;
    this.privateRouter = privateRouter;

    this.privateRouter.register('playerKicked', (msg) => {
      this.clearAutoRejoinTimer();
      this.persistedAutoRejoinOptions = null;
      this._hadSuccessfulJoin = false;
      this._wasKicked = true;
      this._error = msg.reason ?? 'You were kicked from the room.';
      this._state = 'disconnected';
      const r = this.room;
      this.teardownRoom();
      if (r) this.scheduleRoomLeave(r);
      this.notify();
    });

    this.privateRouter.register('roomInfo', (msg) => {
      console.log('[CM] roomInfo received, environmentIndex:', msg.environmentIndex, 'roomType:', msg.roomType, 'ownerId:', msg.ownerId);
      this._environmentIndex = msg.environmentIndex ?? 0;
      this._serverRoomType = msg.roomType ?? null;
      this._ownerId = msg.ownerId ?? null;
      this.notify();
    });
  }

  subscribe(listener: ConnectionListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const l of this.listeners) l();
  }

  get snapshot(): ConnectionSnapshot {
    return {
      state: this._state,
      roomCode: this._roomCode,
      roomName: this._roomName,
      myPlayerId: this._myPlayerId,
      error: this._error,
      wasKicked: this._wasKicked,
      environmentIndex: this._environmentIndex,
      serverRoomType: this._serverRoomType,
      ownerId: this._ownerId,
    };
  }

  get isConnected(): boolean {
    return this._state === 'connected';
  }

  get myPlayerId(): string {
    return this._myPlayerId;
  }

  /**
   * Call immediately before the UI sets new join options (invite, room browser, etc.).
   * Clears stale `wasKicked` / `error` and notifies so the next render does not run
   * "return to lobby" logic against the previous session while `joinOptions` is already non-null.
   */
  prepareForNewJoinIntent(): void {
    this._wasKicked = false;
    this._error = null;
    this.notify();
  }

  private clearRoomListeners() {
    for (const u of this.unsubs) u();
    this.unsubs = [];
  }

  private teardownRoom() {
    this.clearRoomListeners();
    this.room = null;
  }

  /** Fire-and-forget leave chained so `connect()` can await it — avoids two sessions in one room. */
  private scheduleRoomLeave(room: Room): void {
    try {
      room.send('echo', { type: 'gracefulLeave' } as EchoAvatarProtocol);
    } catch {
      /* noop */
    }
    enqueueColyseusLeave(room);
  }

  send(msg: EchoAvatarProtocol): void {
    this.room?.send('echo', msg);
  }

  sendSyncRequest(): void {
    if (!this.room) return;
    this.syncRequestSeq += 1;
    const clientSeq = this.syncRequestSeq;
    this.room.send('echo', { type: 'requestSync', clientSeq } as EchoAvatarProtocol);
  }

  acceptSyncPlayersResponse(clientSeq: number | undefined): boolean {
    if (clientSeq == null) return true;
    if (clientSeq <= this.lastAcceptedSyncResponseSeq) return false;
    this.lastAcceptedSyncResponseSeq = clientSeq;
    return true;
  }

  sendPositionThrottled(x: number, z: number, rotY: number): void {
    const now = Date.now();
    if (now - this.lastEmitTime < 100) return;
    if (!this.room) return;
    this.lastEmitTime = now;
    this.room.send('echo', { type: 'updatePosition', x, z, rotY });
  }

  private bindRoom(room: Room) {
    this.clearRoomListeners();

    this.unsubs.push(
      room.onMessage('b', (msg: BroadcastMessage) => {
        if (this._cancelled) return;
        this.broadcastRouter.dispatch(msg);
      }),
    );

    this.unsubs.push(
      room.onMessage('p', (msg: PrivateMessage) => {
        if (this._cancelled) return;
        console.log('[onMessage]', 'private', (msg as { type?: string }).type, msg);
        this.privateRouter.dispatch(msg);
      }),
    );

    const onLeaveCb = (code: number, _reason?: string) => {
      if (this._cancelled) {
        console.log('[CM] onLeave (intentional disconnect)');
        return;
      }
      console.warn('[CM] onLeave', code, this.autoRejoinSessionLabel());
      this.teardownRoom();
      if (this.shouldScheduleAutoRejoin()) {
        this._error = null;
        this._state = 'reconnecting';
        this.notify();
        this.scheduleAutoRejoin('onLeave');
      } else {
        this._state = 'disconnected';
        if (!this._wasKicked) {
          this._error = 'Disconnected from server.';
        }
        this.notify();
      }
    };
    room.onLeave(onLeaveCb);
    this.unsubs.push(() => room.onLeave.remove(onLeaveCb));

    const onErrorCb = (code: number, message?: string) => {
      if (this._cancelled) {
        console.log('[CM] onError (ignored — client disconnect)', code, message);
        return;
      }
      console.warn('[CM] onError', code, message, this.autoRejoinSessionLabel());
      this.teardownRoom();
      if (this.shouldScheduleAutoRejoin()) {
        this._error = null;
        this._state = 'reconnecting';
        this.notify();
        this.scheduleAutoRejoin('onError');
      } else {
        this._state = 'disconnected';
        this._error = `Connection error: ${message ?? String(code)}`;
        this.notify();
      }
    };
    room.onError(onErrorCb);
    this.unsubs.push(() => room.onError.remove(onErrorCb));

    const onDropCb = (_code: number, _reason?: string) => {
      if (this._cancelled) return;
      console.warn('[CM] onDrop — Colyseus transport recovering', this.autoRejoinSessionLabel());
      this.clearAutoRejoinTimer();
      this._state = 'reconnecting';
      this.notify();
    };
    room.onDrop(onDropCb);
    this.unsubs.push(() => room.onDrop.remove(onDropCb));

    const onReconnectCb = () => {
      if (this._cancelled) return;
      console.warn('[CM] onReconnect — sending requestSync');
      this.clearAutoRejoinTimer();
      this.autoRejoinAttempt = 0;
      this._state = 'connected';
      this.room = room;
      this.notify();
      this.sendSyncRequest();
    };
    room.onReconnect(onReconnectCb);
    this.unsubs.push(() => room.onReconnect.remove(onReconnectCb));
  }

  async connect(options: UseMultiplayerOptions, avatarUrl?: string): Promise<void> {
    // Clear kick/error and mark connecting *before* any await. Otherwise another effect in the
    // same flush (e.g. WorldTab "wasKicked && !inLobby → setJoinOptions(null)") can run while
    // this coroutine is still waiting on leaveChain and wipe a fresh invite join.
    this._wasKicked = false;
    this._error = null;
    this._cancelled = false;
    this._state = 'connecting';
    this.notify();

    const homeDbg = options.mode === 'create' && options.roomType === 'player_room';
    if (homeDbg) {
      console.log('[test] CM connect START (player_room / home)', {
        options,
        prevMyPlayerId: this._myPlayerId || '(empty)',
        hadRoom: Boolean(this.room),
      });
    }
    this.clearAutoRejoinTimer();
    await awaitColyseusLeaves();
    if (this.room) {
      const stale = this.room;
      this.teardownRoom();
      this.scheduleRoomLeave(stale);
      await awaitColyseusLeaves();
    }

    this._environmentIndex = null;
    this._serverRoomType = null;
    this._ownerId = null;
    this._roomCode = null;
    this._roomName = null;
    this.syncRequestSeq = 0;
    this.lastAcceptedSyncResponseSeq = 0;
    this.notify();

    if (this.supportsAutoRejoin(options)) {
      this.persistedAutoRejoinOptions = options;
      this.persistedAutoRejoinAvatarUrl = avatarUrl;
    }

    const profile = RundotGameAPI.getProfile();
    const joinOpts = {
      username: profile.username ?? 'player',
      avatarUrl: profile.avatarUrl ?? '',
      /** Server dedupes same RUN.game user in one room (avoids double Colyseus sessions). */
      profileId: profile.id,
    };

    try {
      const client = getColyseusClient();
      let room: Room;

      if (options.mode === 'joinById') {
        room = await client.joinById(options.roomId.trim(), joinOpts);
      } else if (options.mode === 'joinOrCreate' && options.roomType === 'world_room') {
        room = await client.joinOrCreate('world_room', {
          ...joinOpts,
          plazaId: 'central',
        });
      } else if (options.mode === 'create' && options.roomType === 'player_room') {
        room = await client.joinOrCreate('player_room', {
          ...joinOpts,
          ownerProfileId: profile.id, // filterBy room instance
        });
      } else if (options.mode === 'create' && options.roomType === 'avatar_room') {
        room = await client.create('avatar_room', {
          ...joinOpts,
          roomName: options.roomName,
        });
      } else {
        throw new Error(`Unsupported join: ${JSON.stringify(options)}`);
      }

      if (this._cancelled) {
        this.scheduleRoomLeave(room);
        return;
      }

      this.room = room;
      // Must set before bindRoom(): server may deliver playerJoined/playerMoved immediately;
      // useMovementSync skips self via myPlayerId — if still '', we add a duplicate "remote" self.
      this._myPlayerId = room.sessionId;
      this.bindRoom(room);

      cmSuccessfulJoinCounter += 1;
      const joinN = cmSuccessfulJoinCounter;
      const payload = {
        joinN,
        sessionId: room.sessionId,
        roomId: room.roomId,
        ...(import.meta.env.DEV
          ? {
              strictModeNote:
                'joinN may step twice on first load — React StrictMode re-runs effects in development only.',
            }
          : {}),
      };
      // Single line per successful join — was duplicated as [test] + [CM] before.
      if (homeDbg) {
        console.log('[test] [CM] ROOM JOINED player_room (home)', payload);
      } else {
        console.log('[CM] ROOM JOINED', payload);
      }

      this._roomCode = room.roomId;
      this._roomName = this.resolveRoomName(options);
      this._state = 'connected';
      this._hadSuccessfulJoin = true;
      if (this.supportsAutoRejoin(options)) {
        const wasAppLevelRecovery = this.autoRejoinAttempt > 0;
        this.autoRejoinAttempt = 0;
        if (wasAppLevelRecovery) {
          console.warn('[CM] reconnected (app-level backoff) — join succeeded', {
            roomName: this._roomName,
            roomCode: this._roomCode,
          });
        }
      }
      this.notify();

      if (avatarUrl) {
        console.log('[CM] eagerly sending avatar:', avatarUrl.slice(0, 60));
        room.send('echo', { type: 'setAvatar', avatarUrl });
      }

      console.log('[CM] sending requestSync to server...');
      this.sendSyncRequest();
    } catch (err) {
      if (!this._cancelled) {
        const msg = String(err);
        if (this.shouldScheduleAutoRejoin()) {
          console.warn('[CM] join attempt failed — scheduling app-level rejoin', msg);
          this._state = 'reconnecting';
          this._error = null;
          this.notify();
          this.scheduleAutoRejoin('join catch');
        } else {
          this._error = this.parseFriendlyError(msg);
          this._state = 'disconnected';
          console.error('[CM] join failed:', msg);
          this.notify();
        }
      }
    }
  }

  disconnect(): void {
    const wasHome = this._serverRoomType === 'player_room';
    console.log('[CM] disconnect() — intentional leave / hook cleanup');
    const persistedHome =
      this.persistedAutoRejoinOptions &&
      'roomType' in this.persistedAutoRejoinOptions &&
      this.persistedAutoRejoinOptions.roomType === 'player_room';
    if (wasHome || persistedHome) {
      console.log('[test] CM disconnect (home / player_room path)', {
        sessionId: this._myPlayerId || '(empty)',
        roomId: this._roomCode,
      });
    }
    this._cancelled = true;
    this.clearAutoRejoinTimer();
    this.persistedAutoRejoinOptions = null;
    this._hadSuccessfulJoin = false;
    this._state = 'disconnected';
    const room = this.room;
    this.teardownRoom();
    if (room) {
      this.scheduleRoomLeave(room);
    }
    this.notify();
  }

  private supportsAutoRejoin(options: UseMultiplayerOptions): boolean {
    if (options.mode === 'joinOrCreate' && options.roomType === 'world_room') return true;
    if (options.mode === 'create' && options.roomType === 'player_room') return true;
    return false;
  }

  private shouldScheduleAutoRejoin(): boolean {
    return (
      this._hadSuccessfulJoin &&
      this.persistedAutoRejoinOptions != null &&
      this.supportsAutoRejoin(this.persistedAutoRejoinOptions) &&
      !this._wasKicked
    );
  }

  private clearAutoRejoinTimer(): void {
    if (this.autoRejoinTimer !== null) {
      clearTimeout(this.autoRejoinTimer);
      this.autoRejoinTimer = null;
    }
  }

  private scheduleAutoRejoin(reason: string): void {
    this.clearAutoRejoinTimer();
    const attempt = this.autoRejoinAttempt;
    const delayMs = Math.min(AUTO_REJOIN_MAX_MS, AUTO_REJOIN_BASE_MS * Math.pow(2, attempt));
    this.autoRejoinAttempt = attempt + 1;
    console.warn('[CM] app-level rejoin scheduled', {
      reason,
      delayMs,
      attempt: attempt + 1,
      session: this.autoRejoinSessionLabel(),
    });
    this.autoRejoinTimer = setTimeout(() => {
      this.autoRejoinTimer = null;
      if (this._cancelled || !this.persistedAutoRejoinOptions) {
        console.log('[CM] app-level rejoin skipped (cancelled or no persisted options)');
        return;
      }
      console.warn('[CM] app-level rejoin firing — calling connect()', this.autoRejoinSessionLabel());
      void this.connect(this.persistedAutoRejoinOptions, this.persistedAutoRejoinAvatarUrl);
    }, delayMs);
  }

  private autoRejoinSessionLabel(): string {
    const o = this.persistedAutoRejoinOptions;
    if (!o) return '(no auto-rejoin session)';
    if (o.mode === 'joinOrCreate' && o.roomType === 'world_room') return 'Central Plaza';
    if (o.mode === 'create' && o.roomType === 'player_room') return 'My Home (player_room)';
    return `${o.mode}`;
  }

  private resolveRoomName(options: UseMultiplayerOptions): string {
    if (options.mode === 'joinOrCreate') return 'Central Plaza';
    if (options.mode === 'joinById') return "Friend's home";
    if (options.mode === 'create') {
      if (options.roomType === 'player_room') return 'My Home';
      if (options.roomName) return options.roomName;
    }
    return 'World Room';
  }

  private parseFriendlyError(msg: string): string {
    if (/room\s*(is\s*)?full/i.test(msg) || /max\s*players/i.test(msg)) return 'Room is full.';
    if (/not\s*found/i.test(msg) || /invalid.*code/i.test(msg) || /no.*room/i.test(msg)) return 'Room not found. Check the code and try again.';
    if (/kicked/i.test(msg)) return 'You were kicked from this room.';
    if (/timeout/i.test(msg) || /timed?\s*out/i.test(msg)) return 'Connection timed out. Please try again.';
    return 'Failed to connect.';
  }
}
