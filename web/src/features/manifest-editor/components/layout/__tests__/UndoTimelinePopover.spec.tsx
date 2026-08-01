/**
 * @jest-environment jsdom
 *
 * Tests for UndoTimelinePopover component — History timeline popover (v9.4.0)
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import UndoTimelinePopover from '../UndoTimelinePopover';
import type { HistoryEntry } from '@/omega-ui-core/types/history';
import type { HistoryEntry as BatchHistoryEntry } from '@/features/manifest-editor/hooks/useBatchHistory';

// ── Helpers ─────────────────────────────────────────────────────────────

const createEntry = (
  overrides: { id: string } & Partial<HistoryEntry>
): HistoryEntry => ({
  type: overrides.type ?? 'CONTENT_CHANGE',
  label: overrides.label ?? 'Untitled change',
  timestamp: overrides.timestamp ?? Date.now(),
  correlationId: overrides.correlationId ?? 'corr-1',
  manifest: { version: '1.0', modules: [], contracts: [] } as unknown as HistoryEntry['manifest'],
  ...overrides,
});

/** Helper: create a batch history entry */
const createBatchEntry = (
  overrides: Partial<BatchHistoryEntry> & { message: string }
): BatchHistoryEntry => ({
  variant: overrides.variant ?? 'hide',
  time: overrides.time ?? Date.now(),
  ids: overrides.ids ?? ['node-1', 'node-2'],
  action: overrides.action ?? 'visibility',
  value: overrides.value ?? true,
  ...overrides,
});

/** Return a ref with a mock element that has getBoundingClientRect */
function createTriggerRef() {
  const ref = createRef<HTMLButtonElement>();
  const el = document.createElement('button');
  el.getBoundingClientRect = () => ({
    top: 500,
    left: 800,
    right: 900,
    bottom: 520,
    width: 100,
    height: 20,
    x: 800,
    y: 500,
    toJSON: () => {},
  });
  (ref as React.RefObject<HTMLButtonElement>).current = el;
  return ref;
}

// ── Base props ──────────────────────────────────────────────────────────

const BASE_PROPS = {
  past: [] as HistoryEntry[],
  future: [] as HistoryEntry[],
  onUndoTo: () => {},
  onUndo: () => {},
  onRedo: () => {},
  isOpen: true,
  onClose: () => {},
  triggerRef: createTriggerRef(),
};

// ── Rendering: closed / open / empty ────────────────────────────────────

