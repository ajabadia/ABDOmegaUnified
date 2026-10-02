/**
 * @jest-environment jsdom
 *
 * Tests for useHistoryActions — specifically the stored-patch diff path.
 *
 * The diff viewer renders `before` for remove/replace ops. Those values must
 * come from the patch's SOURCE document (the previous snapshot), not from the
 * history entry's own manifest, which is the patch TARGET: reading the target
 * returns the NEW value for `replace` and undefined for `remove` (the path is
 * already gone).
 *
 * These tests drive the real push path so the patch is produced by the hook
 * itself, rather than hand-written fixtures.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useHistoryActions } from '../useHistoryActions';
import type { OMEGA_Manifest, HistoryEntry } from '../../types/document';

type AnyDoc = Record<string, unknown>;
type PatchOp = { op: string; path: string; from?: unknown; value?: unknown };

const baseManifest = (): OMEGA_Manifest => ({
  id: 'mod',
  schemaVersion: '7.2.3',
  metadata: { name: 'M', version: '1.0.0' },
  nodes: [{ id: 'n1', label: 'A' }],
  resources: {},
  entities: [],
  ui: { palette: { primary: '#111111' } }
} as unknown as OMEGA_Manifest);

const makeWorkbenchState = () => ({
  selectedNodeId: null,
  multiSelectedNodeIds: [],
  pinnedNodeId: null,
  layout: { ratio: 0.5 },
  tabsById: { 'tab-canvas': { type: 'canvas' } },
  panesById: { primary: { activeTabId: 'tab-canvas' } }
});

function setup() {
  const doc: AnyDoc = {
    id: 'primary',
    manifest: baseManifest(),
    isDirty: false,
    lastStableHash: '',
    history: { past: [] as HistoryEntry[], future: [], lastSavedIndex: -1 },
    isInitializing: false,
    contract: null,
    wasmBuffer: null,
    extraResources: []
  };
  const orchestrator = {
    documentsById: { primary: doc },
    // The real reducer appends to the document's past stack; mirror that so
    // compareWithHistory can resolve the index under test.
    pushHistory: jest.fn((_id: string, entry: HistoryEntry) => {
      pastStack().push(entry);
    }),
    undo: jest.fn(),
    redo: jest.fn(),
    undoTo: jest.fn(),
    updateDocument: jest.fn()
  };
  const workbenchActions = {
    setSelectedNode: jest.fn(),
    setPinnedNode: jest.fn(),
    setLayoutRatio: jest.fn(),
    openTab: jest.fn(),
    setLayoutMode: jest.fn(),
    setMultiSelectedNodes: jest.fn()
  };

  const { result } = renderHook(() =>
    useHistoryActions({
      orchestrator: orchestrator as never,
      activeId: 'primary',
      manifest: baseManifest(),
      simulationBridge: { scheduleStructuralSync: jest.fn() },
      addLog: jest.fn(),
      workbenchState: makeWorkbenchState() as never,
      workbenchActions: workbenchActions as never
    })
  );

  const pastStack = () =>
    ((orchestrator.documentsById.primary as AnyDoc).history as { past: HistoryEntry[] }).past;

  /** Snapshots the current manifest, mutates it, then snapshots again. */
  const editAndPush = (mutate: (m: any) => void, label: string): HistoryEntry => {
    act(() => result.current.pushHistoryEntry(label, true));
    mutate((orchestrator.documentsById.primary as AnyDoc).manifest);
    act(() => result.current.pushHistoryEntry(label, true));
    const past = pastStack();
    return past[past.length - 1];
  };

  return { result, orchestrator, editAndPush, pastStack };
}

describe('useHistoryActions — compareWithHistory stored-patch path', () => {
  it('reports the pre-change value for a replace op', () => {
    const { result, editAndPush } = setup();
    const entry = editAndPush((m) => { m.ui.palette.primary = '#222222'; }, 'recolor');

    // push #0 is the baseline snapshot (no patch); push #1 carries the diff.
    expect((entry.metadata!.patch as PatchOp[])).toHaveLength(1);

    const diff = result.current.compareWithHistory(1)!;
    expect(diff.entries).toHaveLength(1);
    expect(diff.entries[0].changeType).toBe('modified');
    expect(diff.entries[0].before).toBe('#111111');
    expect(diff.entries[0].after).toBe('#222222');
    expect(diff.summary.modified).toBe(1);
  });

  it('reports the removed value for a remove op instead of undefined', () => {
    const { editAndPush } = setup();
    const entry = editAndPush((m) => { m.nodes = []; }, 'delete node');

    const patch = entry.metadata!.patch as PatchOp[];
    expect(patch).toHaveLength(1);
    expect(patch[0].op).toBe('remove');
    expect(patch[0].from).toEqual({ id: 'n1', label: 'A' });
  });

  it('records no pre-change value for an add op', () => {
    const { editAndPush } = setup();
    const entry = editAndPush(
      (m) => { m.nodes = [{ id: 'n1', label: 'A' }, { id: 'n2', label: 'B' }]; },
      'add node'
    );

    const patch = entry.metadata!.patch as PatchOp[];
    expect(patch[0].op).toBe('add');
    expect('from' in patch[0]).toBe(false);
  });

  it('captures the pre-change value from the previous snapshot, not the entry manifest', () => {
    const { editAndPush } = setup();
    const entry = editAndPush((m) => { m.ui.palette.primary = '#222222'; }, 'recolor');

    // entry.manifest is the patch TARGET and already holds the new value,
    // so reading the old value from it is impossible by construction.
    expect((entry.manifest as any).ui.palette.primary).toBe('#222222');
    const patch = entry.metadata!.patch as PatchOp[];
    expect(patch[0].from).toBe('#111111');
    expect(patch[0].value).toBe('#222222');
  });

  it('returns null for an out-of-range index', () => {
    const { result } = setup();
    expect(result.current.compareWithHistory(3)).toBeNull();
  });
});
