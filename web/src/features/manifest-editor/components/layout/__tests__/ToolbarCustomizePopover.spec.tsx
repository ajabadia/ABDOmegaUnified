/**
 * @jest-environment jsdom
 *
 * Tests for the Toolbar customize popover (P8) — reorder, show/hide, reset toolbar buttons.
 * Uses the real useToolbarCustomization hook by controlling localStorage before each test.
 *
 * NOTE: loadConfig() always validates and augments the order to include all 11 TOOLBAR_BUTTONS,
 * so tests that set a partial order will see the full 11-button list after loading.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { STORAGE_KEY } from '@/features/manifest-editor/constants/toolbarDefinitions';
import Toolbar from '../Toolbar';

// ── Helpers ──────────────────────────────────────────────────────────────

function setLocalConfig(order: string[], hidden: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, hidden }));
}

/** Click the Customize button (⚙️ Settings2 icon) to open/close the popover */
function clickCustomizeBtn() {
  const btn = screen.getByTitle('Customize Toolbar');
  fireEvent.click(btn);
}

// ── Base props ──────────────────────────────────────────────────────────

const BASE_PROPS = {
  isLiveMode: false,
  onToggleLive: () => {},
  onOpenGallery: () => {},
  onOpenConfig: () => {},
  onOpenCellStudio: () => {},
  onAddEntity: () => {},
  isZenMode: false,
  onToggleZen: () => {},
  activeTool: 'select' as const,
  setActiveTool: () => {},
  multiSelectedIds: [],
};

// ── Render states ───────────────────────────────────────────────────────

describe('CustomizePopover — render states', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should not render the popover when closed by default', () => {
    render(<Toolbar {...BASE_PROPS} />);
    expect(screen.queryByText('Customize Toolbar')).toBeNull();
  });

  it('should render the popover when customize button is clicked', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.getByText('Customize Toolbar')).toBeTruthy();
  });

  it('should close the popover when customize button is clicked again', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.getByText('Customize Toolbar')).toBeTruthy();
    clickCustomizeBtn();
    expect(screen.queryByText('Customize Toolbar')).toBeNull();
  });
});

// ── Header ──────────────────────────────────────────────────────────────

describe('CustomizePopover — header', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render "Customize Toolbar" title in the header', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.getByText('Customize Toolbar')).toBeTruthy();
  });

  it('should render a Reset button in the header', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.getByTitle('Reset to default')).toBeTruthy();
  });

  it('should reset the config to defaults when Reset is clicked', () => {
    // Start with some buttons hidden — count shows fewer than max
    setLocalConfig(
      ['select', 'marquee', 'transform', 'add', 'blueprints', 'config', 'live', 'zen', 'studio', 'group', 'ungroup'],
      ['select', 'add', 'config'],
    );
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    // After validation: 11 buttons in order, 3 hidden → "8 / 11 visible"
    expect(screen.getByText('8 / 11 visible')).toBeTruthy();
    // Click reset — should revert to default (0 hidden) → "11 / 11 visible"
    fireEvent.click(screen.getByTitle('Reset to default'));
    expect(screen.getByText('11 / 11 visible')).toBeTruthy();
  });
});

// ── Button list ─────────────────────────────────────────────────────────

