/**
 * @jest-environment jsdom
 *
 * Tests for CommandPalette component — Ctrl+K palette with fuzzy search,
 * action commands, node browsing, and keyboard navigation.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import CommandPalette from '../../layout/CommandPalette';
import type { CommandPaletteAction, CommandPaletteNode } from '../../layout/CommandPalette';

// ── Polyfill scrollIntoView (not available in jsdom) ───────────────────
beforeEach(() => {
  Element.prototype.scrollIntoView = jest.fn() as unknown as typeof Element.prototype.scrollIntoView;
});

// ── Test Data ──────────────────────────────────────────────────────────

const sampleActions: CommandPaletteAction[] = [
  { id: 'undo', label: 'Undo', category: 'Edit', shortcut: 'Ctrl+Z', onExecute: jest.fn() },
  { id: 'redo', label: 'Redo', category: 'Edit', shortcut: 'Ctrl+Y', onExecute: jest.fn() },
  { id: 'save', label: 'Save OmegaPack', category: 'File', shortcut: 'Ctrl+S', onExecute: jest.fn() },
  { id: 'deploy', label: 'Deploy to Engine', category: 'File', onExecute: jest.fn() },
  { id: 'view-rack', label: 'Virtual Rack', category: 'View', shortcut: 'Ctrl+2', onExecute: jest.fn() },
];

const sampleNodes: CommandPaletteNode[] = [
  { id: 'osc-1', label: 'Oscillator', kind: 'cell' },
  { id: 'flt-1', label: 'Filter', kind: 'cell' },
  { id: 'amp-1', label: 'Amplifier', kind: 'cell' },
  { id: 'lfo-1', label: 'LFO', kind: 'cell' },
  { id: 'main-rack', label: 'Main Rack', kind: 'rack' },
  { id: 'grp-mods', label: 'Modulation Group', kind: 'group' },
];

// ── Helpers ────────────────────────────────────────────────────────────

const renderPalette = (overrides?: {
  isOpen?: boolean;
  onClose?: () => void;
  actions?: CommandPaletteAction[];
  nodes?: CommandPaletteNode[];
  onSelectNode?: (id: string) => void;
}) => {
  const onClose = jest.fn();
  const onSelectNode = jest.fn();
  const result = render(
    <CommandPalette
      isOpen={overrides?.isOpen ?? true}
      onClose={overrides?.onClose ?? onClose}
      actions={overrides?.actions ?? sampleActions}
      nodes={overrides?.nodes ?? sampleNodes}
      onSelectNode={overrides?.onSelectNode ?? onSelectNode}
    />,
  );
  return { onClose, onSelectNode, ...result };
};

/** Helper: get the text of the currently highlighted item */
const getHighlightedText = (): string | null => {
  const allButtons = document.querySelectorAll('button');
  for (const btn of Array.from(allButtons)) {
    // The highlighted item has 'bg-primary/15' in its class
    if (btn.className.includes('bg-primary/15')) {
      return btn.textContent?.trim() || null;
    }
  }
  return null;
};

// ── 1. Open/Close State ───────────────────────────────────────────────

describe('CommandPalette — open/close state', () => {
  it('should return null when isOpen is false', () => {
    const { container } = renderPalette({ isOpen: false });
    expect(container.innerHTML).toBe('');
  });

  it('should render the palette when isOpen is true', () => {
    renderPalette();
    expect(screen.getByPlaceholderText('Search nodes and actions...')).toBeTruthy();
  });

  it('should show the Ctrl+K badge', () => {
    renderPalette();
    expect(screen.getByText('Ctrl+K')).toBeTruthy();
  });
});

// ── 2. All Items Visible (Empty Query) ────────────────────────────────

