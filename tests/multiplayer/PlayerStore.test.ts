import { describe, it, expect, vi } from 'vitest';
import { PlayerStore } from '../../src/multiplayer/core/PlayerStore';
import type { RemotePlayer } from '../../src/multiplayer/types';

function makeRemote(id: string, overrides: Partial<RemotePlayer> = {}): RemotePlayer {
  const now = Date.now();
  return {
    id,
    username: `user-${id}`,
    avatarUrl: `https://example.com/${id}.glb`,
    animation: 'idle',
    posture: null,
    x: 0, z: 0, rotY: 0, lastUpdate: now,
    prevX: 0, prevZ: 0, prevRotY: 0, prevUpdate: now,
    ...overrides,
  };
}

describe('PlayerStore', () => {
  // ---------- Basic CRUD ----------

  it('starts empty', () => {
    const store = new PlayerStore();
    expect(store.size).toBe(0);
    expect(store.getIds()).toEqual([]);
  });

  it('addPlayer increases size and can be retrieved', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a'));
    expect(store.size).toBe(1);
    expect(store.has('a')).toBe(true);
    expect(store.get('a')?.username).toBe('user-a');
  });

  it('removePlayer decreases size', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a'));
    expect(store.removePlayer('a')).toBe(true);
    expect(store.size).toBe(0);
    expect(store.has('a')).toBe(false);
  });

  it('removePlayer returns false for unknown id', () => {
    const store = new PlayerStore();
    expect(store.removePlayer('nobody')).toBe(false);
  });

  it('clear removes all players', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a'));
    store.addPlayer(makeRemote('b'));
    store.clear();
    expect(store.size).toBe(0);
  });

  it('clear on empty store does not notify', () => {
    const store = new PlayerStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.clear();
    expect(listener).not.toHaveBeenCalled();
  });

  // ---------- Derived views ----------

  it('getIds returns all player ids', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('x'));
    store.addPlayer(makeRemote('y'));
    const ids = store.getIds();
    expect(ids).toHaveLength(2);
    expect(ids).toContain('x');
    expect(ids).toContain('y');
  });

  it('getAvatarUrls returns { id: url }', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a', { avatarUrl: 'url-a' }));
    store.addPlayer(makeRemote('b', { avatarUrl: 'url-b' }));
    expect(store.getAvatarUrls()).toEqual({ a: 'url-a', b: 'url-b' });
  });

  it('getAnimations returns { id: animation }', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a', { animation: 'walk2' }));
    expect(store.getAnimations()).toEqual({ a: 'walk2' });
  });

  it('getNames returns { id: username }', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a', { username: 'Alice' }));
    expect(store.getNames()).toEqual({ a: 'Alice' });
  });

  it('getPostures returns { id: posture | null }', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a'));
    store.addPlayer(makeRemote('b', { posture: 'sit' }));
    const postures = store.getPostures();
    expect(postures).toEqual({ a: null, b: 'sit' });
  });

  // ---------- Position updates ----------

  it('updatePosition shifts prev to old and sets new', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a', { x: 1, z: 2, rotY: 0.5 }));
    store.updatePosition('a', 3, 4, 1.0);

    const p = store.get('a')!;
    // Previous should be old values
    expect(p.prevX).toBe(1);
    expect(p.prevZ).toBe(2);
    expect(p.prevRotY).toBe(0.5);
    // Current should be new values
    expect(p.x).toBe(3);
    expect(p.z).toBe(4);
    expect(p.rotY).toBe(1.0);
  });

  it('updatePosition for unknown id auto-adds player', () => {
    const store = new PlayerStore();
    store.updatePosition('unknown', 5, 10, 0);
    expect(store.has('unknown')).toBe(true);
    expect(store.get('unknown')?.x).toBe(5);
  });

  // ---------- Field updates ----------

  it('updateAvatar changes the avatar URL', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a'));
    store.updateAvatar('a', 'new-url.glb');
    expect(store.get('a')?.avatarUrl).toBe('new-url.glb');
  });

  it('updateAnimation changes the animation', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a'));
    store.updateAnimation('a', 'run2');
    expect(store.get('a')?.animation).toBe('run2');
  });

  it('updatePosture changes the posture', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a'));
    expect(store.get('a')?.posture).toBeNull();

    store.updatePosture('a', 'sit');
    expect(store.get('a')?.posture).toBe('sit');

    store.updatePosture('a', null);
    expect(store.get('a')?.posture).toBeNull();
  });

  it('updatePosture for unknown id is a no-op', () => {
    const store = new PlayerStore();
    store.updatePosture('nobody', 'sit'); // should not throw
    expect(store.has('nobody')).toBe(false);
  });

  // ---------- Subscribe / Notify ----------

  it('subscribe fires on addPlayer', () => {
    const store = new PlayerStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.addPlayer(makeRemote('a'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('subscribe fires on removePlayer', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a'));
    const listener = vi.fn();
    store.subscribe(listener);
    store.removePlayer('a');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('subscribe fires on updateAvatar', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a'));
    const listener = vi.fn();
    store.subscribe(listener);
    store.updateAvatar('a', 'new.glb');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('subscribe fires on updatePosture', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a'));
    const listener = vi.fn();
    store.subscribe(listener);
    store.updatePosture('a', 'dance');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('subscribe does NOT fire on updatePosition (hot path)', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a'));
    const listener = vi.fn();
    store.subscribe(listener);
    store.updatePosition('a', 1, 2, 3);
    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribe stops notifications', () => {
    const store = new PlayerStore();
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.addPlayer(makeRemote('a'));
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    store.addPlayer(makeRemote('b'));
    expect(listener).toHaveBeenCalledTimes(1); // no additional call
  });

  // ---------- _map access ----------

  it('_map returns the internal Map', () => {
    const store = new PlayerStore();
    store.addPlayer(makeRemote('a'));
    const map = store._map;
    expect(map).toBeInstanceOf(Map);
    expect(map.size).toBe(1);
    expect(map.get('a')?.id).toBe('a');
  });
});
