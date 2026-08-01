/**
 * @jest-environment jsdom
 *
 * Tests for DockPanelHeader — Encabezado reutilizable para dock panels.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { DockPanelHeader } from '../DockPanelHeader';

const defaultProps = {
  title: 'Layers',
  icon: <span data-testid="test-icon">icon</span>,
  onClose: jest.fn(),
};

// ── Rendering ──────────────────────────────────────────────────────────

describe('DockPanelHeader — rendering', () => {
  it('should render the title', () => {
    render(<DockPanelHeader {...defaultProps} />);
    expect(screen.getByText('Layers')).toBeTruthy();
  });

  it('should render the icon', () => {
    render(<DockPanelHeader {...defaultProps} />);
    expect(screen.getByTestId('test-icon')).toBeTruthy();
  });

  it('should render the X close icon', () => {
    const { container } = render(<DockPanelHeader {...defaultProps} />);
    // X icon from lucide renders an SVG
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('should apply container header classes', () => {
    const { container } = render(<DockPanelHeader {...defaultProps} />);
    const header = container.firstChild as HTMLElement;
    expect(header.className).toContain('flex');
    expect(header.className).toContain('items-center');
    expect(header.className).toContain('justify-between');
    expect(header.className).toContain('border-b');
    expect(header.className).toContain('transition-colors');
  });
});

// ── Variants ────────────────────────────────────────────────────────────

describe('DockPanelHeader — variants', () => {
  it('should apply default variant classes when variant is not specified', () => {
    render(<DockPanelHeader {...defaultProps} />);
    const header = screen.getByText('Layers').closest('div')?.parentElement as HTMLElement;
    expect(header.className).toContain('wb-surface-subtle');
    expect(header.className).toContain('hover:wb-surface-hover');
  });

  it('should apply default variant classes when variant="default"', () => {
    render(<DockPanelHeader {...defaultProps} variant="default" />);
    const header = screen.getByText('Layers').closest('div')?.parentElement as HTMLElement;
    expect(header.className).toContain('wb-surface-subtle');
    expect(header.className).toContain('hover:wb-surface-hover');
    expect(header.className).toContain('wb-text');
  });

  it('should apply subtle variant classes when variant="subtle"', () => {
    render(<DockPanelHeader {...defaultProps} variant="subtle" />);
    const header = screen.getByText('Layers').closest('div')?.parentElement as HTMLElement;
    expect(header.className).toContain('wb-surface-subtle');
    expect(header.className).toContain('hover:bg-primary/10');
    expect(header.className).toContain('wb-text');
  });
});

// ── Click handler ───────────────────────────────────────────────────────

describe('DockPanelHeader — click handler', () => {
  it('should call onClose when header is clicked', () => {
    const onClose = jest.fn();
    render(<DockPanelHeader {...defaultProps} onClose={onClose} />);
    const header = screen.getByText('Layers').closest('div')?.parentElement as HTMLElement;
    fireEvent.click(header);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── Snapshot tests ──────────────────────────────────────────────────────

describe('DockPanelHeader — snapshots', () => {
  it('should match snapshot for default variant', () => {
    const { container } = render(
      <DockPanelHeader title="Layers" icon={<span data-testid="icon">icon</span>} onClose={() => {}} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for subtle variant', () => {
    const { container } = render(
      <DockPanelHeader title="Compliance" icon={<span data-testid="icon">icon</span>} onClose={() => {}} variant="subtle" />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
