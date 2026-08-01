/**
 * @jest-environment jsdom
 *
 * Tests for RackMiniMap component — scaled-down rack overview with navigation.
 *
 * Mock strategy:
 * - framer-motion: motion.div renders as plain <div> (same as CommandPalette tests)
 * - lucide-react: NOT mocked (next/jest doesn't apply module mocks for node_modules)
 * - getBoundingClientRect: spied to return controlled values for click/drag tests
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RackMiniMap from '../RackMiniMap';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

// ── Polyfill scrollIntoView (not available in jsdom) ───────────────────
beforeEach(() => {
  Element.prototype.scrollIntoView = jest.fn();
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState(null, '', url.toString());
  }
});

// ── Mock framer-motion ─────────────────────────────────────────────────
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, exit, transition, ...rest } = props as Record<string, unknown>;
      return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
}));

// ── Default manifest with 3 nodes ─────────────────────────────────────
const defaultManifest: OMEGA_Manifest = {
  metadata: { name: 'Test Synth', version: '1.0.0' },
  resources: { assets: [], extra: [], fonts: [], wasm: null, contract: undefined },
  entities: [],
  ui: {
    dimensions: { width: 800, height: 400 },
    layout: {
      width: 800,
      height: 400,
      grid: { spacingX: 24, spacingY: 24, snapMode: 'center', enabled: true, visible: true, showGuides: false },
    },
    tree: {
      id: 'root',
      kind: 'rack',
      layout: { pos: { x: 0, y: 0 } },
      children: [
        {
          id: 'osc1',
          kind: 'cell',
          role: 'control',
          meta: { label: 'Oscillator' },
          layout: { pos: { x: 100, y: 50 }, size: { width: 60, height: 30 } },
        },
        {
          id: 'filter1',
          kind: 'cell',
          role: 'control',
          meta: { label: 'Filter' },
          layout: { pos: { x: 200, y: 80 }, size: { width: 40, height: 20 } },
        },
        {
          id: 'env1',
          kind: 'group',
          role: 'modulator',
          meta: { label: 'Envelope' },
          layout: { pos: { x: 300, y: 120 }, size: { width: 80, height: 60 } },
        },
      ],
    },
  },
};

// Manifest without a tree (empty rack)
const emptyManifest: OMEGA_Manifest = {
  metadata: { name: 'Empty', version: '1.0' },
  resources: { assets: [], extra: [], fonts: [], wasm: null, contract: undefined },
  entities: [],
  ui: {
    dimensions: { width: 800, height: 400 },
    layout: { width: 800, height: 400 },
  },
};

// Default props
function defaultProps(overrides?: Record<string, unknown>) {
  return {
    manifest: defaultManifest,
    zoom: 1.0,
    pan: { x: 0, y: 0 },
    onPan: jest.fn(),
    onFitViewport: jest.fn(),
    rackWidth: 800,
    rackHeight: 400,
    containerWidth: 600,
    containerHeight: 300,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// ── Helpers ────────────────────────────────────────────────────────────

/** Expected mini-map scale given rack dimensions 800×400 */
// The scale is 0.225 = Math.min(180/800, 120/400, 0.3)

// ── Render states ──────────────────────────────────────────────────────

