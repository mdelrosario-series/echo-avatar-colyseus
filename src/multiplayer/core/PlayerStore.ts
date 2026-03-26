// ---------------------------------------------------------------------------
// PlayerStore — single source of truth for all remote player state.
//
// Replaces the 5 scattered parallel collections that useMultiplayer used to
// manage (remotePlayerIds[], remotePlayerAvatarUrls{}, remotePlayerAnimations{},
// remotePlayerNames{}, remotePlayerPositions Map).
//
// Pure TypeScript class — no React dependency. React hooks subscribe to
// changes via the onChange callback.
// ---------------------------------------------------------------------------

import type { RemotePlayer } from '../types';

export type PlayerStoreListener = () => void;

export class PlayerStore {
  private players = new Map<string, RemotePlayer>();
  private listeners: PlayerStoreListener[] = [];

  // ------ Subscribe / notify ------

  /** Register a callback that fires whenever the store changes. Returns unsubscribe fn. */
  subscribe(listener: PlayerStoreListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const l of this.listeners) l();
  }

  // ------ Read ------

  /** All player IDs currently in the store. */
  getIds(): string[] {
    return [...this.players.keys()];
  }

  /** Get a single player by ID, or undefined. */
  get(id: string): RemotePlayer | undefined {
    return this.players.get(id);
  }

  /** Whether a player ID exists in the store. */
  has(id: string): boolean {
    return this.players.has(id);
  }

  /** Number of remote players currently tracked. */
  get size(): number {
    return this.players.size;
  }

  /** Snapshot of all players as a plain object. */
  getAll(): ReadonlyMap<string, RemotePlayer> {
    return this.players;
  }

  // ------ Derived views (for backward-compat with existing component props) ------

  /** { [id]: avatarUrl } */
  getAvatarUrls(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [id, p] of this.players) result[id] = p.avatarUrl;
    return result;
  }

  /** { [id]: animation } */
  getAnimations(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [id, p] of this.players) result[id] = p.animation;
    return result;
  }

  /** { [id]: username } */
  getNames(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [id, p] of this.players) result[id] = p.username;
    return result;
  }

  /** { [id]: postureId | null } */
  getPostures(): Record<string, string | null> {
    const result: Record<string, string | null> = {};
    for (const [id, p] of this.players) result[id] = p.posture;
    return result;
  }

  // ------ Write ------

  /** Add or fully replace a remote player. */
  addPlayer(player: RemotePlayer): void {
    console.log('[test] PlayerStore addPlayer', { id: player.id, username: player.username });
    this.players.set(player.id, player);
    this.notify();
  }

  /** Remove a remote player by ID. Returns true if the player existed. */
  removePlayer(id: string): boolean {
    const existed = this.players.delete(id);
    if (existed) {
      console.log('[test] PlayerStore removePlayer', { id });
      this.notify();
    }
    return existed;
  }

  /** Update position snapshot for a player. Creates the player if unknown. */
  updatePosition(id: string, x: number, z: number, rotY: number): void {
    const now = Date.now();
    const existing = this.players.get(id);

    if (existing) {
      existing.prevX = existing.x;
      existing.prevZ = existing.z;
      existing.prevRotY = existing.rotY;
      existing.prevUpdate = existing.lastUpdate;
      existing.x = x;
      existing.z = z;
      existing.rotY = rotY;
      existing.lastUpdate = now;
      // Position updates are high-frequency — don't notify (avoid React re-renders).
      // RemotePlayers reads from the store ref directly in useFrame.
    } else {
      // Unknown player sending position — auto-add with minimal info
      console.log('[test] PlayerStore updatePosition auto-add (no prior addPlayer)', { id, x, z, rotY });
      console.log('[PlayerStore] auto-adding unknown player from position update:', id);
      this.players.set(id, {
        id,
        username: '',
        avatarUrl: '',
        animation: 'idle',
        posture: null,
        x, z, rotY,
        lastUpdate: now,
        prevX: x, prevZ: z, prevRotY: rotY, prevUpdate: now,
      });
      this.notify();
    }
  }

  /** Update avatar URL for a player. */
  updateAvatar(id: string, avatarUrl: string): void {
    const p = this.players.get(id);
    if (!p) return;
    p.avatarUrl = avatarUrl;
    this.notify();
  }

  /** Update animation clip name for a player. */
  updateAnimation(id: string, animation: string): void {
    const p = this.players.get(id);
    if (!p) return;
    const t = animation?.trim();
    p.animation = t || 'idle';
    this.notify();
  }

  /** Update posture for a player (null = standing / no posture). */
  updatePosture(id: string, postureId: string | null): void {
    const p = this.players.get(id);
    if (!p) return;
    p.posture = postureId;
    this.notify();
  }

  /** Clear all players. */
  clear(): void {
    if (this.players.size === 0) return;
    console.log('[test] PlayerStore clear', { hadCount: this.players.size });
    this.players.clear();
    this.notify();
  }

  // ------ Low-level access for useFrame-based reads ------

  /**
   * Direct reference to the internal Map for high-frequency reads in useFrame.
   * Consumers MUST NOT call .set() / .delete() on this map — use store methods instead.
   */
  get _map(): Map<string, RemotePlayer> {
    return this.players;
  }
}
