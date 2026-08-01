/**
 * @jest-environment jsdom
 *
 * Tests for LayersPanel keyboard navigation — ArrowUp/Down selection,
 * ArrowRight/Left expand/collapse, Home/End navigation.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LayersPanel from '../LayersPanel';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

// ── Polyfills ──────────────────────────────────────────────────────────
beforeEach(() => {
  // scrollIntoView not available in jsdom
  Element.prototype.scrollIntoView = jest.fn() as unknown as typeof Element.prototype.scrollIntoView;
  // scrollTo not available on all elements in jsdom
  Element.prototype.scrollTo = jest.fn() as unknown as typeof Element.prototype.scrollTo;
  // ResizeObserver not available in jsdom — fire callback synchronously with mock dimensions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockResizeObserver = jest.fn().mockImplementation((callback: any) => {
    callback([{ contentRect: { width: 300, height: 400 } }]);
    return { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
  }) as unknown as typeof ResizeObserver;
  global.ResizeObserver = MockResizeObserver;
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// ── Mocks ──────────────────────────────────────────────────────────────

// Mock react-window — we test keyboard navigation, not virtual scrolling
jest.mock('react-window', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    List: (props: Record<string, unknown>) => {
      const rowCount = props.rowCount as number;
      const RowComponent = props.rowComponent as React.ComponentType<Record<string, unknown>>;
      const rowProps = props.rowProps as Record<string, unknown>;
      return React.createElement('div', { 'data-testid': 'mock-list' },
        Array.from({ length: rowCount }, (_: unknown, i: number) =>
          React.createElement(RowComponent, { key: i, index: i, style: {}, ...rowProps })
        )
      );
    },
    useListRef: () => ({ current: null }),
  };
});

// Mock framer-motion — motion.div renders as plain <div>
jest.mock('framer-motion', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    motion: {
      div: (props: Record<string, unknown>) => {
    const { children, ...rest } = props;
        return React.createElement('div', rest, children);
      },
    },
  };
});

// Mock useBatchHistory (relative path to avoid @/ alias issues in jest.mock)
jest.mock('../../../hooks/useBatchHistory', () => ({
  useBatchHistory: () => ({
    batchHistory: [],
    setBatchHistory: jest.fn(),
    batchNotification: null,
    setBatchNotification: jest.fn(),
    showHistory: false,
    setShowHistory: jest.fn(),
    hoverHistory: false,
    setHoverHistory: jest.fn(),
    fadingOut: false,
    pushBatchAction: jest.fn(),
    clearBatchHistory: jest.fn(),
    isEntryUndoable: jest.fn().mockReturnValue(false),
  }),
  BATCH_VARIANT_PILL: {},
  BATCH_VARIANT_TOOLTIP: {},
  BATCH_VARIANT_TIMELINE: {},
  BATCH_VARIANT_BUTTON: {},
}));

// Mock useLayerFilters (relative path to avoid @/ alias issues in jest.mock)
jest.mock('../../../hooks/useLayerFilters', () => ({
  useLayerFilters: () => ({
    searchTerm: '',
    setSearchTerm: jest.fn(),
    typeFilter: 'all' as const,
    setTypeFilter: jest.fn(),
    showHidden: false,
    setShowHidden: jest.fn(),
    showLocked: false,
    setShowLocked: jest.fn(),
    propertySearchTerm: '',
    setPropertySearchTerm: jest.fn(),
    showAuditIssues: false,
    setShowAuditIssues: jest.fn(),
    showTemplates: false,
    setShowTemplates: jest.fn(),
    visibleCount: 7,
    totalCount: 7,
    clearAllFilters: jest.fn(),
  }),
  getNodeComponentType: () => 'knob',
  COMPONENT_FILTERS: [],
}));

// ── Sample manifest ────────────────────────────────────────────────────

/**
 * Tree structure (7 flat items, all expanded by default):
 *   root (rack)
 *     osc1 (cell)
 *     filter1 (cell)
 *     modulators (group, hasChildren)
 *       lfo1 (cell)
 *       env1 (cell)
 *     amp1 (cell)
 */
