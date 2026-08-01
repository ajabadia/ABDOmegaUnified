/**
 * @jest-environment jsdom
 *
 * Tests for useGroupBlueprint hook — save groups as blueprints.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import {
  useGroupBlueprint,
  type GroupBlueprintEditor,
  type UserBlueprintEntry,
} from '../useGroupBlueprint';
import type { GroupNode } from '@/omega-ui-core/types/rack';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';

// ── Helpers ────────────────────────────────────────────────────────────

function createGroupNode(overrides?: Partial<GroupNode>): GroupNode {
  return {
    id: 'group-1',
    label: 'Test Group',
    pos: { x: 10, y: 20 },
    children: [
      {
        id: 'child-1',
        type: 'knob',
        label: 'Freq',
        pos: { x: 0, y: 0 },
        size: { width: 48, height: 48 },
        style: {},
      },
      {
        id: 'child-2',
        type: 'port',
        label: 'Input',
        pos: { x: 60, y: 0 },
        size: { width: 24, height: 24 },
        style: {},
        bind: { target: '/param/freq' },
      },
    ],
    ...overrides,
  };
}

function createTree(): OmegaNode {
  return {
    id: 'root',
    kind: 'rack',
    role: 'structure',
    layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
    children: [
      {
        id: 'group-1',
        kind: 'container',
        role: 'composite',
        meta: { label: 'Test Group' },
        layout: { pos: { x: 10, y: 20 }, mode: 'absolute' },
        children: [
          {
            id: 'child-1',
            kind: 'cell',
            cellRef: 'knob',
            meta: { label: 'Freq' },
            layout: { pos: { x: 0, y: 0 }, size: { width: 48, height: 48 }, mode: 'absolute' },
            style: {},
          },
          {
            id: 'child-2',
            kind: 'cell',
            cellRef: 'port',
            meta: { label: 'Input' },
            layout: { pos: { x: 60, y: 0 }, size: { width: 24, height: 24 }, mode: 'absolute' },
            style: {},
            bind: '/param/freq',
          },
        ],
      } as unknown as OmegaNode,
    ],
  };
}

function createEditor(overrides?: Partial<GroupBlueprintEditor>): GroupBlueprintEditor {
  return {
    addLog: jest.fn() as unknown as GroupBlueprintEditor['addLog'],
    exportCellAsBlueprint: jest.fn() as unknown as GroupBlueprintEditor['exportCellAsBlueprint'],
    ...overrides,
  } as GroupBlueprintEditor;
}

// ── Initial state / return shape ───────────────────────────────────────

describe('useGroupBlueprint — return shape', () => {
  it('should return all expected members', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useGroupBlueprint(editor));
    expect(result.current).toHaveProperty('userBlueprints');
    expect(Array.isArray(result.current.userBlueprints)).toBe(true);
    expect(result.current.userBlueprints).toHaveLength(0);
    expect(typeof result.current.handleSaveGroupAsBlueprint).toBe('function');
    expect(typeof result.current.handleSaveGroupAsBlueprintFromNodeId).toBe('function');
    expect(typeof result.current.addUserBlueprintEntry).toBe('function');
    expect(typeof result.current.setUserBlueprints).toBe('function');
  });
});

// ── handleSaveGroupAsBlueprint ─────────────────────────────────────────

describe('useGroupBlueprint — handleSaveGroupAsBlueprint', () => {
  it('should add entry to userBlueprints', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useGroupBlueprint(editor));

    act(() => {
      result.current.handleSaveGroupAsBlueprint(createGroupNode());
    });

    expect(result.current.userBlueprints).toHaveLength(1);
    expect(result.current.userBlueprints[0].label).toBe('Test Group');
    expect(result.current.userBlueprints[0].blueprint?.name).toBe('Test Group');
  });

  it('should call exportCellAsBlueprint with the group node id', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useGroupBlueprint(editor));

    act(() => {
      result.current.handleSaveGroupAsBlueprint(createGroupNode());
    });

    expect(editor.exportCellAsBlueprint).toHaveBeenCalledWith('group-1');
  });

  it('should call addLog with success message', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useGroupBlueprint(editor));

    act(() => {
      result.current.handleSaveGroupAsBlueprint(createGroupNode());
    });

    expect(editor.addLog).toHaveBeenCalledWith(
      expect.stringContaining('Group'),
    );
    expect(editor.addLog).toHaveBeenCalledWith(
      expect.stringContaining('exported to library and disk.'),
    );
  });

  it('should generate thumbnail in blueprint metadata', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useGroupBlueprint(editor));

    act(() => {
      result.current.handleSaveGroupAsBlueprint(createGroupNode());
    });

    expect(result.current.userBlueprints[0].blueprint?.metadata).toBeDefined();
    expect(result.current.userBlueprints[0].blueprint?.metadata?.thumbnail).toEqual(
      expect.any(String),
    );
  });

  it('should use label from groupNode', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useGroupBlueprint(editor));

    act(() => {
      result.current.handleSaveGroupAsBlueprint(
        createGroupNode({ label: 'Custom Label' }),
      );
    });

    expect(result.current.userBlueprints[0].label).toBe('Custom Label');
    expect(result.current.userBlueprints[0].blueprint?.name).toBe('Custom Label');
  });
});

// ── handleSaveGroupAsBlueprintFromNodeId ───────────────────────────────

describe('useGroupBlueprint — handleSaveGroupAsBlueprintFromNodeId', () => {
  it('should find node in tree and add to userBlueprints', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useGroupBlueprint(editor));

    act(() => {
      result.current.handleSaveGroupAsBlueprintFromNodeId('group-1', createTree());
    });

    expect(result.current.userBlueprints).toHaveLength(1);
    expect(result.current.userBlueprints[0].label).toBe('Test Group');
  });

  it('should do nothing when tree is undefined', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useGroupBlueprint(editor));

    act(() => {
      result.current.handleSaveGroupAsBlueprintFromNodeId('group-1', undefined);
    });

    expect(result.current.userBlueprints).toHaveLength(0);
  });

  it('should log error when node is not found', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useGroupBlueprint(editor));

    act(() => {
      result.current.handleSaveGroupAsBlueprintFromNodeId('non-existent', createTree());
    });

    expect(editor.addLog).toHaveBeenCalledWith(
      '[ERROR] Cell non-existent not found in UCA tree.',
    );
    expect(result.current.userBlueprints).toHaveLength(0);
  });

  it('should call exportCellAsBlueprint with the found node id', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useGroupBlueprint(editor));

    act(() => {
      result.current.handleSaveGroupAsBlueprintFromNodeId('group-1', createTree());
    });

    expect(editor.exportCellAsBlueprint).toHaveBeenCalledWith('group-1');
  });
});

// ── addUserBlueprintEntry ──────────────────────────────────────────────

describe('useGroupBlueprint — addUserBlueprintEntry', () => {
  it('should append an entry to userBlueprints', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useGroupBlueprint(editor));
    const entry: UserBlueprintEntry = {
      label: 'Imported Blueprint',
      description: 'An imported blueprint',
      version: '1.0.0',
      blueprint: undefined,
    };

    act(() => {
      result.current.addUserBlueprintEntry(entry);
    });

    expect(result.current.userBlueprints).toHaveLength(1);
    expect(result.current.userBlueprints[0].label).toBe('Imported Blueprint');
  });

  it('should accumulate multiple entries', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useGroupBlueprint(editor));

    act(() => {
      result.current.addUserBlueprintEntry({
        label: 'BP1', description: '', version: '1', blueprint: undefined,
      });
      result.current.addUserBlueprintEntry({
        label: 'BP2', description: '', version: '2', blueprint: undefined,
      });
    });

    expect(result.current.userBlueprints).toHaveLength(2);
    expect(result.current.userBlueprints[0].label).toBe('BP1');
    expect(result.current.userBlueprints[1].label).toBe('BP2');
  });
});

// ── Multiple saves ─────────────────────────────────────────────────────

describe('useGroupBlueprint — multiple saves', () => {
  it('should accumulate multiple group saves', () => {
    const editor = createEditor();
    const { result } = renderHook(() => useGroupBlueprint(editor));

    act(() => {
      result.current.handleSaveGroupAsBlueprint(
        createGroupNode({ id: 'group-1', label: 'First Group' }),
      );
    });
    act(() => {
      result.current.handleSaveGroupAsBlueprint(
        createGroupNode({ id: 'group-2', label: 'Second Group' }),
      );
    });

    expect(result.current.userBlueprints).toHaveLength(2);
    expect(result.current.userBlueprints[0].label).toBe('First Group');
    expect(result.current.userBlueprints[1].label).toBe('Second Group');
  });

  it('should not call exportCellAsBlueprint when undefined (optional)', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = createEditor({ exportCellAsBlueprint: undefined as any });
    const { result } = renderHook(() => useGroupBlueprint(editor));

    act(() => {
      result.current.handleSaveGroupAsBlueprint(createGroupNode());
    });

    expect(result.current.userBlueprints).toHaveLength(1);
    // Should not throw
  });
});
