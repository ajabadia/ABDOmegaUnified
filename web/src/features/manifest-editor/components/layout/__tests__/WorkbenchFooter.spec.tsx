/**
 * @jest-environment jsdom
 *
 * Tests for WorkbenchFooter component — Status Bar (Era 9.7.0)
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import WorkbenchFooter from '../WorkbenchFooter';

// ── Mock lucide-react icons ─────────────────────────────────────────────
jest.mock('lucide-react', () => ({
  Layers: () => <span data-testid="icon-layers">Layers</span>,
  Cpu: () => <span data-testid="icon-cpu">Cpu</span>,
  FileCode: () => <span data-testid="icon-filecode">FileCode</span>,
  History: () => <span data-testid="icon-history">History</span>,
  Columns: () => <span data-testid="icon-columns">Columns</span>,
  Save: () => <span data-testid="icon-save">Save</span>,
  AlertTriangle: () => <span data-testid="icon-alert">AlertTriangle</span>,
  Circle: () => <span data-testid="icon-circle">Circle</span>,
}));

// ── Rendering basics ────────────────────────────────────────────────────

describe('WorkbenchFooter — rendering', () => {
  it('should render the build version', () => {
    render(<WorkbenchFooter />);
    expect(screen.getByText('Build v8.0.0')).toBeTruthy();
  });

  it('should render all 4 view selector buttons', () => {
    render(<WorkbenchFooter />);
    expect(screen.getByTitle('Orbital View (Ctrl+1)')).toBeTruthy();
    expect(screen.getByTitle('Virtual Rack (Ctrl+2)')).toBeTruthy();
    expect(screen.getByTitle('Source View (Ctrl+3)')).toBeTruthy();
    expect(screen.getByTitle('Timeline / History (Ctrl+4)')).toBeTruthy();
  });

  it('should render the split toggle button', () => {
    render(<WorkbenchFooter />);
    expect(screen.getByTitle('Toggle Split View (Vertical)')).toBeTruthy();
  });
});

// ── Dirty state ─────────────────────────────────────────────────────────

describe('WorkbenchFooter — dirty state', () => {
  it('should show "Modified" when isDirty is true', () => {
    render(<WorkbenchFooter isDirty={true} />);
    expect(screen.getByText('Modified')).toBeTruthy();
  });

  it('should show "Saved" when isDirty is false', () => {
    render(<WorkbenchFooter isDirty={false} />);
    expect(screen.getByText('Saved')).toBeTruthy();
  });

  it('should show timestamp when lastSavedTime is provided and clean', () => {
    render(<WorkbenchFooter isDirty={false} lastSavedTime="14:30:01" />);
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText(/14:30:01/)).toBeTruthy();
  });

  it('should not show timestamp when dirty even if lastSavedTime is provided', () => {
    render(<WorkbenchFooter isDirty={true} lastSavedTime="14:30:01" />);
    expect(screen.getByText('Modified')).toBeTruthy();
    // "Saved @ 14:30:01" should NOT be visible
    expect(screen.queryByText(/14:30:01/)).toBeNull();
  });

  it('should default to clean state when isDirty is not provided', () => {
    render(<WorkbenchFooter />);
    expect(screen.getByText('Saved')).toBeTruthy();
  });
});

// ── Error count ─────────────────────────────────────────────────────────

describe('WorkbenchFooter — error count', () => {
  it('should show error badge when errorCount > 0', () => {
    render(<WorkbenchFooter errorCount={3} />);
    expect(screen.getByText('3 errors')).toBeTruthy();
  });

  it('should show singular "error" when errorCount is 1', () => {
    render(<WorkbenchFooter errorCount={1} />);
    expect(screen.getByText('1 error')).toBeTruthy();
  });

  it('should not show error badge when errorCount is 0', () => {
    render(<WorkbenchFooter errorCount={0} />);
    expect(screen.queryByText(/error/)).toBeNull();
  });

  it('should not show error badge when errorCount is not provided', () => {
    render(<WorkbenchFooter />);
    expect(screen.queryByText(/error/)).toBeNull();
  });
});

// ── Warning count ───────────────────────────────────────────────────────

describe('WorkbenchFooter — warning count', () => {
  it('should show warning badge when warningCount > 0', () => {
    render(<WorkbenchFooter warningCount={2} />);
    expect(screen.getByText('2 warnings')).toBeTruthy();
  });

  it('should show singular "warning" when warningCount is 1', () => {
    render(<WorkbenchFooter warningCount={1} />);
    expect(screen.getByText('1 warning')).toBeTruthy();
  });

  it('should not show warning badge when warningCount is 0', () => {
    render(<WorkbenchFooter warningCount={0} />);
    expect(screen.queryByText(/warning/)).toBeNull();
  });
});

// ── Both errors and warnings ────────────────────────────────────────────

describe('WorkbenchFooter — errors and warnings together', () => {
  it('should show both errors and warnings separated by "/"', () => {
    render(<WorkbenchFooter errorCount={3} warningCount={2} />);
    expect(screen.getByText('3 errors')).toBeTruthy();
    expect(screen.getByText('2 warnings')).toBeTruthy();
    // The "/" separator between them
    expect(screen.getByText('/')).toBeTruthy();
  });

  it('should show only errors when warnings=0', () => {
    render(<WorkbenchFooter errorCount={3} warningCount={0} />);
    expect(screen.getByText('3 errors')).toBeTruthy();
    expect(screen.queryByText(/warning/)).toBeNull();
  });

  it('should show only warnings when errors=0', () => {
    render(<WorkbenchFooter errorCount={0} warningCount={2} />);
    expect(screen.queryByText(/error/)).toBeNull();
    expect(screen.getByText('2 warnings')).toBeTruthy();
  });
});

// ── Watchdog states ─────────────────────────────────────────────────────

describe('WorkbenchFooter — watchdog state', () => {
  it('should show "WATCHDOG SYNC ACTIVE" when connected', () => {
    render(<WorkbenchFooter watchdogStatus="connected" />);
    expect(screen.getByText('WATCHDOG SYNC ACTIVE')).toBeTruthy();
  });

  it('should show watchdog timestamp when connected and watchdogTime is provided', () => {
    render(<WorkbenchFooter watchdogStatus="connected" watchdogTime="14:30:01" />);
    expect(screen.getByText('WATCHDOG SYNC ACTIVE')).toBeTruthy();
    expect(screen.getByText(/14:30:01/)).toBeTruthy();
  });

  it('should show "WATCHDOG OFFLINE" when in error state', () => {
    render(<WorkbenchFooter watchdogStatus="error" />);
    expect(screen.getByText('WATCHDOG OFFLINE')).toBeTruthy();
  });

  it('should show "Aseptic Standard" when idle', () => {
    render(<WorkbenchFooter watchdogStatus="idle" />);
    expect(screen.getByText('Aseptic Standard')).toBeTruthy();
  });

  it('should default to idle state when watchdogStatus is not provided', () => {
    render(<WorkbenchFooter />);
    expect(screen.getByText('Aseptic Standard')).toBeTruthy();
  });
});

// ── Active tool indicator ───────────────────────────────────────────────

describe('WorkbenchFooter — active tool', () => {
  it('should show marquee indicator when activeTool is "marquee"', () => {
    render(<WorkbenchFooter activeTool="marquee" />);
    expect(screen.getByText('[M] Marquee')).toBeTruthy();
  });

  it('should show add indicator when activeTool is "add"', () => {
    render(<WorkbenchFooter activeTool="add" />);
    expect(screen.getByText('[A] Add')).toBeTruthy();
  });

  it('should not show tool indicator when activeTool is "select"', () => {
    render(<WorkbenchFooter activeTool="select" />);
    expect(screen.queryByText(/Marquee|Add/)).toBeNull();
  });

  it('should not show tool indicator when activeTool is null', () => {
    render(<WorkbenchFooter activeTool={null} />);
    expect(screen.queryByText(/Marquee|Add/)).toBeNull();
  });
});

// ── Integration: dirty + errors + watchdog combinations ────────────────

describe('WorkbenchFooter — integration (dirty + errors + watchdog)', () => {
  it('should show dirty+connected+errors (no warnings)', () => {
    render(
      <WorkbenchFooter
        isDirty={true}
        errorCount={3}
        warningCount={0}
        watchdogStatus="connected"
      />
    );
    expect(screen.getByText('Modified')).toBeTruthy();
    expect(screen.getByText('WATCHDOG SYNC ACTIVE')).toBeTruthy();
    expect(screen.getByText('3 errors')).toBeTruthy();
    expect(screen.queryByText(/warning/)).toBeNull();
    expect(screen.queryByText(/Saved/)).toBeNull();
  });

  it('should show dirty+connected+warnings only (no errors)', () => {
    render(
      <WorkbenchFooter
        isDirty={true}
        errorCount={0}
        warningCount={2}
        watchdogStatus="connected"
      />
    );
    expect(screen.getByText('Modified')).toBeTruthy();
    expect(screen.getByText('WATCHDOG SYNC ACTIVE')).toBeTruthy();
    expect(screen.getByText('2 warnings')).toBeTruthy();
    expect(screen.queryByText(/error/)).toBeNull();
  });

  it('should show dirty+watchdog offline+errors (worst case)', () => {
    render(
      <WorkbenchFooter
        isDirty={true}
        errorCount={5}
        warningCount={3}
        watchdogStatus="error"
      />
    );
    expect(screen.getByText('Modified')).toBeTruthy();
    expect(screen.getByText('WATCHDOG OFFLINE')).toBeTruthy();
    expect(screen.getByText('5 errors')).toBeTruthy();
    expect(screen.getByText('3 warnings')).toBeTruthy();
  });

  it('should show clean+watchdog idle+no errors (ideal state)', () => {
    render(
      <WorkbenchFooter
        isDirty={false}
        errorCount={0}
        warningCount={0}
        watchdogStatus="idle"
      />
    );
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText('Aseptic Standard')).toBeTruthy();
    expect(screen.queryByText(/error|warning|Modified/)).toBeNull();
  });

  it('should show dirty+watchdog idle+no errors (modified but no validation issues)', () => {
    render(
      <WorkbenchFooter
        isDirty={true}
        errorCount={0}
        warningCount={0}
        watchdogStatus="idle"
      />
    );
    expect(screen.getByText('Modified')).toBeTruthy();
    expect(screen.getByText('Aseptic Standard')).toBeTruthy();
    expect(screen.queryByText(/error|warning/)).toBeNull();
    expect(screen.queryByText(/Saved/)).toBeNull();
  });

  it('should show clean (just saved)+watchdog connected+errors (saved but validation issues)', () => {
    render(
      <WorkbenchFooter
        isDirty={false}
        lastSavedTime="10:30:00"
        errorCount={2}
        warningCount={0}
        watchdogStatus="connected"
        watchdogTime="10:30:01"
      />
    );
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText(/10:30:00/)).toBeTruthy();
    expect(screen.getByText('WATCHDOG SYNC ACTIVE')).toBeTruthy();
    expect(screen.getByText('2 errors')).toBeTruthy();
  });

  it('should show dirty+connected+no errors+active tool (marquee)', () => {
    render(
      <WorkbenchFooter
        isDirty={true}
        errorCount={0}
        warningCount={0}
        watchdogStatus="connected"
        watchdogTime="10:00:00"
        activeTool="marquee"
      />
    );
    expect(screen.getByText('Modified')).toBeTruthy();
    expect(screen.getByText('WATCHDOG SYNC ACTIVE')).toBeTruthy();
    expect(screen.getByText(/10:00:00/)).toBeTruthy();
    expect(screen.getByText('[M] Marquee')).toBeTruthy();
    expect(screen.queryByText(/error|warning/)).toBeNull();
  });
});

// ── Edge cases ──────────────────────────────────────────────────────────

describe('WorkbenchFooter — edge cases', () => {
  it('should handle all zero counts gracefully', () => {
    render(<WorkbenchFooter isDirty={false} errorCount={0} warningCount={0} />);
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.queryByText(/error|warning/)).toBeNull();
  });

  it('should handle missing optional props without crashing', () => {
    const { container } = render(<WorkbenchFooter />);
    // Just verify it renders without crashing — basic sanity
    expect(container.querySelector('footer')).toBeTruthy();
    expect(screen.getByText('Build v8.0.0')).toBeTruthy();
  });

  it('should handle all props set simultaneously', () => {
    render(
      <WorkbenchFooter
        watchdogStatus="connected"
        watchdogTime="12:00:00"
        isDirty={true}
        errorCount={5}
        warningCount={3}
        activeTool="marquee"
      />
    );
    expect(screen.getByText('WATCHDOG SYNC ACTIVE')).toBeTruthy();
    expect(screen.getByText('Modified')).toBeTruthy();
    expect(screen.getByText('5 errors')).toBeTruthy();
    expect(screen.getByText('3 warnings')).toBeTruthy();
    expect(screen.getByText('[M] Marquee')).toBeTruthy();
  });

  it('should not show timestamp when lastSavedTime is undefined', () => {
    render(<WorkbenchFooter isDirty={false} />);
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.queryByText(/@/)).toBeNull();
  });

  it('should not show timestamp when lastSavedTime is null', () => {
    render(<WorkbenchFooter isDirty={false} lastSavedTime={null} />);
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.queryByText(/@/)).toBeNull();
  });
});

// ── Snapshot tests ──────────────────────────────────────────────────────

describe('WorkbenchFooter — snapshots', () => {
  it('should match snapshot for default state (clean, idle, no errors)', () => {
    const { container } = render(<WorkbenchFooter />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for dirty state with errors and watchdog connected', () => {
    const { container } = render(
      <WorkbenchFooter
        isDirty={true}
        errorCount={2}
        warningCount={1}
        watchdogStatus="connected"
        watchdogTime="12:00:00"
        activeTabType="rack"
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for saved with timestamp, no errors, watchdog idle', () => {
    const { container } = render(
      <WorkbenchFooter
        isDirty={false}
        lastSavedTime="10:15:30"
        errorCount={0}
        warningCount={0}
        watchdogStatus="idle"
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for error watchdog with marquee tool', () => {
    const { container } = render(
      <WorkbenchFooter
        watchdogStatus="error"
        activeTool="marquee"
        isDirty={true}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for all props set (maximal state)', () => {
    const { container } = render(
      <WorkbenchFooter
        watchdogStatus="connected"
        watchdogTime="14:30:00"
        activeTabType="rack"
        isSplit={true}
        activeTool="add"
        isDirty={true}
        errorCount={5}
        warningCount={3}
        lastSavedTime="14:25:00"
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for clean state with save timestamp, warnings only', () => {
    const { container } = render(
      <WorkbenchFooter
        isDirty={false}
        lastSavedTime="09:45:00"
        errorCount={0}
        warningCount={4}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