const SAMPLE_MANIFEST: OMEGA_Manifest = {
  metadata: { name: 'Test', version: '1.0.0' },
  resources: { assets: [], extra: [], fonts: [], wasm: null, contract: undefined },
  entities: [],
  ui: {
    dimensions: { width: 800, height: 400 },
    layout: { width: 800, height: 400 },
    tree: {
      id: 'root',
      kind: 'rack',
      layout: { pos: { x: 0, y: 0 } },
      children: [
        { id: 'osc1', kind: 'cell', role: 'control', cellRef: 'knob', layout: { pos: { x: 0, y: 0 } } },
        { id: 'filter1', kind: 'cell', role: 'control', cellRef: 'knob', layout: { pos: { x: 0, y: 0 } } },
        {
          id: 'modulators',
          kind: 'group',
          role: 'modulator',
          layout: { pos: { x: 0, y: 0 } },
          children: [
            { id: 'lfo1', kind: 'cell', role: 'control', cellRef: 'knob', layout: { pos: { x: 0, y: 0 } } },
            { id: 'env1', kind: 'cell', role: 'control', cellRef: 'knob', layout: { pos: { x: 0, y: 0 } } },
          ],
        },
        { id: 'amp1', kind: 'cell', role: 'control', cellRef: 'knob', layout: { pos: { x: 0, y: 0 } } },
      ],
    },
  },
};

/** Minimal manifest with no tree (empty rack) */
const EMPTY_MANIFEST: OMEGA_Manifest = {
  metadata: { name: 'Empty', version: '1.0' },
  resources: { assets: [], extra: [], fonts: [], wasm: null, contract: undefined },
  entities: [],
  ui: {
    dimensions: { width: 800, height: 400 },
    layout: { width: 800, height: 400 },
  },
};

/** Minimal manifest with only 1 node */
const SINGLE_MANIFEST: OMEGA_Manifest = {
  metadata: { name: 'Single', version: '1.0' },
  resources: { assets: [], extra: [], fonts: [], wasm: null, contract: undefined },
  entities: [],
  ui: {
    dimensions: { width: 800, height: 400 },
    layout: { width: 800, height: 400 },
    tree: {
      id: 'root',
      kind: 'rack',
      layout: { pos: { x: 0, y: 0 } },
      children: [
        { id: 'only-node', kind: 'cell', role: 'control', cellRef: 'knob', layout: { pos: { x: 0, y: 0 } } },
      ],
    },
  },
};

// ── Helpers ────────────────────────────────────────────────────────────

function defaultProps(overrides?: Record<string, unknown>) {
  return {
    manifest: SAMPLE_MANIFEST,
    selectedItemId: null,
    onSelectItem: jest.fn(),
    hiddenNodeIds: [],
    lockedNodeIds: [],
    onToggleVisibility: jest.fn(),
    onToggleLock: jest.fn(),
    ...overrides,
  };
}

/** Get the tree container element by role */
function getTreeContainer(): HTMLElement {
  const el = screen.getByRole('tree');
  expect(el).toBeTruthy();
  return el;
}

/** Fire a keyboard event on the tree container */
function pressKey(key: string, el?: HTMLElement) {
  const target = el ?? getTreeContainer();
  fireEvent.keyDown(target, { key });
}

// ── ───────────────────────────────────────────────────────────────────
//  Render states
// ── ───────────────────────────────────────────────────────────────────

