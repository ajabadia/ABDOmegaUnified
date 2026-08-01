/**
 * @jest-environment jsdom
 *
 * Tests for ModalCloseButton component — Reusable close button for modals
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import ModalCloseButton from '../ModalCloseButton';

// ── Rendering ───────────────────────────────────────────────────────────

describe('ModalCloseButton — rendering', () => {
  it('should render a button', () => {
    render(<ModalCloseButton onClick={() => {}} />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('should render the X icon', () => {
    render(<ModalCloseButton onClick={() => {}} />);
    // The X icon is an SVG element inside the button
    const btn = screen.getByRole('button');
    const svg = btn.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('should apply close button styling classes', () => {
    render(<ModalCloseButton onClick={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('p-1.5');
    expect(btn.className).toContain('rounded-xs');
    expect(btn.className).toContain('border');
    expect(btn.className).toContain('wb-outline');
    expect(btn.className).toContain('wb-text-muted');
    expect(btn.className).toContain('hover:bg-red-500/10');
    expect(btn.className).toContain('hover:border-red-500/30');
  });
});

// ── Title ───────────────────────────────────────────────────────────────

describe('ModalCloseButton — title', () => {
  it('should set title attribute on the button', () => {
    render(<ModalCloseButton onClick={() => {}} title="Close inspection" />);
    expect(screen.getByTitle('Close inspection')).toBeTruthy();
  });

  it('should not have a title when none is provided', () => {
    const { container } = render(<ModalCloseButton onClick={() => {}} />);
    const btn = container.querySelector('button');
    expect(btn?.getAttribute('title')).toBeFalsy();
  });
});

// ── Click handler ───────────────────────────────────────────────────────

describe('ModalCloseButton — click handler', () => {
  it('should call onClick when clicked', () => {
    const onClick = jest.fn();
    render(<ModalCloseButton onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should not throw when title is undefined', () => {
    const onClick = jest.fn();
    render(<ModalCloseButton onClick={onClick} />);
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// ── Snapshot tests ──────────────────────────────────────────────────────

describe('ModalCloseButton — snapshots', () => {
  it('should match snapshot with title', () => {
    const { container } = render(<ModalCloseButton onClick={() => {}} title="Close inspection" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot without title', () => {
    const { container } = render(<ModalCloseButton onClick={() => {}} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
