/**
 * @jest-environment jsdom
 *
 * Tests for useBatchUngroup hook — batch ungroup + undo group.
 *
 * Strategy: Use real implementations for tree utility functions (pure, no side effects)
 * so tests verify actual reparenting logic and position offsets.
 * Mock only editor.ungroupNode and updateManifest callback capture.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useBatchUngroup, type BatchUngroupEditor } from '../useBatchUngroup';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';

/** Helper: DFS search in tree */
function findNodeInTree(root: OmegaNode, id: string): OmegaNode | undefined {
  if (root.id === id) return root;
  if (root.children) {
    for (const c of root.children) {
      const found = findNodeInTree(c, id);
      if (found) return found;
    }
  }
  return undefined;
}

// ── Test tree fixtures ─────────────────────────────────────────────────

function createTestTree(): OmegaNode {
  return {
    id: 'rack-root',
    kind: 'face',
    role: 'root',
    layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
    children: [
      {
        id: 'group1',
        kind: 'group',
        role: 'infrastructure',
        layout: { pos: { x: 100, y: 100 }, mode: 'absolute' },
        children: [
          {
            id: 'child1',
            kind: 'cell',
            role: 'control',
            cellRef: 'knob',
            layout: { pos: { x: 10, y: 10 }, size: { width: 48, height: 48 }, mode: 'absolute' },
          },
          {
            id: 'child2',
            kind: 'cell',
            role: 'control',
            cellRef: 'knob',
            layout: { pos: { x: 60, y: 10 }, size: { width: 48, height: 48 }, mode: 'absolute' },
          },
        ],
      },
      {
        id: 'group2',
        kind: 'group',
        role: 'infrastructure',
        layout: { pos: { x: 200, y: 200 }, mode: 'absolute' },
        children: [
          {
            id: 'child3',
            kind: 'cell',
            role: 'control',
            cellRef: 'knob',
            layout: { pos: { x: 10, y: 10 }, size: { width: 48, height: 48 }, mode: 'absolute' },
          },
        ],
      },
      {
        id: 'container1',
        kind: 'container',
        role: 'infrastructure',
        layout: { pos: { x: 50, y: 50 }, mode: 'absolute' },
        children: [
          {
            id: 'child4',
            kind: 'cell',
            role: 'control',
            cellRef: 'knob',
            layout: { pos: { x: 5, y: 5 }, size: { width: 48, height: 48 }, mode: 'absolute' },
          },
        ],
      },
      {
        id: 'empty_group',
        kind: 'group',
        role: 'infrastructure',
        layout: { pos: { x: 300, y: 300 }, mode: 'absolute' },
        children: [],
      },
      {
        id: 'standalone_knob',
        kind: 'cell',
        role: 'control',
        cellRef: 'knob',
        layout: { pos: { x: 50, y: 50 }, size: { width: 48, height: 48 }, mode: 'absolute' },
      },
    ],
  };
}

function createManifest(tree: OmegaNode): OMEGA_Manifest {
  return {
    id: 'test-module',
    metadata: { name: 'Test Module', version: '1.0.0', author: 'test' },
    ui: {
      layout: { width: 800, height: 600 },
      tree,
      controls: [],
      jacks: [],
      palette: {},
    },
    resources: { assets: [] },
    entities: [],
  } as unknown as OMEGA_Manifest;
}

// ── Helpers ────────────────────────────────────────────────────────────

function createMockEditor(): jest.MockedObject<BatchUngroupEditor> {
  return {
    addLog: jest.fn<(msg: string) => void>(),
    ungroupNode: jest.fn<(id: string) => void>(),
  };
}

