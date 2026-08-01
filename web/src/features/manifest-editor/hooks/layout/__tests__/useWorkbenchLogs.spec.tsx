/**
 * @jest-environment jsdom
 *
 * Tests for useWorkbenchLogs hook — local showLogs state,
 * log management, and LogTerminalPanel rendering.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useWorkbenchLogs } from '../useWorkbenchLogs';

// ── Mock LogTerminal (avoids import resolution issues) ─────────────────

import React from 'react';

jest.mock('../../../components/logs/LogTerminal', () => ({
  __esModule: true,
  default: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Initial state ──────────────────────────────────────────────────────

describe('useWorkbenchLogs — initial state', () => {
  it('should start with showLogs = false', () => {
    const { result } = renderHook(() => useWorkbenchLogs());
    expect(result.current.showLogs).toBe(false);
  });

  it('should start with empty logs array', () => {
    const { result } = renderHook(() => useWorkbenchLogs());
    expect(result.current.logs).toEqual([]);
  });

  it('should return LogTerminalPanel as ReactNode', () => {
    const { result } = renderHook(() => useWorkbenchLogs());
    expect(result.current.LogTerminalPanel).toBeDefined();
  });

  it('should return all expected properties', () => {
    const { result } = renderHook(() => useWorkbenchLogs());
    expect(result.current).toHaveProperty('showLogs');
    expect(result.current).toHaveProperty('setShowLogs');
    expect(result.current).toHaveProperty('toggleLogs');
    expect(result.current).toHaveProperty('logs');
    expect(result.current).toHaveProperty('addLog');
    expect(result.current).toHaveProperty('clearLogs');
    expect(result.current).toHaveProperty('LogTerminalPanel');
    expect(typeof result.current.setShowLogs).toBe('function');
    expect(typeof result.current.toggleLogs).toBe('function');
    expect(typeof result.current.addLog).toBe('function');
    expect(typeof result.current.clearLogs).toBe('function');
  });
});

// ── setShowLogs ────────────────────────────────────────────────────────

describe('useWorkbenchLogs — setShowLogs', () => {
  it('should open the terminal when setShowLogs(true)', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    act(() => {
      result.current.setShowLogs(true);
    });

    expect(result.current.showLogs).toBe(true);
  });

  it('should close the terminal when setShowLogs(false)', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    act(() => result.current.setShowLogs(true));
    expect(result.current.showLogs).toBe(true);

    act(() => result.current.setShowLogs(false));
    expect(result.current.showLogs).toBe(false);
  });

  it('should be idempotent when setting to same value', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    act(() => result.current.setShowLogs(false));
    expect(result.current.showLogs).toBe(false);

    act(() => result.current.setShowLogs(false));
    expect(result.current.showLogs).toBe(false);
  });
});

// ── toggleLogs ─────────────────────────────────────────────────────────

describe('useWorkbenchLogs — toggleLogs', () => {
  it('should toggle from false to true', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    act(() => {
      result.current.toggleLogs();
    });

    expect(result.current.showLogs).toBe(true);
  });

  it('should toggle back from true to false', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    act(() => result.current.toggleLogs());
    expect(result.current.showLogs).toBe(true);

    act(() => result.current.toggleLogs());
    expect(result.current.showLogs).toBe(false);
  });

  it('should toggle reliably across multiple invocations', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    for (let i = 0; i < 5; i++) {
      act(() => result.current.toggleLogs());
    }

    // Odd number of toggles from false → true
    expect(result.current.showLogs).toBe(true);
  });
});

// ── addLog ─────────────────────────────────────────────────────────────

describe('useWorkbenchLogs — addLog', () => {
  it('should add a log entry to the internal logs array', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    act(() => {
      result.current.addLog('Test log message');
    });

    expect(result.current.logs).toEqual(['Test log message']);
  });

  it('should accumulate multiple log entries', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    act(() => result.current.addLog('First'));
    act(() => result.current.addLog('Second'));
    act(() => result.current.addLog('Third'));

    expect(result.current.logs).toHaveLength(3);
    expect(result.current.logs[0]).toBe('First');
    expect(result.current.logs[1]).toBe('Second');
    expect(result.current.logs[2]).toBe('Third');
  });

  it('should append logs in order', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    act(() => result.current.addLog('A'));
    act(() => result.current.addLog('B'));
    act(() => result.current.addLog('C'));

    expect(result.current.logs).toEqual(['A', 'B', 'C']);
  });

  it('should handle empty string as log entry', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    act(() => result.current.addLog(''));

    expect(result.current.logs).toEqual(['']);
  });
});

// ── clearLogs ──────────────────────────────────────────────────────────

describe('useWorkbenchLogs — clearLogs', () => {
  it('should clear all internal logs', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    act(() => result.current.addLog('Log 1'));
    act(() => result.current.addLog('Log 2'));
    expect(result.current.logs).toHaveLength(2);

    act(() => {
      result.current.clearLogs();
    });

    expect(result.current.logs).toEqual([]);
  });

  it('should be idempotent when already empty', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    act(() => result.current.clearLogs());
    expect(result.current.logs).toEqual([]);

    act(() => result.current.clearLogs());
    expect(result.current.logs).toEqual([]);
  });
});

// ── External logs ──────────────────────────────────────────────────────

describe('useWorkbenchLogs — external logs', () => {
  it('should use external logs when provided', () => {
    const external = ['ext-1', 'ext-2', 'ext-3'];
    const { result } = renderHook(() => useWorkbenchLogs({ logs: external }));

    expect(result.current.logs).toEqual(external);
    expect(result.current.logs).toHaveLength(3);
  });

  it('should NOT modify external logs array', () => {
    const external = ['ext-1'];
    const { result } = renderHook(() => useWorkbenchLogs({ logs: external }));

    act(() => result.current.addLog('should-not-appear'));

    // addLog modifies internal logs, but external logs take precedence via ??
    expect(result.current.logs).toEqual(external);
    expect(result.current.logs).toHaveLength(1);
  });

  it('should use external logs over internal logs (?? operator)', () => {
    const { result } = renderHook(() => useWorkbenchLogs({ logs: ['external'] }));

    act(() => result.current.addLog('internal-only'));

    // ?? means externalLogs takes precedence when truthy (non-null, non-undefined)
    expect(result.current.logs).toEqual(['external']);
  });

  it('should fallback to internal logs when external is undefined', () => {
    const { result } = renderHook(() => useWorkbenchLogs({ logs: undefined }));

    act(() => result.current.addLog('internal-1'));

    expect(result.current.logs).toEqual(['internal-1']);
  });

  it('should fallback to internal logs when no options provided', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    act(() => result.current.addLog('fallback-log'));

    expect(result.current.logs).toEqual(['fallback-log']);
  });
});

// ── LogTerminalPanel ───────────────────────────────────────────────────

describe('useWorkbenchLogs — LogTerminalPanel', () => {
  it('should be a valid React element', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    const panel = result.current.LogTerminalPanel;
    expect(panel).toBeDefined();
    // It should be a valid React element (not null, not undefined)
    expect(React.isValidElement(panel)).toBe(true);
  });

  it('should not throw when rendered', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    expect(() => {
      act(() => result.current.setShowLogs(true));
    }).not.toThrow();
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────

describe('useWorkbenchLogs — edge cases', () => {
  it('should handle rapid sequential addLog + clearLogs', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    act(() => {
      result.current.addLog('A');
      result.current.addLog('B');
      result.current.clearLogs();
      result.current.addLog('C');
    });

    expect(result.current.logs).toEqual(['C']);
  });

  it('should maintain correct showLogs state across log operations', () => {
    const { result } = renderHook(() => useWorkbenchLogs());

    act(() => result.current.setShowLogs(true));

    // Log operations should not affect showLogs
    act(() => result.current.addLog('test'));
    expect(result.current.showLogs).toBe(true);

    act(() => result.current.clearLogs());
    expect(result.current.showLogs).toBe(true);

    act(() => result.current.setShowLogs(false));
    expect(result.current.showLogs).toBe(false);
  });

  it('should handle many log entries', () => {
    const { result } = renderHook(() => useWorkbenchLogs());
    const count = 100;

    act(() => {
      for (let i = 0; i < count; i++) {
        result.current.addLog(`Log ${i}`);
      }
    });

    expect(result.current.logs).toHaveLength(count);
    expect(result.current.logs[0]).toBe('Log 0');
    expect(result.current.logs[count - 1]).toBe(`Log ${count - 1}`);
  });
});
