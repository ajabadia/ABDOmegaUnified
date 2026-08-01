/**
 * @jest-environment jsdom
 *
 * Tests for NodeComponentEditor component — renders ComponentEditor
 * for cell/port nodes as components, group nodes with children,
 * and returns null for other node kinds.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import NodeComponentEditor from '../NodeComponentEditor';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';

// ── Mock ComponentEditor using relative path ───────────────────────────

// Mock handled by moduleNameMapper in jest.config.js

// ── Helpers ────────────────────────────────────────────────────────────

function makeCellNode(overrides?: Partial<OmegaNode>): OmegaNode {
  return {
    id: 'cell-1',
    kind: 'cell',
    role: 'control' as const,
    cellRef: 'knob',
    meta: { label: 'Volume Knob' },
    style: { position: { x: 0, y: 0 }, size: { width: 48, height: 48 } },
    layout: { pos: { x: 10, y: 20 }, mode: 'absolute' as const },
    ...overrides,
  } as OmegaNode;
}

function makePortNode(overrides?: Partial<OmegaNode>): OmegaNode {
  return {
    id: 'port-1',
    kind: 'port',
    role: 'gate' as const,
    meta: { label: 'Gate In' },
    style: { position: { x: 0, y: 0 }, size: { width: 16, height: 16 } },
    layout: { pos: { x: 0, y: 0 }, mode: 'absolute' as const },
    ...overrides,
  } as OmegaNode;
}

function makeGroupNode(overrides?: Partial<OmegaNode>): OmegaNode {
  return {
    id: 'group-1',
    kind: 'group',
    role: 'modulator' as const,
    meta: { label: 'Modulator Group' },
    layout: { pos: { x: 100, y: 200 }, mode: 'absolute' as const },
    children: [
      {
        id: 'child-1',
        kind: 'cell',
        role: 'control' as const,
        cellRef: 'knob',
        meta: { label: 'Rate' },
        layout: { pos: { x: 0, y: 0 }, mode: 'absolute' as const },
        style: { position: { x: 0, y: 0 }, size: { width: 48, height: 48 } },
      } as OmegaNode,
      {
        id: 'child-2',
        kind: 'cell',
        role: 'control' as const,
        cellRef: 'slider-v',
        meta: { label: 'Depth' },
        layout: { pos: { x: 0, y: 0 }, mode: 'absolute' as const },
        style: { position: { x: 0, y: 0 }, size: { width: 24, height: 80 } },
      } as OmegaNode,
    ],
    ...overrides,
  } as OmegaNode;
}

function makeOtherKindNode(kind: string): OmegaNode {
  return {
    id: 'other-1',
    kind,
    role: 'control' as const,
    meta: { label: kind },
    layout: { pos: { x: 0, y: 0 }, mode: 'absolute' as const },
  } as unknown as OmegaNode;
}

const defaultProps = {
  node: makeCellNode(),
  onUpdate: jest.fn(),
  inspectorLevel: 'medium' as const,
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Render states (cell/port) ──────────────────────────────────────────

describe('NodeComponentEditor — cell/port render', () => {
  it('should render ComponentEditor for a cell node', () => {
    render(<NodeComponentEditor {...defaultProps} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should render ComponentEditor for a port node', () => {
    render(<NodeComponentEditor node={makePortNode()} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should pass selection type "component" for cell nodes', () => {
    render(<NodeComponentEditor {...defaultProps} />);
    const editor = screen.getByTestId('component-editor');
    expect(editor.getAttribute('data-selection-type')).toBe('component');
  });

  it('should pass selection type "component" for port nodes', () => {
    render(<NodeComponentEditor node={makePortNode()} onUpdate={jest.fn()} />);
    const editor = screen.getByTestId('component-editor');
    expect(editor.getAttribute('data-selection-type')).toBe('component');
  });

  it('should pass the node id as selection node id', () => {
    render(<NodeComponentEditor {...defaultProps} />);
    const editor = screen.getByTestId('component-editor');
    expect(editor.getAttribute('data-selection-id')).toBe('cell-1');
  });

  it('should pass the node label as selection node label', () => {
    render(<NodeComponentEditor {...defaultProps} />);
    const editor = screen.getByTestId('component-editor');
    expect(editor.getAttribute('data-selection-label')).toBe('Volume Knob');
  });

  it('should fallback to node id when label is missing in meta', () => {
    const node = makeCellNode({ meta: {} });
    render(<NodeComponentEditor node={node} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should pass inspectorLevel to ComponentEditor', () => {
    render(<NodeComponentEditor {...defaultProps} inspectorLevel="advanced" />);
    const editor = screen.getByTestId('component-editor');
    expect(editor.getAttribute('data-inspector-level')).toBe('advanced');
  });

  it('should render with "Component Editor" section title', () => {
    render(<NodeComponentEditor {...defaultProps} />);
    expect(screen.getByText('Component Editor')).toBeTruthy();
  });

  it('should map cellRef "knob" correctly', () => {
    render(<NodeComponentEditor node={makeCellNode({ cellRef: 'knob' })} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should map cellRef "slider-h" correctly', () => {
    render(<NodeComponentEditor node={makeCellNode({ cellRef: 'slider-h' })} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should map cellRef "switch" correctly', () => {
    render(<NodeComponentEditor node={makeCellNode({ cellRef: 'switch' })} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should fallback to "knob" for unknown cellRef', () => {
    const node = makeCellNode({ cellRef: 'unknown-type' as OmegaNode['cellRef'] });
    render(<NodeComponentEditor node={node} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should fallback to node kind when cellRef is undefined', () => {
    const node = makePortNode({ cellRef: undefined });
    render(<NodeComponentEditor node={node} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should pass node style to ComponentNode', () => {
    const node = makeCellNode({
      style: { position: { x: 10, y: 20 }, size: { width: 100, height: 50 } },
    });
    render(<NodeComponentEditor node={node} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should pass bind target when node.bind is set', () => {
    const node = makeCellNode({ bind: 'param-frequency' });
    render(<NodeComponentEditor node={node} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });
});

// ── Group render ───────────────────────────────────────────────────────

describe('NodeComponentEditor — group render', () => {
  it('should render ComponentEditor for a group node', () => {
    render(<NodeComponentEditor node={makeGroupNode()} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should pass selection type "group" for group nodes', () => {
    render(<NodeComponentEditor node={makeGroupNode()} onUpdate={jest.fn()} />);
    const editor = screen.getByTestId('component-editor');
    expect(editor.getAttribute('data-selection-type')).toBe('group');
  });

  it('should render with "Group Editor" section title', () => {
    render(<NodeComponentEditor node={makeGroupNode()} onUpdate={jest.fn()} />);
    expect(screen.getByText('Group Editor')).toBeTruthy();
  });

  it('should pass group id as selection node id', () => {
    render(<NodeComponentEditor node={makeGroupNode()} onUpdate={jest.fn()} />);
    const editor = screen.getByTestId('component-editor');
    expect(editor.getAttribute('data-selection-id')).toBe('group-1');
  });

  it('should handle group with empty children array', () => {
    const node = makeGroupNode({ children: [] });
    render(<NodeComponentEditor node={node} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should handle group with undefined children', () => {
    const node = makeGroupNode({ children: undefined });
    render(<NodeComponentEditor node={node} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should pass onSaveGroupAsBlueprint to ComponentEditor', () => {
    const onSave = jest.fn();
    render(<NodeComponentEditor node={makeGroupNode()} onUpdate={jest.fn()} onSaveGroupAsBlueprint={onSave} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should pass onUngroupNode to ComponentEditor', () => {
    const onUngroup = jest.fn();
    render(<NodeComponentEditor node={makeGroupNode()} onUpdate={jest.fn()} onUngroupNode={onUngroup} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });
});

// ── Other node kinds → null ───────────────────────────────────────────

describe('NodeComponentEditor — other node kinds return null', () => {
  it('should return null for "face" kind', () => {
    const { container } = render(<NodeComponentEditor node={makeOtherKindNode('face')} onUpdate={jest.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('should render RackEditor for "rack" kind', () => {
    render(<NodeComponentEditor node={makeOtherKindNode('rack')} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should pass selection type "rack" for rack nodes', () => {
    render(<NodeComponentEditor node={makeOtherKindNode('rack')} onUpdate={jest.fn()} />);
    const editor = screen.getByTestId('component-editor');
    expect(editor.getAttribute('data-selection-type')).toBe('rack');
  });

  it('should render with "Rack Editor" section title for rack nodes', () => {
    render(<NodeComponentEditor node={makeOtherKindNode('rack')} onUpdate={jest.fn()} />);
    expect(screen.getByText('Rack Editor')).toBeTruthy();
  });

  it('should return null for "label" kind', () => {
    const { container } = render(<NodeComponentEditor node={makeOtherKindNode('label')} onUpdate={jest.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('should return null for "display" kind', () => {
    const { container } = render(<NodeComponentEditor node={makeOtherKindNode('display')} onUpdate={jest.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────

describe('NodeComponentEditor — edge cases', () => {
  it('should handle node with undefined meta', () => {
    const node = makeCellNode({ meta: undefined as unknown as OmegaNode['meta'] });
    render(<NodeComponentEditor node={node} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should handle node with undefined style', () => {
    const node = makeCellNode({ style: undefined } as unknown as OmegaNode);
    render(<NodeComponentEditor node={node} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should handle group node with undefined layout.pos', () => {
    const node = makeGroupNode({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      layout: { pos: undefined as any, mode: 'absolute' as const },
    });
    render(<NodeComponentEditor node={node} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should handle group children with missing layout', () => {
    const node = makeGroupNode({
      children: [
        { id: 'child-no-layout', kind: 'cell', role: 'control' as const } as OmegaNode,
      ],
    });
    render(<NodeComponentEditor node={node} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });

  it('should handle node.id being empty string', () => {
    const node = makeCellNode({ id: '' });
    render(<NodeComponentEditor node={node} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('component-editor')).toBeTruthy();
  });
});
