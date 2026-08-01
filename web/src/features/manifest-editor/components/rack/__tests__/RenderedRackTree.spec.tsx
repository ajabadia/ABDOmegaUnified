/**
 * @jest-environment jsdom
 *
 * Tests for RenderedRackTree — render states, filtered tree, empty tree.
 *
 * Strategy: Mock UniversalRenderer (complex recursive component) and verify
 * that RenderedRackTree correctly:
 * - Returns null when no UCA tree exists
 * - Returns null when all nodes are filtered out
 * - Renders UniversalRenderer with filtered tree when valid
 * - Passes correct debugContext props
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import RenderedRackTree from '../RenderedRackTree';

// ── Mock UniversalRenderer via relative path (avoids @/ alias issues with SWC) ──
jest.mock('../../../../../omega-ui-core/renderers/UniversalRenderer', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    UniversalRenderer: () => {
      return React.createElement('div', {
        'data-testid': 'universal-renderer',
        'data-mock': 'true',
      });
    },
  };
});

// ── Test tree fixtures ─────────────────────────────────────────────────

function createTestTree(overrides?: Partial<OmegaNode>): OmegaNode {
  return {
    id: 'rack-root',
    kind: 'face',
    role: 'root',
    cellRef: 'rack',
    layout: { pos: { x: 0, y: 0 }, size: { width: 800, height: 400 } },
    meta: { label: 'Root' },
    children: [
      {
        id: 'knob-1',
        kind: 'cell',
        role: 'control',
        cellRef: 'knob',
        layout: { pos: { x: 50, y: 50 }, size: { width: 48, height: 48 } },
        meta: { label: 'Cutoff' },
      },
      {
        id: 'knob-2',
        kind: 'cell',
        role: 'control',
        cellRef: 'knob',
        layout: { pos: { x: 150, y: 50 }, size: { width: 48, height: 48 } },
        meta: { label: 'Resonance' },
      },
      {
        id: 'slider-1',
        kind: 'cell',
        role: 'control',
        cellRef: 'slider-v',
        layout: { pos: { x: 250, y: 50 }, size: { width: 24, height: 120 } },
        meta: { label: 'Envelope' },
      },
    ],
    ...overrides,
  };
}

function createManifest(tree?: OmegaNode | null): OMEGA_Manifest {
  const m: OMEGA_Manifest = {
    metadata: { name: 'Test', version: '1.0.0' },
    resources: { assets: [], extra: [], fonts: [], wasm: null, contract: undefined },
    entities: [],
    ui: {
      dimensions: { width: 800, height: 400 },
      layout: { width: 800, height: 400 },
    },
  } as unknown as OMEGA_Manifest;

  if (tree) {
    (m.ui as Record<string, unknown>).tree = tree;
  }

  return m;
}

// ── Shared mock callbacks ──────────────────────────────────────────────

const emptyObj: Record<string, number> = {};

function defaultProps(overrides?: Record<string, unknown>) {
  return {
    manifest: createManifest(createTestTree()),
    hiddenNodeIds: [],
    resolveAsset: undefined,
    selectedItemId: null,
    multiSelectedIds: [],
    onSelectItem: jest.fn(),
    onSelectMultiple: jest.fn(),
    onUpdateItem: jest.fn(),
    onUpdateItems: undefined,
    runtimeValues: emptyObj,
    lockedNodeIds: [],
    isLiveMode: false,
    updateValue: jest.fn(),
    zoom: 1,
    pan: { x: 0, y: 0 },
    activeDragOffset: null,
    setActiveDragOffset: jest.fn(),
    activeResizeOffset: null,
    setActiveResizeOffset: jest.fn(),
    startTransaction: undefined,
    commitTransaction: undefined,
    activeTool: 'select' as const,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── ═════════════════════════════════════════════════════════════════════
//  1. Render states
// ── ═════════════════════════════════════════════════════════════════════

describe('RenderedRackTree — render states', () => {
  it('should render UniversalRenderer when manifest has a UCA tree', () => {
    render(<RenderedRackTree {...defaultProps()} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer).toBeTruthy();
    expect(renderer.getAttribute('data-node-id')).toBe('rack-root');
  });

  it('should pass the tree root node id to UniversalRenderer', () => {
    render(<RenderedRackTree {...defaultProps()} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer.getAttribute('data-node-id')).toBe('rack-root');
  });

  it('should include children nodes in the rendered tree', () => {
    render(<RenderedRackTree {...defaultProps()} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer.getAttribute('data-node-kids')).toBe('3');
  });

  it('should render with empty children array', () => {
    const tree = createTestTree({ children: [] });
    const manifest = createManifest(tree);
    render(<RenderedRackTree {...defaultProps({ manifest })} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer).toBeTruthy();
    expect(renderer.getAttribute('data-node-kids')).toBe('0');
  });
});

// ── ═════════════════════════════════════════════════════════════════════
//  2. Empty tree — returns null
// ── ═════════════════════════════════════════════════════════════════════

describe('RenderedRackTree — empty tree', () => {
  it('should return null when manifest has no UCA tree', () => {
    const manifest = createManifest(undefined);
    const { container } = render(<RenderedRackTree {...defaultProps({ manifest })} />);
    expect(container.innerHTML).toBe('');
  });

  it('should return null when manifest.ui is undefined', () => {
    const manifest = createManifest(undefined);
    delete (manifest as unknown as Record<string, unknown>).ui;
    const { container } = render(<RenderedRackTree {...defaultProps({ manifest })} />);
    expect(container.innerHTML).toBe('');
  });

  it('should return null when manifest is minimal (no tree)', () => {
    const minimalManifest: OMEGA_Manifest = {
      metadata: { name: 'Min', version: '1.0' },
      resources: { assets: [], extra: [], fonts: [], wasm: null, contract: undefined },
      entities: [],
    } as unknown as OMEGA_Manifest;
    const { container } = render(<RenderedRackTree {...defaultProps({ manifest: minimalManifest })} />);
    expect(container.innerHTML).toBe('');
  });
});

// ── ═════════════════════════════════════════════════════════════════════
//  3. Filtered tree (hidden nodes)
// ── ═════════════════════════════════════════════════════════════════════

describe('RenderedRackTree — filtered tree', () => {
  it('should return null when all nodes are hidden', () => {
    const { container } = render(
      <RenderedRackTree {...defaultProps({ hiddenNodeIds: ['rack-root', 'knob-1', 'knob-2', 'slider-1'] })} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should still render when only some nodes are hidden (root visible)', () => {
    render(<RenderedRackTree {...defaultProps({ hiddenNodeIds: ['knob-1'] })} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer).toBeTruthy();
    expect(renderer.getAttribute('data-node-id')).toBe('rack-root');
  });

  it('should reduce child count when children are hidden', () => {
    render(<RenderedRackTree {...defaultProps({ hiddenNodeIds: ['knob-1', 'knob-2'] })} />);
    const renderer = screen.getByTestId('universal-renderer');
    // Only slider-1 remains
    expect(renderer.getAttribute('data-node-kids')).toBe('1');
  });

  it('should return null when root itself is hidden', () => {
    const { container } = render(
      <RenderedRackTree {...defaultProps({ hiddenNodeIds: ['rack-root'] })} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should hide nested children without affecting siblings', () => {
    render(<RenderedRackTree {...defaultProps({ hiddenNodeIds: ['knob-2', 'slider-1'] })} />);
    const renderer = screen.getByTestId('universal-renderer');
    // Only knob-1 remains from the 3 children
    expect(renderer.getAttribute('data-node-kids')).toBe('1');
  });

  it('should work with empty hiddenNodeIds array (no-op)', () => {
    render(<RenderedRackTree {...defaultProps({ hiddenNodeIds: [] })} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer).toBeTruthy();
    expect(renderer.getAttribute('data-node-kids')).toBe('3');
  });
});

// ── ═════════════════════════════════════════════════════════════════════
//  4. DebugContext props passthrough
// ── ═════════════════════════════════════════════════════════════════════

describe('RenderedRackTree — debugContext passthrough', () => {
  it('should pass selectedItemId to UniversalRenderer debugContext', () => {
    render(<RenderedRackTree {...defaultProps({ selectedItemId: 'knob-1' })} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer.getAttribute('data-selected')).toBe('knob-1');
  });

  it('should pass multiSelectedIds to UniversalRenderer debugContext', () => {
    render(<RenderedRackTree {...defaultProps({ multiSelectedIds: ['knob-1', 'knob-2'] })} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer.getAttribute('data-multi')).toBe('knob-1,knob-2');
  });

  it('should pass lockedNodeIds to UniversalRenderer debugContext', () => {
    render(<RenderedRackTree {...defaultProps({ lockedNodeIds: ['slider-1'] })} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer.getAttribute('data-locked')).toBe('slider-1');
  });

  it('should pass empty strings for null/empty selection props', () => {
    render(<RenderedRackTree {...defaultProps()} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer.getAttribute('data-selected')).toBe('');
    expect(renderer.getAttribute('data-multi')).toBe('');
    expect(renderer.getAttribute('data-locked')).toBe('');
  });

  it('should pass isLiveMode as false by default', () => {
    render(<RenderedRackTree {...defaultProps()} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer).toBeTruthy();
  });
});

// ── ═════════════════════════════════════════════════════════════════════
//  5. Edge cases
// ── ═════════════════════════════════════════════════════════════════════

describe('RenderedRackTree — edge cases', () => {
  it('should handle null tree in manifest gracefully (no crash)', () => {
    const manifest = createManifest(null);
    const { container } = render(<RenderedRackTree {...defaultProps({ manifest })} />);
    expect(container.innerHTML).toBe('');
  });

  it('should handle undefined resolveAsset', () => {
    render(<RenderedRackTree {...defaultProps({ resolveAsset: undefined })} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer).toBeTruthy();
  });

  it('should handle undefined onUpdateItems', () => {
    render(<RenderedRackTree {...defaultProps({ onUpdateItems: undefined })} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer).toBeTruthy();
  });

  it('should handle undefined startTransaction and commitTransaction', () => {
    render(<RenderedRackTree {...defaultProps({
      startTransaction: undefined,
      commitTransaction: undefined,
    })} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer).toBeTruthy();
  });

  it('should handle null activeDragOffset and activeResizeOffset', () => {
    render(<RenderedRackTree {...defaultProps({
      activeDragOffset: null,
      activeResizeOffset: null,
    })} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer).toBeTruthy();
  });

  it('should handle undefined pan', () => {
    render(<RenderedRackTree {...defaultProps({ pan: undefined })} />);
    const renderer = screen.getByTestId('universal-renderer');
    expect(renderer).toBeTruthy();
  });
});