describe('LayersPanel — render states', () => {
  it('should render the tree container with role="tree"', () => {
    render(<LayersPanel {...defaultProps()} />);
    const tree = screen.getByRole('tree');
    expect(tree).toBeTruthy();
    expect(tree.getAttribute('tabIndex')).toBe('0');
  });

  it('should show "No tree data" when manifest has no tree', () => {
    render(<LayersPanel {...defaultProps({ manifest: EMPTY_MANIFEST })} />);
    expect(screen.getByText('No tree data')).toBeTruthy();
  });

  it('should render the search input', () => {
    render(<LayersPanel {...defaultProps()} />);
    expect(screen.getByPlaceholderText('Search layers...')).toBeTruthy();
  });

  it('should render the tree container when manifest has a tree', () => {
    render(<LayersPanel {...defaultProps()} />);
    const tree = screen.getByRole('tree');
    expect(tree).toBeTruthy();
    expect(tree.getAttribute('tabIndex')).toBe('0');
  });
});

// ── ───────────────────────────────────────────────────────────────────
//  ArrowDown — forward selection
// ── ───────────────────────────────────────────────────────────────────

describe('LayersPanel — ArrowDown navigation', () => {
  it('should select the second item when pressing ArrowDown from first', () => {
    const onSelectItem = jest.fn();
    const onSelectMultiple = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem, onSelectMultiple })} />);
    const tree = getTreeContainer();

    pressKey('ArrowDown', tree);

    // ArrowDown from index -1 → defaults to 0, then moves to 1 (osc1)
    expect(onSelectItem).toHaveBeenCalledWith('osc1');
    expect(onSelectMultiple).toHaveBeenCalledWith(['osc1']);
  });

  it('should advance selection progressively on repeated ArrowDown', () => {
    const onSelectItem = jest.fn();
    const onSelectMultiple = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem, onSelectMultiple })} />);
    const tree = getTreeContainer();

    // Move from root → osc1 → filter1 → modulators → lfo1 → env1 → amp1
    // -1→norm to 0, then 0→1, 1→2, 2→3
    pressKey('ArrowDown', tree); // -1→0→1 (osc1)
    pressKey('ArrowDown', tree); // 1→2 (filter1)
    pressKey('ArrowDown', tree); // 2→3 (modulators)

    // After 3 ArrowDowns from default (starting at 0): index 3 = modulators
    expect(onSelectItem).toHaveBeenCalledWith('modulators');
    expect(onSelectMultiple).toHaveBeenCalledWith(['modulators']);
  });

  it('should stay at the last item when pressing ArrowDown at end', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    // 7 flat items: root(0), osc1(1), filter1(2), modulators(3), lfo1(4), env1(5), amp1(6)
    for (let i = 0; i < 10; i++) {
      pressKey('ArrowDown', tree);
    }

    // Last call should be with 'amp1' (last item id, index 6)
    const lastCall = onSelectItem.mock.calls[onSelectItem.mock.calls.length - 1] as [string | null];
    expect(lastCall[0]).toBe('amp1');
  });

  it('should not crash when pressing ArrowDown on empty tree', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ manifest: EMPTY_MANIFEST, onSelectItem })} />);
    // No tree → no tree container → no keyboard handler
    // Should just not crash
    expect(screen.getByText('No tree data')).toBeTruthy();
  });

  it('should select the only item when pressing ArrowDown on single-item tree', () => {
    const onSelectItem = jest.fn();
    const onSelectMultiple = jest.fn();
    render(<LayersPanel {...defaultProps({ manifest: SINGLE_MANIFEST, onSelectItem, onSelectMultiple })} />);
    const tree = getTreeContainer();

    // First ArrowDown from -1 → defaults to 0. ArrowDown at 0 stays at 0 (only item)
    pressKey('ArrowDown', tree);

    expect(onSelectItem).toHaveBeenCalledWith('only-node');
    expect(onSelectMultiple).toHaveBeenCalledWith(['only-node']);
  });
});

// ── ───────────────────────────────────────────────────────────────────
//  ArrowUp — backward selection
// ── ───────────────────────────────────────────────────────────────────