/** Captures the callback and label passed to updateManifest */
function createUpdateManifestCapturer() {
  let capturedCallback: ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>) | null = null;
  let capturedLabel: string | undefined;
  let capturedForceHistory: boolean | undefined;

  const mockFn = jest.fn(
    (
      updates:
        | Partial<OMEGA_Manifest>
        | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>),
      label?: string,
      forceHistory?: boolean,
    ) => {
      if (typeof updates === 'function') {
        capturedCallback = updates;
      }
      capturedLabel = label;
      capturedForceHistory = forceHistory;
    },
  );

  const reset = () => {
    capturedCallback = null;
    capturedLabel = undefined;
    capturedForceHistory = undefined;
  };

  const getCapturedLabel = () => capturedLabel;
  const getCapturedForceHistory = () => capturedForceHistory;

  /** Executes the captured callback with a given manifest and returns the result */
  const executeCallback = (manifest: OMEGA_Manifest): Partial<OMEGA_Manifest> | null => {
    if (capturedCallback) {
      return capturedCallback(manifest);
    }
    return null;
  };

  return { mockFn, reset, getCapturedLabel, getCapturedForceHistory, executeCallback };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('useBatchUngroup — handleBatchUngroup', () => {
  let editor: jest.MockedObject<BatchUngroupEditor>;
  let capturer: ReturnType<typeof createUpdateManifestCapturer>;

  beforeEach(() => {
    editor = createMockEditor();
    capturer = createUpdateManifestCapturer();
  });

  it('should call updateManifest with label "Batch Ungroup N groups"', () => {
    const manifest = createManifest(createTestTree());
    const { result } = renderHook(() =>
      useBatchUngroup(manifest, capturer.mockFn, editor),
    );

    act(() => {
      result.current.handleBatchUngroup(['group1']);
    });

    expect(capturer.getCapturedLabel()).toBe('Batch Ungroup 1 groups');
    expect(capturer.getCapturedForceHistory()).toBe(true);
  });

  it('should reparent children with position offset', () => {
    const manifest = createManifest(createTestTree());
    const { result } = renderHook(() =>
      useBatchUngroup(manifest, capturer.mockFn, editor),
    );

    act(() => {
      result.current.handleBatchUngroup(['group1']);
    });

    const partial = capturer.executeCallback(manifest);
    expect(partial).not.toBeNull();

    // Verify children were reparented with offset (group1 at 100,100)
    // child1 was at 10,10 → should be 110,110
    // child2 was at 60,10 → should be 160,110
    const resultTree = partial!.ui?.tree as OmegaNode | undefined;
    expect(resultTree).toBeDefined();

    const child1 = findNodeInTree(resultTree!, 'child1');
    expect(child1).toBeDefined();
    expect(child1!.layout?.pos?.x).toBe(110);
    expect(child1!.layout?.pos?.y).toBe(110);

    const child2 = findNodeInTree(resultTree!, 'child2');
    expect(child2).toBeDefined();
    expect(child2!.layout?.pos?.x).toBe(160);
    expect(child2!.layout?.pos?.y).toBe(110);

    // group1 should no longer exist
    const group1 = findNodeInTree(resultTree!, 'group1');
    expect(group1).toBeUndefined();
  });

  it('should handle empty ids array (no crash)', () => {
    const manifest = createManifest(createTestTree());
    const { result } = renderHook(() =>
      useBatchUngroup(manifest, capturer.mockFn, editor),
    );

    expect(() => {
      act(() => {
        result.current.handleBatchUngroup([]);
      });
    }).not.toThrow();

    expect(capturer.getCapturedLabel()).toBe('Batch Ungroup 0 groups');
    const partial = capturer.executeCallback(manifest);
    expect(partial).not.toBeNull();
  });

  it('should skip nodes that are not group or container', () => {
    const manifest = createManifest(createTestTree());
    const { result } = renderHook(() =>
      useBatchUngroup(manifest, capturer.mockFn, editor),
    );

    act(() => {
      result.current.handleBatchUngroup(['standalone_knob']);
    });

    const partial = capturer.executeCallback(manifest);
    expect(partial).not.toBeNull();

    // standalone_knob should still exist unchanged
    const resultTree = partial!.ui?.tree as OmegaNode | undefined;
    const knob = findNodeInTree(resultTree!, 'standalone_knob');
    expect(knob).toBeDefined();
    expect(knob!.layout?.pos?.x).toBe(50);
  });

  it('should skip groups without children', () => {
    const manifest = createManifest(createTestTree());
    const { result } = renderHook(() =>
      useBatchUngroup(manifest, capturer.mockFn, editor),
    );

    act(() => {
      result.current.handleBatchUngroup(['empty_group']);
    });

    const partial = capturer.executeCallback(manifest);
    expect(partial).not.toBeNull();

    // empty_group should still exist since it has no children
    const resultTree = partial!.ui?.tree as OmegaNode | undefined;
    const empty = findNodeInTree(resultTree!, 'empty_group');
    expect(empty).toBeDefined();
  });

  it('should log "[BATCH] Ungrouped N groups" after processing', () => {
    const manifest = createManifest(createTestTree());
    const { result } = renderHook(() =>
      useBatchUngroup(manifest, capturer.mockFn, editor),
    );

    act(() => {
      result.current.handleBatchUngroup(['group1', 'group2']);
    });

    // Execute the callback to trigger addLog
    capturer.executeCallback(manifest);
    expect(editor.addLog).toHaveBeenCalledWith('[BATCH] Ungrouped 2 groups');
  });

  it('should handle container kind (not just group)', () => {
    const manifest = createManifest(createTestTree());
    const { result } = renderHook(() =>
      useBatchUngroup(manifest, capturer.mockFn, editor),
    );

    act(() => {
      result.current.handleBatchUngroup(['container1']);
    });

    const partial = capturer.executeCallback(manifest);
    expect(partial).not.toBeNull();

    const resultTree = partial!.ui?.tree as OmegaNode | undefined;
    function findNodeInTree(root: OmegaNode, id: string): OmegaNode | undefined {
      if (root.id === id) return root;
      if (root.children) {
        for (const c of root.children) {
          const found = findNodeInTree(c, id);
          if (found) return found;
        }
      }
      return undefined;
    }

    // child4 should be reparented with offset (container1 at 50,50 + child4 at 5,5 = 55,55)
    const child4 = findNodeInTree(resultTree!, 'child4');
    expect(child4).toBeDefined();
    expect(child4!.layout?.pos?.x).toBe(55);
    expect(child4!.layout?.pos?.y).toBe(55);

    // container1 should no longer exist
    const container = findNodeInTree(resultTree!, 'container1');
    expect(container).toBeUndefined();
  });

  it('should handle mixed valid/invalid ids without crash', () => {
    const manifest = createManifest(createTestTree());
    const { result } = renderHook(() =>
      useBatchUngroup(manifest, capturer.mockFn, editor),
    );

    expect(() => {
      act(() => {
        result.current.handleBatchUngroup(['group1', 'nonexistent', 'standalone_knob']);
      });
    }).not.toThrow();

    const partial = capturer.executeCallback(manifest);
    expect(partial).not.toBeNull();

    // group1 should be ungrouped, standalone_knob should remain
    const resultTree = partial!.ui?.tree as OmegaNode | undefined;
    expect(findNodeInTree(resultTree!, 'group1')).toBeUndefined();
    expect(findNodeInTree(resultTree!, 'standalone_knob')).toBeDefined();
  });
});

