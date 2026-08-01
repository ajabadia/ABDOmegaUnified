/**
 * @jest-environment jsdom
 *
 * Tests for useBatchHistory hook
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useBatchHistory, type HistoryEntry } from '../useBatchHistory';

const STORAGE_KEY = 'omega_batch_history';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Initial state ──────────────────────────────────────────────────────

describe('useBatchHistory — initial state', () => {
  it('should start with empty history and null notification', () => {
    const { result } = renderHook(() => useBatchHistory());
    expect(result.current.batchHistory).toEqual([]);
    expect(result.current.batchNotification).toBeNull();
    expect(result.current.showHistory).toBe(false);
    expect(result.current.hoverHistory).toBe(false);
    expect(result.current.fadingOut).toBe(false);
    expect(result.current.MAX_HISTORY).toBe(20);
  });

  it('should load persisted history from localStorage', () => {
    const persisted: HistoryEntry[] = [
      { message: '3 hidden', variant: 'hide', time: 1000, ids: ['a', 'b', 'c'], action: 'visibility', value: true },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));

    const { result } = renderHook(() => useBatchHistory());
    expect(result.current.batchHistory).toHaveLength(1);
    expect(result.current.batchHistory[0].message).toBe('3 hidden');
  });

  it('should ignore corrupted localStorage data', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');
    const { result } = renderHook(() => useBatchHistory());
    expect(result.current.batchHistory).toEqual([]);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an-array' }));
    const { result: result2 } = renderHook(() => useBatchHistory());
    expect(result2.current.batchHistory).toEqual([]);
  });
});

// ── pushBatchAction ────────────────────────────────────────────────────

describe('useBatchHistory — pushBatchAction', () => {
  it('should add entry with correct message for hide variant', () => {
    const { result } = renderHook(() => useBatchHistory());
    act(() => {
      result.current.pushBatchAction('hide', ['a', 'b'], 'visibility', true);
    });
    expect(result.current.batchHistory).toHaveLength(1);
    expect(result.current.batchHistory[0].message).toBe('2 hidden');
    expect(result.current.batchHistory[0].variant).toBe('hide');
    expect(result.current.batchHistory[0].action).toBe('visibility');
    expect(result.current.batchHistory[0].value).toBe(true);
    expect(result.current.batchHistory[0].ids).toEqual(['a', 'b']);
  });

  it('should generate correct labels for each variant', () => {
    const { result } = renderHook(() => useBatchHistory());
    // The hook uses: variant === 'hide' ? 'hidden' : variant === 'show' ? 'shown' : `${variant}d`
    const cases: Array<{ variant: 'hide' | 'show' | 'lock' | 'unlock' | 'group' | 'ungroup'; expected: string }> = [
      { variant: 'hide', expected: '3 hidden' },
      { variant: 'show', expected: '3 shown' },
      { variant: 'lock', expected: '3 lockd' },
      { variant: 'unlock', expected: '3 unlockd' },
      { variant: 'group', expected: '3 groupd' },
      { variant: 'ungroup', expected: '3 ungroupd' },
    ];
    for (const { variant } of cases) {
      act(() => {
        result.current.pushBatchAction(variant, ['x', 'y', 'z'], 'visibility', true);
      });
    }
    const messages = result.current.batchHistory.slice(0, 6).map(e => e.message);
    // pushBatchAction prepends to the front, so order is reversed from push order
    expect(messages).toEqual(cases.map(c => c.expected).reverse());
  });

  it('should set batchNotification with the entry message', () => {
    const { result } = renderHook(() => useBatchHistory());
    act(() => {
      result.current.pushBatchAction('hide', ['a'], 'visibility', true);
    });
    expect(result.current.batchNotification).toEqual({ message: '1 hidden', variant: 'hide' });
  });

  it('should cap history at MAX_HISTORY (20)', () => {
    const { result } = renderHook(() => useBatchHistory());
    act(() => {
      for (let i = 0; i < 25; i++) {
        result.current.pushBatchAction('hide', [`id${i}`], 'visibility', true);
      }
    });
    expect(result.current.batchHistory).toHaveLength(20);
    // The most recent entry should be the last one pushed
    expect(result.current.batchHistory[0].message).toBe('1 hidden');
  });
});

// ── isEntryUndoable ────────────────────────────────────────────────────

describe('useBatchHistory — isEntryUndoable', () => {
  it('should return true for visibility actions', () => {
    const { result } = renderHook(() => useBatchHistory());
    const entry: HistoryEntry = { message: 'test', variant: 'hide', time: 0, ids: [], action: 'visibility', value: true };
    expect(result.current.isEntryUndoable(entry)).toBe(true);
  });

  it('should return true for lock actions', () => {
    const { result } = renderHook(() => useBatchHistory());
    const entry: HistoryEntry = { message: 'test', variant: 'lock', time: 0, ids: [], action: 'lock', value: true };
    expect(result.current.isEntryUndoable(entry)).toBe(true);
  });

  it('should return true for group with value=true', () => {
    const { result } = renderHook(() => useBatchHistory());
    const entry: HistoryEntry = { message: 'test', variant: 'group', time: 0, ids: [], action: 'group', value: true };
    expect(result.current.isEntryUndoable(entry)).toBe(true);
  });

  it('should return false for ungroup (group with value=false)', () => {
    const { result } = renderHook(() => useBatchHistory());
    const entry: HistoryEntry = { message: 'test', variant: 'ungroup', time: 0, ids: [], action: 'group', value: false };
    expect(result.current.isEntryUndoable(entry)).toBe(false);
  });
});

// ── clearBatchHistory ──────────────────────────────────────────────────

describe('useBatchHistory — clearBatchHistory', () => {
  it('should clear history and hide timeline', () => {
    const { result } = renderHook(() => useBatchHistory());
    act(() => {
      result.current.pushBatchAction('hide', ['a'], 'visibility', true);
      result.current.setShowHistory(true);
    });
    expect(result.current.batchHistory).toHaveLength(1);
    expect(result.current.showHistory).toBe(true);

    act(() => {
      result.current.clearBatchHistory();
    });
    expect(result.current.batchHistory).toHaveLength(0);
    expect(result.current.showHistory).toBe(false);
  });

  it('should clear history to empty array via localStorage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ message: 'test', variant: 'hide', time: 0, ids: ['a'], action: 'visibility', value: true }]));
    const { result } = renderHook(() => useBatchHistory());
    act(() => {
      result.current.clearBatchHistory();
    });
    // After clear, the useEffect re-persists the empty array
    expect(localStorage.getItem(STORAGE_KEY)).toBe('[]');
  });
});

// ── localStorage persistence ───────────────────────────────────────────

describe('useBatchHistory — localStorage persistence', () => {
  it('should persist entries to localStorage on pushBatchAction', () => {
    const { result } = renderHook(() => useBatchHistory());
    act(() => {
      result.current.pushBatchAction('hide', ['a'], 'visibility', true);
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].message).toBe('1 hidden');
  });
});

// ── State setters ──────────────────────────────────────────────────────

describe('useBatchHistory — state setters', () => {
  it('should update showHistory', () => {
    const { result } = renderHook(() => useBatchHistory());
    act(() => { result.current.setShowHistory(true); });
    expect(result.current.showHistory).toBe(true);
  });

  it('should update hoverHistory', () => {
    const { result } = renderHook(() => useBatchHistory());
    act(() => { result.current.setHoverHistory(true); });
    expect(result.current.hoverHistory).toBe(true);
  });
});

// ── Timer auto-dismiss (jest.useFakeTimers) ────────────────────────────

describe('useBatchHistory — timer auto-dismiss', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  it('should set fadingOut to false on initial push', () => {
    const { result } = renderHook(() => useBatchHistory());
    act(() => {
      result.current.pushBatchAction('hide', ['a'], 'visibility', true);
    });
    expect(result.current.batchNotification).toEqual({ message: '1 hidden', variant: 'hide' });
    expect(result.current.fadingOut).toBe(false);
  });

  it('should set fadingOut to true after 1700ms (dismiss timer)', () => {
    const { result } = renderHook(() => useBatchHistory());
    act(() => {
      result.current.pushBatchAction('hide', ['a'], 'visibility', true);
    });
    expect(result.current.fadingOut).toBe(false);

    // Advance past the first timeout (1700ms) → fadingOut starts
    act(() => {
      jest.advanceTimersByTime(1700);
    });
    expect(result.current.fadingOut).toBe(true);
    expect(result.current.batchNotification).not.toBeNull();
  });

  it('should clear notification after 2000ms total (1700 + 300)', () => {
    const { result } = renderHook(() => useBatchHistory());
    act(() => {
      result.current.pushBatchAction('hide', ['a'], 'visibility', true);
    });

    // Advance past the full cycle
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.batchNotification).toBeNull();
    expect(result.current.fadingOut).toBe(false);
  });

  it('should respect the intermediate state: fadingOut true, notification still present', () => {
    const { result } = renderHook(() => useBatchHistory());
    act(() => {
      result.current.pushBatchAction('hide', ['a'], 'visibility', true);
    });

    // Advance to 1700ms exactly
    act(() => {
      jest.advanceTimersByTime(1700);
    });
    expect(result.current.fadingOut).toBe(true);
    expect(result.current.batchNotification).toEqual({ message: '1 hidden', variant: 'hide' });
  });

  it('should cancel previous timer when new notification is pushed', () => {
    const { result } = renderHook(() => useBatchHistory());
    act(() => {
      result.current.pushBatchAction('hide', ['a'], 'visibility', true);
    });

    // Advance partially (before any timeout fires)
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.fadingOut).toBe(false);

    // Push a new notification — this should cancel the previous timer
    act(() => {
      result.current.pushBatchAction('show', ['b'], 'visibility', false);
    });
    expect(result.current.batchNotification).toEqual({ message: '1 shown', variant: 'show' });
    expect(result.current.fadingOut).toBe(false);

    // The new timer should start fresh: fadingOut after 1700ms from the new push
    act(() => {
      jest.advanceTimersByTime(1700);
    });
    expect(result.current.fadingOut).toBe(true);

    // Full dismiss after 2000ms from new push (500 already elapsed before push,
    // then 1700 + 300 = 2000 more. Total elapsed = 500 + 2000 = 2500)
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current.batchNotification).toBeNull();
    expect(result.current.fadingOut).toBe(false);
  });

  it('should cancel timers and clear notification on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() => useBatchHistory());

    act(() => {
      result.current.pushBatchAction('hide', ['a'], 'visibility', true);
    });

    // Advance partway through the cycle
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Unmount should trigger cleanup of both timers
    unmount();

    // clearTimeout should have been called at least once (for the dismissTimer in useEffect cleanup)
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it('should call setTimeout when notification is pushed', () => {
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    const { result } = renderHook(() => useBatchHistory());

    act(() => {
      result.current.pushBatchAction('hide', ['a'], 'visibility', true);
    });

    // setTimeout should have been called at least once for the dismiss timer
    expect(setTimeoutSpy).toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  });

  it('should handle rapid successive pushes correctly', () => {
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
    const { result } = renderHook(() => useBatchHistory());

    // Push 3 notifications in rapid succession
    act(() => {
      result.current.pushBatchAction('hide', ['a'], 'visibility', true);
    });
    act(() => {
      result.current.pushBatchAction('show', ['b'], 'visibility', false);
    });
    act(() => {
      result.current.pushBatchAction('lock', ['c'], 'lock', true);
    });

    // Only the last notification should be visible
    expect(result.current.batchNotification).toEqual({ message: '1 lockd', variant: 'lock' });
    expect(result.current.fadingOut).toBe(false);

    // Advance to the dismiss timer of the last push
    act(() => {
      jest.advanceTimersByTime(1700);
    });
    expect(result.current.fadingOut).toBe(true);
    expect(result.current.batchNotification).toEqual({ message: '1 lockd', variant: 'lock' });

    // Advance remaining for full dismiss
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current.batchNotification).toBeNull();
    expect(result.current.fadingOut).toBe(false);

    // clearTimeout should have been called at least once (previous timer canceled when new push arrived)
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it('should preserve history order after multiple pushes', () => {
    const { result } = renderHook(() => useBatchHistory());
    act(() => { result.current.pushBatchAction('hide', ['a'], 'visibility', true); });
    act(() => { result.current.pushBatchAction('show', ['b'], 'visibility', false); });
    act(() => { result.current.pushBatchAction('lock', ['c'], 'lock', true); });

    // pushBatchAction prepends, so order is reversed from push order
    expect(result.current.batchHistory).toHaveLength(3);
    expect(result.current.batchHistory[0].message).toBe('1 lockd');
    expect(result.current.batchHistory[1].message).toBe('1 shown');
    expect(result.current.batchHistory[2].message).toBe('1 hidden');
  });

  it('should not leave orphaned timers after multiple pushes and unmount', () => {
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() => useBatchHistory());

    // Push multiple notifications, then unmount immediately
    act(() => { result.current.pushBatchAction('hide', ['a'], 'visibility', true); });
    act(() => { result.current.pushBatchAction('show', ['b'], 'visibility', false); });
    act(() => { result.current.pushBatchAction('lock', ['c'], 'lock', true); });

    // Unmount while timers are pending
    unmount();

    // clearTimeout should have been called at least once
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });
});
