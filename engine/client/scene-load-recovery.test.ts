import { afterEach, describe, expect, it, vi } from 'vitest';
import { SceneLoadRecovery } from './scene-load-recovery';
afterEach(() => vi.useRealTimers());
describe('shared scene recovery', () => {
  it('coalesces repeated failures and retries with bounded backoff', () => {
    vi.useFakeTimers();
    const recovery = new SceneLoadRecovery(), retry = vi.fn();
    expect(recovery.failed(retry)).toBe(true);
    expect(recovery.failed(retry)).toBe(false);
    vi.advanceTimersByTime(999); expect(retry).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(retry).toHaveBeenCalledTimes(1);
    expect(recovery.failed(retry)).toBe(false);
    vi.advanceTimersByTime(1999); expect(retry).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1); expect(retry).toHaveBeenCalledTimes(2);
    for (const wait of [4000, 8000, 10000, 10000]) { recovery.failed(retry); vi.advanceTimersByTime(wait); }
    expect(retry).toHaveBeenCalledTimes(6);
  });
  it('cancels stale work after success, restore or reconnection', () => {
    vi.useFakeTimers(); const recovery = new SceneLoadRecovery(), retry = vi.fn();
    recovery.failed(retry); recovery.reset(); vi.advanceTimersByTime(20000);
    expect(retry).not.toHaveBeenCalled(); expect(recovery.failed(retry)).toBe(true);
    recovery.reset();
  });
});