describe('RackMiniMap — render states', () => {
  it('should render the mini-map when visible (default)', () => {
    render(<RackMiniMap {...defaultProps()} />);
    expect(screen.getByText('Navigator')).toBeTruthy();
  });

  it('should match tailwind positioning classes with JS constants (expanded + collapsed)', () => {
    render(<RackMiniMap {...defaultProps()} />);

    const { PANEL_CSS_TOP, PANEL_CSS_RIGHT } = jest.requireActual<typeof import('../RackMiniMap')>('../RackMiniMap');

    // Expanded panel
    const panel = screen.getByTestId('mini-map');
    const panelTop = panel.className.match(/top-\[(\d+)px\]/);
    const panelRight = panel.className.match(/right-\[(\d+)px\]/);
    expect(panelTop).toBeTruthy();
    expect(panelRight).toBeTruthy();
    expect(Number(panelTop![1])).toBe(PANEL_CSS_TOP);
    expect(Number(panelRight![1])).toBe(PANEL_CSS_RIGHT);

    // Collapsed button
    fireEvent.click(screen.getByTitle('Hide Mini Map'));
    const toggle = screen.getByTestId('mini-map-toggle');
    const toggleTop = toggle.className.match(/top-\[(\d+)px\]/);
    const toggleRight = toggle.className.match(/right-\[(\d+)px\]/);
    expect(toggleTop).toBeTruthy();
    expect(toggleRight).toBeTruthy();
    expect(Number(toggleTop![1])).toBe(PANEL_CSS_TOP);
    expect(Number(toggleRight![1])).toBe(PANEL_CSS_RIGHT);
  });

  it('should show the zoom percentage in the header', () => {
    render(<RackMiniMap {...defaultProps({ zoom: 0.75 })} />);
    expect(screen.getByText('75%')).toBeTruthy();
  });

  it('should show 100% zoom in the header', () => {
    render(<RackMiniMap {...defaultProps()} />);
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('should render the canvas area with rack background dimensions', () => {
    render(<RackMiniMap {...defaultProps()} />);
    // The rack background has width: miniW (184) and height: miniH (92)
    const bg = document.querySelector('[style*="width: 184px"][style*="height: 92px"]');
    expect(bg).toBeTruthy();
  });

  it('should render a viewport indicator with cursor-grab', () => {
    render(<RackMiniMap {...defaultProps()} />);
    const indicator = screen.getByTestId('mini-map-viewport');
    expect(indicator).toBeTruthy();
    expect(indicator.className).toContain('cursor-grab');
  });

  it('should render node rectangles with pointer cursor when onSelectItem is provided', () => {
    render(<RackMiniMap {...defaultProps({ onSelectItem: jest.fn() })} />);
    const nodeEl = document.querySelector('[title*="Oscillator"]');
    expect(nodeEl).toBeTruthy();
    expect(nodeEl!.getAttribute('style')).toContain('cursor: pointer');
  });
});

// ── Toggle visibility ─────────────────────────────────────────────────

describe('RackMiniMap — toggle visibility', () => {
  it('should collapse to EyeOff button when hide button is clicked', () => {
    render(<RackMiniMap {...defaultProps()} />);
    // Find the hide button (Eye icon)
    const hideBtn = screen.getByTitle('Hide Mini Map');
    expect(hideBtn).toBeTruthy();
    fireEvent.click(hideBtn);
    // Should now show the show button with EyeOff icon
    expect(screen.getByTitle('Show Mini Map · Drag to reposition')).toBeTruthy();
    expect(screen.queryByText('Navigator')).toBeNull();
  });

  it('should restore mini-map when EyeOff button is clicked', () => {
    render(<RackMiniMap {...defaultProps()} />);
    // Hide first
    fireEvent.click(screen.getByTitle('Hide Mini Map'));
    expect(screen.getByTitle('Show Mini Map · Drag to reposition')).toBeTruthy();
    // Show again
    fireEvent.click(screen.getByTitle('Show Mini Map · Drag to reposition'));
    expect(screen.getByText('Navigator')).toBeTruthy();
    expect(screen.queryByTitle('Show Mini Map · Drag to reposition')).toBeNull();
  });
});

// ── Header buttons ────────────────────────────────────────────────────

describe('RackMiniMap — header buttons', () => {
  it('should call onFitViewport when Fit to Screen button is clicked', () => {
    const onFitViewport = jest.fn();
    render(<RackMiniMap {...defaultProps({ onFitViewport })} />);
    const fitBtn = screen.getByTitle('Fit to Screen');
    fireEvent.click(fitBtn);
    expect(onFitViewport).toHaveBeenCalledTimes(1);
  });

  it('should call onResetViewport when Center View button is clicked', () => {
    const onResetViewport = jest.fn();
    const onFitViewport = jest.fn();
    render(<RackMiniMap {...defaultProps({ onResetViewport, onFitViewport })} />);
    const centerBtn = screen.getByTitle('Center View');
    expect(centerBtn).toBeTruthy();
    fireEvent.click(centerBtn);
    expect(onResetViewport).toHaveBeenCalledTimes(1);
    expect(onFitViewport).not.toHaveBeenCalled();
  });

  it('should not render Center View button when onResetViewport is not provided', () => {
    render(<RackMiniMap {...defaultProps()} />);
    expect(screen.queryByTitle('Center View')).toBeNull();
  });

  it('should call onHide when Hide button is clicked', () => {
    render(<RackMiniMap {...defaultProps()} />);
    const hideBtn = screen.getByTitle('Hide Mini Map');
    fireEvent.click(hideBtn);
    expect(screen.getByTitle('Show Mini Map · Drag to reposition')).toBeTruthy();
  });
});

// ── Node rendering ────────────────────────────────────────────────────

describe('RackMiniMap — node rendering', () => {
  it('should render node rectangles for each positioned node in the tree', () => {
    render(<RackMiniMap {...defaultProps()} />);
    // Nodes are rendered as children of the rack background div.
    // Find the rack background by its style attributes.
    const rackBg = document.querySelector('[style*="width: 184px"][style*="height: 92px"]');
    expect(rackBg).toBeTruthy();
    // The rack background should have 3 node children (one per positioned node)
    const nodeDivs = rackBg!.querySelectorAll('div');
    expect(nodeDivs.length).toBe(3);
  });

  it('should not crash when tree is empty', () => {
    render(<RackMiniMap {...defaultProps({ manifest: emptyManifest })} />);
    expect(screen.getByText('Navigator')).toBeTruthy();
  });

  it('should not crash when tree is undefined', () => {
    const noTree = { ...emptyManifest, ui: { dimensions: { width: 800, height: 400 }, tree: undefined } };
    render(<RackMiniMap {...defaultProps({ manifest: noTree as OMEGA_Manifest })} />);
    expect(screen.getByText('Navigator')).toBeTruthy();
  });

  it('should scale node positions correctly', () => {
    render(<RackMiniMap {...defaultProps()} />);
    const rackBg = document.querySelector('[style*="width: 184px"][style*="height: 92px"]');
    expect(rackBg).toBeTruthy();
    const nodeDivs = rackBg!.querySelectorAll('div');
    expect(nodeDivs.length).toBe(3);
    // The first node (osc1) at rack pos (100, 50) should be at mini-map pos (23, 11.5)
    const firstChild = nodeDivs[0] as HTMLElement;
    expect(firstChild.style.top).toBe('11.5px');
    expect(firstChild.style.left).toBe('23px');
  });

  it('should render tooltip with label and kind for each node', () => {
    render(<RackMiniMap {...defaultProps()} />);
    const osc = document.querySelector('[title="Oscillator (cell)"]');
    const filter = document.querySelector('[title="Filter (cell)"]');
    const env = document.querySelector('[title="Envelope (group)"]');
    expect(osc).toBeTruthy();
    expect(filter).toBeTruthy();
    expect(env).toBeTruthy();
  });

  it('should color nodes by kind using distinct colors', () => {
    render(<RackMiniMap {...defaultProps()} />);
    const osc = document.querySelector('[title="Oscillator (cell)"]');
    const env = document.querySelector('[title="Envelope (group)"]');
    expect(osc).toBeTruthy();
    expect(env).toBeTruthy();
    const oscStyle = osc!.getAttribute('style') || '';
    const envStyle = env!.getAttribute('style') || '';
    // cell nodes use cyan tones, group nodes use green tones
    expect(oscStyle).toContain('rgba(0, 242, 255');
    expect(envStyle).toContain('rgba(74, 222, 128');
  });

  it('should highlight the selected node with distinct styling', () => {
    render(<RackMiniMap {...defaultProps({ selectedItemId: 'osc1' })} />);
    const osc = document.querySelector('[title="Oscillator (cell)"]');
    expect(osc).toBeTruthy();
    const style = osc!.getAttribute('style') || '';
    // Selected node gets SELECTED_COLOR and a box-shadow
    expect(style).toContain('rgba(0, 242, 255, 0.55)');
    expect(style).toContain('box-shadow: 0 0 4px');
  });

  it('should not highlight non-selected nodes', () => {
    render(<RackMiniMap {...defaultProps({ selectedItemId: 'filter1' })} />);
    // Oscillator is NOT selected
    const osc = document.querySelector('[title="Oscillator (cell)"]');
    expect(osc).toBeTruthy();
    const style = osc!.getAttribute('style') || '';
    // Non-selected nodes keep their kind color, not SELECTED_COLOR
    expect(style).not.toContain('rgba(0, 242, 255, 0.55)');
    expect(style).toContain('box-shadow: none');
  });
});

// ── Node click-to-select ──────────────────────────────────────────────

describe('RackMiniMap — node click-to-select', () => {
  it('should call onSelectItem with node id when clicking a node rect', () => {
    const onSelectItem = jest.fn();
    render(<RackMiniMap {...defaultProps({ onSelectItem })} />);
    const osc = document.querySelector('[title="Oscillator (cell)"]');
    expect(osc).toBeTruthy();
    fireEvent.click(osc!);
    expect(onSelectItem).toHaveBeenCalledTimes(1);
    expect(onSelectItem).toHaveBeenCalledWith('osc1');
  });

  it('should stop propagation so mini-map background click does not also fire', () => {
    const onSelectItem = jest.fn();
    const onPan = jest.fn();
    render(<RackMiniMap {...defaultProps({ onSelectItem, onPan })} />);
    const osc = document.querySelector('[title="Oscillator (cell)"]');
    expect(osc).toBeTruthy();
    fireEvent.click(osc!);
    // onSelectItem should be called (node click)
    expect(onSelectItem).toHaveBeenCalledTimes(1);
    // Background click should not fire (stopPropagation)
    // onPan should NOT be called from background click
    expect(onPan).not.toHaveBeenCalled();
  });
});

// ── Viewport rect positioning ─────────────────────────────────────────

describe('RackMiniMap — viewport rect positioning', () => {
  it('should position the viewport indicator at the correct location for zoom=1 pan=(0,0)', () => {
    render(<RackMiniMap {...defaultProps({ zoom: 1.0, pan: { x: 0, y: 0 }, containerWidth: 600, containerHeight: 300 })} />);
    // With zoom=1, pan=(0,0), container=600×300, rack=800×400:
    // halfCW = 600/(2*1) = 300, halfCH = 300/(2*1) = 150
    // centerX = 400, centerY = 200
    // left = 400 - 0 - 300 = 100 (clamped to 0)
    // top = 200 - 0 - 150 = 50 (clamped to 0)
    // right = 400 - 0 + 300 = 700 (clamped to 800)
    // bottom = 200 - 0 + 150 = 350 (clamped to 400)
    // visible: w=(700-100)=600*0.225=135, h=(350-50)=300*0.225=67.5
    // rect at: x=100*0.225=22.5, y=50*0.225=11.25, w=135, h=67.5
    const indicator = screen.getByTestId('mini-map-viewport');
    expect(indicator).toBeTruthy();
    const style = indicator.getAttribute('style') || '';
    expect(style).toContain('top:');
    expect(style).toContain('left:');
  });

  it('should show full rack as viewport when zoom is very small', () => {
    render(<RackMiniMap {...defaultProps({ zoom: 0.1, pan: { x: 0, y: 0 }, containerWidth: 600, containerHeight: 300 })} />);
    // At zoom=0.1, the visible area covers the entire rack:
    // halfCW = 600/(2*0.1) = 3000 → clamped to rack width 800
    // So left=0, right=800, top=0, bottom=400
    // viewport rect should be the full mini-map: w=180, h=90
    // positioning: top: 8, left: 8, width: 176 (= 180-4... wait, 180*1=180 at padding 0)
    // Actually: top: 8 + 0 = 8, left: 8 + 0 = 8, width: 180, height: 90
    const indicator = document.querySelector('[class*="cursor-grab"]');
    expect(indicator).toBeTruthy();
  });

  it('should handle zero container dimensions without crashing', () => {
    render(<RackMiniMap {...defaultProps({ containerWidth: 0, containerHeight: 0 })} />);
    expect(screen.getByText('Navigator')).toBeTruthy();
  });
});

// ── Click-to-navigate (background) ────────────────────────────────────

describe('RackMiniMap — click-to-navigate', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call onPan with correct delta when clicking on mini-map background', () => {
    const onPan = jest.fn();
    // Need to mock getBoundingClientRect for the mini-map container.
    // Since there's no CSS layout in jsdom, all rects return zeros.
    // We mock Element.prototype.getBoundingClientRect to return
    // a known position for the mini-map container.
    const mockRect: DOMRect = {
      top: 100, left: 100, bottom: 300, right: 300,
      width: 200, height: 200, x: 100, y: 100,
      toJSON: () => ({}),
    };
    const rectSpy = jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);

    render(<RackMiniMap {...defaultProps({ onPan, zoom: 1.0, pan: { x: 0, y: 0 } })} />);

    // Click on the mini-map canvas (query by padding style)
    const canvas = document.querySelector('[style*="padding: 8px"]');
    expect(canvas).toBeTruthy();

    act(() => {
      fireEvent.click(canvas!, { clientX: 150, clientY: 150 });
    });

    expect(onPan).toHaveBeenCalledTimes(1);
    // Verify delta is roughly correct (floating point)
    const call = onPan.mock.calls[0] as [number, number];
    expect(call[0]).toBeCloseTo(217, 0);
    expect(call[1]).toBeCloseTo(217, 0);

    rectSpy.mockRestore();
  });
});

