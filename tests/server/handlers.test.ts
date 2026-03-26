import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayerManager } from '../../server/src/game/core/PlayerManager';
import { handleMovement } from '../../server/src/game/handlers/MovementHandler';
import { handleChat } from '../../server/src/game/handlers/ChatHandler';
import { handleKick } from '../../server/src/game/handlers/KickHandler';
import { handleAvatar } from '../../server/src/game/handlers/AvatarHandler';
import { handleAnimation } from '../../server/src/game/handlers/AnimationHandler';
import { handlePosture } from '../../server/src/game/handlers/PostureHandler';
import { handleWave } from '../../server/src/game/handlers/WaveHandler';
import { buildSyncSnapshot } from '../../server/src/game/handlers/SyncHandler';

// ============================================================================
// MovementHandler
// ============================================================================
describe('handleMovement', () => {
  let mgr: PlayerManager;

  beforeEach(() => {
    mgr = new PlayerManager();
    mgr.add('p1', 'Alice', '');
  });

  it('accepts a valid move', () => {
    const result = handleMovement('p1', { x: 1, z: 2, rotY: 0 }, mgr);
    expect(result.accepted).toBe(true);
    expect(result.x).toBe(1);
    expect(result.z).toBe(2);
  });

  it('rejects for unknown sender', () => {
    const result = handleMovement('nobody', { x: 1, z: 2, rotY: 0 }, mgr);
    expect(result.accepted).toBe(false);
  });

  it('rejects NaN position', () => {
    const result = handleMovement('p1', { x: NaN, z: 2, rotY: 0 }, mgr);
    expect(result.accepted).toBe(false);
  });

  it('rejects Infinity position', () => {
    const result = handleMovement('p1', { x: Infinity, z: 2, rotY: 0 }, mgr);
    expect(result.accepted).toBe(false);
  });

  it('clamps position to world bounds', () => {
    // First move to set lastPositionMs
    handleMovement('p1', { x: 0, z: 0, rotY: 0 }, mgr);
    // Force enough time to pass
    const player = mgr.get('p1')!;
    player.lastPositionMs = Date.now() - 1000;

    const result = handleMovement('p1', { x: 999, z: -999, rotY: 0 }, mgr);
    // Even if speed-clamped, final position should be within bounds
    expect(result.x).toBeLessThanOrEqual(200);
    expect(result.x).toBeGreaterThanOrEqual(-200);
    expect(result.z).toBeLessThanOrEqual(200);
    expect(result.z).toBeGreaterThanOrEqual(-200);
  });

  it('rate-limits rapid updates', () => {
    const r1 = handleMovement('p1', { x: 1, z: 0, rotY: 0 }, mgr);
    expect(r1.accepted).toBe(true);

    // Immediate second update should be rejected (< 45ms)
    const r2 = handleMovement('p1', { x: 2, z: 0, rotY: 0 }, mgr);
    expect(r2.accepted).toBe(false);
  });

  it('updates server-side state on acceptance', () => {
    handleMovement('p1', { x: 5, z: 10, rotY: 1.5 }, mgr);
    const player = mgr.get('p1')!;
    expect(player.x).toBe(5);
    expect(player.z).toBe(10);
    expect(player.rotY).toBe(1.5);
  });
});

// ============================================================================
// ChatHandler
// ============================================================================
describe('handleChat', () => {
  let mgr: PlayerManager;

  beforeEach(() => {
    mgr = new PlayerManager();
    mgr.add('p1', 'Alice', '');
  });

  it('accepts a valid message', () => {
    const result = handleChat('p1', { text: 'hello' }, mgr);
    expect(result.accepted).toBe(true);
    expect(result.text).toBe('hello');
  });

  it('rejects for unknown sender', () => {
    const result = handleChat('nobody', { text: 'hello' }, mgr);
    expect(result.accepted).toBe(false);
  });

  it('rejects empty text', () => {
    expect(handleChat('p1', { text: '' }, mgr).accepted).toBe(false);
    expect(handleChat('p1', { text: '   ' }, mgr).accepted).toBe(false);
  });

  it('trims whitespace', () => {
    const result = handleChat('p1', { text: '  hi  ' }, mgr);
    expect(result.text).toBe('hi');
  });

  it('clamps to 200 chars', () => {
    const longText = 'a'.repeat(300);
    const result = handleChat('p1', { text: longText }, mgr);
    expect(result.accepted).toBe(true);
    expect(result.text).toHaveLength(200);
  });

  it('rate-limits rapid messages', () => {
    const r1 = handleChat('p1', { text: 'first' }, mgr);
    expect(r1.accepted).toBe(true);

    const r2 = handleChat('p1', { text: 'second' }, mgr);
    expect(r2.accepted).toBe(false); // too fast
  });
});

// ============================================================================
// KickHandler
// ============================================================================
describe('handleKick', () => {
  let mgr: PlayerManager;

  beforeEach(() => {
    mgr = new PlayerManager();
    mgr.add('owner', 'Owner', '');
    mgr.add('guest', 'Guest', '');
  });

  it('owner can kick a guest', () => {
    const result = handleKick('owner', 'owner', { targetPlayerId: 'guest' }, mgr);
    expect(result.accepted).toBe(true);
    expect(result.targetId).toBe('guest');
    expect(mgr.has('guest')).toBe(false); // removed from manager
  });

  it('non-owner cannot kick', () => {
    const result = handleKick('guest', 'owner', { targetPlayerId: 'owner' }, mgr);
    expect(result.accepted).toBe(false);
  });

  it('cannot kick self', () => {
    const result = handleKick('owner', 'owner', { targetPlayerId: 'owner' }, mgr);
    expect(result.accepted).toBe(false);
  });

  it('cannot kick non-existent player', () => {
    const result = handleKick('owner', 'owner', { targetPlayerId: 'nobody' }, mgr);
    expect(result.accepted).toBe(false);
  });
});

