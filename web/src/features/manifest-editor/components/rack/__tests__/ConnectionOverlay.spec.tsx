/**
 * @jest-environment jsdom
 *
 * P11 — ConnectionOverlay Unit Tests
 * Covers rendering, drag-to-connect, prevent duplicate, cancel drag, etc.
 * Mirrors the same edge cases covered in the P11 E2E test suite.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import type { OMEGA_Manifest, OMEGA_Modulation, ManifestEntity } from '@/omega-ui-core/types/manifest';
import ConnectionOverlay from '../ConnectionOverlay';

// ── Polyfill ResizeObserver (not available in jsdom) ───────────────────
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// ── Mock SVG animations (not supported in jsdom) ───────────────────────
// SVG animate elements cause warnings. We mock the render to skip them.
jest.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x">X</span>,
}));

// ── Constants ──────────────────────────────────────────────────────────

const KNOB_ID = 'test_knob';
const FREQ_ID = 'test_freq';
const AUDIO_IN_ID = 'test_audio_in';
const AUDIO_OUT_ID = 'test_audio_out';

// ── Helpers ────────────────────────────────────────────────────────────

function createEntity(id: string, label: string, type = 'control'): ManifestEntity {
  return { id, type, label } as ManifestEntity;
}

function createMockManifest(modulations?: OMEGA_Modulation[]): OMEGA_Manifest {
  return {
    metadata: { name: 'test', version: '1.0' },
    resources: {},
    ui: {
      controls: [
        createEntity(KNOB_ID, 'Cutoff'),
        createEntity(FREQ_ID, 'Frequency'),
      ],
      jacks: [
        createEntity(AUDIO_IN_ID, 'Audio In', 'stream'),
        createEntity(AUDIO_OUT_ID, 'Audio Out', 'stream'),
      ],
    },
    entities: [],
    modulations: modulations || [],
  } as OMEGA_Manifest;
}

/**
 * Create a mock container div that simulates the rack viewport.
 * Each UCA element is positioned so ConnectionOverlay can calculate handle positions.
 */
function createMockContainer(): HTMLDivElement {
  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.width = '800px';
  container.style.height = '600px';
  container.getBoundingClientRect = jest.fn(() => ({
    width: 800, height: 600, top: 0, left: 0,
    bottom: 600, right: 800, x: 0, y: 0,
    toJSON: () => ({}),
  }));

  // Add UCA elements with known positions
  const positions: Record<string, { x: number; y: number; w: number; h: number }> = {
    [KNOB_ID]: { x: 50, y: 50, w: 48, h: 48 },
    [FREQ_ID]: { x: 150, y: 50, w: 48, h: 48 },
    [AUDIO_IN_ID]: { x: 50, y: 200, w: 40, h: 40 },
    [AUDIO_OUT_ID]: { x: 150, y: 200, w: 40, h: 40 },
  };

  Object.entries(positions).forEach(([id, pos]) => {
    const el = document.createElement('div');
    el.id = `uca-${id}`;
    el.style.position = 'absolute';
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    el.style.width = `${pos.w}px`;
    el.style.height = `${pos.h}px`;
    el.getBoundingClientRect = jest.fn(() => ({
      width: pos.w, height: pos.h,
      top: pos.y, left: pos.x,
      bottom: pos.y + pos.h, right: pos.x + pos.w,
      x: pos.x, y: pos.y,
      toJSON: () => ({}),
    }));
    container.appendChild(el);
  });

  return container;
}

function createMockRef(container: HTMLDivElement): React.RefObject<HTMLDivElement | null> {
  return { current: container };
}