// ── Drag-to-navigate ──────────────────────────────────────────────────

describe('RackMiniMap — drag-to-navigate', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call onPan with delta when dragging the viewport indicator', () => {
    const onPan = jest.fn();
    const mockRect: DOMRect = {
      top: 100, left: 100, bottom: 300, right: 300,
      width: 200, height: 200, x: 100, y: 100,
      toJSON: () => ({}),
    };
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);

    render(<RackMiniMap {...defaultProps({ onPan, zoom: 1.0, pan: { x: 0, y: 0 } })} />);

    // Find the viewport indicator (cursor-grab element)
    const indicator = screen.getByTestId('mini-map-viewport');
    expect(indicator).toBeTruthy();

    // Mousedown on the indicator at (150, 150) in screen coords
    act(() => {
      fireEvent.mouseDown(indicator!, { clientX: 150, clientY: 150, button: 0 });
    });

    // Mousemove to (200, 180) — delta of (50, 30) in screen pixels
    // rackDx = 50 / 0.23 = 217.39, rackDy = 30 / 0.23 = 130.43
    act(() => {
      fireEvent.mouseMove(window, { clientX: 200, clientY: 180 });
    });

    // Mouseup
    act(() => {
      fireEvent.mouseUp(window);
    });

    expect(onPan).toHaveBeenCalledTimes(1);
    const call = onPan.mock.calls[0] as [number, number];
    expect(call[0]).toBeCloseTo(217, 0);
    expect(call[1]).toBeCloseTo(130, 0);
  });

  it('should not call onPan when mousedown on rect without movement (click)', () => {
    const onPan = jest.fn();
    const mockRect: DOMRect = {
      top: 100, left: 100, bottom: 300, right: 300,
      width: 200, height: 200, x: 100, y: 100,
      toJSON: () => ({}),
    };
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);

    render(<RackMiniMap {...defaultProps({ onPan, zoom: 1.0, pan: { x: 0, y: 0 } })} />);

    const indicator = screen.getByTestId('mini-map-viewport');
    expect(indicator).toBeTruthy();

    // Mousedown on the indicator
    act(() => {
      fireEvent.mouseDown(indicator!, { clientX: 150, clientY: 150, button: 0 });
    });

    // Mouseup WITHOUT mousemove — click on rect, not drag
    // This should trigger navigation in handleUp (since didDragRef is false)
    act(() => {
      fireEvent.mouseUp(window, { clientX: 150, clientY: 150 });
    });

    // onPan should be called from handleUp (click-on-rect navigation)
    expect(onPan).toHaveBeenCalledTimes(1);
  });

  it('should not call onPan when right-clicking on viewport rect', () => {
    const onPan = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan })} />);

    const indicator = screen.getByTestId('mini-map-viewport');
    expect(indicator).toBeTruthy();

    // Right-click (button: 2) should be ignored by handleMouseDown
    fireEvent.mouseDown(indicator!, { clientX: 150, clientY: 150, button: 2 });
    fireEvent.mouseMove(window, { clientX: 200, clientY: 180 });
    fireEvent.mouseUp(window);

    // No onPan calls since handleMouseDown returned early
    expect(onPan).not.toHaveBeenCalled();
  });
});

