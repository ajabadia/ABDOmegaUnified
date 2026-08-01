/**
 * @jest-environment jsdom
 *
 * Tests for VisualModulationMatrix component
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import type { OMEGA_Manifest, OMEGA_Modulation, ManifestEntity } from '@/omega-ui-core/types/manifest';
import VisualModulationMatrix from '../VisualModulationMatrix';

// ── Polyfill ResizeObserver (not available in jsdom) ───────────────────
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// ── Mock framer-motion ──────────────────────────────────────────────────
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, exit, transition, drag, dragMomentum, dragElastic, dragTransition, whileTap, whileHover, layout, ...rest } = props as Record<string, unknown>;
      return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => <>{children}</>,
}));

// ── Mock lucide-react icons ─────────────────────────────────────────────
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x">X</span>,
  Zap: () => <span data-testid="icon-zap">⚡</span>,
  GripVertical: () => <span data-testid="icon-grip">⋮</span>,
}));

// ── Helpers ─────────────────────────────────────────────────────────────

function createMockEntity(id: string, label: string): ManifestEntity {
  return {
    id, type: 'control', label,
    pos: { x: 0, y: 0 },
    size: { width: 50, height: 50 },
  };
}

function createMockManifest(overrides?: Partial<OMEGA_Manifest>): OMEGA_Manifest {
  return {
    metadata: { name: 'test', version: '1.0' },
    resources: {},
    ui: {
      controls: [
        createMockEntity('osc_1', 'Osc 1'),
        createMockEntity('filter_1', 'Filter'),
        createMockEntity('amp_1', 'Amp'),
      ],
      jacks: [
        createMockEntity('in_1', 'Input'),
        createMockEntity('out_1', 'Output'),
      ],
    },
    entities: [],
    modulations: [],
    ...overrides,
  } as OMEGA_Manifest;
}

function createMockModulation(id: string, source: string, target: string, overrides?: Partial<OMEGA_Modulation>): OMEGA_Modulation {
  return {
    id, source, target,
    amount: 0.75, type: 'unipolar',
    ...overrides,
  } as OMEGA_Modulation;
}

function getCell(id: string): HTMLElement {
  const el = document.querySelector(`[data-target-id="${id}"]`) as HTMLElement | null;
  expect(el).not.toBeNull();
  return el!;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Rendering ───────────────────────────────────────────────────────────

describe('VisualModulationMatrix — rendering', () => {
  it('should render the modal overlay with title', () => {
    render(<VisualModulationMatrix manifest={createMockManifest()} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Visual Modulation Matrix')).toBeTruthy();
    expect(screen.getByText(/Drag from Source.*Target/)).toBeTruthy();
  });

  it('should render source labels from controls and jacks', () => {
    render(<VisualModulationMatrix manifest={createMockManifest()} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);

    // Source labels appear in both the sticky column AND the rotated header →
    // use getAllByText and verify at least one exists
    expect(screen.getAllByText('Osc 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Filter').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Amp').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Input').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Output').length).toBeGreaterThanOrEqual(1);
  });

  it('should display active modulation count in header', () => {
    const manifest = createMockManifest({
      modulations: [
        createMockModulation('mod_1', 'osc_1', 'filter_1'),
        createMockModulation('mod_2', 'osc_1', 'amp_1'),
      ],
    });
    render(<VisualModulationMatrix manifest={manifest} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('2 active')).toBeTruthy();
  });

  it('should display 0 active when no modulations', () => {
    render(<VisualModulationMatrix manifest={createMockManifest()} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('0 active')).toBeTruthy();
  });

  it('should render legend with modulation types', () => {
    render(<VisualModulationMatrix manifest={createMockManifest()} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('unipolar')).toBeTruthy();
    expect(screen.getByText('bipolar')).toBeTruthy();
    expect(screen.getByText('additive')).toBeTruthy();
    expect(screen.getByText('multiplicative')).toBeTruthy();
  });

  it('should render footer interaction hints', () => {
    render(<VisualModulationMatrix manifest={createMockManifest()} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText('Click cell to toggle')).toBeTruthy();
    expect(screen.getByText('Scroll wheel for amount')).toBeTruthy();
    expect(screen.getByText('Drag source → target to create')).toBeTruthy();
  });

  it('should have a close button that calls onClose', () => {
    const onClose = jest.fn();
    const { container } = render(<VisualModulationMatrix manifest={createMockManifest()} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={onClose} />);

    // The header (with close button) renders before source rows (with grip buttons).
    // First <button> in DOM order is the close button.
    const btn = container.querySelector('button')!;
    fireEvent.click(btn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── Cell Interactions ───────────────────────────────────────────────────

describe('VisualModulationMatrix — cell interactions', () => {
  it('should call onAdd when clicking on an empty cell', () => {
    const onAdd = jest.fn();
    render(<VisualModulationMatrix manifest={createMockManifest()} onAdd={onAdd} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);

    getCell('filter_1').click();
    expect(onAdd).toHaveBeenCalledTimes(1);
    const added = onAdd.mock.calls[0][0] as OMEGA_Modulation;
    expect(added.source).toBe('osc_1');
    expect(added.target).toBe('filter_1');
    expect(added.amount).toBe(0.75);
    expect(added.type).toBe('unipolar');
  });

  it('should call onAdd when clicking on an empty amp_1 cell', () => {
    const onAdd = jest.fn();
    render(<VisualModulationMatrix manifest={createMockManifest()} onAdd={onAdd} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);

    getCell('amp_1').click();
    expect(onAdd).toHaveBeenCalledTimes(1);
    const added = onAdd.mock.calls[0][0] as OMEGA_Modulation;
    expect(added.source).toBe('osc_1');
    expect(added.target).toBe('amp_1');
    expect(onAdd).toHaveBeenCalledWith({
      id: 'mod_osc_1_amp_1',
      source: 'osc_1',
      target: 'amp_1',
      amount: 0.75,
      type: 'unipolar',
    });
  });

  it('should remove existing modulation when clicking an active cell twice (toggle)', () => {
    const onRemove = jest.fn();
    const manifest = createMockManifest({
      modulations: [createMockModulation('my_mod', 'osc_1', 'filter_1')],
    });
    render(<VisualModulationMatrix manifest={manifest} onAdd={jest.fn()} onRemove={onRemove} onUpdate={jest.fn()} onClose={jest.fn()} />);

    const cell = getCell('filter_1');

    // First click calls toggleMod which finds existing mod and calls onRemove
    cell.click();
    expect(onRemove).toHaveBeenCalledWith('my_mod');
  });

  it('should call onUpdate with increased amount on scroll up', () => {
    const onUpdate = jest.fn();
    const manifest = createMockManifest({
      modulations: [createMockModulation('mod_osc_filter', 'osc_1', 'filter_1')],
    });
    render(<VisualModulationMatrix manifest={manifest} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={onUpdate} onClose={jest.fn()} />);

    fireEvent.wheel(getCell('filter_1'), { deltaY: -100 });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const args = onUpdate.mock.calls[0] as [string, Partial<OMEGA_Modulation>];
    expect(args[1].amount).toBe(0.8);
  });

  it('should call onUpdate with decreased amount on scroll down', () => {
    const onUpdate = jest.fn();
    const manifest = createMockManifest({
      modulations: [createMockModulation('mod_osc_filter', 'osc_1', 'filter_1')],
    });
    render(<VisualModulationMatrix manifest={manifest} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={onUpdate} onClose={jest.fn()} />);

    fireEvent.wheel(getCell('filter_1'), { deltaY: 100 });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const args = onUpdate.mock.calls[0] as [string, Partial<OMEGA_Modulation>];
    expect(args[1].amount).toBe(0.7);
  });

  it('should clamp amount to 0 on scroll down when already at 0', () => {
    const onUpdate = jest.fn();
    const manifest = createMockManifest({
      modulations: [createMockModulation('mod_osc_filter', 'osc_1', 'filter_1', { amount: 0 })],
    });
    render(<VisualModulationMatrix manifest={manifest} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={onUpdate} onClose={jest.fn()} />);

    fireEvent.wheel(getCell('filter_1'), { deltaY: 100 });
    const args = onUpdate.mock.calls[0] as [string, Partial<OMEGA_Modulation>];
    expect(args[1].amount).toBe(0);
  });

  it('should clamp amount to 1.0 on scroll up when near max', () => {
    const onUpdate = jest.fn();
    const manifest = createMockManifest({
      modulations: [createMockModulation('mod_1', 'osc_1', 'filter_1', { amount: 0.95 })],
    });
    render(<VisualModulationMatrix manifest={manifest} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={onUpdate} onClose={jest.fn()} />);

    const cell = getCell('filter_1');

    fireEvent.wheel(cell, { deltaY: -100 });
    const args1 = onUpdate.mock.calls[0] as [string, Partial<OMEGA_Modulation>];
    expect(args1[1].amount).toBe(1.0);

    fireEvent.wheel(cell, { deltaY: -100 });
    const args2 = onUpdate.mock.calls[1] as [string, Partial<OMEGA_Modulation>];
    expect(args2[1].amount).toBe(1.0);
  });

  it('should not toggle modulation on self-cell (source === target)', () => {
    const onAdd = jest.fn();
    const onRemove = jest.fn();
    render(<VisualModulationMatrix manifest={createMockManifest()} onAdd={onAdd} onRemove={onRemove} onUpdate={jest.fn()} onClose={jest.fn()} />);

    getCell('osc_1').click();
    expect(onAdd).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('should call onUpdate with only the amount field (partial update)', () => {
    const onUpdate = jest.fn();
    const manifest = createMockManifest({
      modulations: [createMockModulation('mod_1', 'osc_1', 'filter_1', { amount: 0.3, type: 'additive' })],
    });
    render(<VisualModulationMatrix manifest={manifest} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={onUpdate} onClose={jest.fn()} />);

    fireEvent.wheel(getCell('filter_1'), { deltaY: -100 });
    expect(onUpdate).toHaveBeenCalledWith('mod_1', { amount: 0.35 });
  });
});

// ── SVG Container ───────────────────────────────────────────────────────

describe('VisualModulationMatrix — SVG', () => {
  it('should render an SVG overlay element', () => {
    render(<VisualModulationMatrix manifest={createMockManifest()} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);
    const svg = document.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('should have data-target-id cells in the DOM for modulation clicks', () => {
    render(<VisualModulationMatrix manifest={createMockManifest()} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);
    expect(document.querySelector('[data-target-id="filter_1"]')).not.toBeNull();
    expect(document.querySelector('[data-target-id="osc_1"]')).not.toBeNull();
  });

  it('should have data-source-id labels in the DOM for drag sources', () => {
    render(<VisualModulationMatrix manifest={createMockManifest()} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);
    expect(document.querySelector('[data-source-id="osc_1"]')).not.toBeNull();
    expect(document.querySelector('[data-source-id="filter_1"]')).not.toBeNull();
  });
});

// ── Drag and Drop ───────────────────────────────────────────────────────

describe('VisualModulationMatrix — drag and drop', () => {
  it('should show drag ghost on mousedown on a source grip handle', () => {
    render(<VisualModulationMatrix manifest={createMockManifest()} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);

    // Count initial 'Osc 1' occurrences (source row label + header rotated label)
    const initialCount = screen.getAllByText('Osc 1').length;

    const sourceRow = document.querySelector('[data-source-id="osc_1"]') as HTMLElement | null;
    const grip = sourceRow!.querySelector('button') as HTMLElement | null;
    expect(grip).not.toBeNull();
    fireEvent.mouseDown(grip!);

    // After drag ghost appears, there should be one more 'Osc 1' rendering
    const ghostCount = screen.getAllByText('Osc 1').length;
    expect(ghostCount).toBe(initialCount + 1);
    expect(screen.getByText('Drop on target')).toBeTruthy();
  });

  it('should create modulation when drag ends over a target cell', () => {
    const onAdd = jest.fn();
    render(<VisualModulationMatrix manifest={createMockManifest()} onAdd={onAdd} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);

    const sourceRow = document.querySelector('[data-source-id="osc_1"]') as HTMLElement | null;
    const grip = sourceRow!.querySelector('button') as HTMLElement;
    fireEvent.mouseDown(grip);

    const overlay = document.querySelector('.fixed.inset-0') as HTMLElement | null;
    fireEvent.mouseMove(overlay!, { clientX: 200, clientY: 200 });

    // mouseUp on a target cell triggers handleDragEnd + cell onClick
    const targetCell = getCell('filter_1');
    fireEvent.mouseUp(targetCell);

    // onAdd is called at least once (from dragEnd or click)
    expect(onAdd).toHaveBeenCalled();
  });
});

// ── Edge Cases ──────────────────────────────────────────────────────────

describe('VisualModulationMatrix — edge cases', () => {
  it('should handle empty controls and jacks gracefully', () => {
    const manifest = { metadata: { name: 'test', version: '1.0' }, resources: {}, ui: { controls: [], jacks: [] }, entities: [] } as unknown as OMEGA_Manifest;
    render(<VisualModulationMatrix manifest={manifest} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('Visual Modulation Matrix')).toBeTruthy();
    expect(screen.getByText('0 active')).toBeTruthy();
  });

  it('should handle missing modulations field gracefully', () => {
    const manifest = { metadata: { name: 'test', version: '1.0' }, resources: {}, ui: { controls: [createMockEntity('osc_1', 'Osc 1')], jacks: [] }, entities: [] } as unknown as OMEGA_Manifest;
    render(<VisualModulationMatrix manifest={manifest} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('0 active')).toBeTruthy();
  });

  it('should show bipolar label for bipolar modulation type', () => {
    const manifest = createMockManifest({
      modulations: [createMockModulation('mod_1', 'osc_1', 'filter_1', { type: 'bipolar' })],
    });
    render(<VisualModulationMatrix manifest={manifest} onAdd={jest.fn()} onRemove={jest.fn()} onUpdate={jest.fn()} onClose={jest.fn()} />);

    // BI label appears once per modulation cell; use getAllByText
    expect(screen.getAllByText('BI').length).toBeGreaterThanOrEqual(1);
  });
});