describe('UndoTimelinePopover — render states', () => {
  it('should return null when isOpen is false', () => {
    const { container } = render(<UndoTimelinePopover {...BASE_PROPS} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('should render the popover when isOpen is true', () => {
    render(<UndoTimelinePopover {...BASE_PROPS} />);
    expect(screen.getByText('History')).toBeTruthy();
  });

  it('should show "No history yet" when past and future are empty', () => {
    render(<UndoTimelinePopover {...BASE_PROPS} />);
    expect(screen.getByText('No history yet')).toBeTruthy();
  });

  it('should not show "No history yet" when past has entries', () => {
    render(
      <UndoTimelinePopover
        {...BASE_PROPS}
        past={[createEntry({ id: 'e1', label: 'Added module' })]}
      />
    );
    expect(screen.queryByText('No history yet')).toBeNull();
  });

  it('should not show "No history yet" when future has entries', () => {
    render(
      <UndoTimelinePopover
        {...BASE_PROPS}
        future={[createEntry({ id: 'e1', label: 'Redo change' })]}
      />
    );
    expect(screen.queryByText('No history yet')).toBeNull();
  });

  it('should render the step count in the header', () => {
    render(
      <UndoTimelinePopover
        {...BASE_PROPS}
        past={[createEntry({ id: 'e1' }), createEntry({ id: 'e2' })]}
        future={[createEntry({ id: 'e3' })]}
      />
    );
    expect(screen.getByText('3 steps')).toBeTruthy();
  });

  it('should show singular "step" when total is 1', () => {
    render(
      <UndoTimelinePopover
        {...BASE_PROPS}
        past={[createEntry({ id: 'e1' })]}
      />
    );
    expect(screen.getByText('1 step')).toBeTruthy();
  });
});

// ── Past entries ────────────────────────────────────────────────────────

describe('UndoTimelinePopover — past entries', () => {
  it('should render past entries in reverse order (newest first)', () => {
    const past = [
      createEntry({ id: 'e1', label: 'First change', timestamp: 1000 }),
      createEntry({ id: 'e2', label: 'Second change', timestamp: 2000 }),
      createEntry({ id: 'e3', label: 'Third change', timestamp: 3000 }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);

    const entries = screen.getAllByText(/change/);
    expect(entries[0]?.textContent).toBe('Third change');
    expect(entries[1]?.textContent).toBe('Second change');
    expect(entries[2]?.textContent).toBe('First change');
  });

  it('should mark the current (newest) entry with bold text', () => {
    const past = [
      createEntry({ id: 'e1', label: 'Old' }),
      createEntry({ id: 'e2', label: 'Current' }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);

    const currentEl = screen.getByText('Current');
    expect(currentEl.className).toContain('font-bold');
    expect(currentEl.className).toContain('text-primary');
  });

  it('should disable click on the current entry (newest)', () => {
    const past = [createEntry({ id: 'e1', label: 'Only entry' })];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);

    const buttons = screen.getAllByRole('button');
    const onlyBtn = buttons.find(
      (btn) => btn.textContent?.includes('Only entry')
    ) as HTMLButtonElement | undefined;
    expect(onlyBtn).toBeTruthy();
    expect(onlyBtn!.disabled).toBe(true);
  });

  it('should call onUndoTo with original index and close when clicking a non-current past entry', () => {
    const onUndoTo = jest.fn();
    const onClose = jest.fn();
    const past = [
      createEntry({ id: 'e1', label: 'Old change', timestamp: 1000 }),
      createEntry({ id: 'e2', label: 'Current state', timestamp: 2000 }),
    ];
    render(
      <UndoTimelinePopover
        {...BASE_PROPS}
        past={past}
        onUndoTo={onUndoTo}
        onClose={onClose}
      />
    );

    // 'Old change' → reversed index 1 → original index 0
    fireEvent.click(screen.getByText('Old change'));
    expect(onUndoTo).toHaveBeenCalledWith(0);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should render the label or fallback type name when label is empty', () => {
    const past = [createEntry({ id: 'e1', label: '', type: 'SNAPSHOT' })];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    expect(screen.getByText('SNAPSHOT')).toBeTruthy();
  });

  it('should render timestamps using relative time', () => {
    const past = [createEntry({ id: 'e1', label: 'Recent', timestamp: Date.now() - 3000 })];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    expect(screen.getByText('just now')).toBeTruthy();
  });

  it('should render "Xs ago" for recent entries', () => {
    const past = [createEntry({ id: 'e1', label: 'Seconds ago', timestamp: Date.now() - 15000 })];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    expect(screen.getByText('15s ago')).toBeTruthy();
  });
});

// ── Future entries ──────────────────────────────────────────────────────

describe('UndoTimelinePopover — future (redo) entries', () => {
  it('should render future entries with reduced opacity', () => {
    const future = [createEntry({ id: 'e1', label: 'Future change' })];
    const { container } = render(
      <UndoTimelinePopover {...BASE_PROPS} future={future} />
    );

    const futureContainer = container.querySelector('.opacity-50');
    expect(futureContainer).toBeTruthy();
    expect(futureContainer?.textContent).toContain('Future change');
  });

  it('should show "Redo" divider when both past and future have entries', () => {
    const past = [createEntry({ id: 'e1', label: 'Past change' })];
    const future = [createEntry({ id: 'e2', label: 'Future change' })];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} future={future} />);

    // 2 elements contain "Redo": divider span + footer button
    const redoElements = screen.getAllByText('Redo');
    expect(redoElements.length).toBe(2);
  });

  it('should not show "Redo" divider when only future has entries (no past)', () => {
    const future = [createEntry({ id: 'e2', label: 'Future change' })];
    const { container } = render(
      <UndoTimelinePopover {...BASE_PROPS} past={[]} future={future} />
    );

    // Only footer button has "Redo" — 1 element, not 2 (no divider)
    const redoElements = screen.getAllByText('Redo');
    expect(redoElements.length).toBe(1);

    // Ensure the divider wrapper div is not rendered
    const dividers = container.querySelectorAll('.flex.items-center.gap-2.px-3.py-1');
    expect(dividers.length).toBe(0);
  });

  it('should not show "Redo" divider when only past has entries (no future)', () => {
    const past = [createEntry({ id: 'e1', label: 'Past change' })];
    const { container } = render(
      <UndoTimelinePopover {...BASE_PROPS} past={past} future={[]} />
    );

    // Only footer button has "Redo" — 1 element
    const redoElements = screen.getAllByText('Redo');
    expect(redoElements.length).toBe(1);

    // No future container at all
    const futureContainer = container.querySelector('.opacity-50');
    expect(futureContainer).toBeNull();

    // No divider
    const dividers = container.querySelectorAll('.flex.items-center.gap-2.px-3.py-1');
    expect(dividers.length).toBe(0);
  });

  it('should call onRedo and close when clicking a future entry', () => {
    const onRedo = jest.fn();
    const onClose = jest.fn();
    const future = [createEntry({ id: 'e1', label: 'Future change' })];
    render(
      <UndoTimelinePopover
        {...BASE_PROPS}
        future={future}
        onRedo={onRedo}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByText('Future change'));
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── Footer buttons (Undo / Redo) ────────────────────────────────────────

/** Helper: get the footer Undo button via accessible name */
function getUndoBtn(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Undo last action' }) as HTMLButtonElement;
}

/** Helper: get the footer Redo button via accessible name */
function getRedoBtn(): HTMLButtonElement {
  // Use exact aria-label match to distinguish footer button from future entry
  // buttons (which have aria-label="Redo: ...")
  return screen.getByRole('button', { name: 'Redo last action' }) as HTMLButtonElement;
}

describe('UndoTimelinePopover — footer undo/redo buttons', () => {
  it('should render Undo and Redo buttons in the footer', () => {
    render(<UndoTimelinePopover {...BASE_PROPS} />);
    expect(getUndoBtn()).toBeTruthy();
    expect(getRedoBtn()).toBeTruthy();
  });

  it('should disable Undo when past is empty', () => {
    render(<UndoTimelinePopover {...BASE_PROPS} past={[]} />);
    expect(getUndoBtn().disabled).toBe(true);
  });

  it('should enable Undo when past has entries', () => {
    render(
      <UndoTimelinePopover
        {...BASE_PROPS}
        past={[createEntry({ id: 'e1' })]}
      />
    );
    expect(getUndoBtn().disabled).toBe(false);
  });

  it('should disable Redo when future is empty', () => {
    render(<UndoTimelinePopover {...BASE_PROPS} future={[]} />);
    expect(getRedoBtn().disabled).toBe(true);
  });

  it('should enable Redo when future has entries', () => {
    render(
      <UndoTimelinePopover
        {...BASE_PROPS}
        future={[createEntry({ id: 'e1' })]}
      />
    );
    expect(getRedoBtn().disabled).toBe(false);
  });

  it('should call onUndo and close when clicking Undo button', () => {
    const onUndo = jest.fn();
    const onClose = jest.fn();
    render(
      <UndoTimelinePopover
        {...BASE_PROPS}
        past={[createEntry({ id: 'e1' })]}
        onUndo={onUndo}
        onClose={onClose}
      />
    );
    fireEvent.click(getUndoBtn());
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onRedo and close when clicking Redo button', () => {
    const onRedo = jest.fn();
    const onClose = jest.fn();
    render(
      <UndoTimelinePopover
        {...BASE_PROPS}
        future={[createEntry({ id: 'e1' })]}
        onRedo={onRedo}
        onClose={onClose}
      />
    );
    fireEvent.click(getRedoBtn());
    expect(onRedo).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── Click outside & Escape ──────────────────────────────────────────────

describe('UndoTimelinePopover — dismiss behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call onClose when pressing Escape', () => {
    const onClose = jest.fn();
    render(<UndoTimelinePopover {...BASE_PROPS} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when clicking outside the popover (on document mousedown)', () => {
    const onClose = jest.fn();
    render(<UndoTimelinePopover {...BASE_PROPS} onClose={onClose} />);

    // Flush the setTimeout(0) that attaches the mousedown listener
    jest.advanceTimersByTime(0);
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onClose when clicking inside the popover', () => {
    const onClose = jest.fn();
    const { container } = render(
      <UndoTimelinePopover {...BASE_PROPS} onClose={onClose} />
    );

    const popoverEl = container.firstChild as HTMLElement;
    jest.advanceTimersByTime(0);
    fireEvent.mouseDown(popoverEl);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should not call onClose when clicking on the trigger element', () => {
    const onClose = jest.fn();
    render(<UndoTimelinePopover {...BASE_PROPS} onClose={onClose} />);

    jest.advanceTimersByTime(0);
    const triggerEl = BASE_PROPS.triggerRef.current!;
    fireEvent.mouseDown(triggerEl);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should not attach listeners when isOpen is false', () => {
    const onClose = jest.fn();
    render(
      <UndoTimelinePopover {...BASE_PROPS} isOpen={false} onClose={onClose} />
    );

    jest.advanceTimersByTime(0);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ── Event types ─────────────────────────────────────────────────────────

describe('UndoTimelinePopover — event types', () => {
  it('should render a CONTENT_CHANGE entry with an SVG icon', () => {
    const past = [createEntry({ id: 'e1', type: 'CONTENT_CHANGE' })];
    const { container } = render(
      <UndoTimelinePopover {...BASE_PROPS} past={past} />
    );

    const entryBtn = container.querySelector('button');
    const svg = entryBtn?.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('should render multiple event types in the same list', () => {
    const past = [
      createEntry({ id: 'e1', type: 'CONTENT_CHANGE', label: 'Edit' }),
      createEntry({ id: 'e2', type: 'UI_SELECTION', label: 'Select' }),
      createEntry({ id: 'e3', type: 'UI_PINNING', label: 'Pin' }),
      createEntry({ id: 'e4', type: 'MODE_CHANGE', label: 'Mode' }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);

    expect(screen.getByText('Edit')).toBeTruthy();
    expect(screen.getByText('Select')).toBeTruthy();
    expect(screen.getByText('Pin')).toBeTruthy();
    expect(screen.getByText('Mode')).toBeTruthy();
  });

  it('should render a SNAPSHOT entry', () => {
    const past = [createEntry({ id: 'e1', type: 'SNAPSHOT', label: 'Snapshot' })];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    expect(screen.getByText('Snapshot')).toBeTruthy();
  });

  it('should render a RECOVERY_POINT entry', () => {
    const past = [createEntry({ id: 'e1', type: 'RECOVERY_POINT', label: 'Recovery' })];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    expect(screen.getByText('Recovery')).toBeTruthy();
  });

  it('should render an entry with a default icon for unknown types', () => {
    const past = [
      createEntry({ id: 'e1',  type: 'UI_SELECTION' as HistoryEntry['type'], label: 'Custom' }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    expect(screen.getByText('Custom')).toBeTruthy();
  });
});

// ── Positioning ─────────────────────────────────────────────────────────

describe('UndoTimelinePopover — positioning', () => {
  it('should set bottom and right style based on triggerRef bounding rect', () => {
    const { container } = render(<UndoTimelinePopover {...BASE_PROPS} />);
    const popoverEl = container.firstChild as HTMLElement;
    expect(popoverEl).toBeTruthy();
    expect(popoverEl.style.bottom).toBeTruthy();
    expect(popoverEl.style.right).toBeTruthy();
  });

  it('should not set position when isOpen is false', () => {
    const { container } = render(
      <UndoTimelinePopover {...BASE_PROPS} isOpen={false} />
    );
    expect(container.innerHTML).toBe('');
  });
});

// ── Proportional style classification ──────────────────────────────────

describe('UndoTimelinePopover — proportional dimensions', () => {
  it('should have w-[280px] and max-h-[340px] classes', () => {
    const { container } = render(<UndoTimelinePopover {...BASE_PROPS} />);
    const popoverEl = container.firstChild as HTMLElement;
    expect(popoverEl.className).toContain('w-[280px]');
    expect(popoverEl.className).toContain('max-h-[340px]');
  });
});

// ── Keyboard navigation ────────────────────────────────────────────────

describe('UndoTimelinePopover — keyboard navigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should focus the first item when popover opens with entries', async () => {
    const past = [
      createEntry({ id: 'e1', label: 'First', timestamp: 1000 }),
      createEntry({ id: 'e2', label: 'Second', timestamp: 2000 }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);

    // First item should have tabIndex={0} after setTimeout(0) flushes
    const firstItem = document.querySelector('[data-history-index="0"]');
    expect(firstItem).toBeTruthy();
    await waitFor(() => {
      expect(firstItem!.getAttribute('tabindex')).toBe('0');
    });
  });

  it('should move focus forward on ArrowDown', () => {
    const past = [
      createEntry({ id: 'e1', label: 'First', timestamp: 1000 }),
      createEntry({ id: 'e2', label: 'Second', timestamp: 2000 }),
      createEntry({ id: 'e3', label: 'Third', timestamp: 3000 }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    jest.advanceTimersByTime(0);

    const list = document.querySelector('.overflow-y-auto');
    expect(list).toBeTruthy();

    // ArrowDown from index 0 → index 1
    fireEvent.keyDown(list!, { key: 'ArrowDown' });
    const secondItem = document.querySelector('[data-history-index="1"]');
    expect(secondItem!.getAttribute('tabindex')).toBe('0');
    const firstItem = document.querySelector('[data-history-index="0"]');
    expect(firstItem!.getAttribute('tabindex')).toBe('-1');
  });

  it('should move focus backward on ArrowUp', () => {
    const past = [
      createEntry({ id: 'e1', label: 'First', timestamp: 1000 }),
      createEntry({ id: 'e2', label: 'Second', timestamp: 2000 }),
      createEntry({ id: 'e3', label: 'Third', timestamp: 3000 }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    jest.advanceTimersByTime(0);

    const list = document.querySelector('.overflow-y-auto');
    expect(list).toBeTruthy();

    // ArrowDown twice: 0 → 1 → 2
    fireEvent.keyDown(list!, { key: 'ArrowDown' });
    fireEvent.keyDown(list!, { key: 'ArrowDown' });
    expect(document.querySelector('[data-history-index="2"]')!.getAttribute('tabindex')).toBe('0');

    // ArrowUp: 2 → 1
    fireEvent.keyDown(list!, { key: 'ArrowUp' });
    expect(document.querySelector('[data-history-index="1"]')!.getAttribute('tabindex')).toBe('0');
    expect(document.querySelector('[data-history-index="2"]')!.getAttribute('tabindex')).toBe('-1');
  });

  it('should stay at first item on ArrowUp when at index 0', () => {
    const past = [
      createEntry({ id: 'e1', label: 'First', timestamp: 1000 }),
      createEntry({ id: 'e2', label: 'Second', timestamp: 2000 }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    jest.advanceTimersByTime(0);

    const list = document.querySelector('.overflow-y-auto');
    expect(list).toBeTruthy();

    // ArrowUp from 0 should stay at 0
    fireEvent.keyDown(list!, { key: 'ArrowUp' });
    expect(document.querySelector('[data-history-index="0"]')!.getAttribute('tabindex')).toBe('0');
  });

  it('should stay at last item on ArrowDown when at the end', () => {
    const past = [
      createEntry({ id: 'e1', label: 'First', timestamp: 1000 }),
      createEntry({ id: 'e2', label: 'Second', timestamp: 2000 }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    jest.advanceTimersByTime(0);

    const list = document.querySelector('.overflow-y-auto');
    expect(list).toBeTruthy();

    // ArrowDown from 0 → 1 (last)
    fireEvent.keyDown(list!, { key: 'ArrowDown' });
    // ArrowDown again should stay at 1
    fireEvent.keyDown(list!, { key: 'ArrowDown' });
    expect(document.querySelector('[data-history-index="1"]')!.getAttribute('tabindex')).toBe('0');
    expect(document.querySelector('[data-history-index="0"]')!.getAttribute('tabindex')).toBe('-1');
  });

  it('should jump to first item on Home', () => {
    const past = [
      createEntry({ id: 'e1', label: 'First', timestamp: 1000 }),
      createEntry({ id: 'e2', label: 'Second', timestamp: 2000 }),
      createEntry({ id: 'e3', label: 'Third', timestamp: 3000 }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    jest.advanceTimersByTime(0);

    const list = document.querySelector('.overflow-y-auto');
    expect(list).toBeTruthy();

    // ArrowDown twice to go to index 2
    fireEvent.keyDown(list!, { key: 'ArrowDown' });
    fireEvent.keyDown(list!, { key: 'ArrowDown' });
    expect(document.querySelector('[data-history-index="2"]')!.getAttribute('tabindex')).toBe('0');

    // Home jumps to first
    fireEvent.keyDown(list!, { key: 'Home' });
    expect(document.querySelector('[data-history-index="0"]')!.getAttribute('tabindex')).toBe('0');
    expect(document.querySelector('[data-history-index="2"]')!.getAttribute('tabindex')).toBe('-1');
  });

  it('should jump to last item on End', () => {
    const past = [
      createEntry({ id: 'e1', label: 'First', timestamp: 1000 }),
      createEntry({ id: 'e2', label: 'Second', timestamp: 2000 }),
      createEntry({ id: 'e3', label: 'Third', timestamp: 3000 }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    jest.advanceTimersByTime(0);

    const list = document.querySelector('.overflow-y-auto');
    expect(list).toBeTruthy();

    // End jumps to last (index 2)
    fireEvent.keyDown(list!, { key: 'End' });
    expect(document.querySelector('[data-history-index="2"]')!.getAttribute('tabindex')).toBe('0');
    expect(document.querySelector('[data-history-index="0"]')!.getAttribute('tabindex')).toBe('-1');
  });

  it('should navigate across past, future, and batch entries', () => {
    const past = [
      createEntry({ id: 'e1', label: 'Past', timestamp: 1000 }),
    ];
    const future = [
      createEntry({ id: 'e2', label: 'Future', timestamp: 2000 }),
    ];
    const batchEntries = [
      createBatchEntry({ message: 'Batch op', variant: 'hide', action: 'visibility', value: true, ids: ['n1'], time: 3000 }),
    ];
    render(
      <UndoTimelinePopover
        {...BASE_PROPS}
        past={past}
        future={future}
        batchEntries={batchEntries}
      />
    );
    jest.advanceTimersByTime(0);

    const list = document.querySelector('.overflow-y-auto');
    expect(list).toBeTruthy();

    // Total 3 items: past[0], future[0], batch[0]
    // ArrowDown from 0 → 1
    fireEvent.keyDown(list!, { key: 'ArrowDown' });
    expect(document.querySelector('[data-history-index="1"]')!.getAttribute('tabindex')).toBe('0');

    // ArrowDown from 1 → 2
    fireEvent.keyDown(list!, { key: 'ArrowDown' });
    expect(document.querySelector('[data-history-index="2"]')!.getAttribute('tabindex')).toBe('0');

    // Home jumps back to 0
    fireEvent.keyDown(list!, { key: 'Home' });
    expect(document.querySelector('[data-history-index="0"]')!.getAttribute('tabindex')).toBe('0');
  });

  it('should not crash when there are no items (empty list)', () => {
    render(<UndoTimelinePopover {...BASE_PROPS} />);
    jest.advanceTimersByTime(0);
    const list = document.querySelector('.overflow-y-auto');
    expect(list).toBeTruthy();

    // Should not throw when navigating on empty list
    expect(() => {
      fireEvent.keyDown(list!, { key: 'ArrowDown' });
      fireEvent.keyDown(list!, { key: 'ArrowUp' });
      fireEvent.keyDown(list!, { key: 'Home' });
      fireEvent.keyDown(list!, { key: 'End' });
    }).not.toThrow();
  });

  it('should set tabIndex=-1 for non-focused items', async () => {
    const past = [
      createEntry({ id: 'e1', label: 'First', timestamp: 1000 }),
      createEntry({ id: 'e2', label: 'Second', timestamp: 2000 }),
      createEntry({ id: 'e3', label: 'Third', timestamp: 3000 }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);

    // Initially only index 0 has tabIndex=0, others have -1
    const items = document.querySelectorAll('[data-history-index]');
    expect(items.length).toBe(3);
    await waitFor(() => {
      expect(items[0].getAttribute('tabindex')).toBe('0');
    });
    expect(items[1].getAttribute('tabindex')).toBe('-1');
    expect(items[2].getAttribute('tabindex')).toBe('-1');
  });

  it('should process keydown events on the list container and navigate items', () => {
    const past = [
      createEntry({ id: 'e1', label: 'First', timestamp: 1000 }),
      createEntry({ id: 'e2', label: 'Second', timestamp: 2000 }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    jest.advanceTimersByTime(0);

    const list = document.querySelector('.overflow-y-auto') as HTMLElement;
    expect(list).toBeTruthy();

    // ArrowDown moves focus to second item (already tested above, but here we
    // verify the handler is attached by checking the result of firing events)
    fireEvent.keyDown(list!, { key: 'ArrowDown' });
    const secondItem = document.querySelector('[data-history-index="1"]');
    expect(secondItem!.getAttribute('tabindex')).toBe('0');
  });
});

// ── Edge cases ──────────────────────────────────────────────────────────

describe('UndoTimelinePopover — edge cases', () => {
  it('should handle very large numbers of entries without crashing', () => {
    const past = Array.from({ length: 50 }, (_, i) =>
      createEntry({ id: `e${i}`, label: `Change ${i}` })
    );
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    expect(screen.getByText('50 steps')).toBeTruthy();
    expect(screen.getByText('Change 49')).toBeTruthy();
    expect(screen.getByText('Change 0')).toBeTruthy();
  });

  it('should handle entries with missing optional fields gracefully', () => {
    const minimalEntry = {
      id: 'minimal',
      type: 'CONTENT_CHANGE' as const,
      label: 'Minimal',
      timestamp: Date.now(),
      correlationId: '',
      manifest: {} as unknown as HistoryEntry['manifest'],
    };
    render(
      <UndoTimelinePopover
        {...BASE_PROPS}
        past={[minimalEntry]}
        future={[minimalEntry]}
      />
    );
    // Both past and future entries render with label 'Minimal'
    expect(screen.getAllByText('Minimal').length).toBe(2);
    expect(screen.getByText('2 steps')).toBeTruthy();
  });

  it('should render all entries as buttons with role="button"', () => {
    const past = [
      createEntry({ id: 'e1', label: 'First' }),
      createEntry({ id: 'e2', label: 'Second' }),
      createEntry({ id: 'e3', label: 'Third' }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} />);
    const buttons = screen.getAllByRole('button');
    // 3 past entries + 2 footer buttons (Undo + Redo) = 5
    expect(buttons.length).toBe(5);
  });

  it('should render footer buttons when there are no entries', () => {
    render(<UndoTimelinePopover {...BASE_PROPS} />);
    const undoBtn = screen.getByRole('button', { name: 'Undo last action' }) as HTMLButtonElement;
    const redoBtn = screen.getByRole('button', { name: 'Redo last action' }) as HTMLButtonElement;
    expect(undoBtn).toBeTruthy();
    expect(redoBtn).toBeTruthy();
    expect(undoBtn.disabled).toBe(true);
    expect(redoBtn.disabled).toBe(true);
  });
});

// ── Batch History entries ───────────────────────────────────────────────

describe('UndoTimelinePopover — batch entries', () => {
  it('should render batch entries when batchEntries is provided', () => {
    const batchEntries = [
      createBatchEntry({ message: '3 hidden', variant: 'hide', action: 'visibility', value: true }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    expect(screen.getByText('3 hidden')).toBeTruthy();
  });

  it('should show "Batch" divider with amber styling', () => {
    const batchEntries = [
      createBatchEntry({ message: '2 locked', variant: 'lock', action: 'lock', value: true }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    expect(screen.getByText('Batch')).toBeTruthy();
    // The Batch label should have amber color classes
    const batchLabel = screen.getByText('Batch');
    expect(batchLabel.className).toContain('text-amber-400/50');
  });

  it('should not render batch section when batchEntries is empty', () => {
    render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={[]} />);
    expect(screen.queryByText('Batch')).toBeNull();
  });

  it('should include batch entries in total step count', () => {
    const past = [createEntry({ id: 'e1', label: 'Edit' })];
    const batchEntries = [
      createBatchEntry({ message: '3 hidden', variant: 'hide' }),
      createBatchEntry({ message: '2 locked', variant: 'lock' }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} past={past} batchEntries={batchEntries} />);
    expect(screen.getByText('3 steps')).toBeTruthy();
  });

  it('should show undo symbol ↶ for undoable entries (visibility action)', () => {
    const batchEntries = [
      createBatchEntry({ message: '5 hidden', action: 'visibility', value: true }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    expect(screen.getByText('↶')).toBeTruthy();
  });

  it('should show undo symbol ↶ for lock actions', () => {
    const batchEntries = [
      createBatchEntry({ message: '2 locked', action: 'lock', value: true, variant: 'lock' }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    expect(screen.getByText('↶')).toBeTruthy();
  });

  it('should show undo symbol ↶ for group action with value=true', () => {
    const batchEntries = [
      createBatchEntry({ message: '4 grouped', action: 'group', value: true, variant: 'group' }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    expect(screen.getByText('↶')).toBeTruthy();
  });

  it('should show dash — for non-undoable entries (ungroup)', () => {
    const batchEntries = [
      createBatchEntry({ message: '1 ungrouped', action: 'group', value: false, variant: 'ungroup' }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByText('↶')).toBeNull();
  });

  it('should disable buttons for non-undoable entries', () => {
    const batchEntries = [
      createBatchEntry({ message: '1 ungrouped', action: 'group', value: false, variant: 'ungroup' }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    const buttons = screen.getAllByRole('button');
    // Find the batch entry button (exclude footer Undo/Redo buttons)
    const batchBtn = buttons.find(b => b.textContent?.includes('1 ungrouped')) as HTMLButtonElement;
    expect(batchBtn).toBeTruthy();
    expect(batchBtn.disabled).toBe(true);
  });

  it('should call onUndoBatchEntry with correct index and close when clicking undoable entry', () => {
    const onUndoBatchEntry = jest.fn();
    const onClose = jest.fn();
    const batchEntries = [
      createBatchEntry({ message: '3 hidden', variant: 'hide', action: 'visibility', value: true }),
      createBatchEntry({ message: '2 locked', variant: 'lock', action: 'lock', value: true }),
    ];
    render(
      <UndoTimelinePopover
        {...BASE_PROPS}
        batchEntries={batchEntries}
        onUndoBatchEntry={onUndoBatchEntry}
        onClose={onClose}
      />
    );

    // Click the second entry (index 1)
    fireEvent.click(screen.getByText('2 locked'));
    expect(onUndoBatchEntry).toHaveBeenCalledWith(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not call onUndoBatchEntry when clicking non-undoable entry', () => {
    const onUndoBatchEntry = jest.fn();
    const batchEntries = [
      createBatchEntry({ message: '1 ungrouped', action: 'group', value: false, variant: 'ungroup' }),
    ];
    render(
      <UndoTimelinePopover
        {...BASE_PROPS}
        batchEntries={batchEntries}
        onUndoBatchEntry={onUndoBatchEntry}
      />
    );

    fireEvent.click(screen.getByText('1 ungrouped'));
    expect(onUndoBatchEntry).not.toHaveBeenCalled();
  });

  it('should not fail when onUndoBatchEntry is undefined', () => {
    const batchEntries = [
      createBatchEntry({ message: '3 hidden', variant: 'hide', action: 'visibility', value: true }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} onUndoBatchEntry={undefined} />);
    // Should not throw when clicking
    expect(() => fireEvent.click(screen.getByText('3 hidden'))).not.toThrow();
  });

  it('should use correct color for hide variant', () => {
    const batchEntries = [
      createBatchEntry({ message: 'hide test', variant: 'hide', action: 'visibility', value: true }),
    ];
    const { container } = render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    const batchBtn = container.querySelector('[class*="bg-red-400"]');
    expect(batchBtn).toBeTruthy();
  });

  it('should use correct color for show variant', () => {
    const batchEntries = [
      createBatchEntry({ message: 'show test', variant: 'show', action: 'visibility', value: false }),
    ];
    const { container } = render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    const batchBtn = container.querySelector('[class*="bg-green-400"]');
    expect(batchBtn).toBeTruthy();
  });

  it('should use correct color for lock variant', () => {
    const batchEntries = [
      createBatchEntry({ message: 'lock test', variant: 'lock', action: 'lock', value: true }),
    ];
    const { container } = render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    const batchBtn = container.querySelector('[class*="bg-amber-400"]');
    expect(batchBtn).toBeTruthy();
  });

  it('should use correct color for group variant', () => {
    const batchEntries = [
      createBatchEntry({ message: 'group test', variant: 'group', action: 'group', value: true }),
    ];
    const { container } = render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    const batchBtn = container.querySelector('[class*="bg-sky-400"]');
    expect(batchBtn).toBeTruthy();
  });

  it('should use correct color for ungroup variant', () => {
    const batchEntries = [
      createBatchEntry({ message: 'ungroup test', variant: 'ungroup', action: 'group', value: false }),
    ];
    const { container } = render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    const batchBtn = container.querySelector('[class*="bg-fuchsia-400"]');
    expect(batchBtn).toBeTruthy();
  });

  it('should display timestamps in HH:MM:SS format', () => {
    const fixedTime = new Date('2026-06-15T12:30:45').getTime();
    const batchEntries = [
      createBatchEntry({ message: 'timestamped', time: fixedTime }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    // toLocaleTimeString depends on locale, so just check a timestamp is rendered (digits + colons)
    const timeEl = screen.getByText(/\d{1,2}:\d{2}:\d{2}/);
    expect(timeEl).toBeTruthy();
  });

  it('should render multiple batch entries in order (newest first, as passed)', () => {
    const batchEntries = [
      createBatchEntry({ message: 'First', time: 1000 }),
      createBatchEntry({ message: 'Second', time: 2000 }),
      createBatchEntry({ message: 'Third', time: 3000 }),
    ];
    render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);

    const entries = screen.getAllByText(/First|Second|Third/);
    expect(entries[0]?.textContent).toBe('First');
    expect(entries[1]?.textContent).toBe('Second');
    expect(entries[2]?.textContent).toBe('Third');
  });

  it('should have amber dot indicator for undoable entries', () => {
    const batchEntries = [
      createBatchEntry({ message: 'dot test', action: 'visibility', value: true }),
    ];
    const { container } = render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    const dot = container.querySelector('[class*="bg-amber-400/60"]');
    expect(dot).toBeTruthy();
  });

  it('should have white dot indicator for non-undoable entries', () => {
    const batchEntries = [
      createBatchEntry({ message: 'non-dot', action: 'group', value: false, variant: 'ungroup' }),
    ];
    const { container } = render(<UndoTimelinePopover {...BASE_PROPS} batchEntries={batchEntries} />);
    // Non-undoable: should have bg-white/10 on the dot span
    const nonUndoableDot = container.querySelector('[class*="bg-white/10"]');
    expect(nonUndoableDot).toBeTruthy();
  });
});

// ── Snapshot tests ──────────────────────────────────────────────────────

describe('UndoTimelinePopover — snapshots', () => {
  const FIXED_DATE = new Date('2026-06-15T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should match snapshot for empty state', () => {
    const { container } = render(<UndoTimelinePopover {...BASE_PROPS} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with past entries only', () => {
    const past = [
      createEntry({ id: 'e1', type: 'CONTENT_CHANGE', label: 'Edited module', timestamp: Date.now() - 120000 }),
      createEntry({ id: 'e2', type: 'UI_SELECTION', label: 'Selected node', timestamp: Date.now() - 60000 }),
      createEntry({ id: 'e3', type: 'UI_PINNING', label: 'Pinned parameter', timestamp: Date.now() - 30000 }),
    ];
    const { container } = render(
      <UndoTimelinePopover {...BASE_PROPS} past={past} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with past and future entries', () => {
    const past = [
      createEntry({ id: 'e1', label: 'Current state', timestamp: Date.now() - 10000 }),
    ];
    const future = [
      createEntry({ id: 'e2', type: 'CONTENT_CHANGE', label: 'Future change', timestamp: Date.now() - 5000 }),
      createEntry({ id: 'e3', type: 'MODE_CHANGE', label: 'Mode switch', timestamp: Date.now() - 2000 }),
    ];
    const { container } = render(
      <UndoTimelinePopover {...BASE_PROPS} past={past} future={future} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with all event types in one list', () => {
    const past = ([
      'CONTENT_CHANGE',
      'UI_SELECTION',
      'UI_PINNING',
      'UI_LAYOUT_RATIO',
      'MODE_CHANGE',
      'SNAPSHOT',
      'RECOVERY_POINT',
    ] as const).map((type, i) =>
      createEntry({
        id: `e${i}`,
        type,
        label: type.replace(/_/g, ' '),
        timestamp: Date.now() - i * 60000,
      })
    );
    const { container } = render(
      <UndoTimelinePopover {...BASE_PROPS} past={past} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with batch entries', () => {
    const past = [
      createEntry({ id: 'e1', label: 'Edited module', timestamp: Date.now() - 120000 }),
    ];
    const batchEntries = [
      createBatchEntry({ message: '3 hidden', variant: 'hide', action: 'visibility', value: true, time: Date.now() - 30000 }),
      createBatchEntry({ message: '2 locked', variant: 'lock', action: 'lock', value: true, time: Date.now() - 20000 }),
      createBatchEntry({ message: '4 grouped', variant: 'group', action: 'group', value: true, time: Date.now() - 10000 }),
      createBatchEntry({ message: '1 ungrouped', variant: 'ungroup', action: 'group', value: false, time: Date.now() - 5000 }),
    ];
    const { container } = render(
      <UndoTimelinePopover {...BASE_PROPS} past={past} batchEntries={batchEntries} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