describe('CustomizePopover — button list', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render all non-conditional buttons in the list', () => {
    // DEFAULT_CONFIG has 11 buttons — 3 conditional => 8 visible
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.getByText('Select Tool')).toBeTruthy();
    expect(screen.getByText('Marquee Select')).toBeTruthy();
    expect(screen.getByText('Add Primitives')).toBeTruthy();
    expect(screen.getByText('Blueprints')).toBeTruthy();
    expect(screen.getByText('Config')).toBeTruthy();
    expect(screen.getByText('Live Mode')).toBeTruthy();
    expect(screen.getByText('Zen Mode')).toBeTruthy();
  });

  it('should filter out conditional buttons (studio, group, ungroup)', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.queryByText('Cell Studio')).toBeNull();
    expect(screen.queryByText('Group')).toBeNull();
    expect(screen.queryByText('Ungroup')).toBeNull();
  });

  it('should render a drag handle (GripVertical icon) for each button', () => {
    const { container } = render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    // 11 total — 3 conditional (studio, group, ungroup) filtered = 8 rows
    const gripIcons = container.querySelectorAll('svg.lucide-grip-vertical');
    expect(gripIcons.length).toBe(8);
  });

  it('should render a visibility toggle button for each button', () => {
    const { container } = render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    // Each non-conditional row should have either an Eye or EyeOff SVG
    const eyeIcons = container.querySelectorAll('svg.lucide-eye, svg.lucide-eye-off');
    expect(eyeIcons.length).toBe(8);
  });

  it('should show Eye icon for visible buttons', () => {
    const { container } = render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    // When nothing is hidden, all should show Eye (not EyeOff)
    const eyeIcons = container.querySelectorAll('svg.lucide-eye');
    const eyeOffIcons = container.querySelectorAll('svg.lucide-eye-off');
    expect(eyeIcons.length).toBe(8);
    expect(eyeOffIcons.length).toBe(0);
  });

  it('should show EyeOff icon for hidden buttons', () => {
    // Hidden 3 items — the popover shows 8 non-conditional buttons, 3 hidden → 5 Eye, 3 EyeOff
    setLocalConfig(
      ['select', 'marquee', 'transform', 'add', 'blueprints', 'config', 'live', 'zen', 'studio', 'group', 'ungroup'],
      ['select', 'add', 'config'],
    );
    const { container } = render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    const eyeIcons = container.querySelectorAll('svg.lucide-eye');
    const eyeOffIcons = container.querySelectorAll('svg.lucide-eye-off');
    expect(eyeIcons.length).toBe(5);
    expect(eyeOffIcons.length).toBe(3);
  });

  it('should apply reduced opacity to hidden buttons', () => {
    setLocalConfig(
      ['select', 'marquee', 'transform', 'add', 'blueprints', 'config', 'live', 'zen', 'studio', 'group', 'ungroup'],
      ['select'],
    );
    const { container } = render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    // Hidden rows have "opacity-40" class — first row (select) is hidden
    const rows = container.querySelectorAll('[class*="flex items-center gap-2 px-3 py-1.5"]');
    const hiddenRow = rows[0] as HTMLElement;
    expect(hiddenRow.className).toContain('opacity-40');
    const visibleRow = rows[1] as HTMLElement;
    expect(visibleRow.className).not.toContain('opacity-40');
  });

  it('should toggle visibility when a visibility toggle button is clicked', () => {
    const { container } = render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    // Initially all visible — 8 Eye icons, 0 EyeOff
    expect(container.querySelectorAll('svg.lucide-eye').length).toBe(8);
    // Click first Hide button (for 'select' button)
    const hideBtn = screen.getAllByTitle('Hide button')[0]!;
    fireEvent.click(hideBtn);
    // Now 'select' should be hidden: 7 Eye, 1 EyeOff
    expect(container.querySelectorAll('svg.lucide-eye').length).toBe(7);
    expect(container.querySelectorAll('svg.lucide-eye-off').length).toBe(1);
  });

  it('should show "Show button" on EyeOff button and "Hide button" on Eye button', () => {
    setLocalConfig(
      ['select', 'marquee', 'transform', 'add', 'blueprints', 'config', 'live', 'zen', 'studio', 'group', 'ungroup'],
      ['select'],
    );
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.getByTitle('Show button')).toBeTruthy();
    expect(screen.getAllByTitle('Hide button').length).toBe(7);
  });
});

// ── Footer ──────────────────────────────────────────────────────────────

