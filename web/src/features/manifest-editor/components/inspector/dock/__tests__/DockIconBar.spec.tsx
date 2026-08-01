/**
 * @jest-environment jsdom
 *
 * Tests for DockIconBar — Barra de iconos vertical genérica.
 * Unifica DockIconStrip y DockRackSectionToolbar.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { DockIconBar } from '../DockIconBar';
import type { DockIconBarButton, DockIconBarGroup } from '../DockIconBar';

const testButtons: DockIconBarButton[] = [
  { id: 'alpha', icon: <span data-testid="icon-alpha">A</span>, title: 'Alpha' },
  { id: 'beta', icon: <span data-testid="icon-beta">B</span>, title: 'Beta' },
  { id: 'gamma', icon: <span data-testid="icon-gamma">C</span>, title: 'Gamma' },
];

const defaultProps = {
  buttons: testButtons,
  isActive: jest.fn<(_: string) => boolean>().mockReturnValue(false),
  onButtonClick: jest.fn(),
};

// ── Rendering — without groups ─────────────────────────────────────────

describe('DockIconBar — rendering (no groups)', () => {
  it('should render all buttons', () => {
    const { container } = render(<DockIconBar {...defaultProps} />);
    const btns = container.querySelectorAll('button');
    expect(btns.length).toBe(3);
  });

  it('should render correct button titles', () => {
    render(<DockIconBar {...defaultProps} />);
    expect(screen.getByTitle('Alpha')).toBeTruthy();
    expect(screen.getByTitle('Beta')).toBeTruthy();
    expect(screen.getByTitle('Gamma')).toBeTruthy();
  });

  it('should render all icons', () => {
    render(<DockIconBar {...defaultProps} />);
    expect(screen.getByTestId('icon-alpha')).toBeTruthy();
    expect(screen.getByTestId('icon-beta')).toBeTruthy();
    expect(screen.getByTestId('icon-gamma')).toBeTruthy();
  });

  it('should apply default container classes', () => {
    const { container } = render(<DockIconBar {...defaultProps} />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain('w-10');
    expect(outer.className).toContain('wb-surface');
    expect(outer.className).toContain('shrink-0');
    expect(outer.className).toContain('z-50');
    expect(outer.className).toContain('shadow-xl');
  });

  it('should not render a label when not provided', () => {
    const { container } = render(<DockIconBar {...defaultProps} />);
    expect(container.textContent).not.toContain('RACK');
  });
});

// ── Rendering — with label ─────────────────────────────────────────────

describe('DockIconBar — label', () => {
  it('should render the label when provided', () => {
    render(<DockIconBar {...defaultProps} label="TEST BAR" />);
    expect(screen.getByText('TEST BAR')).toBeTruthy();
  });

  it('should apply label styling classes', () => {
    const { container } = render(<DockIconBar {...defaultProps} label="MY BAR" />);
    const labels = container.querySelectorAll('.text-\\[5px\\]');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

// ── Rendering — with groups ────────────────────────────────────────────

describe('DockIconBar — groups', () => {
  const groups: DockIconBarGroup[] = [
    { id: 'first', buttonIds: ['alpha', 'beta'] },
    { id: 'second', buttonIds: ['gamma'] },
  ];

  it('should render buttons grouped when groups prop is provided', () => {
    const { container } = render(<DockIconBar {...defaultProps} groups={groups} />);
    const btns = container.querySelectorAll('button');
    expect(btns.length).toBe(3);
  });

  it('should NOT render a divider for a single group', () => {
    const singleGroup: DockIconBarGroup[] = [
      { id: 'only', buttonIds: ['alpha', 'beta', 'gamma'] },
    ];
    const { container } = render(<DockIconBar {...defaultProps} groups={singleGroup} />);
    // There should be no divider since there's only one group (idx 0, no divider)
    const allDivs = container.querySelectorAll('div');
    const dividers = Array.from(allDivs).filter(d =>
      d.className.includes('bg-white') && d.className.includes('h-px')
    );
    expect(dividers.length).toBe(0);
  });

  it('should render a divider between multiple groups', () => {
    const { container } = render(<DockIconBar {...defaultProps} groups={groups} />);
    // Second group has idx=1, which should render a divider
    const allDivs = container.querySelectorAll('div');
    const dividers = Array.from(allDivs).filter(d =>
      d.className.includes('bg-white') && d.className.includes('h-px')
    );
    expect(dividers.length).toBe(1);
  });

  it('should place first group buttons before the divider', () => {
    const { container } = render(<DockIconBar {...defaultProps} groups={groups} />);
    const btns = container.querySelectorAll('button');
    expect(btns[0].getAttribute('title')).toBe('Alpha');
    expect(btns[1].getAttribute('title')).toBe('Beta');
  });

  it('should place second group buttons after the divider', () => {
    const { container } = render(<DockIconBar {...defaultProps} groups={groups} />);
    const btns = container.querySelectorAll('button');
    expect(btns[2].getAttribute('title')).toBe('Gamma');
  });

  it('should apply per-group className to group containers', () => {
    const groupsWithClass: DockIconBarGroup[] = [
      { id: 'scrollable', buttonIds: ['alpha'], className: 'overflow-y-auto max-h-[50vh]' },
      { id: 'normal', buttonIds: ['beta', 'gamma'] },
    ];
    const { container } = render(
      <DockIconBar {...defaultProps} groups={groupsWithClass} />
    );
    const allDivs = container.querySelectorAll('div');
    const scrollableDiv = Array.from(allDivs).find(d =>
      d.className.includes('overflow-y-auto')
    );
    expect(scrollableDiv).toBeTruthy();
    expect(scrollableDiv!.className).toContain('max-h-[50vh]');
  });

  it('should render group labels when provided', () => {
    const groupsWithLabels: DockIconBarGroup[] = [
      { id: 'essential', buttonIds: ['alpha'], label: 'ESSENTIAL' },
      { id: 'advanced', buttonIds: ['beta', 'gamma'], label: 'ADVANCED' },
    ];
    render(<DockIconBar {...defaultProps} groups={groupsWithLabels} />);
    expect(screen.getByText('ESSENTIAL')).toBeTruthy();
    expect(screen.getByText('ADVANCED')).toBeTruthy();
  });

  it('should render group label text before the group\'s buttons in DOM order', () => {
    const groupsWithLabels: DockIconBarGroup[] = [
      { id: 'first', buttonIds: ['alpha'], label: 'MY GROUP' },
      { id: 'second', buttonIds: ['beta'] },
    ];
    const { container } = render(
      <DockIconBar {...defaultProps} groups={groupsWithLabels} />
    );
    const html = container.innerHTML;
    const labelPos = html.indexOf('MY GROUP');
    const alphaBtnPos = html.indexOf('Alpha');
    // Label should appear before the first button in the DOM
    expect(labelPos).toBeGreaterThan(0);
    expect(alphaBtnPos).toBeGreaterThan(labelPos);
  });

  it('should not render group labels when group.label is not provided', () => {
    const groupsNoLabels: DockIconBarGroup[] = [
      { id: 'first', buttonIds: ['alpha'] },
      { id: 'second', buttonIds: ['beta', 'gamma'] },
    ];
    const { container } = render(
      <DockIconBar {...defaultProps} groups={groupsNoLabels} />
    );
    expect(container.textContent).not.toContain('ESSENTIAL');
    expect(container.textContent).not.toContain('ADVANCED');
  });
});

// ── Active state ────────────────────────────────────────────────────────

describe('DockIconBar — active state', () => {
  it('should apply active classes when isActive returns true', () => {
    render(
      <DockIconBar
        {...defaultProps}
        isActive={(id) => id === 'alpha'}
      />
    );
    const btns = screen.getAllByRole('button');
    // Alpha should be active
    expect(btns[0].className).toContain('bg-primary/20');
    // Beta and Gamma should be inactive
    expect(btns[1].className).toContain('wb-text-muted');
    expect(btns[2].className).toContain('wb-text-muted');
  });

  it('should apply shadow class when active', () => {
    render(
      <DockIconBar
        {...defaultProps}
        isActive={() => true}
      />
    );
    const btns = screen.getAllByRole('button');
    btns.forEach(btn => {
      expect(btn.className).toContain('shadow-[0_0_8px_rgba(var(--primary-rgb),0.1)]');
    });
  });

  it('should not apply shadow class when inactive', () => {
    render(
      <DockIconBar
        {...defaultProps}
        isActive={() => false}
      />
    );
    const btns = screen.getAllByRole('button');
    btns.forEach(btn => {
      expect(btn.className).not.toContain('shadow-[');
    });
  });

  it('should handle all buttons inactive by default', () => {
    render(<DockIconBar {...defaultProps} />);
    const btns = screen.getAllByRole('button');
    btns.forEach(btn => {
      expect(btn.className).toContain('wb-text-muted');
    });
  });
});

// ── className prop ──────────────────────────────────────────────────────

describe('DockIconBar — className prop', () => {
  it('should apply custom className to container', () => {
    const { container } = render(
      <DockIconBar {...defaultProps} className="z-45 animate-in shadow-lg" />
    );
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain('z-45');
    expect(outer.className).toContain('animate-in');
    expect(outer.className).toContain('shadow-lg');
  });

  it('should replace default z-50 and shadow-xl with custom className', () => {
    const { container } = render(
      <DockIconBar {...defaultProps} className="z-45 shadow-lg" />
    );
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain('z-45');
    expect(outer.className).toContain('shadow-lg');
    expect(outer.className).not.toContain('z-50');
    expect(outer.className).not.toContain('shadow-xl');
  });
});

// ── Click handler ───────────────────────────────────────────────────────

describe('DockIconBar — click handler', () => {
  it('should call onButtonClick with correct id when button is clicked', () => {
    const onButtonClick = jest.fn();
    render(<DockIconBar {...defaultProps} onButtonClick={onButtonClick} />);
    const btns = screen.getAllByRole('button');

    fireEvent.click(btns[0]);
    expect(onButtonClick).toHaveBeenCalledWith('alpha');

    fireEvent.click(btns[2]);
    expect(onButtonClick).toHaveBeenCalledWith('gamma');
  });
});

// ── Edge cases ──────────────────────────────────────────────────────────

describe('DockIconBar — edge cases', () => {
  it('should render empty container when buttons is empty', () => {
    const { container } = render(
      <DockIconBar {...defaultProps} buttons={[]} />
    );
    const btns = container.querySelectorAll('button');
    expect(btns.length).toBe(0);
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain('w-10');
  });

  it('should gracefully handle missing button IDs in groups', () => {
    const groupsWithMissing: DockIconBarGroup[] = [
      { id: 'existing', buttonIds: ['alpha', 'nonexistent', 'beta'] },
    ];
    const { container } = render(
      <DockIconBar {...defaultProps} groups={groupsWithMissing} />
    );
    // Only alpha and beta should render (nonexistent has no button entry)
    const btns = container.querySelectorAll('button');
    expect(btns.length).toBe(2);
  });
});

// ── Snapshot tests ──────────────────────────────────────────────────────

describe('DockIconBar — snapshots', () => {
  it('should match snapshot without groups, all inactive', () => {
    const { container } = render(<DockIconBar {...defaultProps} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot without groups, some active', () => {
    const { container } = render(
      <DockIconBar
        {...defaultProps}
        isActive={(id) => id === 'alpha' || id === 'gamma'}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with groups and label', () => {
    const groups: DockIconBarGroup[] = [
      { id: 'first', buttonIds: ['alpha', 'beta'] },
      { id: 'second', buttonIds: ['gamma'] },
    ];
    const { container } = render(
      <DockIconBar
        {...defaultProps}
        groups={groups}
        label="SECTIONS"
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with custom className', () => {
    const { container } = render(
      <DockIconBar
        {...defaultProps}
        className="z-45 animate-in slide-in-from-right shadow-lg"
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with per-group className (like advanced scrolling)', () => {
    const groups: DockIconBarGroup[] = [
      { id: 'essential', buttonIds: ['alpha'] },
      { id: 'advanced', buttonIds: ['beta', 'gamma'], className: 'overflow-y-auto max-h-[50vh]' },
    ];
    const { container } = render(
      <DockIconBar
        {...defaultProps}
        groups={groups}
        label="RACK SECT"
        isActive={() => true}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
