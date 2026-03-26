import { describe, it, expect } from 'vitest';
import { PlayerManager } from '../../server/src/game/core/PlayerManager';

describe('PlayerManager', () => {
  it('starts empty', () => {
    const mgr = new PlayerManager();
    expect(mgr.size).toBe(0);
  });

  it('add creates a player with defaults', () => {
    const mgr = new PlayerManager();
    const p = mgr.add('p1', 'Alice', 'avatar.glb');
    expect(p.username).toBe('Alice');
    expect(p.avatarUrl).toBe('avatar.glb');
    expect(p.x).toBe(0);
    expect(p.z).toBe(0);
    expect(p.rotY).toBe(0);
    expect(p.lastPositionMs).toBe(0);
    expect(p.lastChatMs).toBe(0);
    expect(mgr.size).toBe(1);
  });

  it('get returns the player', () => {
    const mgr = new PlayerManager();
    mgr.add('p1', 'Alice', '');
    expect(mgr.get('p1')?.username).toBe('Alice');
  });

  it('get returns undefined for unknown', () => {
    const mgr = new PlayerManager();
    expect(mgr.get('nobody')).toBeUndefined();
  });

  it('has returns true/false correctly', () => {
    const mgr = new PlayerManager();
    mgr.add('p1', 'Alice', '');
    expect(mgr.has('p1')).toBe(true);
    expect(mgr.has('p2')).toBe(false);
  });

  it('remove deletes a player', () => {
    const mgr = new PlayerManager();
    mgr.add('p1', 'Alice', '');
    expect(mgr.remove('p1')).toBe(true);
    expect(mgr.size).toBe(0);
    expect(mgr.has('p1')).toBe(false);
  });

  it('remove returns false for unknown', () => {
    const mgr = new PlayerManager();
    expect(mgr.remove('nobody')).toBe(false);
  });

  it('entries iterates all players', () => {
    const mgr = new PlayerManager();
    mgr.add('a', 'A', '');
    mgr.add('b', 'B', '');
    const ids = [...mgr.entries()].map(([id]) => id);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids).toHaveLength(2);
  });

  it('keys iterates all ids', () => {
    const mgr = new PlayerManager();
    mgr.add('x', 'X', '');
    mgr.add('y', 'Y', '');
    expect([...mgr.keys()]).toEqual(expect.arrayContaining(['x', 'y']));
  });

  it('add overwrites existing player with same id', () => {
    const mgr = new PlayerManager();
    mgr.add('p1', 'Alice', 'old.glb');
    mgr.add('p1', 'Bob', 'new.glb');
    expect(mgr.size).toBe(1);
    expect(mgr.get('p1')?.username).toBe('Bob');
    expect(mgr.get('p1')?.avatarUrl).toBe('new.glb');
  });
});
