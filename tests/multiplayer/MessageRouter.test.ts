import { describe, it, expect, vi } from 'vitest';
import { MessageRouter } from '../../src/multiplayer/core/MessageRouter';

type TestMsg =
  | { type: 'alpha'; value: number }
  | { type: 'beta'; text: string };

describe('MessageRouter', () => {
  it('dispatches to registered handler', () => {
    const router = new MessageRouter<TestMsg>();
    const handler = vi.fn();
    router.register('alpha', handler);

    router.dispatch({ type: 'alpha', value: 42 });
    expect(handler).toHaveBeenCalledWith({ type: 'alpha', value: 42 });
  });

  it('returns true when handler exists', () => {
    const router = new MessageRouter<TestMsg>();
    router.register('alpha', vi.fn());
    expect(router.dispatch({ type: 'alpha', value: 1 })).toBe(true);
  });

  it('returns false when no handler exists', () => {
    const router = new MessageRouter<TestMsg>();
    expect(router.dispatch({ type: 'alpha', value: 1 })).toBe(false);
  });

  it('does not call wrong handler', () => {
    const router = new MessageRouter<TestMsg>();
    const alphaHandler = vi.fn();
    const betaHandler = vi.fn();
    router.register('alpha', alphaHandler);
    router.register('beta', betaHandler);

    router.dispatch({ type: 'alpha', value: 1 });
    expect(alphaHandler).toHaveBeenCalledTimes(1);
    expect(betaHandler).not.toHaveBeenCalled();
  });

  it('later registration overwrites earlier', () => {
    const router = new MessageRouter<TestMsg>();
    const first = vi.fn();
    const second = vi.fn();
    router.register('alpha', first);
    router.register('alpha', second);

    router.dispatch({ type: 'alpha', value: 1 });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('unregister removes handler', () => {
    const router = new MessageRouter<TestMsg>();
    const handler = vi.fn();
    router.register('alpha', handler);
    router.unregister('alpha');

    expect(router.dispatch({ type: 'alpha', value: 1 })).toBe(false);
    expect(handler).not.toHaveBeenCalled();
  });

  it('unregister for unregistered type is safe', () => {
    const router = new MessageRouter<TestMsg>();
    router.unregister('alpha'); // should not throw
  });

  it('clear removes all handlers', () => {
    const router = new MessageRouter<TestMsg>();
    router.register('alpha', vi.fn());
    router.register('beta', vi.fn());
    router.clear();

    expect(router.dispatch({ type: 'alpha', value: 1 })).toBe(false);
    expect(router.dispatch({ type: 'beta', text: 'hi' })).toBe(false);
  });

  it('can re-register after unregister', () => {
    const router = new MessageRouter<TestMsg>();
    const handler = vi.fn();
    router.register('alpha', vi.fn());
    router.unregister('alpha');
    router.register('alpha', handler);

    router.dispatch({ type: 'alpha', value: 99 });
    expect(handler).toHaveBeenCalledWith({ type: 'alpha', value: 99 });
  });
});
