/**
 * @jest-environment jsdom
 *
 * Tests for ToolbarIconButton component — Reusable icon toggle button
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import ToolbarIconButton from '../ToolbarIconButton';

// ── Rendering — default state ──────────────────────────────────────────

describe('ToolbarIconButton — rendering', () => {
  it('should render a button', () => {
    render(<ToolbarIconButton icon={<span>icon</span>} onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('should render the given icon', () => {
    render(<ToolbarIconButton icon={<span data-testid="test-icon" />} onClick={() => {}} />);
    expect(screen.getByTestId('test-icon')).toBeTruthy();
  });

  it('should apply base button classes', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('flex');
    expect(btn.className).toContain('items-center');
    expect(btn.className).toContain('justify-center');
    expect(btn.className).toContain('rounded-xs');
    expect(btn.className).toContain('transition-all');
  });
});

// ── Size ────────────────────────────────────────────────────────────────

describe('ToolbarIconButton — size', () => {
  it('should default to size="sm" (w-5 h-4)', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('w-5');
    expect(btn.className).toContain('h-4');
  });

  it('should apply w-5 h-4 when size="sm"', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} size="sm" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('w-5');
    expect(btn.className).toContain('h-4');
  });

  it('should apply w-7 h-7 when size="md"', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} size="md" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('w-7');
    expect(btn.className).toContain('h-7');
  });

  it('should not add hover:bg-primary/10 for size="sm"', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} size="sm" />);
    const btn = screen.getByRole('button');
    expect(btn.className).not.toContain('hover:bg-primary/10');
  });

  it('should add hover:bg-primary/10 for size="md" when inactive', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} size="md" active={false} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('hover:bg-primary/10');
  });
});

// ── Active state — primary (default) ───────────────────────────────────

describe('ToolbarIconButton — active state (primary)', () => {
  it('should apply primary highlight when active is true', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} active />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-primary/20');
    expect(btn.className).toContain('text-primary');
    expect(btn.className).toContain('border');
    expect(btn.className).toContain('border-primary/20');
  });

  it('should apply muted styling when active is false', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} active={false} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('wb-text-muted');
    expect(btn.className).toContain('hover:wb-text');
    expect(btn.className).not.toContain('bg-primary/20');
  });

  it('should default to inactive when active is not provided', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('wb-text-muted');
    expect(btn.className).not.toContain('bg-primary/20');
  });

  it('should default colorVariant to primary when not specified', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} active />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-primary/20');
    expect(btn.className).not.toContain('bg-accent/20');
  });
});

// ── Active state — accent variant ───────────────────────────────────────

describe('ToolbarIconButton — accent variant', () => {
  it('should apply accent highlight when active with colorVariant="accent"', () => {
    render(
      <ToolbarIconButton icon={<span />} onClick={() => {}} active colorVariant="accent" />
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-accent/20');
    expect(btn.className).toContain('text-accent');
    expect(btn.className).toContain('border');
    expect(btn.className).toContain('border-accent/20');
  });

  it('should NOT apply primary classes when accent is active', () => {
    render(
      <ToolbarIconButton icon={<span />} onClick={() => {}} active colorVariant="accent" />
    );
    const btn = screen.getByRole('button');
    expect(btn.className).not.toContain('bg-primary/20');
    expect(btn.className).not.toContain('text-primary');
    expect(btn.className).not.toContain('border-primary/20');
  });

  it('should apply muted styling when accent is inactive (same as primary)', () => {
    render(
      <ToolbarIconButton icon={<span />} onClick={() => {}} active={false} colorVariant="accent" />
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('wb-text-muted');
    expect(btn.className).toContain('hover:wb-text');
  });

  it('should work with className prop (e.g. tool-active-glow-accent)', () => {
    render(
      <ToolbarIconButton
        icon={<span />}
        onClick={() => {}}
        active
        colorVariant="accent"
        className="tool-active-glow-accent"
      />
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('tool-active-glow-accent');
    expect(btn.className).toContain('bg-accent/20');
    expect(btn.className).toContain('text-accent');
  });
});

// ── className prop ─────────────────────────────────────────────────────

describe('ToolbarIconButton — className prop', () => {
  it('should append extra classes to the button', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} className="tool-active-glow" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('tool-active-glow');
  });

  it('should append shadow class for dock-style active buttons', () => {
    render(
      <ToolbarIconButton
        icon={<span />}
        onClick={() => {}}
        active
        className="shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]"
      />
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]');
  });

  it('should handle empty className without issues', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} className="" />);
    const btn = screen.getByRole('button');
    // Should still render with base classes
    expect(btn.className).toContain('flex');
  });
});

// ── aria-pressed (WCAG toggle button) ──────────────────────────────────

describe('ToolbarIconButton — aria-pressed', () => {
  it('should set aria-pressed="true" when active=true and onClick provided', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} active />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('should set aria-pressed="false" when active=false and onClick provided', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} active={false} />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('should NOT set aria-pressed when active prop is not provided (undefined)', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-pressed')).toBeNull();
  });

  it('should NOT set aria-pressed when onClick is not provided', () => {
    render(<ToolbarIconButton icon={<span />} active />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-pressed')).toBeNull();
  });

  it('should NOT set aria-pressed when both active and onClick are missing', () => {
    render(<ToolbarIconButton icon={<span />} />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-pressed')).toBeNull();
  });

  it('should set aria-label to match title for accessibility', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} title="Select Tool" />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-label')).toBe('Select Tool');
  });
});

// ── Title ───────────────────────────────────────────────────────────────

describe('ToolbarIconButton — title', () => {
  it('should set the title attribute', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} title="Select Tool (V)" />);
    expect(screen.getByTitle('Select Tool (V)')).toBeTruthy();
  });

  it('should not have a title when not provided', () => {
    const { container } = render(<ToolbarIconButton icon={<span />} onClick={() => {}} />);
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('title')).toBeFalsy();
  });
});

// ── Click handler ───────────────────────────────────────────────────────

describe('ToolbarIconButton — click handler', () => {
  it('should call onClick when clicked', () => {
    const onClick = jest.fn();
    render(<ToolbarIconButton icon={<span />} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should not throw when onClick is undefined', () => {
    render(<ToolbarIconButton icon={<span />} />);
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
  });
});

// ── Snapshot tests ──────────────────────────────────────────────────────

describe('ToolbarIconButton — snapshots', () => {
  it('should match snapshot for size="sm" default', () => {
    const { container } = render(<ToolbarIconButton icon={<span data-testid="icon" />} title="Footer Button" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for size="md" inactive', () => {
    const { container } = render(
      <ToolbarIconButton icon={<span data-testid="icon" />} title="Toolbar Button" size="md" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for size="md" active (primary)', () => {
    const { container } = render(
      <ToolbarIconButton icon={<span data-testid="icon" />} title="Active Tool" size="md" active />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with className', () => {
    const { container } = render(
      <ToolbarIconButton icon={<span data-testid="icon" />} title="With Class" className="tool-active-glow" active />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for size="sm" active', () => {
    const { container } = render(
      <ToolbarIconButton icon={<span data-testid="icon" />} title="Footer Active" size="sm" active />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for colorVariant="accent" active', () => {
    const { container } = render(
      <ToolbarIconButton
        icon={<span data-testid="icon" />}
        title="Live Mode"
        size="md"
        active
        colorVariant="accent"
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for colorVariant="accent" with glow class', () => {
    const { container } = render(
      <ToolbarIconButton
        icon={<span data-testid="icon" />}
        title="Live Active"
        size="md"
        active
        colorVariant="accent"
        className="tool-active-glow-accent"
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for colorVariant="accent" inactive', () => {
    const { container } = render(
      <ToolbarIconButton
        icon={<span data-testid="icon" />}
        title="Live Disconnected"
        size="md"
        active={false}
        colorVariant="accent"
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