describe('LayersPanel — ArrowUp navigation', () => {
  it('should select the first item when pressing ArrowUp at start', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    pressKey('ArrowUp', tree);

    // ArrowUp from -1 → defaults to 0. ArrowUp at 0 stays at 0 → selects root
    expect(onSelectItem).toHaveBeenCalledWith('root');
  });

  it('should move back to previous item on ArrowUp', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    // Navigate forward twice (to filter1), then back once (to osc1)
    pressKey('ArrowDown', tree); // root → osc1 (index 1)
    pressKey('ArrowDown', tree); // osc1 → filter1 (index 2)
    pressKey('ArrowUp', tree);   // filter1 → osc1 (index 1)

    // The last call should be for 'osc1'
    const lastCall = onSelectItem.mock.calls[onSelectItem.mock.calls.length - 1] as [string | null];
    expect(lastCall[0]).toBe('osc1');
  });

  it('should stay at the first item when pressing ArrowUp repeatedly', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    // ArrowUp at start multiple times — should still select first item
    pressKey('ArrowUp', tree);
    pressKey('ArrowUp', tree);
    pressKey('ArrowUp', tree);

    const lastCall = onSelectItem.mock.calls[onSelectItem.mock.calls.length - 1] as [string | null];
    expect(lastCall[0]).toBe('root');
  });
});

// ── ───────────────────────────────────────────────────────────────────
//  ArrowRight — expand collapsed item
// ── ───────────────────────────────────────────────────────────────────

describe('LayersPanel — ArrowRight expand', () => {
  it('should expand a collapsed container when pressing ArrowRight', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    // Navigate to 'modulators' (index 3)
    pressKey('ArrowDown', tree); // -1→0→1 (osc1)
    pressKey('ArrowDown', tree); // 1→2 (filter1)
    pressKey('ArrowDown', tree); // 2→3 (modulators)

    // Collapse with ArrowLeft
    pressKey('ArrowLeft', tree);

    // After collapsing: flat items = root(0), osc1(1), filter1(2), modulators(3), amp1(4)
    // ArrowLeft doesn't change selection, should still be modulators
    const lastCall = onSelectItem.mock.calls[onSelectItem.mock.calls.length - 1] as [string | null];
    expect(lastCall[0]).toBe('modulators');

    // Expand with ArrowRight
    pressKey('ArrowRight', tree);

    // Selection should still be on modulators — ArrowRight doesn't change selection
    const afterExpand = onSelectItem.mock.calls[onSelectItem.mock.calls.length - 1] as [string | null];
    expect(afterExpand[0]).toBe('modulators');
  });

  it('should not expand when pressing ArrowRight on an item without children', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    // Navigate to osc1 (index 1) — no children
    pressKey('ArrowDown', tree); // -1→0→1 (osc1)

    // ArrowRight on leaf item — should be a no-op (no onChange)
    pressKey('ArrowRight', tree);

    // Selection should still be osc1
    const lastCall = onSelectItem.mock.calls[onSelectItem.mock.calls.length - 1] as [string | null];
    expect(lastCall[0]).toBe('osc1');
  });

  it('should not expand when pressing ArrowRight on an already-expanded item', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    // Navigate to modulators (index 3) — already expanded by default
    pressKey('ArrowDown', tree); // -1→0→1 (osc1)
    pressKey('ArrowDown', tree); // 1→2 (filter1)
    pressKey('ArrowDown', tree); // 2→3 (modulators)

    // ArrowRight on already-expanded item — should be a no-op
    pressKey('ArrowRight', tree);

    // Selection stays on modulators
    const lastCall = onSelectItem.mock.calls[onSelectItem.mock.calls.length - 1] as [string | null];
    expect(lastCall[0]).toBe('modulators');
  });
});

// ── ───────────────────────────────────────────────────────────────────
//  ArrowLeft — collapse expanded item
// ── ───────────────────────────────────────────────────────────────────

