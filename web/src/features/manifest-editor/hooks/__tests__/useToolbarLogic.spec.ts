/**
 * @jest-environment jsdom
 *
 * Tests for useToolbarLogic hook — toolbar state, handlers, and layout computation.
 *
 * Mock strategy:
 * - useToolbarCustomization: controlled via localStorage (real hook reads from it)
 * - findParentInTree / findNodeInTree: mocked for tree lookups
 * - window.innerHeight: controlled via Object.defineProperty for layout tests
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useToolbarLogic, type UseToolbarLogicParams } from '../layout/useToolbarLogic';
import type { OMEGA_Manifest } from '../../../../omega-ui-core/types/manifest';
import { STORAGE_KEY, DEFAULT_CONFIG } from '../../constants/toolbarDefinitions';

// ── Default button order (matches DEFAULT_CONFIG from toolbarDefinitions) ──


// ── Helpers ─────────────────────────────────────────────────────────────

function setLocalConfig(order: string[], hidden: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, hidden }));
}

// ── Default params ─────────────────────────────────────────────────────

const mockManifest = {
  ui: {
    tree: { id: 'root', kind: 'rack', layout: { pos: { x: 0, y: 0 } }, children: [] },
  },
} as unknown as OMEGA_Manifest;

function defaultParams(overrides?: Partial<UseToolbarLogicParams>): UseToolbarLogicParams {
  return {
    setActiveTool: jest.fn(),
    selectedNodeId: null,
    multiSelectedIds: [],
    onOpenCellStudio: jest.fn(),
    findItem: undefined,
    manifest: undefined,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  // Reset window height to a known default
  Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true });
});

afterEach(() => {
  jest.useRealTimers();
});

// ── handleSelectTool ───────────────────────────────────────────────────

describe('useToolbarLogic — handleSelectTool', () => {
  it('should call setActiveTool with the selected tool', () => {
    const setActiveTool = jest.fn();
    const { result } = renderHook(() => useToolbarLogic(defaultParams({ setActiveTool })));

    act(() => {
      result.current.handleSelectTool('marquee');
    });

    expect(setActiveTool).toHaveBeenCalledWith('marquee');
  });

  it('should toggle showAddMenu when tool is "add"', () => {
    const { result } = renderHook(() => useToolbarLogic(defaultParams()));

    expect(result.current.showAddMenu).toBe(false);

    act(() => {
      result.current.handleSelectTool('add');
    });

    expect(result.current.showAddMenu).toBe(true);

    act(() => {
      result.current.handleSelectTool('add');
    });

    expect(result.current.showAddMenu).toBe(false);
  });

  it('should close showAddMenu when selecting a non-add tool', () => {
    const { result } = renderHook(() => useToolbarLogic(defaultParams()));

    // Open add menu first
    act(() => {
      result.current.handleSelectTool('add');
    });
    expect(result.current.showAddMenu).toBe(true);

    // Select a different tool
    act(() => {
      result.current.handleSelectTool('select');
    });

    expect(result.current.showAddMenu).toBe(false);
  });

  it('should call onOpenCellStudio when tool is "studio"', () => {
    const onOpenCellStudio = jest.fn();
    const setActiveTool = jest.fn();
    const { result } = renderHook(() =>
      useToolbarLogic(defaultParams({ onOpenCellStudio, setActiveTool })),
    );

    act(() => {
      result.current.handleSelectTool('studio');
    });

    expect(onOpenCellStudio).toHaveBeenCalledTimes(1);
    expect(setActiveTool).toHaveBeenCalledWith('studio');
  });

  it('should auto-revert to select after studio launch', () => {
    jest.useFakeTimers();
    const setActiveTool = jest.fn();
    const { result } = renderHook(() =>
      useToolbarLogic(defaultParams({ setActiveTool })),
    );

    act(() => {
      result.current.handleSelectTool('studio');
    });

    expect(setActiveTool).toHaveBeenCalledWith('studio');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(setActiveTool).toHaveBeenCalledWith('select');
  });
});

// ── Group / Ungroup enablement ─────────────────────────────────────────

describe('useToolbarLogic — group/ungroup enablement', () => {
  it('should disable group when fewer than 2 items selected', () => {
    const { result } = renderHook(() =>
      useToolbarLogic(defaultParams({ multiSelectedIds: ['a'] })),
    );
    expect(result.current.isGroupEnabled).toBe(false);
  });

  it('should enable group when 2 or more items selected', () => {
    const { result } = renderHook(() =>
      useToolbarLogic(defaultParams({ multiSelectedIds: ['a', 'b'] })),
    );
    expect(result.current.isGroupEnabled).toBe(true);
  });

  it('should enable group with 3+ items', () => {
    const { result } = renderHook(() =>
      useToolbarLogic(defaultParams({ multiSelectedIds: ['a', 'b', 'c'] })),
    );
    expect(result.current.isGroupEnabled).toBe(true);
  });

  it('should disable ungroup when no target group found', () => {
    const { result } = renderHook(() =>
      useToolbarLogic(defaultParams({ multiSelectedIds: [] })),
    );
    expect(result.current.isUngroupEnabled).toBe(false);
  });

  it('should enable ungroup when single selected node is a group', () => {
    const findItem = jest.fn().mockReturnValue({ kind: 'group' });
    const { result } = renderHook(() =>
      useToolbarLogic(defaultParams({ multiSelectedIds: ['g1'], findItem, manifest: mockManifest })),
    );
    expect(result.current.isUngroupEnabled).toBe(true);
    expect(result.current.targetGroupId).toBe('g1');
  });

  it('should enable ungroup when single selected node is a container', () => {
    const findItem = jest.fn().mockReturnValue({ kind: 'container' });
    const { result } = renderHook(() =>
      useToolbarLogic(defaultParams({ multiSelectedIds: ['c1'], findItem, manifest: mockManifest })),
    );
    expect(result.current.isUngroupEnabled).toBe(true);
    expect(result.current.targetGroupId).toBe('c1');
  });
});

// ── renderedButtons visibility filtering ───────────────────────────────

describe('useToolbarLogic — renderedButtons visibility', () => {
  it('should include all default buttons when nothing is selected', () => {
    const { result } = renderHook(() => useToolbarLogic(defaultParams()));
    const ids = result.current.renderedButtons.map((b) => b.id);
    // studio, numeric-resize, numeric-rotate are hidden (no selection)
    // group is hidden (< 2 selected)
    // ungroup is hidden (no target group)
    expect(ids).toContain('select');
    expect(ids).toContain('marquee');
    expect(ids).toContain('transform');
    expect(ids).toContain('add');
    expect(ids).toContain('blueprints');
    expect(ids).not.toContain('studio');
    expect(ids).not.toContain('group');
    expect(ids).not.toContain('ungroup');
  });

  it('should show studio when a node is selected', () => {
    const { result } = renderHook(() =>
      useToolbarLogic(defaultParams({ selectedNodeId: 'n1' })),
    );
    const ids = result.current.renderedButtons.map((b) => b.id);
    expect(ids).toContain('studio');
    // numeric-resize / numeric-rotate only appear if the user has added them to config.order
  });

  it('should show group when 2+ nodes are multi-selected', () => {
    const { result } = renderHook(() =>
      useToolbarLogic(defaultParams({ multiSelectedIds: ['a', 'b'] })),
    );
    const ids = result.current.renderedButtons.map((b) => b.id);
    expect(ids).toContain('group');
  });

  it('should show ungroup when a target group is identified', () => {
    const findItem = jest.fn().mockReturnValue({ kind: 'group' });
    const { result } = renderHook(() =>
      useToolbarLogic(defaultParams({ multiSelectedIds: ['g1'], findItem, manifest: mockManifest })),
    );
    const ids = result.current.renderedButtons.map((b) => b.id);
    expect(ids).toContain('ungroup');
  });

  it('should hide buttons that are in the hidden list', async () => {
    setLocalConfig(DEFAULT_CONFIG.order, ['blueprints', 'config']);

    const { result } = renderHook(() => useToolbarLogic(defaultParams()));
    await waitFor(() => {
      const ids = result.current.renderedButtons.map((b) => b.id);
      expect(ids).not.toContain('blueprints');
      expect(ids).not.toContain('config');
    });
  });

  it('should respect custom button order', async () => {
    setLocalConfig(['config', 'select', 'marquee'], []);

    const { result } = renderHook(() => useToolbarLogic(defaultParams()));
    await waitFor(() => {
      const ids = result.current.renderedButtons.map((b) => b.id);
      expect(ids[0]).toBe('config');
      expect(ids[1]).toBe('select');
      expect(ids[2]).toBe('marquee');
    });
  });
});

// ── Layout cols calculation ────────────────────────────────────────────

describe('useToolbarLogic — layout cols calculation', () => {
  it('should calculate cols based on window height and button count', () => {
    // window.innerHeight = 800 (default from beforeEach)
    // maxHeight = max(200, 800 - 140) = 660
    // maxRows = max(1, floor((660 - 36) / 34)) = max(1, floor(624/34)) = max(1, 18) = 18
    // B = number of visible buttons (9 by default: select, marquee, transform, add, blueprints, config, live, zen = 8... let's count)
    const { result } = renderHook(() => useToolbarLogic(defaultParams()));
    // Default visible: select, marquee, transform, add, blueprints, config, live, zen = 8
    // cols = ceil(8 / 18) = 1
    expect(result.current.cols).toBe(1);
    expect(result.current.maxRows).toBe(18);
  });

  it('should produce more cols with a shorter window', () => {
    Object.defineProperty(window, 'innerHeight', { value: 400, writable: true, configurable: true });
    // maxHeight = max(200, 400 - 140) = 260
    // maxRows = max(1, floor((260 - 36) / 34)) = max(1, floor(224/34)) = max(1, 6) = 6
    // B = 8, cols = ceil(8 / 6) = 2
    const { result } = renderHook(() => useToolbarLogic(defaultParams()));
    expect(result.current.maxRows).toBe(6);
    expect(result.current.cols).toBe(2);
  });

  it('should have at least 1 col and 1 row', () => {
    Object.defineProperty(window, 'innerHeight', { value: 200, writable: true, configurable: true });
    // maxHeight = max(200, 200 - 140) = 200
    // maxRows = max(1, floor((200 - 36) / 34)) = max(1, floor(164/34)) = max(1, 4) = 4
    const { result } = renderHook(() => useToolbarLogic(defaultParams()));
    expect(result.current.maxRows).toBeGreaterThanOrEqual(1);
    expect(result.current.cols).toBeGreaterThanOrEqual(1);
  });

  it('should update cols when window resizes', () => {
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true, configurable: true });
    const { result, rerender } = renderHook(() => useToolbarLogic(defaultParams()));
    const initialCols = result.current.cols;

    Object.defineProperty(window, 'innerHeight', { value: 350, writable: true, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    rerender();

    // At 350: maxHeight = max(200, 210) = 210, maxRows = max(1, floor(174/34)) = 5, cols = ceil(8/5) = 2
    expect(result.current.cols).toBe(2);
    expect(result.current.cols).not.toBe(initialCols);
  });
});

// ── Items with dividers ────────────────────────────────────────────────

describe('useToolbarLogic — items with dividers', () => {
  it('should insert dividers between different button groups', () => {
    // Default order: select(tools), marquee(tools), transform(tools), add(tools),
    //   blueprints(views), config(views), live(system), zen(system)
    const { result } = renderHook(() => useToolbarLogic(defaultParams()));
    const items = result.current.items;

    // Should have dividers between tools→views and views→system
    const dividers = items.filter((i) => i.type === 'divider');
    expect(dividers.length).toBeGreaterThanOrEqual(2);
  });

  it('should not insert divider between buttons in the same group', () => {
    const { result } = renderHook(() => useToolbarLogic(defaultParams()));
    const items = result.current.items;

    // First 4 items are select, marquee, transform, add — all 'tools' group
    // No divider should appear among them
    const firstFour = items.slice(0, 4);
    const dividersInFirstFour = firstFour.filter((i) => i.type === 'divider');
    expect(dividersInFirstFour).toHaveLength(0);
  });

  it('should preserve button IDs in order', () => {
    const { result } = renderHook(() => useToolbarLogic(defaultParams()));
    const buttons = result.current.items.filter((i) => i.type === 'button') as { type: 'button'; id: string }[];
    const ids = buttons.map((b) => b.id);

    expect(ids).toContain('select');
    expect(ids).toContain('marquee');
    expect(ids).toContain('transform');
    expect(ids).toContain('add');
    expect(ids).toContain('blueprints');
    expect(ids).toContain('config');
    expect(ids).toContain('live');
    expect(ids).toContain('zen');
  });

  it('should not include hidden buttons in items', async () => {
    setLocalConfig(DEFAULT_CONFIG.order, ['live', 'zen']);

    const { result } = renderHook(() => useToolbarLogic(defaultParams()));
    await waitFor(() => {
      const buttons = result.current.items.filter((i) => i.type === 'button') as { type: 'button'; id: string }[];
      const ids = buttons.map((b) => b.id);

      expect(ids).not.toContain('live');
      expect(ids).not.toContain('zen');
    });
  });

  it('should not include conditionally hidden buttons in items', () => {
    // studio is hidden when no node is selected
    const { result } = renderHook(() => useToolbarLogic(defaultParams()));
    const buttons = result.current.items.filter((i) => i.type === 'button') as { type: 'button'; id: string }[];
    const ids = buttons.map((b) => b.id);

    expect(ids).not.toContain('studio');
    expect(ids).not.toContain('group');
    expect(ids).not.toContain('ungroup');
  });
});