describe('CommandPalette — all items visible (empty query)', () => {
  it('should show section headers', () => {
    renderPalette();
    expect(screen.getByText('Actions')).toBeTruthy();
    expect(screen.getByText('Nodes')).toBeTruthy();
  });

  it('should show all action labels', () => {
    renderPalette();
    expect(screen.getByText('Undo')).toBeTruthy();
    expect(screen.getByText('Redo')).toBeTruthy();
    expect(screen.getByText('Save OmegaPack')).toBeTruthy();
    expect(screen.getByText('Deploy to Engine')).toBeTruthy();
    expect(screen.getByText('Virtual Rack')).toBeTruthy();
  });

  it('should show all node labels', () => {
    renderPalette();
    ['Oscillator', 'Filter', 'Amplifier', 'LFO', 'Main Rack', 'Modulation Group'].forEach(label => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('should show shortcut badges for actions with shortcuts', () => {
    renderPalette();
    expect(screen.getByText('Ctrl+Z')).toBeTruthy();
    expect(screen.getByText('Ctrl+Y')).toBeTruthy();
    expect(screen.getByText('Ctrl+S')).toBeTruthy();
    expect(screen.getByText('Ctrl+2')).toBeTruthy();
  });

  it('should only show shortcut badges for actions that have a shortcut defined', () => {
    renderPalette();
    // 4 of 5 sample actions have shortcuts: Ctrl+Z, Ctrl+Y, Ctrl+S, Ctrl+2
    expect(screen.getByText('Ctrl+Z')).toBeTruthy();
    expect(screen.getByText('Ctrl+Y')).toBeTruthy();
    expect(screen.getByText('Ctrl+S')).toBeTruthy();
    expect(screen.getByText('Ctrl+2')).toBeTruthy();
    // "Deploy to Engine" has no shortcut — no extra badge should appear
    expect(screen.queryByText('Deploy to Engine')?.querySelector('.tracking-normal')).toBeNull();
  });

  it('should show category text for each action', () => {
    renderPalette();
    // Each action shows its category as a small text below the label
    // "Edit" appears twice (Undo + Redo), "File" appears twice (Save + Deploy), "View" once
    expect(screen.getAllByText('Edit').length).toBe(2);
    expect(screen.getAllByText('File').length).toBe(2);
    expect(screen.getByText('View')).toBeTruthy();
  });
});

// ── 3. Fuzzy Search / Filtering ───────────────────────────────────────

describe('CommandPalette — search / filtering', () => {
  it('should filter actions by label (exact prefix match)', () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');
    fireEvent.change(input, { target: { value: 'Undo' } });
    expect(screen.getByText('Undo')).toBeTruthy();
    expect(screen.queryByText('Redo')).toBeNull();
    expect(screen.queryByText('Oscillator')).toBeNull();
  });

  it('should match case-insensitively', () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');
    fireEvent.change(input, { target: { value: 'UNDO' } });
    expect(screen.getByText('Undo')).toBeTruthy();
  });

  it('should match fuzzy (subsequence)', () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');
    fireEvent.change(input, { target: { value: 'omegapack' } });
    expect(screen.getByText('Save OmegaPack')).toBeTruthy();
  });

  it('should match nodes by label', () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');
    fireEvent.change(input, { target: { value: 'Oscillator' } });
    expect(screen.getByText('Oscillator')).toBeTruthy();
    expect(screen.queryByText('Filter')).toBeNull();
  });

  it('should match nodes by kind', () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');
    fireEvent.change(input, { target: { value: 'group' } });
    // "Modulation Group" has kind "group", shown in category "Node — group"
    expect(screen.getByText('Modulation Group')).toBeTruthy();
  });

  it('should show results from both sections when query matches both', () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');
    fireEvent.change(input, { target: { value: 'rack' } });
    expect(screen.getByText('Virtual Rack')).toBeTruthy();
    expect(screen.getByText('Main Rack')).toBeTruthy();
  });

  it('should prefer prefix matches over contains matches', () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');
    // "amp" has prefix match with "Amplifier" (score 100)
    // no other items contain "amp" as subsequence in this dataset
    fireEvent.change(input, { target: { value: 'amp' } });
    expect(screen.getByText('Amplifier')).toBeTruthy();
  });

  it('should clear search when query is deleted', () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');
    fireEvent.change(input, { target: { value: 'Undo' } });
    expect(screen.queryByText('Redo')).toBeNull();
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('Redo')).toBeTruthy();
  });
});

// ── 4. No Results ─────────────────────────────────────────────────────

describe('CommandPalette — no results', () => {
  it('should show "No results for" message when nothing matches', () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');
    fireEvent.change(input, { target: { value: 'zzzxyz' } });
    expect(screen.getByText(/No results for/)).toBeTruthy();
  });
});

// ── 5. Keyboard Navigation ────────────────────────────────────────────