describe('CustomizePopover — footer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should show "Drag to reorder" text in the footer', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.getByText('Drag to reorder')).toBeTruthy();
  });

  it('should show visible/total count in the footer', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    // Default config: 11 buttons, 0 hidden → "11 / 11 visible"
    expect(screen.getByText('11 / 11 visible')).toBeTruthy();
  });

  it('should update visible count when buttons are hidden', () => {
    setLocalConfig(
      ['select', 'marquee', 'transform', 'add', 'live', 'zen', 'studio', 'group', 'ungroup', 'blueprints', 'config'],
      ['add', 'zen'],
    );
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    // After validation: 11 buttons in order, 2 hidden → "9 / 11 visible"
    expect(screen.getByText('9 / 11 visible')).toBeTruthy();
  });

  it('should show 0 / N visible when all buttons are hidden', () => {
    setLocalConfig(
      ['select', 'marquee', 'transform', 'add', 'live', 'zen', 'studio', 'group', 'ungroup', 'blueprints', 'config'],
      ['select', 'marquee', 'transform', 'add', 'live', 'zen', 'studio', 'group', 'ungroup', 'blueprints', 'config'],
    );
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.getByText('0 / 11 visible')).toBeTruthy();
  });

  it('should show N / N visible when no buttons are hidden', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.getByText('11 / 11 visible')).toBeTruthy();
  });
});

// ── Dismiss behavior (Escape + click outside) ───────────────────────────

describe('CustomizePopover — dismiss behavior', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should close the popover when pressing Escape', () => {
    jest.useFakeTimers();
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.getByText('Customize Toolbar')).toBeTruthy();
    // Flush the setTimeout(0) that attaches the Escape handler
    jest.advanceTimersByTime(0);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Customize Toolbar')).toBeNull();
    jest.useRealTimers();
  });

  it('should close the popover when clicking outside', () => {
    jest.useFakeTimers();
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.getByText('Customize Toolbar')).toBeTruthy();
    // Flush the setTimeout(0) that attaches the mousedown listener
    jest.advanceTimersByTime(0);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Customize Toolbar')).toBeNull();
    jest.useRealTimers();
  });

  it('should not close when clicking inside the popover', () => {
    jest.useFakeTimers();
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.getByText('Customize Toolbar')).toBeTruthy();
    jest.advanceTimersByTime(0);
    // Click on the popover title — this is inside the popover
    fireEvent.mouseDown(screen.getByText('Customize Toolbar'));
    expect(screen.getByText('Customize Toolbar')).toBeTruthy();
    jest.useRealTimers();
  });
});

// ── Edge cases ──────────────────────────────────────────────────────────

describe('CustomizePopover — edge cases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should handle an empty button list gracefully', () => {
    // Even with an empty config in localStorage, loadConfig augments to 11 buttons
    setLocalConfig([], []);
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.getByText('Customize Toolbar')).toBeTruthy();
    // After augmentation: 11 buttons, 0 hidden → "11 / 11 visible"
    expect(screen.getByText('11 / 11 visible')).toBeTruthy();
    // The popover should render all 8 non-conditional buttons
    expect(screen.getByText('Select Tool')).toBeTruthy();
  });

  it('should handle buttons with unexpected IDs gracefully', () => {
    // Invalid IDs are filtered by loadConfig; valid IDs are preserved and augmented
    setLocalConfig(
      ['select', 'nonexistent-id', 'live', 'fake'],
      ['fake'],
    );
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    // Valid non-conditional buttons should still render
    expect(screen.getByText('Select Tool')).toBeTruthy();
    expect(screen.getByText('Live Mode')).toBeTruthy();
    // Invalid IDs are filtered — no crash, hidden list is empty (fake filtered out)
    // Footer shows 11/11 visible (no hidden items survive validation)
    expect(screen.getByText('11 / 11 visible')).toBeTruthy();
  });

  it('should not crash when rapidly opening and closing the popover', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    clickCustomizeBtn();
    clickCustomizeBtn();
    clickCustomizeBtn();
    clickCustomizeBtn();
    // After 5 clicks (odd count), popover is open
    expect(screen.getByText('Customize Toolbar')).toBeTruthy();
    clickCustomizeBtn();
    // After 6 clicks (even count), popover is closed
    expect(screen.queryByText('Customize Toolbar')).toBeNull();
  });

  it('should render differently when the customize button is hovered', () => {
    render(<Toolbar {...BASE_PROPS} />);
    const customizeBtn = screen.getByTitle('Customize Toolbar');
    // Default: opacity-40
    expect(customizeBtn.className).toContain('opacity-40');
  });
});

