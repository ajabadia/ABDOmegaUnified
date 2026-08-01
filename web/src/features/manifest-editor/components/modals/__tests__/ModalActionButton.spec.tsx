/**
 * @jest-environment jsdom
 *
 * Tests for ModalActionButton component — Reusable secondary action button for modals
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import ModalActionButton from '../ModalActionButton';

// ── Rendering ───────────────────────────────────────────────────────────

describe('ModalActionButton — rendering', () => {
  it('should render a button with children text', () => {
    render(<ModalActionButton onClick={() => {}}>Dismiss View</ModalActionButton>);
    expect(screen.getByText('Dismiss View')).toBeTruthy();
  });

  it('should render a button accessible by role', () => {
    render(<ModalActionButton onClick={() => {}}>Cancel</ModalActionButton>);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('should apply action button styling classes', () => {
    render(<ModalActionButton onClick={() => {}}>Dismiss</ModalActionButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('px-6');
    expect(btn.className).toContain('py-2.5');
    expect(btn.className).toContain('rounded-xs');
    expect(btn.className).toContain('border');
    expect(btn.className).toContain('wb-outline');
    expect(btn.className).toContain('wb-text-muted');
    expect(btn.className).toContain('text-[9px]');
    expect(btn.className).toContain('font-black');
    expect(btn.className).toContain('uppercase');
    expect(btn.className).toContain('tracking-widest');
  });
});

// ── Children ────────────────────────────────────────────────────────────

describe('ModalActionButton — children', () => {
  it('should render custom text as children', () => {
    render(<ModalActionButton onClick={() => {}}>Abort Ingestion</ModalActionButton>);
    expect(screen.getByText('Abort Ingestion')).toBeTruthy();
  });

  it('should render custom JSX as children', () => {
    render(
      <ModalActionButton onClick={() => {}}>
        <span data-testid="custom-child">Cancel Selection</span>
      </ModalActionButton>
    );
    expect(screen.getByTestId('custom-child')).toBeTruthy();
    expect(screen.getByText('Cancel Selection')).toBeTruthy();
  });
});

// ── Click handler ───────────────────────────────────────────────────────

describe('ModalActionButton — click handler', () => {
  it('should call onClick when clicked', () => {
    const onClick = jest.fn();
    render(<ModalActionButton onClick={onClick}>Click Me</ModalActionButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should call onClick each time it is clicked', () => {
    const onClick = jest.fn();
    render(<ModalActionButton onClick={onClick}>Click Me</ModalActionButton>);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(3);
  });
});

// ── Disabled state ──────────────────────────────────────────────────────

describe('ModalActionButton — disabled state', () => {
  it('should be disabled when disabled is true', () => {
    render(<ModalActionButton onClick={() => {}} disabled>Disabled</ModalActionButton>);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('should not be disabled by default', () => {
    render(<ModalActionButton onClick={() => {}}>Enabled</ModalActionButton>);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('should not call onClick when disabled', () => {
    const onClick = jest.fn();
    render(<ModalActionButton onClick={onClick} disabled>Disabled</ModalActionButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ── Snapshot tests ──────────────────────────────────────────────────────

describe('ModalActionButton — snapshots', () => {
  it('should match snapshot for enabled state', () => {
    const { container } = render(<ModalActionButton onClick={() => {}}>Dismiss View</ModalActionButton>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot for disabled state', () => {
    const { container } = render(<ModalActionButton onClick={() => {}} disabled>Disabled</ModalActionButton>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