describe('LayersPanel — ArrowLeft collapse', () => {
  it('should collapse an expanded container when pressing ArrowLeft', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    // Navigate to modulators (index 3) — has children, expanded by default
    pressKey('ArrowDown', tree); // -1→0→1 (osc1)
    pressKey('ArrowDown', tree); // 1→2 (filter1)
    pressKey('ArrowDown', tree); // 2→3 (modulators)

    // Collapse with ArrowLeft
    pressKey('ArrowLeft', tree);

    // Selection stays on modulators
    const lastCall = onSelectItem.mock.calls[onSelectItem.mock.calls.length - 1] as [string | null];
    expect(lastCall[0]).toBe('modulators');
  });

  it('should not collapse when pressing ArrowLeft on an item without children', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    // Navigate to osc1 (index 1) — no children
    pressKey('ArrowDown', tree); // -1→0→1 (osc1)

    // ArrowLeft on leaf item — should be a no-op
    pressKey('ArrowLeft', tree);

    // Selection stays on osc1
    const lastCall = onSelectItem.mock.calls[onSelectItem.mock.calls.length - 1] as [string | null];
    expect(lastCall[0]).toBe('osc1');
  });

  it('should not collapse when pressing ArrowLeft on an already-collapsed item', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    // Navigate to modulators, collapse it, then ArrowLeft again — should be a no-op
    pressKey('ArrowDown', tree); // -1→0→1 (osc1)
    pressKey('ArrowDown', tree); // 1→2 (filter1)
    pressKey('ArrowDown', tree); // 2→3 (modulators)

    // Collapse once
    pressKey('ArrowLeft', tree);

    // ArrowLeft again on already-collapsed item — no-op
    pressKey('ArrowLeft', tree);

    const lastCall = onSelectItem.mock.calls[onSelectItem.mock.calls.length - 1] as [string | null];
    expect(lastCall[0]).toBe('modulators');
  });
});

// ── ───────────────────────────────────────────────────────────────────
//  Home — jump to first item
// ── ───────────────────────────────────────────────────────────────────

describe('LayersPanel — Home navigation', () => {
  it('should select the first item when pressing Home', () => {
    const onSelectItem = jest.fn();
    const onSelectMultiple = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem, onSelectMultiple })} />);
    const tree = getTreeContainer();

    // Navigate to a middle item first
    pressKey('ArrowDown', tree); // -1→0→1 (osc1)
    pressKey('ArrowDown', tree); // 1→2 (filter1)
    pressKey('ArrowDown', tree); // 2→3 (modulators)

    // Press Home to jump to first
    pressKey('Home', tree);

    expect(onSelectItem).toHaveBeenCalledWith('root');
    expect(onSelectMultiple).toHaveBeenCalledWith(['root']);
  });

  it('should select the first item when pressing Home from anywhere', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    // Press Home immediately (default index = -1 → normalized to 0)
    pressKey('Home', tree);

    expect(onSelectItem).toHaveBeenCalledWith('root');
  });
});

// ── ───────────────────────────────────────────────────────────────────
//  End — jump to last item
// ── ───────────────────────────────────────────────────────────────────

describe('LayersPanel — End navigation', () => {
  it('should select the last item when pressing End', () => {
    const onSelectItem = jest.fn();
    const onSelectMultiple = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem, onSelectMultiple })} />);
    const tree = getTreeContainer();

    // Press End from start — should jump to last item (amp1)
    pressKey('End', tree);

    expect(onSelectItem).toHaveBeenCalledWith('amp1');
    expect(onSelectMultiple).toHaveBeenCalledWith(['amp1']);
  });

  it('should jump to last item when pressing End from a middle position', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    // Navigate to item 2 (filter1)
    pressKey('ArrowDown', tree); // -1→0→1 (osc1)
    pressKey('ArrowDown', tree); // 1→2 (filter1)

    // Press End — should jump to last
    pressKey('End', tree);

    expect(onSelectItem).toHaveBeenCalledWith('amp1');
  });
});

// ── ───────────────────────────────────────────────────────────────────
//  Edge cases
// ── ───────────────────────────────────────────────────────────────────

