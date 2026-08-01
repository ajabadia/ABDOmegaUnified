/**
 * @jest-environment jsdom
 *
 * Tests for useTabDiagnostics hook — aggregates per-tab diagnostics
 * and memoizes structural diagnostics via StructuralAuditor.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import type { OMEGA_Manifest, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import { structuralAuditor } from '@/features/manifest-editor/services/StructuralAuditor';
import type { AuditResult } from '@/omega-ui-core/types/audit';
import { useTabDiagnostics } from '../useTabDiagnostics';

// ── Spy on structuralAuditor.extractDiagnostics ────────────────────────
let mockSpy: jest.Mock<(...args: unknown[]) => AuditResult>;

// ── Helpers ────────────────────────────────────────────────────────────

function createEmptyAuditResult(): AuditResult {
  return {
    errors: [],
    warnings: [],
    infos: [],
    errorCount: 0,
    warningCount: 0,
    infoCount: 0,
    score: 100,
    checks: { governance: true, integrity: true, technical: true, aesthetic: true },
    isCompliant: true,
    issues: [],
  };
}

function createAuditResult(overrides?: Partial<AuditResult>): AuditResult {
  return { ...createEmptyAuditResult(), ...overrides };
}

const MINIMAL_MANIFEST: OMEGA_Manifest = {
  id: 'test-manifest',
  metadata: { name: 'Test', version: '1.0.0', author: 'tester' },
  ui: {
    layout: { width: 800, height: 600 },
    tree: { id: 'root', kind: 'face', role: 'root', layout: { pos: { x: 0, y: 0 }, mode: 'absolute' } },
    controls: [],
    jacks: [],
    palette: {},
  },
  resources: { assets: [] },
  entities: [],
};

const MINIMAL_CONTRACT: OMEGA_Contract = {
  id: 'test-contract',
  label: 'Test Contract',
  role: 'test',
  parameters: [],
  ports: [],
};

beforeEach(() => {
  mockSpy = jest.spyOn(structuralAuditor, 'extractDiagnostics') as unknown as jest.Mock<(...args: unknown[]) => AuditResult>;
  mockSpy.mockReturnValue(createEmptyAuditResult());
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Initial state ──────────────────────────────────────────────────────

describe('useTabDiagnostics — initial state', () => {
  it('should start with empty tabDiagnostics', () => {
    const { result } = renderHook(() =>
      useTabDiagnostics(MINIMAL_MANIFEST, MINIMAL_CONTRACT),
    );
    expect(result.current.tabDiagnostics).toEqual({});
  });

  it('should compute structuralDiagnostics on mount', () => {
    renderHook(() => useTabDiagnostics(MINIMAL_MANIFEST, MINIMAL_CONTRACT));
    expect(mockSpy).toHaveBeenCalledTimes(1);
    expect(mockSpy).toHaveBeenCalledWith(MINIMAL_MANIFEST, {
      contract: MINIMAL_CONTRACT,
    });
  });

  it('should return empty structuralDiagnostics when auditor returns empty', () => {
    const { result } = renderHook(() =>
      useTabDiagnostics(MINIMAL_MANIFEST, MINIMAL_CONTRACT),
    );
    expect(result.current.structuralDiagnostics.errorCount).toBe(0);
    expect(result.current.structuralDiagnostics.warningCount).toBe(0);
    expect(result.current.structuralDiagnostics.infoCount).toBe(0);
    expect(result.current.structuralDiagnostics.errors).toEqual([]);
    expect(result.current.structuralDiagnostics.warnings).toEqual([]);
    expect(result.current.structuralDiagnostics.infos).toEqual([]);
  });
});

// ── handleDiagnosticsUpdate ────────────────────────────────────────────

describe('useTabDiagnostics — handleDiagnosticsUpdate', () => {
  it('should store diagnostics for a tabId', () => {
    const { result } = renderHook(() =>
      useTabDiagnostics(MINIMAL_MANIFEST, MINIMAL_CONTRACT),
    );

    const diags = createAuditResult({ errorCount: 2, errors: [{ id: 'e1', source: 'test', message: 'err', severity: 'error' }] });

    act(() => {
      result.current.handleDiagnosticsUpdate('tab-source', diags);
    });

    expect(result.current.tabDiagnostics['tab-source']).toBeDefined();
    expect(result.current.tabDiagnostics['tab-source'].errorCount).toBe(2);
  });

  it('should store diagnostics for multiple tabs independently', () => {
    const { result } = renderHook(() =>
      useTabDiagnostics(MINIMAL_MANIFEST, MINIMAL_CONTRACT),
    );

    const diagsA = createAuditResult({ errorCount: 1 });
    const diagsB = createAuditResult({ warningCount: 3 });

    act(() => {
      result.current.handleDiagnosticsUpdate('tab-a', diagsA);
      result.current.handleDiagnosticsUpdate('tab-b', diagsB);
    });

    expect(result.current.tabDiagnostics['tab-a'].errorCount).toBe(1);
    expect(result.current.tabDiagnostics['tab-b'].warningCount).toBe(3);
  });

  it('should NOT update if counts are identical (idempotent)', () => {
    const { result } = renderHook(() =>
      useTabDiagnostics(MINIMAL_MANIFEST, MINIMAL_CONTRACT),
    );

    const diags = createAuditResult({ errorCount: 1, warningCount: 2, infoCount: 3 });

    act(() => {
      result.current.handleDiagnosticsUpdate('tab-source', diags);
    });
    const firstRef = result.current.tabDiagnostics['tab-source'];

    act(() => {
      result.current.handleDiagnosticsUpdate('tab-source', { ...diags });
    });
    const secondRef = result.current.tabDiagnostics['tab-source'];

    // Same reference → no re-render triggered
    expect(firstRef).toBe(secondRef);
  });

  it('should update if errorCount changes', () => {
    const { result } = renderHook(() =>
      useTabDiagnostics(MINIMAL_MANIFEST, MINIMAL_CONTRACT),
    );

    const diags1 = createAuditResult({ errorCount: 1 });
    const diags2 = createAuditResult({ errorCount: 2 });

    act(() => {
      result.current.handleDiagnosticsUpdate('tab-source', diags1);
    });
    const before = result.current.tabDiagnostics['tab-source'];

    act(() => {
      result.current.handleDiagnosticsUpdate('tab-source', diags2);
    });
    const after = result.current.tabDiagnostics['tab-source'];

    expect(before).not.toBe(after);
    expect(after.errorCount).toBe(2);
  });

  it('should update if warningCount changes', () => {
    const { result } = renderHook(() =>
      useTabDiagnostics(MINIMAL_MANIFEST, MINIMAL_CONTRACT),
    );

    act(() => {
      result.current.handleDiagnosticsUpdate('tab-source', createAuditResult({ warningCount: 1 }));
    });
    act(() => {
      result.current.handleDiagnosticsUpdate('tab-source', createAuditResult({ warningCount: 5 }));
    });

    expect(result.current.tabDiagnostics['tab-source'].warningCount).toBe(5);
  });

  it('should update if infoCount changes', () => {
    const { result } = renderHook(() =>
      useTabDiagnostics(MINIMAL_MANIFEST, MINIMAL_CONTRACT),
    );

    act(() => {
      result.current.handleDiagnosticsUpdate('tab-source', createAuditResult({ infoCount: 0 }));
    });
    act(() => {
      result.current.handleDiagnosticsUpdate('tab-source', createAuditResult({ infoCount: 1 }));
    });

    expect(result.current.tabDiagnostics['tab-source'].infoCount).toBe(1);
  });
});

// ── structuralDiagnostics memoization ───────────────────────────────────

describe('useTabDiagnostics — structuralDiagnostics memoization', () => {
  it('should NOT recompute structuralDiagnostics when handleDiagnosticsUpdate is called', () => {
    const { result } = renderHook(() =>
      useTabDiagnostics(MINIMAL_MANIFEST, MINIMAL_CONTRACT),
    );
    const callsAfterMount = mockSpy.mock.calls.length;

    act(() => {
      result.current.handleDiagnosticsUpdate('tab-source', createAuditResult({ errorCount: 1 }));
    });

    // structuralDiagnostics is only dependent on manifest and contract, not on tabDiagnostics
    expect(mockSpy).toHaveBeenCalledTimes(callsAfterMount);
  });

  it('should recompute structuralDiagnostics when manifest reference changes', () => {
    const { rerender } = renderHook(
      (props: { manifest: OMEGA_Manifest; contract: OMEGA_Contract }) =>
        useTabDiagnostics(props.manifest, props.contract),
      { initialProps: { manifest: MINIMAL_MANIFEST, contract: MINIMAL_CONTRACT } },
    );

    const callsAfterFirst = mockSpy.mock.calls.length;

    const newManifest: OMEGA_Manifest = {
      ...MINIMAL_MANIFEST,
      metadata: { name: 'Changed', version: '2.0.0', author: 'tester' },
    };
    rerender({ manifest: newManifest, contract: MINIMAL_CONTRACT });

    expect(mockSpy).toHaveBeenCalledTimes(callsAfterFirst + 1);
    expect(mockSpy).toHaveBeenLastCalledWith(newManifest, {
      contract: MINIMAL_CONTRACT,
    });
  });

  it('should recompute structuralDiagnostics when contract reference changes', () => {
    const { rerender } = renderHook(
      (props: { manifest: OMEGA_Manifest; contract: OMEGA_Contract }) =>
        useTabDiagnostics(props.manifest, props.contract),
      { initialProps: { manifest: MINIMAL_MANIFEST, contract: MINIMAL_CONTRACT } },
    );

    const callsAfterFirst = mockSpy.mock.calls.length;

    const newContract: OMEGA_Contract = {
      ...MINIMAL_CONTRACT,
      id: 'changed-contract',
    };
    rerender({ manifest: MINIMAL_MANIFEST, contract: newContract });

    expect(mockSpy).toHaveBeenCalledTimes(callsAfterFirst + 1);
  });

  it('should NOT recompute structuralDiagnostics on same references (stable)', () => {
    const { rerender } = renderHook(
      () => useTabDiagnostics(MINIMAL_MANIFEST, MINIMAL_CONTRACT),
    );

    const callsAfterMount = mockSpy.mock.calls.length;

    // Re-render with same props
    rerender();

    expect(mockSpy).toHaveBeenCalledTimes(callsAfterMount);
  });
});

// ── Structural diagnostics with real data ──────────────────────────────

describe('useTabDiagnostics — structural diagnostics content', () => {
  it('should expose structural diagnostics from the auditor', () => {
    const mockDiags = createAuditResult({
      errorCount: 3,
      warningCount: 1,
      errors: [
        { id: 'e1', source: 'Structural', message: 'Error 1', severity: 'error' },
        { id: 'e2', source: 'Structural', message: 'Error 2', severity: 'error' },
        { id: 'e3', source: 'Structural', message: 'Error 3', severity: 'error' },
      ],
      warnings: [{ id: 'w1', source: 'Structural', message: 'Warning 1', severity: 'warning' }],
    });
    mockSpy.mockReturnValue(mockDiags);

    const { result } = renderHook(() =>
      useTabDiagnostics(MINIMAL_MANIFEST, MINIMAL_CONTRACT),
    );

    expect(result.current.structuralDiagnostics.errorCount).toBe(3);
    expect(result.current.structuralDiagnostics.warningCount).toBe(1);
    expect(result.current.structuralDiagnostics.errors).toHaveLength(3);
    expect(result.current.structuralDiagnostics.warnings).toHaveLength(1);
  });
});

// ── Return shape ───────────────────────────────────────────────────────

describe('useTabDiagnostics — return shape', () => {
  it('should return tabDiagnostics, structuralDiagnostics, and handleDiagnosticsUpdate', () => {
    const { result } = renderHook(() =>
      useTabDiagnostics(MINIMAL_MANIFEST, MINIMAL_CONTRACT),
    );

    expect(result.current).toHaveProperty('tabDiagnostics');
    expect(result.current).toHaveProperty('structuralDiagnostics');
    expect(result.current).toHaveProperty('handleDiagnosticsUpdate');
    expect(typeof result.current.handleDiagnosticsUpdate).toBe('function');
  });
});