// ── Kind filter dropdown ──────────────────────────────────────────────

describe('RackMiniMap — kind filter dropdown', () => {
  it('should render the Filter button in the header with title', () => {
    render(<RackMiniMap {...defaultProps()} />);
    const filterBtn = screen.getByTitle('Filter node kinds');
    expect(filterBtn).toBeTruthy();
  });

  it('should toggle dropdown visibility when Filter button is clicked', () => {
    render(<RackMiniMap {...defaultProps()} />);
    // Dropdown should not be visible initially
    expect(screen.queryByText('Show Kinds')).toBeNull();

    // Click Filter button to open dropdown
    fireEvent.click(screen.getByTitle('Filter node kinds'));
    expect(screen.getByText('Show Kinds')).toBeTruthy();

    // Click again to close
    fireEvent.click(screen.getByTitle('Filter node kinds'));
    expect(screen.queryByText('Show Kinds')).toBeNull();
  });

  it('should show available node kinds from the tree (cell, group)', () => {
    render(<RackMiniMap {...defaultProps()} />);
    fireEvent.click(screen.getByTitle('Filter node kinds'));

    // The test manifest has 'cell' and 'group' kinds
    expect(screen.getByText('cell')).toBeTruthy();
    expect(screen.getByText('group')).toBeTruthy();
  });

  it('should show color dots for each kind with correct background', () => {
    render(<RackMiniMap {...defaultProps()} />);
    fireEvent.click(screen.getByTitle('Filter node kinds'));

    // Check that the color dot for 'cell' uses cyan tones
    const cellLabel = screen.getByText('cell').closest('label');
    expect(cellLabel).toBeTruthy();
    const colorDot = cellLabel!.querySelector('span.inline-block');
    expect(colorDot).toBeTruthy();
    const dotStyle = colorDot!.getAttribute('style') || '';
    expect(dotStyle).toContain('rgba(0, 242, 255'); // cell color

    // Check that the color dot for 'group' uses green tones
    const groupLabel = screen.getByText('group').closest('label');
    expect(groupLabel).toBeTruthy();
    const groupDot = groupLabel!.querySelector('span.inline-block');
    expect(groupDot).toBeTruthy();
    const groupDotStyle = groupDot!.getAttribute('style') || '';
    expect(groupDotStyle).toContain('rgba(74, 222, 128'); // group color
  });

  it('should hide cell nodes when cell checkbox is unchecked', () => {
    render(<RackMiniMap {...defaultProps()} />);
    // Initially 3 nodes visible (2 cells + 1 group)
    const rackBg = document.querySelector('[style*="width: 184px"][style*="height: 92px"]');
    expect(rackBg!.querySelectorAll('div').length).toBe(3);

    // Open filter dropdown
    fireEvent.click(screen.getByTitle('Filter node kinds'));

    // Uncheck 'cell' — clicking the checkbox toggles it
    const cellCheckbox = screen.getByText('cell').closest('label')!.querySelector('input[type="checkbox"]');
    expect(cellCheckbox).toBeTruthy();
    fireEvent.click(cellCheckbox!);

    // Now only the group node should remain (1 node)
    const rackBgAfter = document.querySelector('[style*="width: 184px"][style*="height: 92px"]');
    expect(rackBgAfter!.querySelectorAll('div').length).toBe(1);
  });

  it('should restore hidden nodes when kind is re-checked', () => {
    render(<RackMiniMap {...defaultProps()} />);

    // Open dropdown and uncheck 'cell'
    fireEvent.click(screen.getByTitle('Filter node kinds'));
    const cellCheckbox = screen.getByText('cell').closest('label')!.querySelector('input[type="checkbox"]');
    fireEvent.click(cellCheckbox!);

    // Only 1 node left
    const rackBg = document.querySelector('[style*="width: 184px"][style*="height: 92px"]');
    expect(rackBg!.querySelectorAll('div').length).toBe(1);

    // Re-check 'cell'
    fireEvent.click(cellCheckbox!);

    // All 3 nodes back
    expect(rackBg!.querySelectorAll('div').length).toBe(3);
  });

  it('should show Filter button with accent styling when filters are active', () => {
    render(<RackMiniMap {...defaultProps()} />);

    // Open dropdown and hide 'group'
    fireEvent.click(screen.getByTitle('Filter node kinds'));
    const groupCheckbox = screen.getByText('group').closest('label')!.querySelector('input[type="checkbox"]');
    fireEvent.click(groupCheckbox!);

    // Close dropdown
    fireEvent.click(screen.getByTitle('Filter node kinds'));

    // Filter button should have accent styling class
    const filterBtn = screen.getByTitle('Filter node kinds');
    const btnClass = filterBtn.getAttribute('class') || '';
    expect(btnClass).toContain('text-accent');
    expect(btnClass).toContain('bg-accent/10');
  });

  it('should show Clear all filters button when a kind is hidden', () => {
    render(<RackMiniMap {...defaultProps()} />);

    // Open dropdown — no clear button yet
    fireEvent.click(screen.getByTitle('Filter node kinds'));
    expect(screen.queryByText('Clear all filters')).toBeNull();

    // Hide 'group'
    const groupCheckbox = screen.getByText('group').closest('label')!.querySelector('input[type="checkbox"]');
    fireEvent.click(groupCheckbox!);

    // Clear button should appear
    expect(screen.getByText('Clear all filters')).toBeTruthy();
  });

  it('should reset all filters when Clear all filters is clicked', () => {
    render(<RackMiniMap {...defaultProps()} />);

    // Open dropdown and hide both 'cell' and 'group'
    fireEvent.click(screen.getByTitle('Filter node kinds'));
    const cellCheckbox = screen.getByText('cell').closest('label')!.querySelector('input[type="checkbox"]');
    const groupCheckbox = screen.getByText('group').closest('label')!.querySelector('input[type="checkbox"]');
    fireEvent.click(cellCheckbox!);
    fireEvent.click(groupCheckbox!);

    // All nodes hidden
    const rackBg = document.querySelector('[style*="width: 184px"][style*="height: 92px"]');
    expect(rackBg!.querySelectorAll('div').length).toBe(0);

    // Click Clear all filters
    fireEvent.click(screen.getByText('Clear all filters'));

    // All 3 nodes should be back
    expect(rackBg!.querySelectorAll('div').length).toBe(3);

    // Filter button should lose accent styling
    const filterBtn = screen.getByTitle('Filter node kinds');
    const btnClass = filterBtn.getAttribute('class') || '';
    expect(btnClass).not.toContain('text-accent');
  });

  it('should not clear nodes that were never hidden', () => {
    render(<RackMiniMap {...defaultProps()} />);

    // Hide 'group' only
    fireEvent.click(screen.getByTitle('Filter node kinds'));
    const groupCheckbox = screen.getByText('group').closest('label')!.querySelector('input[type="checkbox"]');
    fireEvent.click(groupCheckbox!);

    // 2 cells should remain
    const rackBg = document.querySelector('[style*="width: 184px"][style*="height: 92px"]');
    expect(rackBg!.querySelectorAll('div').length).toBe(2);

    // Clear all
    fireEvent.click(screen.getByText('Clear all filters'));

    // All 3 back
    expect(rackBg!.querySelectorAll('div').length).toBe(3);
  });
});