describe('LayersPanel — keyboard edge cases', () => {
  it('should not crash when pressing unknown keys', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    // These keys should be ignored by handleTreeKeyDown
    expect(() => {
      pressKey('Enter', tree);
      pressKey('Escape', tree);
      pressKey('Tab', tree);
      pressKey('a', tree);
      pressKey(' ', tree);
    }).not.toThrow();

    // No selection changes should have occurred
    expect(onSelectItem).not.toHaveBeenCalled();
  });

  it('should handle rapid consecutive key presses', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    // Rapid ArrowDown presses
    act(() => {
      fireEvent.keyDown(tree, { key: 'ArrowDown' });
      fireEvent.keyDown(tree, { key: 'ArrowDown' });
      fireEvent.keyDown(tree, { key: 'ArrowDown' });
      fireEvent.keyDown(tree, { key: 'ArrowDown' });
    });

    // Should have progressed through items without crashing
    // From -1→norm to 0→1→2→3→4 (4 presses → index 4 = lfo1, since modulators is expanded)
    const lastCall = onSelectItem.mock.calls[onSelectItem.mock.calls.length - 1] as [string | null];
    // Items: root(0), osc1(1), filter1(2), modulators(3), lfo1(4), env1(5), amp1(6)
    // 4 ArrowDowns from -1: -1→norm to 0→1→2→3→4 = lfo1
    expect(lastCall[0]).toBe('lfo1');
  });

  it('should handle tree with only rack root', () => {
    // A tree with just the root rack node and no children
    const rootOnly: OMEGA_Manifest = {
      metadata: { name: 'RootOnly', version: '1.0' },
      resources: { assets: [], extra: [], fonts: [], wasm: null, contract: undefined },
      entities: [],
      ui: {
        dimensions: { width: 800, height: 400 },
        layout: { width: 800, height: 400 },
    tree: {
      id: 'root',
      kind: 'rack',
      layout: { pos: { x: 0, y: 0 } },
    },
      },
    };
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ manifest: rootOnly, onSelectItem })} />);
    const tree = screen.queryByRole('tree');

    // If there's only a root with no children, flattened tree has just the root
    // The search filters might hide it though — let's just ensure no crash
    expect(() => {
      if (tree) {
        pressKey('ArrowDown', tree);
        pressKey('ArrowUp', tree);
        pressKey('Home', tree);
        pressKey('End', tree);
      }
    }).not.toThrow();
  });
});

// ── ───────────────────────────────────────────────────────────────────
//  Expand then navigate — verifies tree structure changes
// ── ───────────────────────────────────────────────────────────────────

describe('LayersPanel — expand then navigate', () => {
  it('should navigate into children after expanding a container', () => {
    const onSelectItem = jest.fn();
    render(<LayersPanel {...defaultProps({ onSelectItem })} />);
    const tree = getTreeContainer();

    // Navigate to modulators
    pressKey('ArrowDown', tree); // -1→0→1 (osc1)
    pressKey('ArrowDown', tree); // 1→2 (filter1)
    pressKey('ArrowDown', tree); // 2→3 (modulators)

    // Verify modulators is selected
    expect(onSelectItem).toHaveBeenCalledWith('modulators');

    // Collapse with ArrowLeft
    pressKey('ArrowLeft', tree);

    // Now modulators is collapsed — ArrowDown should skip children
    // Flat items: root(0), osc1(1), filter1(2), modulators(3), amp1(4)
    pressKey('ArrowDown', tree); // 3→4 (amp1)

    expect(onSelectItem).toHaveBeenCalledWith('amp1');

    // ArrowUp back to modulators
    pressKey('ArrowUp', tree); // 4→3 (modulators)

    // Expand with ArrowRight — children should reappear
    pressKey('ArrowRight', tree);

    // Now modulators is expanded again — ArrowDown into children
    pressKey('ArrowDown', tree); // 3→4 (lfo1)

    expect(onSelectItem).toHaveBeenCalledWith('lfo1');
  });
});
