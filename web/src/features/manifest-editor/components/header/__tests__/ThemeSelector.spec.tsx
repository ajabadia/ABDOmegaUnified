/**
 * @jest-environment jsdom
 *
 * Tests for ThemeSelector component — Theme dropdown selector (P7)
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeSelector from '../ThemeToggle';

// ── Rendering basics ────────────────────────────────────────────────────

describe('ThemeSelector — render states', () => {
  it('should render the trigger button with palette icon', () => {
    render(<ThemeSelector uiTheme="dark" setUiTheme={() => {}} />);
    // The trigger button has a title matching the active theme
    expect(screen.getByTitle(/Theme:/)).toBeTruthy();
    // It should contain an SVG icon (real lucide-react Palette renders <svg>)
    const trigger = screen.getByTitle(/Theme:/);
    expect(trigger.querySelector('svg')).toBeTruthy();
  });

  it('should show the correct active theme title in the trigger', () => {
    render(<ThemeSelector uiTheme="amber" setUiTheme={() => {}} />);
    expect(screen.getByTitle('Theme: Amber (Warm) (click to change)')).toBeTruthy();
  });

  it('should show "Dark (Industrial)" title when dark is selected', () => {
    render(<ThemeSelector uiTheme="dark" setUiTheme={() => {}} />);
    expect(screen.getByTitle('Theme: Dark (Industrial) (click to change)')).toBeTruthy();
  });

  it('should show "Cyberpunk (Neon)" title when cyberpunk is selected', () => {
    render(<ThemeSelector uiTheme="cyberpunk" setUiTheme={() => {}} />);
    expect(screen.getByTitle('Theme: Cyberpunk (Neon) (click to change)')).toBeTruthy();
  });

  it('should show "High Contrast" title when high-contrast is selected', () => {
    render(<ThemeSelector uiTheme="high-contrast" setUiTheme={() => {}} />);
    expect(screen.getByTitle('Theme: High Contrast (click to change)')).toBeTruthy();
  });

  it('should not render the dropdown when closed by default', () => {
    render(<ThemeSelector uiTheme="dark" setUiTheme={() => {}} />);
    // All theme labels should be absent when dropdown is closed
    expect(screen.queryByText('Dark (Industrial)')).toBeNull();
    expect(screen.queryByText('Light (Minimal)')).toBeNull();
    expect(screen.queryByText('Amber (Warm)')).toBeNull();
    expect(screen.queryByText('Cyberpunk (Neon)')).toBeNull();
    expect(screen.queryByText('High Contrast')).toBeNull();
  });
});

// ── Dropdown open/close ─────────────────────────────────────────────────

describe('ThemeSelector — dropdown open/close', () => {
  it('should open the dropdown when trigger is clicked', () => {
    render(<ThemeSelector uiTheme="dark" setUiTheme={() => {}} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    // All 5 themes should be visible
    expect(screen.getByText('Dark (Industrial)')).toBeTruthy();
    expect(screen.getByText('Light (Minimal)')).toBeTruthy();
    expect(screen.getByText('Amber (Warm)')).toBeTruthy();
    expect(screen.getByText('Cyberpunk (Neon)')).toBeTruthy();
    expect(screen.getByText('High Contrast')).toBeTruthy();
    // Should show 5 theme buttons inside the dropdown
    const allButtons = screen.getAllByRole('button');
    expect(allButtons.length).toBe(6); // 1 trigger + 5 options
  });

  it('should close the dropdown when trigger is clicked again', () => {
    render(<ThemeSelector uiTheme="dark" setUiTheme={() => {}} />);
    const trigger = screen.getByTitle(/Theme:/);
    fireEvent.click(trigger);
    expect(screen.getByText('Dark (Industrial)')).toBeTruthy();
    fireEvent.click(trigger);
    expect(screen.queryByText('Dark (Industrial)')).toBeNull();
  });

  it('should close the dropdown when a theme is selected', () => {
    const setUiTheme = jest.fn();
    render(<ThemeSelector uiTheme="dark" setUiTheme={setUiTheme} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    fireEvent.click(screen.getByText('Amber (Warm)'));
    expect(setUiTheme).toHaveBeenCalledWith('amber');
    expect(screen.queryByText('Amber (Warm)')).toBeNull();
  });

  it('should close on Escape key', () => {
    render(<ThemeSelector uiTheme="dark" setUiTheme={() => {}} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    expect(screen.getByText('Dark (Industrial)')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Dark (Industrial)')).toBeNull();
  });

  it('should close on click outside', () => {
    jest.useFakeTimers();
    render(<ThemeSelector uiTheme="dark" setUiTheme={() => {}} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    expect(screen.getByText('Dark (Industrial)')).toBeTruthy();
    // Flush the setTimeout(0) that attaches the mousedown listener
    jest.advanceTimersByTime(0);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Dark (Industrial)')).toBeNull();
    jest.useRealTimers();
  });

  it('should not close on click inside the dropdown', () => {
    jest.useFakeTimers();
    const { container } = render(<ThemeSelector uiTheme="dark" setUiTheme={() => {}} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    expect(screen.getByText('Dark (Industrial)')).toBeTruthy();
    // Find the dropdown wrapper (has 'absolute' class)
    jest.advanceTimersByTime(0);
    const dropdownEl = container.querySelector('[class*="absolute"]');
    if (dropdownEl) fireEvent.mouseDown(dropdownEl);
    expect(screen.getByText('Dark (Industrial)')).toBeTruthy();
    jest.useRealTimers();
  });
});

// ── Theme selection ─────────────────────────────────────────────────────

describe('ThemeSelector — theme selection', () => {
  it('should call setUiTheme with "dark" when Dark is clicked', () => {
    const setUiTheme = jest.fn();
    render(<ThemeSelector uiTheme="light" setUiTheme={setUiTheme} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    fireEvent.click(screen.getByText('Dark (Industrial)'));
    expect(setUiTheme).toHaveBeenCalledWith('dark');
  });

  it('should call setUiTheme with "light" when Light is clicked', () => {
    const setUiTheme = jest.fn();
    render(<ThemeSelector uiTheme="dark" setUiTheme={setUiTheme} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    fireEvent.click(screen.getByText('Light (Minimal)'));
    expect(setUiTheme).toHaveBeenCalledWith('light');
  });

  it('should call setUiTheme with "amber" when Amber is clicked', () => {
    const setUiTheme = jest.fn();
    render(<ThemeSelector uiTheme="dark" setUiTheme={setUiTheme} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    fireEvent.click(screen.getByText('Amber (Warm)'));
    expect(setUiTheme).toHaveBeenCalledWith('amber');
  });

  it('should call setUiTheme with "cyberpunk" when Cyberpunk is clicked', () => {
    const setUiTheme = jest.fn();
    render(<ThemeSelector uiTheme="dark" setUiTheme={setUiTheme} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    fireEvent.click(screen.getByText('Cyberpunk (Neon)'));
    expect(setUiTheme).toHaveBeenCalledWith('cyberpunk');
  });

  it('should call setUiTheme with "high-contrast" when High Contrast is clicked', () => {
    const setUiTheme = jest.fn();
    render(<ThemeSelector uiTheme="dark" setUiTheme={setUiTheme} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    fireEvent.click(screen.getByText('High Contrast'));
    expect(setUiTheme).toHaveBeenCalledWith('high-contrast');
  });

  it('should call setUiTheme once per click', () => {
    const setUiTheme = jest.fn();
    render(<ThemeSelector uiTheme="dark" setUiTheme={setUiTheme} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    fireEvent.click(screen.getByText('Light (Minimal)'));
    expect(setUiTheme).toHaveBeenCalledTimes(1);
  });
});

// ── Active theme indicator ──────────────────────────────────────────────

describe('ThemeSelector — active theme indicator', () => {
  it('should highlight the active theme button with primary class', () => {
    render(<ThemeSelector uiTheme="amber" setUiTheme={() => {}} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    const amberBtn = screen.getByText('Amber (Warm)').closest('button');
    // Active theme button should have bg-primary/10 class
    expect(amberBtn?.className).toContain('bg-primary/10');
    // Inactive theme should not have the active class
    const darkBtn = screen.getByText('Dark (Industrial)').closest('button');
    expect(darkBtn?.className).not.toContain('bg-primary/10');
  });

  it('should show a check indicator on the currently active theme', () => {
    render(<ThemeSelector uiTheme="cyberpunk" setUiTheme={() => {}} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    const cyberpunkBtn = screen.getByText('Cyberpunk (Neon)').closest('button');
    // The button should contain a Check icon (rendered as SVG from lucide-react)
    const checkIcon = cyberpunkBtn?.querySelector('svg.lucide-check');
    expect(checkIcon).toBeTruthy();
  });

  it('should show check only on the active theme (not on inactive)', () => {
    render(<ThemeSelector uiTheme="cyberpunk" setUiTheme={() => {}} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    // Active theme has check SVG
    const cyberpunkBtn = screen.getByText('Cyberpunk (Neon)').closest('button');
    expect(cyberpunkBtn?.querySelector('svg.lucide-check')).toBeTruthy();
    // Inactive theme should NOT have check SVG
    const darkBtn = screen.getByText('Dark (Industrial)').closest('button');
    expect(darkBtn?.querySelector('svg.lucide-check')).toBeNull();
  });

  it('should move check indicator when theme changes via rerender', () => {
    const { rerender } = render(<ThemeSelector uiTheme="dark" setUiTheme={() => {}} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    const darkBtn = screen.getByText('Dark (Industrial)').closest('button');
    expect(darkBtn?.querySelector('svg.lucide-check')).toBeTruthy();

    // Rerender with amber as active theme (state isOpen persists as true)
    rerender(<ThemeSelector uiTheme="amber" setUiTheme={() => {}} />);
    // Dropdown remains open after rerender — no need to click again
    const amberBtn = screen.getByText('Amber (Warm)').closest('button');
    expect(amberBtn?.querySelector('svg.lucide-check')).toBeTruthy();
    // Dark should no longer have check
    const darkBtnAfter = screen.getByText('Dark (Industrial)').closest('button');
    expect(darkBtnAfter?.querySelector('svg.lucide-check')).toBeNull();
  });

  it('should render color dots for each theme option', () => {
    const { container } = render(<ThemeSelector uiTheme="dark" setUiTheme={() => {}} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    // Each theme button should have a span with rounded-full class (the color dot)
    const buttons = container.querySelectorAll('button');
    // First button is the trigger, the rest are theme options
    const optionButtons = Array.from(buttons).slice(1);
    optionButtons.forEach((btn) => {
      const colorDot = btn.querySelector('span[class*="rounded-full"]');
      expect(colorDot).toBeTruthy();
    });
  });
});

// ── Edge cases ──────────────────────────────────────────────────────────

describe('ThemeSelector — edge cases', () => {
  it('should handle unknown uiTheme gracefully (falls back to first theme)', () => {
    render(<ThemeSelector uiTheme={'unknown' as 'dark'} setUiTheme={() => {}} />);
    // Falls back to THEMES[0] which is 'dark'
    expect(screen.getByTitle('Theme: Dark (Industrial) (click to change)')).toBeTruthy();
  });

  it('should not crash when clicking multiple themes rapidly', () => {
    const setUiTheme = jest.fn();
    render(<ThemeSelector uiTheme="dark" setUiTheme={setUiTheme} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    fireEvent.click(screen.getByText('Light (Minimal)'));
    fireEvent.click(screen.getByTitle(/Theme:/)); // reopen
    fireEvent.click(screen.getByText('Amber (Warm)'));
    fireEvent.click(screen.getByTitle(/Theme:/)); // reopen
    fireEvent.click(screen.getByText('Cyberpunk (Neon)'));
    expect(setUiTheme).toHaveBeenCalledTimes(3);
  });

  it('should render all 5 theme options', () => {
    render(<ThemeSelector uiTheme="dark" setUiTheme={() => {}} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    // Count all theme option buttons = total buttons - 1 (trigger)
    const allButtons = screen.getAllByRole('button');
    expect(allButtons.length - 1).toBe(5);
  });
});

// ── Snapshot tests ──────────────────────────────────────────────────────

describe('ThemeSelector — snapshots', () => {
  it('should match snapshot for closed state (dark theme)', () => {
    const { container } = render(<ThemeSelector uiTheme="dark" setUiTheme={() => {}} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for open dropdown (dark theme)', () => {
    const { container } = render(<ThemeSelector uiTheme="dark" setUiTheme={() => {}} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for open dropdown (cyberpunk theme)', () => {
    const { container } = render(<ThemeSelector uiTheme="cyberpunk" setUiTheme={() => {}} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for open dropdown (amber theme)', () => {
    const { container } = render(<ThemeSelector uiTheme="amber" setUiTheme={() => {}} />);
    fireEvent.click(screen.getByTitle(/Theme:/));
    expect(container.firstChild).toMatchSnapshot();
  });
});