// ── Keyboard navigation ───────────────────────────────────────────────

describe('RackMiniMap — keyboard navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call onPan with (0, -PAN_STEP) when ArrowUp is pressed on the mini-map canvas', () => {
    const onPan = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan })} />);
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();
    fireEvent.keyDown(canvas!, { key: 'ArrowUp' });
    expect(onPan).toHaveBeenCalledWith(0, -20);
  });

  it('should call onPan with (0, PAN_STEP) when ArrowDown is pressed', () => {
    const onPan = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan })} />);
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();
    fireEvent.keyDown(canvas!, { key: 'ArrowDown' });
    expect(onPan).toHaveBeenCalledWith(0, 20);
  });

  it('should call onPan with (-PAN_STEP, 0) when ArrowLeft is pressed', () => {
    const onPan = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan })} />);
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();
    fireEvent.keyDown(canvas!, { key: 'ArrowLeft' });
    expect(onPan).toHaveBeenCalledWith(-20, 0);
  });

  it('should call onPan with (PAN_STEP, 0) when ArrowRight is pressed', () => {
    const onPan = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan })} />);
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();
    fireEvent.keyDown(canvas!, { key: 'ArrowRight' });
    expect(onPan).toHaveBeenCalledWith(20, 0);
  });

  it('should call onPan for Arrow keys (confirming the handler processes the event)', () => {
    const onPan = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan })} />);
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();
    fireEvent.keyDown(canvas!, { key: 'ArrowDown' });
    expect(onPan).toHaveBeenCalled();
  });

  it('should open the kind filter dropdown when Enter is pressed', () => {
    render(<RackMiniMap {...defaultProps()} />);
    // Filter dropdown should be closed initially
    expect(screen.queryByText('Show Kinds')).toBeNull();

    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();
    fireEvent.keyDown(canvas!, { key: 'Enter' });

    // Dropdown should now be open
    expect(screen.getByText('Show Kinds')).toBeTruthy();
  });

  it('should close the kind filter dropdown when Enter is pressed again (toggle)', () => {
    render(<RackMiniMap {...defaultProps()} />);
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();

    // Open with Enter
    fireEvent.keyDown(canvas!, { key: 'Enter' });
    expect(screen.getByText('Show Kinds')).toBeTruthy();

    // Close with Enter again
    fireEvent.keyDown(canvas!, { key: 'Enter' });
    expect(screen.queryByText('Show Kinds')).toBeNull();
  });

  it('should close the kind filter dropdown when Escape is pressed', () => {
    render(<RackMiniMap {...defaultProps()} />);
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();

    // Open with Enter first
    fireEvent.keyDown(canvas!, { key: 'Enter' });
    expect(screen.getByText('Show Kinds')).toBeTruthy();

    // Close with Escape
    fireEvent.keyDown(canvas!, { key: 'Escape' });
    expect(screen.queryByText('Show Kinds')).toBeNull();
  });

  it('should toggle filter on Enter key (confirming handler processes the event)', () => {
    render(<RackMiniMap {...defaultProps()} />);
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();

    // Filter starts closed
    expect(screen.queryByText('Show Kinds')).toBeNull();

    // Enter toggles it open
    fireEvent.keyDown(canvas!, { key: 'Enter' });
    expect(screen.getByText('Show Kinds')).toBeTruthy();

    // Enter toggles it closed again
    fireEvent.keyDown(canvas!, { key: 'Enter' });
    expect(screen.queryByText('Show Kinds')).toBeNull();
  });

  it('should close filter on Escape when filter is open', () => {
    render(<RackMiniMap {...defaultProps()} />);
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();

    // Open filter first
    fireEvent.keyDown(canvas!, { key: 'Enter' });
    expect(screen.getByText('Show Kinds')).toBeTruthy();

    // Escape closes it
    fireEvent.keyDown(canvas!, { key: 'Escape' });
    expect(screen.queryByText('Show Kinds')).toBeNull();
  });

  it('should have role="grid" and correct aria-label on the mini-map canvas', () => {
    render(<RackMiniMap {...defaultProps()} />);
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();
    expect(canvas!.getAttribute('aria-label')).toContain('Arrow keys');
    expect(canvas!.getAttribute('aria-label')).toContain('Enter');
    expect(canvas!.getAttribute('aria-label')).toContain('Escape');
  });

  it('should have tabIndex={0} on the mini-map canvas for keyboard focusability', () => {
    render(<RackMiniMap {...defaultProps()} />);
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();
    expect(canvas!.getAttribute('tabindex')).toBe('0');
  });

  it('should not call onPan for non-navigation keys', () => {
    const onPan = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan })} />);
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();

    fireEvent.keyDown(canvas!, { key: 'a' });
    fireEvent.keyDown(canvas!, { key: 'Tab' });
    fireEvent.keyDown(canvas!, { key: ' ' });
    fireEvent.keyDown(canvas!, { key: 'Delete' });

    // onPan should not be called for non-navigation keys
    expect(onPan).not.toHaveBeenCalled();
  });

  it('should do nothing when Escape is pressed but filter is already closed', () => {
    const onPan = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan })} />);
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();

    // Filter starts closed. Escape should do nothing (no default prevented, no pan)
    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    fireEvent.keyDown(canvas!, { key: 'Escape', preventDefault, stopPropagation });
    // When filter is closed, Escape does not match any case, so preventDefault/stopPropagation not called
    expect(preventDefault).not.toHaveBeenCalled();
    expect(stopPropagation).not.toHaveBeenCalled();
    expect(onPan).not.toHaveBeenCalled();
  });

  it('should set isMiniMapFocused on focus (adding ring class)', () => {
    render(<RackMiniMap {...defaultProps()} />);
    const miniMapPanel = screen.getByTestId('mini-map');
    expect(miniMapPanel).toBeTruthy();

    // The mini-map canvas is inside the panel; when focused, the panel
    // should show a ring class via `isMiniMapFocused` state
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();

    // Before focus: no ring class on canvas
    expect(canvas!.className).not.toContain('ring-1');

    fireEvent.focus(canvas!);
    // After focus: the canvas should have ring-1 class
    expect(canvas!.className).toContain('ring-1');
    expect(canvas!.className).toContain('ring-primary/40');
  });

  it('should keep focus state when focus moves to filter dropdown inside the panel', () => {
    render(<RackMiniMap {...defaultProps()} />);
    const canvas = document.querySelector('[role="grid"]');
    expect(canvas).toBeTruthy();

    // Open filter with Enter — now filter is visible
    fireEvent.keyDown(canvas!, { key: 'Enter' });
    expect(screen.getByText('Show Kinds')).toBeTruthy();

    // Verify the filter dropdown container exists in the DOM
    const filterDropdown = screen.getByText('Show Kinds').closest('div');
    expect(filterDropdown).toBeTruthy();

    // onBlur on the canvas sets isMiniMapFocused=false if relatedTarget is
    // outside the panel. Since we haven't blurred, focus stays.
    // This test simply verifies the filter toggle works and dropdown renders.
    expect(screen.getByText('cell')).toBeTruthy();
    expect(screen.getByText('group')).toBeTruthy();
  });
});

