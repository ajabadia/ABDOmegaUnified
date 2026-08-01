/**
 * @jest-environment jsdom
 *
 * Tests for useToast hook — notification queue with auto-dismiss.
 *
 * Mock strategy: renderHook from @testing-library/react with fake timers.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../useToast';

// ── Setup fake timers ──────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Return shape ───────────────────────────────────────────────────────

describe('useToast — return shape', () => {
  it('should return toasts, addToast, removeToast, and clearToasts', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current).toHaveProperty('toasts');
    expect(result.current).toHaveProperty('addToast');
    expect(result.current).toHaveProperty('removeToast');
    expect(result.current).toHaveProperty('clearToasts');
    expect(Array.isArray(result.current.toasts)).toBe(true);
    expect(result.current.toasts).toHaveLength(0);
  });
});

// ── addToast ───────────────────────────────────────────────────────────

describe('useToast — addToast', () => {
  it('should add a toast with default variant "info"', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Hello world');
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Hello world');
    expect(result.current.toasts[0].variant).toBe('info');
    expect(result.current.toasts[0].id).toContain('toast-');
  });

  it('should add a toast with specified variant', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Success!', 'success');
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].variant).toBe('success');
  });

  it('should add a toast with warning variant', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Warning!', 'warning');
    });
    expect(result.current.toasts[0].variant).toBe('warning');
  });

  it('should add a toast with error variant', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Error!', 'error');
    });
    expect(result.current.toasts[0].variant).toBe('error');
  });

  it('should generate unique IDs for successive toasts', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('First');
      result.current.addToast('Second');
    });
    expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id);
  });

  it('should limit the stack to MAX_TOASTS (5)', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Toast 1');
      result.current.addToast('Toast 2');
      result.current.addToast('Toast 3');
      result.current.addToast('Toast 4');
      result.current.addToast('Toast 5');
      result.current.addToast('Toast 6');
    });
    // Should only keep the latest 5
    expect(result.current.toasts).toHaveLength(5);
    expect(result.current.toasts[0].message).toBe('Toast 2');
    expect(result.current.toasts[4].message).toBe('Toast 6');
  });
});

// ── removeToast ────────────────────────────────────────────────────────

describe('useToast — removeToast', () => {
  it('should remove a specific toast by id', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Remove me');
    });
    expect(result.current.toasts).toHaveLength(1);
    const id = result.current.toasts[0].id;
    act(() => {
      result.current.removeToast(id);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('should do nothing when removing a non-existent id', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Stay');
    });
    act(() => {
      result.current.removeToast('non-existent-id');
    });
    expect(result.current.toasts).toHaveLength(1);
  });

  it('should cancel the auto-dismiss timer when removed manually', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Manual dismiss', 'success');
    });
    const id = result.current.toasts[0].id;
    act(() => {
      result.current.removeToast(id);
    });
    // Advance past the auto-dismiss time — toast should not reappear
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});

// ── clearToasts ────────────────────────────────────────────────────────

describe('useToast — clearToasts', () => {
  it('should clear all toasts at once', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('A');
      result.current.addToast('B');
      result.current.addToast('C');
    });
    expect(result.current.toasts).toHaveLength(3);
    act(() => {
      result.current.clearToasts();
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('should cancel all pending auto-dismiss timers', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('A', 'warning'); // 4s
      result.current.addToast('B', 'error');   // 5s
    });
    act(() => {
      result.current.clearToasts();
    });
    // Advance well past any auto-dismiss — nothing should reappear
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});

// ── Auto-dismiss ───────────────────────────────────────────────────────

describe('useToast — auto-dismiss', () => {
  it('should auto-dismiss success after 3 seconds', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Quick', 'success');
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => {
      jest.advanceTimersByTime(2999);
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('should auto-dismiss info after 3 seconds', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Info', 'info');
    });
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('should auto-dismiss warning after 4 seconds', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Slow', 'warning');
    });
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('should auto-dismiss error after 5 seconds', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Persistent', 'error');
    });
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('should auto-dismiss multiple toasts independently', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Quick', 'success');  // 3s
      result.current.addToast('Slow', 'error');     // 5s
    });
    // At 3s, only Quick should be gone
    act(() => { jest.advanceTimersByTime(3000); });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Slow');
    // At 5s, Slow should be gone too
    act(() => { jest.advanceTimersByTime(2000); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('should not auto-dismiss a toast that was already removed', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Gone', 'success');
    });
    const id = result.current.toasts[0].id;
    act(() => {
      result.current.removeToast(id);
    });
    // The auto-dismiss timer should have been cleared — no crash
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});

// ── Unmount cleanup ────────────────────────────────────────────────────

describe('useToast — unmount cleanup', () => {
  it('should clear all timers on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('Will be cleaned', 'error');
      result.current.addToast('Also cleaned', 'warning');
    });
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