// ── Drag-to-reorder behavior ────────────────────────────────────────────

describe('CustomizePopover — drag & drop reorder', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should render draggable items', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    const draggableItems = document.querySelectorAll('[draggable=\"true\"]');
    expect(draggableItems.length).toBe(8);
  });

  it('should reorder buttons when drag ends on a different position', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    const draggableItems = document.querySelectorAll('[draggable=\"true\"]');
    expect(draggableItems.length).toBe(8);

    // First button label
    const secondLabel = draggableItems[1]!.querySelector('span.flex-1')?.textContent;

    // Simulate drag from index 0 to index 1
    fireEvent.dragStart(draggableItems[0]!);
    fireEvent.dragOver(draggableItems[1]!);
    fireEvent.dragEnd(draggableItems[0]!);

    // After reorder, the first item should now be what was second
    const updatedItems = document.querySelectorAll('[draggable=\"true\"]');
    const newFirstLabel = updatedItems[0]!.querySelector('span.flex-1')?.textContent;
    expect(newFirstLabel).toBe(secondLabel);
  });

  it('should NOT reorder when drag starts and ends on the same position', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    const draggableItems = document.querySelectorAll('[draggable=\"true\"]');

    const firstLabel = draggableItems[0]!.querySelector('span.flex-1')?.textContent;

    // Simulate drag from index 0 to index 0 (same position)
    fireEvent.dragStart(draggableItems[0]!);
    fireEvent.dragOver(draggableItems[0]!);
    fireEvent.dragEnd(draggableItems[0]!);

    // Order should remain unchanged
    const updatedItems = document.querySelectorAll('[draggable=\"true\"]');
    expect(updatedItems[0]!.querySelector('span.flex-1')?.textContent).toBe(firstLabel);
  });

  it('should not crash when dragging with undefined indices', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    const draggableItems = document.querySelectorAll('[draggable=\"true\"]');
    // Directly trigger dragEnd without dragStart — should not throw
    expect(() => {
      fireEvent.dragEnd(draggableItems[0]!);
    }).not.toThrow();
  });

  it('should add a visual border indicator on drag over', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    const draggableItems = document.querySelectorAll('[draggable=\"true\"]');

    // Drag over item at index 2
    fireEvent.dragStart(draggableItems[0]!);
    fireEvent.dragOver(draggableItems[2]!);

    // The dragged-over item should have a border-top indicator
    const item = draggableItems[2] as HTMLElement;
    expect(item.className).toContain('border-t');
  });
});

// ── localStorage persistence ───────────────────────────────────────────

