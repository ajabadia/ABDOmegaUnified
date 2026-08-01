/**
 * @jest-environment jsdom
 *
 * Tests for useCellBlueprint hook — save selected cell as blueprint.
 *
 * Mock strategy: Dependency injection via the hook's `editor` parameter.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useCellBlueprint, type CellBlueprintEditor } from '../useCellBlueprint';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';

// ── Helpers ────────────────────────────────────────────────────────────

function createNode(overrides?: Partial<OmegaNode>): OmegaNode {
  return {
    id: 'test-cell-1',
    kind: 'cell',
    role: 'structure',
    layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
    ...overrides,
  } as OmegaNode;
}

function createTree(rootOverrides?: Partial<OmegaNode>): OmegaNode {
  return {
    id: 'root',
    kind: 'rack',
    role: 'structure',
    layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
    children: [
      createNode(rootOverrides),
    ],
  };
}

function createEditor(overrides?: Partial<CellBlueprintEditor>): CellBlueprintEditor {
  return {
    addLog: jest.fn() as unknown as CellBlueprintEditor['addLog'],
    registerTemplate: jest.fn() as unknown as CellBlueprintEditor['registerTemplate'],
    ...overrides,
  } as CellBlueprintEditor;
}

const MINIMAL_MANIFEST = {
  id: 'test-module',
  metadata: { name: 'Test Module', version: '1.0.0', author: 'tester' },
  ui: {
    layout: { width: 800, height: 600 },
    tree: createTree(),
  },
  resources: { assets: [] },
  entities: [],
};

// ── Initial state / return shape ───────────────────────────────────────

describe('useCellBlueprint — return shape', () => {
  it('should return handleSaveCellAsBlueprint function', () => {
    const editor = createEditor();
    const { result } = renderHook(() =>
      useCellBlueprint(MINIMAL_MANIFEST as OMEGA_Manifest, 'test-cell-1', editor),
    );
    expect(result.current).toHaveProperty('handleSaveCellAsBlueprint');
    expect(typeof result.current.handleSaveCellAsBlueprint).toBe('function');
  });
});

// ── Error cases ────────────────────────────────────────────────────────

describe('useCellBlueprint — error cases', () => {
  it('should log error when selectedNodeId is null', () => {
    const editor = createEditor();
    const { result } = renderHook(() =>
      useCellBlueprint(MINIMAL_MANIFEST as unknown as OMEGA_Manifest, null, editor),
    );
    act(() => { result.current.handleSaveCellAsBlueprint(); });
    expect(editor.addLog).toHaveBeenCalledWith(
      '[ERROR] No cell selected to save as blueprint.',
    );
    expect(editor.registerTemplate).not.toHaveBeenCalled();
  });

  it('should log error when selectedNodeId is undefined-like (empty string)', () => {
    const editor = createEditor();
    const { result } = renderHook(() =>
      useCellBlueprint(MINIMAL_MANIFEST as unknown as OMEGA_Manifest, '', editor),
    );
    act(() => { result.current.handleSaveCellAsBlueprint(); });
    expect(editor.addLog).toHaveBeenCalledWith(
      '[ERROR] No cell selected to save as blueprint.',
    );
  });

  it('should log error when manifest has no UCA tree', () => {
    const manifestNoTree = {
      ...MINIMAL_MANIFEST,
      ui: {
        layout: { width: 800, height: 600 },
        tree: undefined,
      },
    };
    const editor = createEditor();
    const { result } = renderHook(() =>
      useCellBlueprint(manifestNoTree as OMEGA_Manifest, 'test-cell-1', editor),
    );
    act(() => { result.current.handleSaveCellAsBlueprint(); });
    expect(editor.addLog).toHaveBeenCalledWith(
      '[ERROR] No UCA tree found in manifest. Cannot save blueprint.',
    );
    expect(editor.registerTemplate).not.toHaveBeenCalled();
  });

  it('should log error when node is not found in tree', () => {
    const editor = createEditor();
    const { result } = renderHook(() =>
      useCellBlueprint(MINIMAL_MANIFEST as unknown as OMEGA_Manifest, 'non-existent-id', editor),
    );
    act(() => { result.current.handleSaveCellAsBlueprint(); });
    expect(editor.addLog).toHaveBeenCalledWith(
      '[ERROR] Cell non-existent-id not found in UCA tree.',
    );
    expect(editor.registerTemplate).not.toHaveBeenCalled();
  });
});

// ── Success path ───────────────────────────────────────────────────────

describe('useCellBlueprint — success', () => {
  it('should call registerTemplate with a valid ModuleTemplate', () => {
    const editor = createEditor();
    const { result } = renderHook(() =>
      useCellBlueprint(MINIMAL_MANIFEST as unknown as OMEGA_Manifest, 'test-cell-1', editor),
    );
    act(() => { result.current.handleSaveCellAsBlueprint(); });
    expect(editor.registerTemplate).toHaveBeenCalledTimes(1);
    const template = (editor.registerTemplate as jest.Mock).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(template.id).toBe('test-cell-1');
    expect(template.version).toBe('1.0.0');
    expect(template.family).toBe('user-saved');
  });

  it('should call exportCellAsBlueprint when defined', () => {
    const editor = createEditor({ exportCellAsBlueprint: jest.fn() as unknown as (nodeId: string) => void });
    const { result } = renderHook(() =>
      useCellBlueprint(MINIMAL_MANIFEST as unknown as OMEGA_Manifest, 'test-cell-1', editor),
    );
    act(() => { result.current.handleSaveCellAsBlueprint(); });
    expect(editor.exportCellAsBlueprint).toHaveBeenCalledWith('test-cell-1');
  });

  it('should NOT call exportCellAsBlueprint when undefined (optional method)', () => {
    const editor = createEditor();
    const { result } = renderHook(() =>
      useCellBlueprint(MINIMAL_MANIFEST as unknown as OMEGA_Manifest, 'test-cell-1', editor),
    );
    act(() => { result.current.handleSaveCellAsBlueprint(); });
    // Should not throw and registerTemplate should still work
    expect(editor.registerTemplate).toHaveBeenCalledTimes(1);
  });

  it('should set template label from meta.label when available', () => {
    const manifestWithLabel = {
      ...MINIMAL_MANIFEST,
      ui: {
        ...MINIMAL_MANIFEST.ui,
        tree: createTree({
          meta: { label: 'My Knob' },
        }),
      },
    };
    const editor = createEditor();
    const { result } = renderHook(() =>
      useCellBlueprint(manifestWithLabel as unknown as OMEGA_Manifest, 'test-cell-1', editor),
    );
    act(() => { result.current.handleSaveCellAsBlueprint(); });
    const template = (editor.registerTemplate as jest.Mock).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(template.label).toBe('My Knob');
  });

  it('should fallback to node.id when meta.label is missing', () => {
    const editor = createEditor();
    const { result } = renderHook(() =>
      useCellBlueprint(MINIMAL_MANIFEST as unknown as OMEGA_Manifest, 'test-cell-1', editor),
    );
    act(() => { result.current.handleSaveCellAsBlueprint(); });
    const template = (editor.registerTemplate as jest.Mock).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(template.label).toBe('test-cell-1');
  });
});

// ── Category mapping ───────────────────────────────────────────────────

describe('useCellBlueprint — category mapping', () => {
  const cases: Array<{ kind: string; expected: string }> = [
    { kind: 'face', expected: 'structure' },
    { kind: 'container', expected: 'composite' },
    { kind: 'group', expected: 'composite' },
    { kind: 'cell', expected: 'control' },
    { kind: 'port', expected: 'control' },
    { kind: 'knob', expected: 'control' },
  ];

  cases.forEach(({ kind, expected }) => {
    it(`should map kind '${kind}' to category '${expected}'`, () => {
      const manifestWithKind = {
        ...MINIMAL_MANIFEST,
        ui: {
          ...MINIMAL_MANIFEST.ui,
          tree: createTree({ kind: kind as OmegaNode['kind'] }),
        },
      };
      const editor = createEditor();
      const { result } = renderHook(() =>
        useCellBlueprint(manifestWithKind as unknown as OMEGA_Manifest, 'test-cell-1', editor),
      );
      act(() => { result.current.handleSaveCellAsBlueprint(); });
      const template = (editor.registerTemplate as jest.Mock).mock.calls[0]?.[0] as Record<string, unknown>;
      expect(template.category).toBe(expected);
    });
  });
});