// ============================================================================
// AvatarHandler
// ============================================================================
describe('handleAvatar', () => {
  let mgr: PlayerManager;

  beforeEach(() => {
    mgr = new PlayerManager();
    mgr.add('p1', 'Alice', '');
  });

  it('accepts valid avatar URL', () => {
    const result = handleAvatar('p1', { avatarUrl: 'https://example.com/avatar.glb' }, mgr);
    expect(result.accepted).toBe(true);
    expect(result.avatarUrl).toBe('https://example.com/avatar.glb');
  });

  it('rejects for unknown sender', () => {
    const result = handleAvatar('nobody', { avatarUrl: 'url' }, mgr);
    expect(result.accepted).toBe(false);
  });

  it('clamps URL to 512 chars', () => {
    const longUrl = 'x'.repeat(600);
    const result = handleAvatar('p1', { avatarUrl: longUrl }, mgr);
    expect(result.accepted).toBe(true);
    expect(result.avatarUrl).toHaveLength(512);
  });

  it('accepts empty string (clear avatar)', () => {
    const result = handleAvatar('p1', { avatarUrl: '' }, mgr);
    expect(result.accepted).toBe(true);
    expect(result.avatarUrl).toBe('');
  });

  it('updates server-side state', () => {
    handleAvatar('p1', { avatarUrl: 'new.glb' }, mgr);
    expect(mgr.get('p1')?.avatarUrl).toBe('new.glb');
  });
});

// ============================================================================
// AnimationHandler
// ============================================================================
describe('handleAnimation', () => {
  it('accepts valid animation name', () => {
    const result = handleAnimation({ animation: 'walk2' });
    expect(result.accepted).toBe(true);
    expect(result.animation).toBe('walk2');
  });

  it('rejects empty animation', () => {
    expect(handleAnimation({ animation: '' }).accepted).toBe(false);
  });

  it('rejects non-string animation', () => {
    expect(handleAnimation({ animation: undefined as any }).accepted).toBe(false);
    expect(handleAnimation({ animation: 42 as any }).accepted).toBe(false);
  });

  it('clamps to 64 chars', () => {
    const result = handleAnimation({ animation: 'a'.repeat(100) });
    expect(result.accepted).toBe(true);
    expect(result.animation).toHaveLength(64);
  });
});

// ============================================================================
// PostureHandler
// ============================================================================
describe('handlePosture', () => {
  it('accepts valid posture id', () => {
    const result = handlePosture({ postureId: 'sit' });
    expect(result.accepted).toBe(true);
    expect(result.postureId).toBe('sit');
  });

  it('accepts null (exit posture)', () => {
    const result = handlePosture({ postureId: null });
    expect(result.accepted).toBe(true);
    expect(result.postureId).toBeNull();
  });

  it('rejects empty string', () => {
    expect(handlePosture({ postureId: '' }).accepted).toBe(false);
  });

  it('rejects non-string non-null', () => {
    expect(handlePosture({ postureId: 42 as any }).accepted).toBe(false);
  });

  it('clamps to 32 chars', () => {
    const result = handlePosture({ postureId: 'a'.repeat(50) });
    expect(result.accepted).toBe(true);
    expect(result.postureId).toHaveLength(32);
  });
});

// ============================================================================
// WaveHandler
// ============================================================================
describe('handleWave', () => {
  it('returns true for existing player', () => {
    const mgr = new PlayerManager();
    mgr.add('p1', 'Alice', '');
    expect(handleWave('p1', mgr)).toBe(true);
  });

  it('returns false for unknown player', () => {
    const mgr = new PlayerManager();
    expect(handleWave('nobody', mgr)).toBe(false);
  });
});

// ============================================================================
// SyncHandler
// ============================================================================
describe('buildSyncSnapshot', () => {
  it('returns all players except requester', () => {
    const mgr = new PlayerManager();
    mgr.add('a', 'Alice', 'url-a');
    mgr.add('b', 'Bob', 'url-b');
    mgr.add('c', 'Carol', 'url-c');

    const snapshot = buildSyncSnapshot('a', mgr);
    expect(snapshot).toHaveLength(2);
    const ids = snapshot.map((s) => s.sessionId);
    expect(ids).toContain('b');
    expect(ids).toContain('c');
    expect(ids).not.toContain('a');
  });

  it('returns empty array when requester is the only player', () => {
    const mgr = new PlayerManager();
    mgr.add('a', 'Alice', '');
    expect(buildSyncSnapshot('a', mgr)).toEqual([]);
  });

  it('includes position, username, and avatarUrl', () => {
    const mgr = new PlayerManager();
    mgr.add('a', 'Alice', '');
    const bob = mgr.add('b', 'Bob', 'bob.glb');
    bob.x = 5;
    bob.z = 10;
    bob.rotY = 1.5;

    const snapshot = buildSyncSnapshot('a', mgr);
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]).toEqual({
      sessionId: 'b',
      x: 5,
      z: 10,
      rotY: 1.5,
      username: 'Bob',
      avatarUrl: 'bob.glb',
      animation: 'idle',
      posture: null,
    });
  });
});