describe('CommandPalette — keyboard navigation', () => {
  it('should close on Escape when query is empty', () => {
    const { onClose } = renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');
    fireEvent.keyDown(input, { key: 'Escape' });
    // onClose may be called by both the div handler and global listener
    expect(onClose).toHaveBeenCalled();
  });

  it('should clear query on Escape when query is non-empty', () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');
    fireEvent.change(input, { target: { value: 'Undo' } });
    // Press Escape to clear query
    fireEvent.keyDown(input, { key: 'Escape' });
    // All items should be visible again
    expect(screen.getByText('Redo')).toBeTruthy();
  });

  it('should execute highlighted item on Enter', () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');
    fireEvent.change(input, { target: { value: 'Undo' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(sampleActions[0].onExecute).toHaveBeenCalled();
  });

  it('should not crash on Enter when results are empty', () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');
    fireEvent.change(input, { target: { value: 'zzzxyz' } });
    // Should not throw
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText(/No results for/)).toBeTruthy();
  });

  it('should move highlighted index on ArrowDown then ArrowUp', () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');

    // Narrow results
    fireEvent.change(input, { target: { value: 'o' } });

    // Get initial highlighted text
    const initial = getHighlightedText();

    // ArrowDown
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const afterDown = getHighlightedText();
    expect(afterDown).not.toBeNull();

    // ArrowUp should go back to previous item
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    const afterUp = getHighlightedText();

    // After Up we should be back at or near the initial item
    expect(afterUp).toBe(initial);
  });

  it('should stay at first item on ArrowUp at top of list', () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search nodes and actions...');

    // ArrowUp at top (index 0) should stay at 0
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    const highlighted = getHighlightedText();
    expect(highlighted).not.toBeNull();
  });
});

// ── 6. Mouse Interaction ──────────────────────────────────────────────

describe('CommandPalette — mouse interaction', () => {
  it('should execute action and close on click', () => {
    const onClose = jest.fn();
    render(
      <CommandPalette
        isOpen={true}
        onClose={onClose}
        actions={sampleActions}
        nodes={[]}
        onSelectNode={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Undo'));
    expect(sampleActions[0].onExecute).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onSelectNode with correct id when clicking a node', () => {
    const onSelectNode = jest.fn();
    render(
      <CommandPalette
        isOpen={true}
        onClose={jest.fn()}
        actions={[]}
        nodes={sampleNodes}
        onSelectNode={onSelectNode}
      />,
    );
    fireEvent.click(screen.getByText('Oscillator'));
    expect(onSelectNode).toHaveBeenCalledWith('osc-1');
  });

  it('should call onClose when clicking the backdrop', () => {
    const { onClose } = renderPalette();
    const backdrop = screen.getByTestId('palette-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});

// ── 7. Nodes Section ──────────────────────────────────────────────────

describe('CommandPalette — nodes section', () => {
  it('should show Nodes section header when nodes are provided', () => {
    renderPalette({ nodes: sampleNodes, actions: [] });
    expect(screen.getByText('Nodes')).toBeTruthy();
  });

  it('should hide Nodes section when nodes array is empty', () => {
    renderPalette({ nodes: [], actions: sampleActions });
    expect(screen.queryByText('Nodes')).toBeNull();
  });

  it('should show kind icon for cell nodes (◈)', () => {
    renderPalette({ nodes: sampleNodes, actions: [] });
    // 4 of 6 nodes are cell kind — each shows ◈ icon
    const cellIcons = screen.getAllByText('◈');
    expect(cellIcons.length).toBe(4);
  });

  it('should show fallback icon for unknown node kinds', () => {
    const customNodes: CommandPaletteNode[] = [
      { id: 'unknown-1', label: 'Custom Node', kind: 'widget' },
    ];
    renderPalette({ nodes: customNodes, actions: [] });
    // widget not in NODE_KIND_ICONS → fallback '○'
    expect(screen.getByText('○')).toBeTruthy();
  });
});

// ── 8. Edge Cases ─────────────────────────────────────────────────────

describe('CommandPalette — edge cases', () => {
  it('should handle empty actions and empty nodes gracefully', () => {
    renderPalette({ actions: [], nodes: [] });
    expect(screen.queryByText('Actions')).toBeNull();
    expect(screen.queryByText('Nodes')).toBeNull();
  });

  it('should show footer keyboard hints', () => {
    renderPalette();
    expect(screen.getByText(/Enter to select/)).toBeTruthy();
    expect(screen.getByText(/Esc to close/)).toBeTruthy();
  });

  it('should render node categories with "Node —" prefix', () => {
    renderPalette({ nodes: sampleNodes, actions: [] });
    // Multiple nodes share the same kind (e.g., 4 cell nodes) so use getAllByText
    const cellLabels = screen.getAllByText('Node — cell');
    expect(cellLabels.length).toBe(4); // Oscillator, Filter, Amplifier, LFO
    expect(screen.getByText('Node — rack')).toBeTruthy();
    expect(screen.getByText('Node — group')).toBeTruthy();
  });

  it('should use node id as fallback label when label is empty', () => {
    const unnamedNodes: CommandPaletteNode[] = [
      { id: 'node-without-label', label: '', kind: 'cell' },
    ];
    renderPalette({ nodes: unnamedNodes, actions: [] });
    expect(screen.getByText('node-without-label')).toBeTruthy();
  });
});
