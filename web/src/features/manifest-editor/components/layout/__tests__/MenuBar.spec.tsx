/**
 * @jest-environment jsdom
 *
 * Tests for MenuBar component — Help > Guided Tour menu item
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import MenuBar from '../MenuBar';

// ── Mock framer-motion ──────────────────────────────────────────────
// Render children directly without animation wrappers
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      // Strip framer-motion-specific props that React doesn't recognize
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, exit, transition, ...cleanProps } = props as Record<string, unknown>;
      return <div {...cleanProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// ── Required props (all required MenuBar props as no-ops) ────────────
const BASE_PROPS = {
  onTriggerUpload: () => {},
  onExportManifest: () => {},
  onExportPack: () => {},
  onExportOmegaRack: () => {},
  onExportCAD: () => {},
  onExportContract: () => {},
  onDeploy: () => {},
  onReset: () => {},
  onUndo: () => {},
  onRedo: () => {},
  onToggleLogs: () => {},
  onHelp: () => {},
  onGenerateMockup: () => {},
  onTabFocus: () => {},
  onOpenAudit: () => {},
  onOpenAbout: () => {},
  onOpenConfig: () => {},
};

// ── Helper: open the Help menu dropdown ─────────────────────────────
function openHelpMenu() {
  render(<MenuBar {...BASE_PROPS} />);
  const helpBtn = screen.getByText('Help');
  fireEvent.click(helpBtn);
}

// ── Help > Guided Tour ─────────────────────────────────────────────
describe('MenuBar — Help > Guided Tour', () => {
  it('should render the Help menu button', () => {
    render(<MenuBar {...BASE_PROPS} />);
    expect(screen.getByText('Help')).toBeTruthy();
  });

  it('should show "Guided Tour" when Help menu is opened', () => {
    openHelpMenu();
    // "Guided Tour" is rendered via MenuItem using lowercase/uppercase as defined in menu data
    const tourItem = screen.getByText('Guided Tour');
    expect(tourItem).toBeTruthy();
  });

  it('should show "Engineering Manual" before "Guided Tour" in the Help menu', () => {
    openHelpMenu();
    const helpDropdown = screen.getByText('Help').parentElement!;
    const items = helpDropdown.querySelectorAll('button');
    const labels = Array.from(items).map(btn => btn.textContent?.trim());
    const engIdx = labels.indexOf('Engineering Manual');
    const tourIdx = labels.indexOf('Guided Tour');
    expect(engIdx).toBeGreaterThanOrEqual(0);
    expect(tourIdx).toBeGreaterThan(engIdx);
  });

  it('should show "Guided Tour" before "About OMEGA" in the Help menu', () => {
    openHelpMenu();
    const helpDropdown = screen.getByText('Help').parentElement!;
    const items = helpDropdown.querySelectorAll('button');
    const labels = Array.from(items).map(btn => btn.textContent?.trim());
    const tourIdx = labels.indexOf('Guided Tour');
    const aboutIdx = labels.indexOf('About OMEGA');
    expect(tourIdx).toBeGreaterThanOrEqual(0);
    expect(aboutIdx).toBeGreaterThan(tourIdx);
  });

  it('should call onToggleTour when "Guided Tour" is clicked', () => {
    const onToggleTour = jest.fn();
    render(<MenuBar {...BASE_PROPS} onToggleTour={onToggleTour} />);
    // Open Help menu
    fireEvent.click(screen.getByText('Help'));
    // Click "Guided Tour"
    fireEvent.click(screen.getByText('Guided Tour'));
    expect(onToggleTour).toHaveBeenCalledTimes(1);
  });

  it('should not crash when onToggleTour is undefined', () => {
    render(<MenuBar {...BASE_PROPS} />);
    fireEvent.click(screen.getByText('Help'));
    const tourItem = screen.getByText('Guided Tour');
    expect(() => fireEvent.click(tourItem)).not.toThrow();
  });

  it('should not render "Guided Tour" when Help menu is closed', () => {
    render(<MenuBar {...BASE_PROPS} />);
    // Help menu is closed by default
    expect(screen.queryByText('Guided Tour')).toBeNull();
  });

  it('should show the HelpCircle icon next to "Guided Tour"', () => {
    openHelpMenu();
    const tourItem = screen.getByText('Guided Tour');
    // The button containing "Guided Tour" should have a HelpCircle icon rendered
    // We can verify the parent button exists and has a nested SVG or span element
    const button = tourItem.closest('button');
    expect(button).toBeTruthy();
    // The button should contain an SVG (from lucide-react HelpCircle)
    const svg = button?.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});

// ── Other Help menu items are unaffected ────────────────────────────
describe('MenuBar — Help menu other items', () => {
  it('should still show "Engineering Manual" and call onHelp', () => {
    const onHelp = jest.fn();
    render(<MenuBar {...BASE_PROPS} onHelp={onHelp} />);
    fireEvent.click(screen.getByText('Help'));
    fireEvent.click(screen.getByText('Engineering Manual'));
    expect(onHelp).toHaveBeenCalledTimes(1);
  });

  it('should show "Compliance (Audit)" in Window menu with toggle', () => {
    const onToggleWindow = jest.fn();
    render(<MenuBar {...BASE_PROPS} onToggleWindow={onToggleWindow} windowStates={{
      window_layers: false, window_properties: false, window_rack_properties: false,
      window_blueprints: false, window_compliance: false, window_info: false,
      window_history: false, window_logs: false,
    }} />);
    fireEvent.click(screen.getByText('Window'));
    const complianceItem = screen.getByText('Compliance (Audit)');
    expect(complianceItem).toBeTruthy();
    fireEvent.click(complianceItem);
    expect(onToggleWindow).toHaveBeenCalledWith('window_compliance');
  });

  it('should show "About OMEGA" and call onOpenAbout', () => {
    const onOpenAbout = jest.fn();
    render(<MenuBar {...BASE_PROPS} onOpenAbout={onOpenAbout} />);
    fireEvent.click(screen.getByText('Help'));
    fireEvent.click(screen.getByText('About OMEGA'));
    expect(onOpenAbout).toHaveBeenCalledTimes(1);
  });
});

// ── Snapshot ─────────────────────────────────────────────────────────
describe('MenuBar — snapshots', () => {
  it('should match snapshot for Help menu open with onToggleTour', () => {
    const { container } = render(
      <MenuBar {...BASE_PROPS} onToggleTour={() => {}} />
    );
    fireEvent.click(screen.getByText('Help'));
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for Help menu open without onToggleTour', () => {
    const { container } = render(<MenuBar {...BASE_PROPS} />);
    fireEvent.click(screen.getByText('Help'));
    expect(container.firstChild).toMatchSnapshot();
  });
});