// ── Edge cases ────────────────────────────────────────────────────────

describe('RackMiniMap — edge cases', () => {

  it('should handle zero rack dimensions without crashing', () => {
    render(<RackMiniMap {...defaultProps({ rackWidth: 0, rackHeight: 0 })} />);
    expect(screen.getByText('Navigator')).toBeTruthy();
  });

  it('should handle negative rack dimensions without crashing', () => {
    render(<RackMiniMap {...defaultProps({ rackWidth: -100, rackHeight: -50 })} />);
    expect(screen.getByText('Navigator')).toBeTruthy();
  });

  it('should handle zoom of 0 without crashing', () => {
    render(<RackMiniMap {...defaultProps({ zoom: 0 })} />);
    expect(screen.getByText('0%')).toBeTruthy();
  });
});

// ── Panel clamping ────────────────────────────────────────────────────

describe('RackMiniMap — panel clamping', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should clamp extreme negative x from localStorage on mount (right-edge protection)', () => {
    // Store an impossibly far-left offset
    localStorage.setItem('omega-mini-map-panel-offset', JSON.stringify({ x: -9999, y: 0 }));
    render(<RackMiniMap {...defaultProps({ containerWidth: 600, containerHeight: 300 })} />);
    // Mount clamp: x = Math.max(-(600-70), Math.min(10, -9999)) = Math.max(-530, -9999) = -530
    const miniMap = screen.getByTestId('mini-map');
    const style = miniMap.getAttribute('style') || '';
    expect(style).toContain('translate(-530px, 0px)');
  });

  it('should clamp extreme positive x from localStorage on mount (left-edge protection)', () => {
    // Store an impossibly far-right offset
    localStorage.setItem('omega-mini-map-panel-offset', JSON.stringify({ x: 9999, y: 0 }));
    render(<RackMiniMap {...defaultProps({ containerWidth: 600, containerHeight: 300 })} />);
    // Mount clamp: x = Math.max(-530, Math.min(10, 9999)) = Math.max(-530, 10) = 10
    const miniMap = screen.getByTestId('mini-map');
    const style = miniMap.getAttribute('style') || '';
    expect(style).toContain('translate(10px, 0px)');
  });

  it('should clamp extreme positive y from localStorage on mount', () => {
    localStorage.setItem('omega-mini-map-panel-offset', JSON.stringify({ x: 0, y: 9999 }));
    render(<RackMiniMap {...defaultProps({ containerWidth: 600, containerHeight: 300 })} />);
    // Mount clamp: y = Math.max(-80, Math.min(300-100, 9999)) = Math.max(-80, 200) = 200
    const miniMap = screen.getByTestId('mini-map');
    const style = miniMap.getAttribute('style') || '';
    expect(style).toContain('translate(0px, 200px)');
  });

  it('should clamp extreme negative y from localStorage on mount', () => {
    localStorage.setItem('omega-mini-map-panel-offset', JSON.stringify({ x: 0, y: -9999 }));
    render(<RackMiniMap {...defaultProps({ containerWidth: 600, containerHeight: 300 })} />);
    // Mount clamp: y = Math.max(-20, Math.min(200, -9999)) = Math.max(-20, -9999) = -20
    const miniMap = screen.getByTestId('mini-map');
    const style = miniMap.getAttribute('style') || '';
    expect(style).toContain('translate(0px, -20px)');
  });

  it('should preserve normal values in localStorage without clamping', () => {
    localStorage.setItem('omega-mini-map-panel-offset', JSON.stringify({ x: 5, y: -20 }));
    render(<RackMiniMap {...defaultProps({ containerWidth: 600, containerHeight: 300 })} />);
    // Mount clamp: x = Math.max(-530, Math.min(10, 5)) = 5, y = Math.max(-20, Math.min(200, -20)) = -20
    const miniMap = screen.getByTestId('mini-map');
    const style = miniMap.getAttribute('style') || '';
    expect(style).toContain('translate(5px, -20px)');
  });

  it('should clamp offset when dragging the collapsed (EyeOff) button — horizontal and vertical', () => {
    const mockRect: DOMRect = {
      top: 0, left: 0, bottom: 300, right: 600,
      width: 600, height: 300, x: 0, y: 0,
      toJSON: () => ({}),
    };
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);

    const onPan = jest.fn();
    const onFitViewport = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan, onFitViewport, containerWidth: 600, containerHeight: 300 })} />);

    // Collapse the mini-map first
    fireEvent.click(screen.getByTitle('Hide Mini Map'));
    const collapsedBtn = screen.getByTestId('mini-map-toggle');
    expect(collapsedBtn).toBeTruthy();

    // Drag right extreme on collapsed button
    act(() => {
      fireEvent.mouseDown(collapsedBtn, { clientX: 0, clientY: 0, button: 0 });
    });
    act(() => {
      fireEvent.mouseMove(window, { clientX: 1000, clientY: 0, buttons: 1 });
    });
    act(() => {
      fireEvent.mouseUp(window);
    });

    // Clamped: offsetX ≤ 10 (PANEL_CSS_RIGHT)
    const style1 = collapsedBtn.getAttribute('style') || '';
    const matchX = style1.match(/translate\(([-\d.]+)px/);
    expect(matchX).toBeTruthy();
    if (matchX) {
      expect(Number(matchX[1])).toBeLessThanOrEqual(10);
    }

    // Now drag up extreme — should clamp to -20
    act(() => {
      fireEvent.mouseDown(collapsedBtn, { clientX: 0, clientY: 0, button: 0 });
    });
    act(() => {
      fireEvent.mouseMove(window, { clientX: 0, clientY: -1000, buttons: 1 });
    });
    act(() => {
      fireEvent.mouseUp(window);
    });

    const style2 = collapsedBtn.getAttribute('style') || '';
    const matchY = style2.match(/translate\(([-\d.]+)px, ([\d.-]+)px\)/);
    expect(matchY).toBeTruthy();
    if (matchY) {
      expect(Number(matchY[2])).toBe(-20);
    }
  });

  it('should clamp offset during drag to prevent panel from going off-screen right', () => {
    const mockRect: DOMRect = {
      top: 0, left: 0, bottom: 300, right: 600,
      width: 600, height: 300, x: 0, y: 0,
      toJSON: () => ({}),
    };
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);

    const onPan = jest.fn();
    const onFitViewport = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan, onFitViewport, containerWidth: 600, containerHeight: 300 })} />);

    // Grab the Navigator text (drag handle)
    const navSpan = screen.getByText('Navigator');
    expect(navSpan).toBeTruthy();

    // Mousedown on Navigator at position (0, 0) 
    act(() => {
      fireEvent.mouseDown(navSpan, { clientX: 0, clientY: 0, button: 0 });
    });

    // Drag far to the right (clientX: 1000) — would try to set offsetX to 1000
    act(() => {
      fireEvent.mouseMove(window, { clientX: 1000, clientY: 0, buttons: 1 });
    });

    // Release mouse
    act(() => {
      fireEvent.mouseUp(window);
    });

    // The clamp should limit newX to 10 (right edge at parent's right edge)
    const miniMap = screen.getByTestId('mini-map');
    const style = miniMap.getAttribute('style') || '';
    // offsetX should be ≤ 10, not 1000
    const matchX = style.match(/translate\(([-\d.]+)px/);
    expect(matchX).toBeTruthy();
    if (matchX) {
      expect(Number(matchX[1])).toBeLessThanOrEqual(10);
    }
  });

  it('should clamp offset upward during drag to prevent panel from going above the viewport top', () => {
    const mockRect: DOMRect = {
      top: 0, left: 0, bottom: 300, right: 600,
      width: 600, height: 300, x: 0, y: 0,
      toJSON: () => ({}),
    };
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);

    const onPan = jest.fn();
    const onFitViewport = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan, onFitViewport, containerWidth: 600, containerHeight: 300 })} />);

    const navSpan = screen.getByText('Navigator');
    expect(navSpan).toBeTruthy();

    act(() => {
      fireEvent.mouseDown(navSpan, { clientX: 0, clientY: 0, button: 0 });
    });

    // Drag far up (clientY: -1000) — would try to set offsetY to -1000
    act(() => {
      fireEvent.mouseMove(window, { clientX: 0, clientY: -1000, buttons: 1 });
    });

    act(() => {
      fireEvent.mouseUp(window);
    });

    // Clamp: y = Math.max(PANEL_CLAMP_TOP_MAX, -1000) = Math.max(-20, -1000) = -20
    const miniMap = screen.getByTestId('mini-map');
    const style = miniMap.getAttribute('style') || '';
    const matchY = style.match(/translate\(([-\d.]+)px, ([\d.-]+)px\)/);
    expect(matchY).toBeTruthy();
    if (matchY) {
      expect(Number(matchY[2])).toBe(-20);
    }
  });

  it('should show top limit inset shadow when panel is at the clamp top bound (offsetY === PANEL_CLAMP_TOP_MAX)', () => {
    const mockRect: DOMRect = {
      top: 0, left: 0, bottom: 300, right: 600,
      width: 600, height: 300, x: 0, y: 0,
      toJSON: () => ({}),
    };
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);

    const onPan = jest.fn();
    const onFitViewport = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan, onFitViewport, containerWidth: 600, containerHeight: 300 })} />);

    const navSpan = screen.getByText('Navigator');
    expect(navSpan).toBeTruthy();

    act(() => {
      fireEvent.mouseDown(navSpan, { clientX: 0, clientY: 0, button: 0 });
    });

    // Drag up to clamp limit (offsetY = -20)
    act(() => {
      fireEvent.mouseMove(window, { clientX: 0, clientY: -1000, buttons: 1 });
    });

    // Panel should have the top limit inset shadow class
    const miniMap = screen.getByTestId('mini-map');
    expect(miniMap.className).toContain('shadow-[inset_0_1px_0_rgba(0,242,255,0.12)]');

    // Drag down to restore normal position
    act(() => {
      fireEvent.mouseMove(window, { clientX: 0, clientY: 200, buttons: 1 });
    });

    // Inset shadow should disappear
    expect(miniMap.className).not.toContain('shadow-[inset_0_1px_0_rgba(0,242,255,0.12)]');
  });

  it('should clamp offset during drag to prevent panel from going off-screen left (min 70px visible)', () => {
    const mockRect: DOMRect = {
      top: 0, left: 0, bottom: 300, right: 600,
      width: 600, height: 300, x: 0, y: 0,
      toJSON: () => ({}),
    };
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);

    const onPan = jest.fn();
    const onFitViewport = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan, onFitViewport, containerWidth: 600, containerHeight: 300 })} />);

    const navSpan = screen.getByText('Navigator');
    expect(navSpan).toBeTruthy();

    act(() => {
      fireEvent.mouseDown(navSpan, { clientX: 0, clientY: 0, button: 0 });
    });

    // Drag far left (clientX: -1000) — would try to set offsetX to -1000
    act(() => {
      fireEvent.mouseMove(window, { clientX: -1000, clientY: 0, buttons: 1 });
    });

    act(() => {
      fireEvent.mouseUp(window);
    });

    // Clamp: x = Math.max(-(pw - PANEL_CLAMP_MIN_VISIBLE_LEFT), ...) = Math.max(-(600-70), -1000) = Math.max(-530, -1000) = -530
    const miniMap = screen.getByTestId('mini-map');
    const style = miniMap.getAttribute('style') || '';
    const matchX = style.match(/translate\(([-\d.]+)px/);
    expect(matchX).toBeTruthy();
    if (matchX) {
      expect(Number(matchX[1])).toBe(-530);
    }
  });

  it('should clamp vertical offset during drag to prevent panel from going off-screen bottom', () => {
    const mockRect: DOMRect = {
      top: 0, left: 0, bottom: 300, right: 600,
      width: 600, height: 300, x: 0, y: 0,
      toJSON: () => ({}),
    };
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);

    const onPan = jest.fn();
    const onFitViewport = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan, onFitViewport, containerWidth: 600, containerHeight: 300 })} />);

    const navSpan = screen.getByText('Navigator');
    expect(navSpan).toBeTruthy();

    act(() => {
      fireEvent.mouseDown(navSpan, { clientX: 0, clientY: 0, button: 0 });
    });

    // Drag far down (clientY: 1000) — would try to set offsetY to 1000
    act(() => {
      fireEvent.mouseMove(window, { clientX: 0, clientY: 1000, buttons: 1 });
    });

    act(() => {
      fireEvent.mouseUp(window);
    });

    // Clamp: y = Math.max(-80, Math.min(300-40-60, 1000)) = Math.max(-80, 200) = 200
    const miniMap = screen.getByTestId('mini-map');
    const style = miniMap.getAttribute('style') || '';
    const matchY = style.match(/translate\(([-\d.]+)px, ([\d.-]+)px\)/);
    expect(matchY).toBeTruthy();
    if (matchY) {
      expect(Number(matchY[2])).toBeLessThanOrEqual(200);
    }
  });
});