// ── handleBatchUndoGroup ───────────────────────────────────────────────

describe('useBatchUngroup — handleBatchUndoGroup', () => {
  let editor: jest.MockedObject<BatchUngroupEditor>;

  beforeEach(() => {
    editor = createMockEditor();
  });

  it('should find group by children and call editor.ungroupNode', () => {
    const manifest = createManifest(createTestTree());
    const { result } = renderHook(() =>
      useBatchUngroup(manifest, jest.fn(), editor),
    );

    act(() => {
      result.current.handleBatchUndoGroup(['child1', 'child2']);
    });

    // group1 contains child1 and child2
    expect(editor.ungroupNode).toHaveBeenCalledWith('group1');
    expect(editor.addLog).toHaveBeenCalledWith('[BATCH UNDO] Ungrouped group1 (2 children)');
  });

  it('should log when no group contains the specified children', () => {
    const manifest = createManifest(createTestTree());
    const { result } = renderHook(() =>
      useBatchUngroup(manifest, jest.fn(), editor),
    );

    act(() => {
      result.current.handleBatchUndoGroup(['child1', 'nonexistent_child']);
    });

    expect(editor.ungroupNode).not.toHaveBeenCalled();
    expect(editor.addLog).toHaveBeenCalledWith(
      '[BATCH UNDO] Could not find group containing those children',
    );
  });

  it('should find group even when child IDs match different subsets (exact match required)', () => {
    const tree = createTestTree();
    // Add a custom group to test different child combinations
    tree.children!.push({
      id: 'group3',
      kind: 'group',
      role: 'infrastructure',
      layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
      children: [
        {
          id: 'child5',
          kind: 'cell',
          role: 'control',
          cellRef: 'knob',
          layout: { pos: { x: 0, y: 0 }, size: { width: 48, height: 48 }, mode: 'absolute' },
        },
        {
          id: 'child6',
          kind: 'cell',
          role: 'control',
          cellRef: 'knob',
          layout: { pos: { x: 50, y: 0 }, size: { width: 48, height: 48 }, mode: 'absolute' },
        },
      ],
    });
    const manifest = createManifest(tree);
    const { result } = renderHook(() =>
      useBatchUngroup(manifest, jest.fn(), editor),
    );

    // child5 and child6 match group3 exactly
    act(() => {
      result.current.handleBatchUndoGroup(['child5', 'child6']);
    });

    expect(editor.ungroupNode).toHaveBeenCalledWith('group3');
  });

  it('should log when there is no tree in the manifest', () => {
    const noTreeManifest: OMEGA_Manifest = {
      id: 'empty',
      metadata: { name: 'Empty', version: '1.0.0', author: 'test' },
      ui: {} as OMEGA_Manifest['ui'],
      resources: { assets: [] },
      entities: [],
    } as unknown as OMEGA_Manifest;

    const { result } = renderHook(() =>
      useBatchUngroup(noTreeManifest, jest.fn(), editor),
    );

    act(() => {
      result.current.handleBatchUndoGroup(['child1']);
    });

    expect(editor.addLog).toHaveBeenCalledWith('[BATCH UNDO] No tree available');
    expect(editor.ungroupNode).not.toHaveBeenCalled();
  });
});

// ── Return shape ───────────────────────────────────────────────────────

describe('useBatchUngroup — return shape', () => {
  it('should return handleBatchUngroup and handleBatchUndoGroup', () => {
    const manifest = createManifest(createTestTree());
    const editor = createMockEditor();
    const { result } = renderHook(() =>
      useBatchUngroup(manifest, jest.fn(), editor),
    );

    expect(result.current).toHaveProperty('handleBatchUngroup');
    expect(typeof result.current.handleBatchUngroup).toBe('function');
    expect(result.current).toHaveProperty('handleBatchUndoGroup');
    expect(typeof result.current.handleBatchUndoGroup).toBe('function');
  });
});