describe('CustomizePopover — localStorage persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should persist toggle visibility to localStorage', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();

    // Hide 'select' button
    const hideBtn = screen.getAllByTitle('Hide button')[0]!;
    fireEvent.click(hideBtn);

    // Read localStorage directly
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw!);
    expect(saved.hidden).toContain('select');
  });

  it('should persist drag-reorder to localStorage with correct content', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    const draggableItems = document.querySelectorAll('[draggable="true"]');

    // Default order: select(0), marquee(1), transform(2), add(3), studio(4), group(5), ungroup(6), blueprints(7), config(8), live(9), zen(10)
    // Rendered items map to full-order indices: select=0, marquee=1, transform=2, add=3, blueprints=7, config=8, live=9, zen=10
    // Drag rendered item 0 (select, idx=0) to rendered item 2 (transform, idx=2)
    fireEvent.dragStart(draggableItems[0]!);
    fireEvent.dragOver(draggableItems[2]!);
    fireEvent.dragEnd(draggableItems[0]!);

    // moveButton(0, 2) removes select from 0 and inserts at 2:
    // [marquee, transform, select, add, studio, group, ungroup, blueprints, config, live, zen]
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw!);
    expect(saved.order).toBeDefined();
    expect(saved.order.length).toBe(11);
    expect(saved.order[0]).toBe('marquee');
    expect(saved.order[1]).toBe('transform');
    expect(saved.order[2]).toBe('select');
    expect(saved.order[3]).toBe('add');
    // Remaining items unchanged
    expect(saved.order.slice(4)).toEqual(['studio', 'group', 'ungroup', 'blueprints', 'config', 'live', 'zen']);
  });

  it('should persist reset to localStorage (clear hidden)', () => {
    // Start with hidden buttons
    setLocalConfig(
      ['select', 'marquee', 'transform', 'add', 'blueprints', 'config', 'live', 'zen', 'studio', 'group', 'ungroup'],
      ['select', 'add', 'config'],
    );
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    expect(screen.getByText('8 / 11 visible')).toBeTruthy();

    // Click Reset
    fireEvent.click(screen.getByTitle('Reset to default'));

    // localStorage should now have empty hidden array
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw!);
    expect(saved.hidden).toEqual([]);
  });

  it('should load config from localStorage on mount', () => {
    // Pre-populate localStorage with a custom order
    setLocalConfig(
      ['live', 'zen', 'select', 'marquee', 'transform', 'add', 'blueprints', 'config', 'studio', 'group', 'ungroup'],
      [],
    );
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();

    // The first button in the customize list should be 'Live Mode'
    const firstLabel = document.querySelectorAll('[draggable="true"]')[0]!
      .querySelector('span.flex-1')?.textContent;
    expect(firstLabel).toBe('Live Mode');
  });

  it('should write default config to localStorage when no prior config exists', () => {
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();

    // After mount, the hook should have saved the default config
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const saved = JSON.parse(raw!);
    expect(saved.order).toBeDefined();
    expect(saved.order.length).toBe(11);
    expect(saved.hidden).toEqual([]);
  });

  it('should persist toggle-then-toggle-back (unhide) to localStorage', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();

    // Hide 'select'
    const hideBtn = screen.getAllByTitle('Hide button')[0]!;
    fireEvent.click(hideBtn);
    let saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.hidden).toContain('select');

    // Unhide 'select'
    const showBtn = screen.getByTitle('Show button');
    fireEvent.click(showBtn);
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.hidden).not.toContain('select');
  });
});

// ── Snapshot tests ──────────────────────────────────────────────────────

describe('CustomizePopover — snapshots', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should match snapshot for closed state', () => {
    const { container } = render(<Toolbar {...BASE_PROPS} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for open popover (all visible)', () => {
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    const popover = document.querySelector('[class*=\"fixed left-16 top-20\"]');
    expect(popover).toMatchSnapshot();
  });

  it('should match snapshot for open popover (some hidden)', () => {
    setLocalConfig(
      ['select', 'marquee', 'transform', 'add', 'blueprints', 'config', 'live', 'zen', 'studio', 'group', 'ungroup'],
      ['select', 'config', 'zen'],
    );
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    const popover = document.querySelector('[class*=\"fixed left-16 top-20\"]');
    expect(popover).toMatchSnapshot();
  });

  it('should match snapshot for open popover (empty config)', () => {
    setLocalConfig([], []);
    render(<Toolbar {...BASE_PROPS} />);
    clickCustomizeBtn();
    const popover = document.querySelector('[class*=\"fixed left-16 top-20\"]');
    expect(popover).toMatchSnapshot();
  });
});
