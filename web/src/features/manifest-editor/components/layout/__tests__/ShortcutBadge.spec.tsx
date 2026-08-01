/**
 * @jest-environment jsdom
 *
 * Tests for ShortcutBadge component — Reusable keyboard shortcut badge
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import ShortcutBadge from '../ShortcutBadge';

// ── Rendering — default state (inactive, enabled) ──────────────────────

describe('ShortcutBadge — default state', () => {
  it('should render a button with the given keys', () => {
    render(<ShortcutBadge keys={['Ctrl', 'Z']} />);
    expect(screen.getByText('Ctrl')).toBeTruthy();
    expect(screen.getByText('Z')).toBeTruthy();
  });

  it('should render + separators between keys', () => {
    render(<ShortcutBadge keys={['Ctrl', 'Shift', 'Z']} />);
    const plusSigns = screen.getAllByText('+');
    expect(plusSigns).toHaveLength(2);
  });

  it('should render kbd elements with uppercase text', () => {
    render(<ShortcutBadge keys={['Ctrl', 'Z']} />);
    const kbds = document.querySelectorAll('kbd');
    expect(kbds).toHaveLength(2);
    expect(kbds[0].textContent).toBe('Ctrl');
    expect(kbds[1].textContent).toBe('Z');
  });

  it('should apply default muted styling when not active and not disabled', () => {
    render(<ShortcutBadge keys={['Ctrl', 'K']} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-white/10');
    expect(btn.className).toContain('bg-white/5');
    expect(btn.className).toContain('text-white/30');
    expect(btn.className).toContain('hover:bg-white/10');
    expect(btn.className).toContain('hover:text-white/50');
    expect(btn.className).not.toContain('cursor-not-allowed');
  });

  it('should default to responsive="flex" (always visible)', () => {
    render(<ShortcutBadge keys={['Ctrl', 'K']} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/\bflex\b/);
  });
});

// ── Active state ────────────────────────────────────────────────────────

describe('ShortcutBadge — active state', () => {
  it('should apply primary highlight when active is true', () => {
    render(<ShortcutBadge keys={['Ctrl', '2']} active />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-primary/30');
    expect(btn.className).toContain('bg-primary/10');
    expect(btn.className).toContain('text-primary');
    expect(btn.className).toContain('hover:bg-primary/20');
  });

  it('should not be disabled when active', () => {
    render(<ShortcutBadge keys={['Ctrl', '2']} active />);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

// ── Disabled state ──────────────────────────────────────────────────────

describe('ShortcutBadge — disabled state', () => {
  it('should be disabled when disabled is true', () => {
    render(<ShortcutBadge keys={['Ctrl', 'Z']} disabled />);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('should apply muted styling when disabled', () => {
    render(<ShortcutBadge keys={['Ctrl', 'Z']} disabled />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-white/5');
    expect(btn.className).toContain('bg-transparent');
    expect(btn.className).toContain('text-white/10');
    expect(btn.className).toContain('cursor-not-allowed');
  });

  it('should not apply primary highlight when disabled even if active is true', () => {
    render(<ShortcutBadge keys={['Ctrl', 'Z']} disabled active />);
    const btn = screen.getByRole('button');
    // Disabled takes precedence over active
    expect(btn.className).toContain('border-white/5');
    expect(btn.className).not.toContain('border-primary/30');
  });
});

// ── Click handler ───────────────────────────────────────────────────────

describe('ShortcutBadge — click handler', () => {
  it('should call onClick when clicked and not disabled', () => {
    const onClick = jest.fn();
    render(<ShortcutBadge keys={['Ctrl', 'K']} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', () => {
    const onClick = jest.fn();
    render(<ShortcutBadge keys={['Ctrl', 'Z']} onClick={onClick} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('should not throw when onClick is undefined and button is clicked', () => {
    render(<ShortcutBadge keys={['Ctrl', 'K']} />);
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
  });
});

// ── Title ───────────────────────────────────────────────────────────────

describe('ShortcutBadge — title', () => {
  it('should set the title attribute on the button', () => {
    render(<ShortcutBadge keys={['Ctrl', 'K']} title="Command Palette (Ctrl+K)" />);
    const btn = screen.getByTitle('Command Palette (Ctrl+K)');
    expect(btn).toBeTruthy();
  });

  it('should not have a title when none is provided', () => {
    const { container } = render(<ShortcutBadge keys={['Ctrl', 'Z']} />);
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('title')).toBeFalsy();
  });
});

// ── Responsive prop ─────────────────────────────────────────────────────

describe('ShortcutBadge — responsive prop', () => {
  it('should apply custom responsive class when provided', () => {
    render(<ShortcutBadge keys={['Ctrl', 'S']} responsive="hidden md:flex" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('hidden');
    expect(btn.className).toContain('md:flex');
  });

  it('should default to flex', () => {
    render(<ShortcutBadge keys={['Ctrl', 'Z']} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/\bflex\b/);
  });
});

// ── Single key ──────────────────────────────────────────────────────────

describe('ShortcutBadge — single key', () => {
  it('should render a single kbd element without + separator', () => {
    render(<ShortcutBadge keys={['Esc']} />);
    const kbds = document.querySelectorAll('kbd');
    expect(kbds).toHaveLength(1);
    expect(kbds[0].textContent).toBe('Esc');
    expect(screen.queryByText('+')).toBeNull();
  });
});

// ── Snapshot tests ──────────────────────────────────────────────────────

describe('ShortcutBadge — snapshots', () => {
  it('should match snapshot for default state', () => {
    const { container } = render(<ShortcutBadge keys={['Ctrl', 'K']} title="Command Palette" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for active state', () => {
    const { container } = render(<ShortcutBadge keys={['Ctrl', '2']} active title="Virtual Rack" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for disabled state', () => {
    const { container } = render(<ShortcutBadge keys={['Ctrl', 'Z']} disabled title="Undo" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with three keys', () => {
    const { container } = render(<ShortcutBadge keys={['Ctrl', 'Shift', 'M']} active title="Mini Map" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with responsive class', () => {
    const { container } = render(<ShortcutBadge keys={['Ctrl', 'S']} responsive="hidden md:flex" title="Save" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
