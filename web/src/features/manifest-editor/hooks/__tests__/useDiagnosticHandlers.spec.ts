/**
 * @jest-environment jsdom
 *
 * Tests for useDiagnosticHandlers hook — diagnostic click navigation
 * and view state capture.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useDiagnosticHandlers } from '../useDiagnosticHandlers';
import type { Diagnostic } from '../../types/diagnostics';

// ── Mock Actions ──────────────────────────────────────────────────────

function createMockActions() {
  return {
    focusTab: jest.fn(),
    captureTabViewState: jest.fn(),
  };
}

const mockHandleSelectItem = jest.fn();

function createMonacoDiagnostic(overrides?: Partial<Diagnostic>): Diagnostic {
  return {
    id: 'e1',
    source: 'Monaco',
    message: 'Unexpected token',
    severity: 'error',
    line: 10,
    column: 5,
    ...overrides,
  };
}

function createEntityDiagnostic(overrides?: Partial<Diagnostic>): Diagnostic {
  return {
    id: 'e2',
    source: 'Structural',
    message: 'Broken bind',
    severity: 'warning',
    entityId: 'ctrl_osc1',
    ...overrides,
  };
}

function createStructuralDiagnostic(overrides?: Partial<Diagnostic>): Diagnostic {
  return {
    id: 'e3',
    source: 'Structural',
    message: 'Some warning',
    severity: 'warning',
    ...overrides,
  };
}

beforeEach(() => {
  mockHandleSelectItem.mockClear();
});

// ── handleDiagnosticClick ─────────────────────────────────────────────

describe('useDiagnosticHandlers — handleDiagnosticClick', () => {
  it('should focus tab-source when source is Monaco', () => {
    const actions = createMockActions();
    const { result } = renderHook(() =>
      useDiagnosticHandlers(actions, mockHandleSelectItem),
    );

    const diag = createMonacoDiagnostic();

    act(() => {
      result.current.handleDiagnosticClick('tab-source', diag);
    });

    expect(actions.focusTab).toHaveBeenCalledTimes(1);
    expect(actions.focusTab).toHaveBeenCalledWith('primary', 'tab-source');
  });

  it('should focus tab-source when diagnostic has a line number', () => {
    const actions = createMockActions();
    const { result } = renderHook(() =>
      useDiagnosticHandlers(actions, mockHandleSelectItem),
    );

    const diag: Diagnostic = {
      id: 'e4',
      source: 'Custom',
      message: 'Issue at line',
      severity: 'error',
      line: 42,
    };

    act(() => {
      result.current.handleDiagnosticClick('tab-source', diag);
    });

    expect(actions.focusTab).toHaveBeenCalledWith('primary', 'tab-source');
  });

  it('should select entity when diagnostic has entityId and no line', () => {
    const actions = createMockActions();
    const { result } = renderHook(() =>
      useDiagnosticHandlers(actions, mockHandleSelectItem),
    );

    const diag = createEntityDiagnostic();

    act(() => {
      result.current.handleDiagnosticClick('tab-rack', diag);
    });

    expect(mockHandleSelectItem).toHaveBeenCalledTimes(1);
    expect(mockHandleSelectItem).toHaveBeenCalledWith('ctrl_osc1');
    expect(actions.focusTab).not.toHaveBeenCalled();
  });

  it('should do nothing when diagnostic has no source, no line, and no entityId', () => {
    const actions = createMockActions();
    const { result } = renderHook(() =>
      useDiagnosticHandlers(actions, mockHandleSelectItem),
    );

    const diag = createStructuralDiagnostic();

    act(() => {
      result.current.handleDiagnosticClick('tab-source', diag);
    });

    expect(actions.focusTab).not.toHaveBeenCalled();
    expect(mockHandleSelectItem).not.toHaveBeenCalled();
  });

  it('should prioritize line-based navigation over entityId', () => {
    const actions = createMockActions();
    const { result } = renderHook(() =>
      useDiagnosticHandlers(actions, mockHandleSelectItem),
    );

    const diag: Diagnostic = {
      id: 'e5',
      source: 'Monaco',
      message: 'Error',
      severity: 'error',
      line: 5,
      entityId: 'ctrl_osc1',
    };

    act(() => {
      result.current.handleDiagnosticClick('tab-source', diag);
    });

    expect(actions.focusTab).toHaveBeenCalledWith('primary', 'tab-source');
    expect(mockHandleSelectItem).not.toHaveBeenCalled();
  });
});

// ── handleCaptureViewState ────────────────────────────────────────────

describe('useDiagnosticHandlers — handleCaptureViewState', () => {
  it('should call actions.captureTabViewState with editorViewState', () => {
    const actions = createMockActions();
    const { result } = renderHook(() =>
      useDiagnosticHandlers(actions, mockHandleSelectItem),
    );

    const viewState = { cursorLine: 10, scrollTop: 50 };

    act(() => {
      result.current.handleCaptureViewState('tab-source', viewState);
    });

    expect(actions.captureTabViewState).toHaveBeenCalledTimes(1);
    expect(actions.captureTabViewState).toHaveBeenCalledWith('tab-source', {
      editorViewState: viewState,
    });
  });
});

// ── Return shape ──────────────────────────────────────────────────────

describe('useDiagnosticHandlers — return shape', () => {
  it('should return handleDiagnosticClick and handleCaptureViewState as functions', () => {
    const actions = createMockActions();
    const { result } = renderHook(() =>
      useDiagnosticHandlers(actions, mockHandleSelectItem),
    );

    expect(typeof result.current.handleDiagnosticClick).toBe('function');
    expect(typeof result.current.handleCaptureViewState).toBe('function');
  });
});