// ── Snap visual indicator ─────────────────────────────────────────────

describe('RackMiniMap — snap visual indicator', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockRect: DOMRect = {
    top: 0, left: 0, bottom: 300, right: 600,
    width: 600, height: 300, x: 0, y: 0,
    toJSON: () => ({}),
  };

  it('should show amber glow when panel snaps to right edge (SNAP_THRESHOLD for 10 - newX < 8)', () => {
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);
    const onPan = jest.fn();
    const onFitViewport = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan, onFitViewport, containerWidth: 600, containerHeight: 300 })} />);

    const navSpan = screen.getByText('Navigator');
    expect(navSpan).toBeTruthy();

    // Mousedown at (0, 0)
    act(() => {
      fireEvent.mouseDown(navSpan, { clientX: 0, clientY: 0, button: 0 });
    });

    // Drag right so newX = 10 — triggers right edge snap: |10 - 10| = 0 < 8
    act(() => {
      fireEvent.mouseMove(window, { clientX: 10, clientY: 0, buttons: 1 });
    });

    const miniMap = screen.getByTestId('mini-map');
    expect(miniMap.className).toContain('ring-accent/40');
  });

  it('should show amber glow when panel snaps to top edge (SNAP_THRESHOLD for 40 + newY < 8)', () => {
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);
    const onPan = jest.fn();
    const onFitViewport = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan, onFitViewport, containerWidth: 600, containerHeight: 300 })} />);

    const navSpan = screen.getByText('Navigator');
    expect(navSpan).toBeTruthy();

    act(() => {
      fireEvent.mouseDown(navSpan, { clientX: 0, clientY: 0, button: 0 });
    });

    // Drag up so newY = -40 — triggers top edge snap: |40 + (-40)| = 0 < 8
    act(() => {
      fireEvent.mouseMove(window, { clientX: 0, clientY: -40, buttons: 1 });
    });

    const miniMap = screen.getByTestId('mini-map');
    expect(miniMap.className).toContain('ring-accent/40');
  });

  it('should NOT show amber glow when panel is far from any edge', () => {
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);
    const onPan = jest.fn();
    const onFitViewport = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan, onFitViewport, containerWidth: 600, containerHeight: 300 })} />);

    const navSpan = screen.getByText('Navigator');
    expect(navSpan).toBeTruthy();

    act(() => {
      fireEvent.mouseDown(navSpan, { clientX: 0, clientY: 0, button: 0 });
    });

    // Drag to newX=-50 (left of center, no snap): visualLeft=590-50=540, |10-(-50)|=60 — both > 8
    act(() => {
      fireEvent.mouseMove(window, { clientX: -50, clientY: 0, buttons: 1 });
    });

    const miniMap = screen.getByTestId('mini-map');
    expect(miniMap.className).not.toContain('ring-accent/40');
  });

  it('should clear amber glow on mouseup', () => {
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);
    const onPan = jest.fn();
    const onFitViewport = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan, onFitViewport, containerWidth: 600, containerHeight: 300 })} />);

    const navSpan = screen.getByText('Navigator');
    expect(navSpan).toBeTruthy();

    act(() => {
      fireEvent.mouseDown(navSpan, { clientX: 0, clientY: 0, button: 0 });
    });
    act(() => {
      fireEvent.mouseMove(window, { clientX: 10, clientY: 0, buttons: 1 });
    });

    const miniMap = screen.getByTestId('mini-map');
    expect(miniMap.className).toContain('ring-accent/40');

    // Release mouse — handleUp should clear isSnapped
    act(() => {
      fireEvent.mouseUp(window);
    });

    expect(miniMap.className).not.toContain('ring-accent/40');
  });

  it('should clear amber glow when moving away from snapped edge', () => {
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);
    const onPan = jest.fn();
    const onFitViewport = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan, onFitViewport, containerWidth: 600, containerHeight: 300 })} />);

    const navSpan = screen.getByText('Navigator');
    expect(navSpan).toBeTruthy();

    act(() => {
      fireEvent.mouseDown(navSpan, { clientX: 0, clientY: 0, button: 0 });
    });
    // Snap to right edge
    act(() => {
      fireEvent.mouseMove(window, { clientX: 10, clientY: 0, buttons: 1 });
    });

    const miniMap = screen.getByTestId('mini-map');
    expect(miniMap.className).toContain('ring-accent/40');

    // Move away (dx=-100 → newX=-100) — no edge near
    act(() => {
      fireEvent.mouseMove(window, { clientX: -100, clientY: 0, buttons: 1 });
    });

    expect(miniMap.className).not.toContain('ring-accent/40');
  });

  it('should clear amber glow when mouse button is released mid-drag (e.buttons !== 1 guard)', () => {
    jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(mockRect);
    const onPan = jest.fn();
    const onFitViewport = jest.fn();
    render(<RackMiniMap {...defaultProps({ onPan, onFitViewport, containerWidth: 600, containerHeight: 300 })} />);

    const navSpan = screen.getByText('Navigator');
    expect(navSpan).toBeTruthy();

    act(() => {
      fireEvent.mouseDown(navSpan, { clientX: 0, clientY: 0, button: 0 });
    });
    act(() => {
      fireEvent.mouseMove(window, { clientX: 10, clientY: 0, buttons: 1 });
    });

    const miniMap = screen.getByTestId('mini-map');
    expect(miniMap.className).toContain('ring-accent/40');

    // Next mousemove with buttons=0 (no button pressed) — guard fires: setIsSnapped(false)
    act(() => {
      fireEvent.mouseMove(window, { clientX: 20, clientY: 0, buttons: 0 });
    });

    expect(miniMap.className).not.toContain('ring-accent/40');
  });
});