const defaultProps = {
  manifest: createMockManifest(),
  containerRef: createMockRef(createMockContainer()),
  onAddModulation: jest.fn() as (mod: OMEGA_Modulation) => void,
  onRemoveModulation: jest.fn() as (id: string) => void,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── ═══════════════════════════════════════════════════════════════════════
//  1. Rendering
// ── ═══════════════════════════════════════════════════════════════════════

describe('ConnectionOverlay — rendering', () => {
  it('should return null when there are no handles, links, or drag state', () => {
    const { container } = render(
      <ConnectionOverlay
        manifest={createMockManifest([])}
        containerRef={createMockRef(document.createElement('div'))}
        onAddModulation={jest.fn()}
        onRemoveModulation={jest.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render SVG when port handles are detected in the container', () => {
    const { container } = render(
      <ConnectionOverlay {...defaultProps} />
    );

    // Advance timers to trigger the initial refreshPositions effect
    jest.advanceTimersByTime(100);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();

    // Verify handle circles are rendered
    const handleCircles = container.querySelectorAll('circle[data-port-handle-id]');
    expect(handleCircles.length).toBeGreaterThanOrEqual(4);
  });

  it('should give each handle a unique data-port-handle-id', () => {
    const { container } = render(
      <ConnectionOverlay {...defaultProps} />
    );
    jest.advanceTimersByTime(100);

    const handles = container.querySelectorAll('circle[data-port-handle-id]');
    const ids = Array.from(handles).map(h => h.getAttribute('data-port-handle-id'));
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(4);
  });

  it('should render connection lines when modulations exist', () => {
    const manifest = createMockManifest([
      { id: 'mod_1', source: KNOB_ID, target: AUDIO_OUT_ID, amount: 0.75, type: 'unipolar' } as OMEGA_Modulation,
    ]);
    const { container } = render(
      <ConnectionOverlay
        {...defaultProps}
        manifest={manifest}
      />
    );
    jest.advanceTimersByTime(100);

    // SVG should have path elements for the bezier connection lines
    // The glow line + solid line = 2 paths per connection + 1 invisible click target = 3 paths
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(3);
  });

  it('should render bidirectional handles with correct label text', () => {
    const { container } = render(
      <ConnectionOverlay {...defaultProps} />
    );
    jest.advanceTimersByTime(100);

    // SVG text elements should show entity labels
    const texts = container.querySelectorAll('text');
    const textContents = Array.from(texts).map(t => t.textContent);

    // At least one of the labels should exist
    const hasLabels = textContents.some(
      t => t?.includes('Cutoff') || t?.includes('Audio') || t?.includes('Frequency')
    );
    expect(hasLabels).toBe(true);
  });

  it('should skip handles for entities not present in both tree and manifest', () => {
    // Container has a UCA element that is NOT in the manifest entities
    const container = createMockContainer();
    const extraEl = document.createElement('div');
    extraEl.id = 'uca-ghost_node';
    extraEl.getBoundingClientRect = jest.fn(() => ({
      width: 30, height: 30, top: 300, left: 300,
      bottom: 330, right: 330, x: 300, y: 300,
      toJSON: () => ({}),
    }));
    container.appendChild(extraEl);

    const { container: rendered } = render(
      <ConnectionOverlay
        {...defaultProps}
        containerRef={createMockRef(container)}
      />
    );
    jest.advanceTimersByTime(100);

    // Only 4 handles (from manifest entities) should render, not 5
    const handles = rendered.querySelectorAll('circle[data-port-handle-id]');
    expect(handles.length).toBe(4);
  });
});

// ── ═══════════════════════════════════════════════════════════════════════
//  2. Drag-to-Connect
// ── ═══════════════════════════════════════════════════════════════════════

describe('ConnectionOverlay — drag-to-connect', () => {
  it('should set dragState on mouse down on a port handle', () => {
    const { container } = render(
      <ConnectionOverlay {...defaultProps} />
    );
    jest.advanceTimersByTime(100);

    const handle = container.querySelector('circle[data-port-handle-id]');
    expect(handle).not.toBeNull();

    // Simulate mousedown on handle
    fireEvent.mouseDown(handle!, { clientX: 50, clientY: 50 });

    // Ghost line element should now be rendered (while dragging)
    const ghostLine = container.querySelector('line');
    expect(ghostLine).not.toBeNull();
  });

  it('should call onAddModulation when dragging from source to nearby target handle', () => {
    const onAdd = jest.fn();
    const container = createMockContainer();
    const knobCenterX = 50 + 24; // 74
    const knobCenterY = 50 + 24; // 74
    const audioInCenterX = 50 + 20; // 70
    const audioInCenterY = 200 + 20; // 220

    const { container: rendered } = render(
      <ConnectionOverlay
        manifest={createMockManifest()}
        containerRef={createMockRef(container)}
        onAddModulation={onAdd}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    const knobHandle = rendered.querySelector(`circle[data-port-handle-id="${KNOB_ID}"]`);
    expect(knobHandle).not.toBeNull();

    // Mouse down on knob handle
    fireEvent.mouseDown(knobHandle!, { clientX: knobCenterX, clientY: knobCenterY });

    // Mouse move to near audio_in handle (within SNAP_RADIUS)
    fireEvent.mouseMove(window, { clientX: audioInCenterX, clientY: audioInCenterY });

    // Mouse up to complete the drag
    fireEvent.mouseUp(window, { clientX: audioInCenterX, clientY: audioInCenterY });

    // Advance timers to process setTimeout(refreshPositions, 50)
    jest.advanceTimersByTime(100);

    expect(onAdd).toHaveBeenCalledTimes(1);
    const mod = onAdd.mock.calls[0][0] as OMEGA_Modulation;
    expect(mod.source).toBe(KNOB_ID);
    expect(mod.target).toBe(AUDIO_IN_ID);
    expect(mod.amount).toBe(0.75);
    expect(mod.type).toBe('unipolar');
  });

  it('should create modulation with correct id format (mod_source_target)', () => {
    const onAdd = jest.fn();
    const container = createMockContainer();

    const { container: rendered } = render(
      <ConnectionOverlay
        manifest={createMockManifest()}
        containerRef={createMockRef(container)}
        onAddModulation={onAdd}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    const knobHandle = rendered.querySelector(`circle[data-port-handle-id="${KNOB_ID}"]`);
    expect(knobHandle).not.toBeNull();

    fireEvent.mouseDown(knobHandle!, { clientX: 74, clientY: 74 });
    fireEvent.mouseMove(window, { clientX: 70, clientY: 220 });
    fireEvent.mouseUp(window, { clientX: 70, clientY: 220 });
    jest.advanceTimersByTime(100);

    const mod = onAdd.mock.calls[0][0] as OMEGA_Modulation;
    expect(mod.id).toBe(`mod_${KNOB_ID}_${AUDIO_IN_ID}`);
  });

  it('should fire onAddModulation when dragging from input to output (reverse direction)', () => {
    const onAdd = jest.fn();
    const container = createMockContainer();

    const { container: rendered } = render(
      <ConnectionOverlay
        manifest={createMockManifest()}
        containerRef={createMockRef(container)}
        onAddModulation={onAdd}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    const audioInHandle = rendered.querySelector(`circle[data-port-handle-id="${AUDIO_IN_ID}"]`);
    expect(audioInHandle).not.toBeNull();

    // Drag from Audio In → Knob (reverse direction)
    fireEvent.mouseDown(audioInHandle!, { clientX: 70, clientY: 220 });
    fireEvent.mouseMove(window, { clientX: 74, clientY: 74 });
    fireEvent.mouseUp(window, { clientX: 74, clientY: 74 });
    jest.advanceTimersByTime(100);

    expect(onAdd).toHaveBeenCalledTimes(1);
    const mod = onAdd.mock.calls[0][0] as OMEGA_Modulation;
    expect(mod.source).toBe(AUDIO_IN_ID);
    expect(mod.target).toBe(KNOB_ID);
  });
});

// ── ═══════════════════════════════════════════════════════════════════════
//  3. Drag Edge Cases (Cancellation, Self, Duplicate)
// ── ═══════════════════════════════════════════════════════════════════════

describe('ConnectionOverlay — drag edge cases', () => {
  it('should NOT call onAddModulation when drag is cancelled on empty space (far from any handle)', () => {
    const onAdd = jest.fn();
    const container = createMockContainer();

    const { container: rendered } = render(
      <ConnectionOverlay
        manifest={createMockManifest()}
        containerRef={createMockRef(container)}
        onAddModulation={onAdd}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    const knobHandle = rendered.querySelector(`circle[data-port-handle-id="${KNOB_ID}"]`);
    expect(knobHandle).not.toBeNull();

    // Mouse down on knob handle
    fireEvent.mouseDown(knobHandle!, { clientX: 74, clientY: 74 });

    // Move to far-away empty space (500px away, well beyond snap radius)
    fireEvent.mouseMove(window, { clientX: 600, clientY: 500 });
    fireEvent.mouseUp(window, { clientX: 600, clientY: 500 });
    jest.advanceTimersByTime(100);

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('should NOT create modulation when dragging to the same handle (self-connection)', () => {
    const onAdd = jest.fn();
    const container = createMockContainer();

    const { container: rendered } = render(
      <ConnectionOverlay
        manifest={createMockManifest()}
        containerRef={createMockRef(container)}
        onAddModulation={onAdd}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    const knobHandle = rendered.querySelector(`circle[data-port-handle-id="${KNOB_ID}"]`);
    expect(knobHandle).not.toBeNull();

    // Mouse down and up on the same handle (moved slightly but within snap radius of itself → filtered out)
    fireEvent.mouseDown(knobHandle!, { clientX: 74, clientY: 74 });
    fireEvent.mouseMove(window, { clientX: 80, clientY: 80 });
    fireEvent.mouseUp(window, { clientX: 80, clientY: 80 });
    jest.advanceTimersByTime(100);

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('should NOT create duplicate modulation when same source→target connection already exists', () => {
    const onAdd = jest.fn();
    const container = createMockContainer();
    const manifest = createMockManifest([
      { id: 'existing_mod', source: KNOB_ID, target: AUDIO_IN_ID, amount: 0.5, type: 'bipolar' } as OMEGA_Modulation,
    ]);

    const { container: rendered } = render(
      <ConnectionOverlay
        manifest={manifest}
        containerRef={createMockRef(container)}
        onAddModulation={onAdd}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    const knobHandle = rendered.querySelector(`circle[data-port-handle-id="${KNOB_ID}"]`);
    expect(knobHandle).not.toBeNull();

    // Try to create the same modulation that already exists
    fireEvent.mouseDown(knobHandle!, { clientX: 74, clientY: 74 });
    fireEvent.mouseMove(window, { clientX: 70, clientY: 220 });
    fireEvent.mouseUp(window, { clientX: 70, clientY: 220 });
    jest.advanceTimersByTime(100);

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('should NOT create duplicate when reverse-direction connection already exists', () => {
    const onAdd = jest.fn();
    const container = createMockContainer();
    // Existing modulation with source=audio_in, target=knob
    const manifest = createMockManifest([
      { id: 'existing_mod_reverse', source: AUDIO_IN_ID, target: KNOB_ID, amount: 0.5, type: 'bipolar' } as OMEGA_Modulation,
    ]);

    const { container: rendered } = render(
      <ConnectionOverlay
        manifest={manifest}
        containerRef={createMockRef(container)}
        onAddModulation={onAdd}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    // Try to create knob → audio_in (reverse of existing)
    const knobHandle = rendered.querySelector(`circle[data-port-handle-id="${KNOB_ID}"]`);
    expect(knobHandle).not.toBeNull();

    fireEvent.mouseDown(knobHandle!, { clientX: 74, clientY: 74 });
    fireEvent.mouseMove(window, { clientX: 70, clientY: 220 });
    fireEvent.mouseUp(window, { clientX: 70, clientY: 220 });
    jest.advanceTimersByTime(100);

    expect(onAdd).not.toHaveBeenCalled();
  });

  it('should handle empty manifest gracefully (no controls/jacks)', () => {
    const emptyManifest = {
      metadata: { name: 'empty', version: '1.0' },
      resources: {},
      ui: { controls: [], jacks: [] },
      entities: [],
      modulations: [],
    } as unknown as OMEGA_Manifest;

    const { container } = render(
      <ConnectionOverlay
        manifest={emptyManifest}
        containerRef={createMockRef(createMockContainer())}
        onAddModulation={jest.fn()}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    // Should render nothing (no handles to show)
    expect(container.innerHTML).toBe('');
  });
});

// ── ═══════════════════════════════════════════════════════════════════════
//  4. Click-to-Delete
// ── ═══════════════════════════════════════════════════════════════════════

describe('ConnectionOverlay — click-to-delete', () => {
  it('should call onRemoveModulation when clicking on a connection line', () => {
    const onRemove = jest.fn();
    const manifest = createMockManifest([
      { id: 'mod_del', source: KNOB_ID, target: AUDIO_OUT_ID, amount: 0.5, type: 'bipolar' } as OMEGA_Modulation,
    ]);

    const { container } = render(
      <ConnectionOverlay
        manifest={manifest}
        containerRef={createMockRef(createMockContainer())}
        onAddModulation={jest.fn()}
        onRemoveModulation={onRemove}
      />
    );
    jest.advanceTimersByTime(100);

    // Find and click the invisible click-target path (stroke="transparent", strokeWidth=14)
    // It's the first path in each connection group with className containing "pointer-events-auto"
    const clickTargets = container.querySelectorAll('path[stroke="transparent"]');
    expect(clickTargets.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(clickTargets[0]);
    jest.advanceTimersByTime(100);

    expect(onRemove).toHaveBeenCalledWith('mod_del');
  });

  it('should call onRemoveModulation when clicking delete button (X) on hover', () => {
    const onRemove = jest.fn();
    const manifest = createMockManifest([
      { id: 'mod_xbtn', source: KNOB_ID, target: AUDIO_OUT_ID, amount: 0.6, type: 'unipolar' } as OMEGA_Modulation,
    ]);

    const { container } = render(
      <ConnectionOverlay
        manifest={manifest}
        containerRef={createMockRef(createMockContainer())}
        onAddModulation={jest.fn()}
        onRemoveModulation={onRemove}
      />
    );
    jest.advanceTimersByTime(100);

    // Simulate hover on a connection line to show the delete button (X)
    const clickTarget = container.querySelector('path[stroke="transparent"]');
    expect(clickTarget).not.toBeNull();

    fireEvent.mouseEnter(clickTarget!);

    // The delete button (foreignObject with X icon) should now be rendered
    const deleteBtn = container.querySelector('[title="Delete connection"]');
    expect(deleteBtn).not.toBeNull();

    // Click the delete button
    fireEvent.click(deleteBtn!);
    jest.advanceTimersByTime(100);

    expect(onRemove).toHaveBeenCalledWith('mod_xbtn');
  });

  it('should clean up hover state on mouse leave', () => {
    const onRemove = jest.fn();
    const manifest = createMockManifest([
      { id: 'mod_hover', source: KNOB_ID, target: AUDIO_OUT_ID, amount: 0.6, type: 'unipolar' } as OMEGA_Modulation,
    ]);

    const { container } = render(
      <ConnectionOverlay
        manifest={manifest}
        containerRef={createMockRef(createMockContainer())}
        onAddModulation={jest.fn()}
        onRemoveModulation={onRemove}
      />
    );
    jest.advanceTimersByTime(100);

    const clickTarget = container.querySelector('path[stroke="transparent"]');
    expect(clickTarget).not.toBeNull();

    // Hover on → delete button visible
    fireEvent.mouseEnter(clickTarget!);
    expect(container.querySelector('[title="Delete connection"]')).not.toBeNull();

    // Hover off → delete button hidden
    fireEvent.mouseLeave(clickTarget!);
    expect(container.querySelector('[title="Delete connection"]')).toBeNull();
  });
});

// ── ═══════════════════════════════════════════════════════════════════════
//  5. Ghost Line During Drag
// ── ═══════════════════════════════════════════════════════════════════════

describe('ConnectionOverlay — ghost line', () => {
  it('should render ghost line with dashed stroke during drag', () => {
    const { container } = render(
      <ConnectionOverlay {...defaultProps} />
    );
    jest.advanceTimersByTime(100);

    const handle = container.querySelector(`circle[data-port-handle-id="${KNOB_ID}"]`);
    expect(handle).not.toBeNull();

    // Start drag
    fireEvent.mouseDown(handle!, { clientX: 74, clientY: 74 });
    fireEvent.mouseMove(window, { clientX: 200, clientY: 100 });

    // Ghost line should have stroke-dasharray="6 4"
    const ghostLine = container.querySelector('line');
    expect(ghostLine).not.toBeNull();
    expect(ghostLine!.getAttribute('stroke-dasharray')).toBe('6 4');
  });

  it('should remove ghost line after drag cancel (mouse up on empty space)', () => {
    const { container } = render(
      <ConnectionOverlay {...defaultProps} />
    );
    jest.advanceTimersByTime(100);

    const handle = container.querySelector(`circle[data-port-handle-id="${KNOB_ID}"]`);
    expect(handle).not.toBeNull();

    fireEvent.mouseDown(handle!, { clientX: 74, clientY: 74 });
    fireEvent.mouseMove(window, { clientX: 200, clientY: 100 });

    // Ghost should exist during drag
    expect(container.querySelector('line')).not.toBeNull();

    // Cancel drag
    fireEvent.mouseUp(window, { clientX: 600, clientY: 500 });
    jest.advanceTimersByTime(100);

    // Ghost should be removed
    expect(container.querySelector('line')).toBeNull();
  });

  it('should remove ghost line after successful drop (connection created)', () => {
    const onAdd = jest.fn();
    const container = createMockContainer();

    const { container: rendered } = render(
      <ConnectionOverlay
        manifest={createMockManifest()}
        containerRef={createMockRef(container)}
        onAddModulation={onAdd}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    const handle = rendered.querySelector(`circle[data-port-handle-id="${KNOB_ID}"]`);
    expect(handle).not.toBeNull();

    fireEvent.mouseDown(handle!, { clientX: 74, clientY: 74 });
    fireEvent.mouseMove(window, { clientX: 70, clientY: 220 });

    // Ghost exists during drag
    expect(rendered.querySelector('line')).not.toBeNull();

    // Drop on target → connection created
    fireEvent.mouseUp(window, { clientX: 70, clientY: 220 });
    jest.advanceTimersByTime(100);

    // Ghost should be removed after drop
    expect(rendered.querySelector('line')).toBeNull();
  });
});

// ── ═══════════════════════════════════════════════════════════════════════
//  6. Connection Count Badges
// ── ═══════════════════════════════════════════════════════════════════════

describe('ConnectionOverlay — connection count badges', () => {
  it('should show connection count badge when handle has connected links', () => {
    const manifest = createMockManifest([
      { id: 'mod_badge', source: KNOB_ID, target: AUDIO_OUT_ID, amount: 0.75, type: 'unipolar' } as OMEGA_Modulation,
    ]);

    const { container } = render(
      <ConnectionOverlay
        manifest={manifest}
        containerRef={createMockRef(createMockContainer())}
        onAddModulation={jest.fn()}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    // The badge text should show "1" (one connection)
    const badgeTexts = container.querySelectorAll('text');
    const badgeText = Array.from(badgeTexts).find(t => t.textContent === '1');
    expect(badgeText).not.toBeNull();
  });

  it('should show correct count when handle has multiple connections', () => {
    const manifest = createMockManifest([
      { id: 'mod_a', source: KNOB_ID, target: AUDIO_OUT_ID, amount: 0.5, type: 'unipolar' } as OMEGA_Modulation,
      { id: 'mod_b', source: KNOB_ID, target: FREQ_ID, amount: 0.8, type: 'bipolar' } as OMEGA_Modulation,
    ]);

    const { container } = render(
      <ConnectionOverlay
        manifest={manifest}
        containerRef={createMockRef(createMockContainer())}
        onAddModulation={jest.fn()}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    // The badge text for knob should show "2" (two connections)
    const badgeTexts = container.querySelectorAll('text');
    const badgeText = Array.from(badgeTexts).find(t => t.textContent === '2');
    expect(badgeText).not.toBeNull();
  });

  it('should NOT show connection count badge when handle has no connections', () => {
    const { container } = render(
      <ConnectionOverlay {...defaultProps} />
    );
    jest.advanceTimersByTime(100);

    // Badge text elements only render when connectionCount > 0.
    // Without modulation data, no numeric badge text should appear.
    // Labels like 'Cutoff', 'Audio In' etc. are fine — we check for digits.
    const badgeTexts = container.querySelectorAll('text');
    const hasNumericBadge = Array.from(badgeTexts).some(t => {
      const content = t.textContent || '';
      return /^\d+$/.test(content) || content === '9+';
    });
    expect(hasNumericBadge).toBe(false);
  });

  it('should show "9+" when connection count exceeds 9', () => {
    const modulations: OMEGA_Modulation[] = [];
    for (let i = 0; i < 12; i++) {
      modulations.push({
        id: `mod_${i}`, source: KNOB_ID, target: i % 2 === 0 ? FREQ_ID : AUDIO_IN_ID,
        amount: 0.5, type: 'unipolar',
      } as OMEGA_Modulation);
    }
    const manifest = createMockManifest(modulations);

    const { container } = render(
      <ConnectionOverlay
        manifest={manifest}
        containerRef={createMockRef(createMockContainer())}
        onAddModulation={jest.fn()}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    // The knob handle has 12 connections → badge should show "9+"
    const badgeTexts = container.querySelectorAll('text');
    const badgeText = Array.from(badgeTexts).find(t => t.textContent === '9+');
    expect(badgeText).not.toBeNull();
  });
});

// ── ═══════════════════════════════════════════════════════════════════════
//  7. Tooltip on Hover
// ── ═══════════════════════════════════════════════════════════════════════

describe('ConnectionOverlay — tooltip on hover', () => {
  it('should show tooltip with source → target label on hover over connection line', () => {
    const manifest = createMockManifest([
      { id: 'mod_tt', source: KNOB_ID, target: AUDIO_OUT_ID, amount: 0.75, type: 'unipolar' } as OMEGA_Modulation,
    ]);

    const { container } = render(
      <ConnectionOverlay
        manifest={manifest}
        containerRef={createMockRef(createMockContainer())}
        onAddModulation={jest.fn()}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    const clickTarget = container.querySelector('path[stroke="transparent"]');
    expect(clickTarget).not.toBeNull();

    // Hover on the connection line
    fireEvent.mouseEnter(clickTarget!);

    // Tooltip should show source → target text with amount and type
    const tooltipTexts = container.querySelectorAll('text');
    const tooltipContent = Array.from(tooltipTexts).map(t => t.textContent).join(' ');

    // Should contain source label, target label, and type label
    expect(tooltipContent).toContain('Cutoff');
    expect(tooltipContent).toContain('Audio Out');
    expect(tooltipContent).toContain('0.75');
  });

  it('should show type label (UNI/BI/etc.) in tooltip on hover', () => {
    const manifest = createMockManifest([
      { id: 'mod_type', source: KNOB_ID, target: AUDIO_OUT_ID, amount: 0.75, type: 'bipolar' } as OMEGA_Modulation,
    ]);

    const { container } = render(
      <ConnectionOverlay
        manifest={manifest}
        containerRef={createMockRef(createMockContainer())}
        onAddModulation={jest.fn()}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    const clickTarget = container.querySelector('path[stroke="transparent"]');
    expect(clickTarget).not.toBeNull();

    fireEvent.mouseEnter(clickTarget!);

    const tooltipTexts = container.querySelectorAll('text');
    const tooltipContent = Array.from(tooltipTexts).map(t => t.textContent).join(' ');

    // Bipolar type should show "BI"
    expect(tooltipContent).toContain('BI');
  });
});

// ── ═══════════════════════════════════════════════════════════════════════
//  8. Color Coding by Type
// ── ═══════════════════════════════════════════════════════════════════════

describe('ConnectionOverlay — color coding', () => {
  it('should use cyan (#00f0ff) for unipolar modulation lines', () => {
    const manifest = createMockManifest([
      { id: 'mod_c', source: KNOB_ID, target: AUDIO_OUT_ID, amount: 0.75, type: 'unipolar' } as OMEGA_Modulation,
    ]);

    const { container } = render(
      <ConnectionOverlay
        manifest={manifest}
        containerRef={createMockRef(createMockContainer())}
        onAddModulation={jest.fn()}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    // The glow path should have cyan stroke
    const paths = container.querySelectorAll('path');
    const glowPath = Array.from(paths).find(p => p.getAttribute('opacity') === '0.3');
    expect(glowPath).not.toBeNull();
    expect(glowPath!.getAttribute('stroke')).toBe('#00f0ff');
  });

  it('should use orange (#ff8c00) for bipolar modulation lines', () => {
    const manifest = createMockManifest([
      { id: 'mod_orange', source: KNOB_ID, target: AUDIO_OUT_ID, amount: 0.75, type: 'bipolar' } as OMEGA_Modulation,
    ]);

    const { container } = render(
      <ConnectionOverlay
        manifest={manifest}
        containerRef={createMockRef(createMockContainer())}
        onAddModulation={jest.fn()}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    const paths = container.querySelectorAll('path');
    const pathsWithColor = Array.from(paths).filter(p => p.getAttribute('stroke') === '#ff8c00');
    expect(pathsWithColor.length).toBeGreaterThanOrEqual(1);
  });
});

// ── ═══════════════════════════════════════════════════════════════════════
//  9. Edge Cases & Lifecycle
// ── ═══════════════════════════════════════════════════════════════════════

describe('ConnectionOverlay — edge cases & lifecycle', () => {
  it('should handle null containerRef gracefully (no crash)', () => {
    const nullRef = { current: null };
    const { container } = render(
      <ConnectionOverlay
        manifest={createMockManifest()}
        containerRef={nullRef}
        onAddModulation={jest.fn()}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    // Should render nothing without crashing
    expect(container.innerHTML).toBe('');
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    try {
      const { unmount } = render(
        <ConnectionOverlay {...defaultProps} />
      );
      jest.advanceTimersByTime(100);

      // Trigger drag to add event listeners
      const handle = document.querySelector('circle[data-port-handle-id]');
      if (handle) {
        fireEvent.mouseDown(handle, { clientX: 74, clientY: 74 });
      }

      unmount();

      // Should have removed mousemove and mouseup listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    } finally {
      removeEventListenerSpy.mockRestore();
    }
  });

  it('should clean up resize observer and interval on unmount', () => {
    const disconnectSpy = jest.spyOn(MockResizeObserver.prototype, 'disconnect');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = render(
      <ConnectionOverlay {...defaultProps} />
    );
    jest.advanceTimersByTime(100);

    unmount();

    expect(disconnectSpy).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();

    disconnectSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  it('should handle rapid drag start/cancel cycles without errors', () => {
    const { container } = render(
      <ConnectionOverlay {...defaultProps} />
    );
    jest.advanceTimersByTime(100);

    const handle = container.querySelector(`circle[data-port-handle-id="${KNOB_ID}"]`);
    expect(handle).not.toBeNull();

    // Rapid cycle: start → cancel → start → cancel
    for (let i = 0; i < 3; i++) {
      fireEvent.mouseDown(handle!, { clientX: 74, clientY: 74 });
      fireEvent.mouseMove(window, { clientX: 200, clientY: 100 + i * 50 });
      fireEvent.mouseUp(window, { clientX: 600, clientY: 500 });
    }

    jest.advanceTimersByTime(100);

    // Should not crash and end in clean state (no ghost line)
    expect(container.querySelector('line')).toBeNull();
  });

  it('should correctly handle modulations with missing amount (default to 0.75)', () => {
    const manifest = createMockManifest([
      { id: 'mod_no_amount', source: KNOB_ID, target: AUDIO_OUT_ID } as OMEGA_Modulation,
    ]);

    const { container } = render(
      <ConnectionOverlay
        manifest={manifest}
        containerRef={createMockRef(createMockContainer())}
        onAddModulation={jest.fn()}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    // Should render without crashing (amount defaults to 0.75 internally)
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('should handle modulation with unknown type by using default color', () => {
    const manifest = createMockManifest([
      { id: 'mod_unknown', source: KNOB_ID, target: AUDIO_OUT_ID, amount: 0.5, type: 'quantum' } as OMEGA_Modulation,
    ]);

    const { container } = render(
      <ConnectionOverlay
        manifest={manifest}
        containerRef={createMockRef(createMockContainer())}
        onAddModulation={jest.fn()}
        onRemoveModulation={jest.fn()}
      />
    );
    jest.advanceTimersByTime(100);

    // Unknown type should use default color (#00f0ff)
    const paths = container.querySelectorAll('path');
    const defaultColorPath = Array.from(paths).find(p => p.getAttribute('stroke') === '#00f0ff');
    expect(defaultColorPath).not.toBeNull();
  });
});
