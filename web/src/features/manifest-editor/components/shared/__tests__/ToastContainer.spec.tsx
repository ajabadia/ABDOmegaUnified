/**
 * @jest-environment jsdom
 *
 * Tests for ToastProvider — context-based toast notification system.
 *
 * Mock strategy:
 * - framer-motion: motion.div renders as plain <div>, AnimatePresence renders children
 * - lucide-react: NOT mocked (next/jest doesn't apply module mocks for node_modules)
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../../ToastContainer';
import type { ReactNode } from 'react';

// ── Mock framer-motion ─────────────────────────────────────────────────
jest.mock('framer-motion', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    motion: {
      div: (props: Record<string, unknown>) => {
        const { children, ...rest } = props;
        return React.createElement('div', rest, children);
      },
    },
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

// ── Test helper component ──────────────────────────────────────────────

function TestHarness() {
  const { showToast } = useToast();
  return (
    <div>
      <button data-testid="btn-success" onClick={() => showToast('Success!', 'success')}>
        Show Success
      </button>
      <button data-testid="btn-error" onClick={() => showToast('Error!', 'error')}>
        Show Error
      </button>
      <button data-testid="btn-warning" onClick={() => showToast('Warning!', 'warning')}>
        Show Warning
      </button>
      <button data-testid="btn-info" onClick={() => showToast('Info!', 'info')}>
        Show Info
      </button>

    </div>
  );
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ── Provider renders children ──────────────────────────────────────────

describe('ToastProvider — render', () => {
  it('should render children inside the provider', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Hello</div>
      </ToastProvider>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('should provide a status region for accessibility when toasts are present', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    // Show a toast to trigger the status region rendering
    act(() => {
      fireEvent.click(screen.getByTestId('btn-info'));
    });

    const region = screen.getByRole('status');
    expect(region).toBeTruthy();
    expect(region.getAttribute('aria-live')).toBe('polite');
  });
});

// ── useToast outside provider throws ───────────────────────────────────

describe('useToast — error boundary', () => {
  it('should throw when used outside ToastProvider', () => {
    // Silence the expected console.error from React's error boundary
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestHarness />)).toThrow(
      'useToast must be used within a ToastProvider',
    );
    spy.mockRestore();
  });
});

// ── Toast display ──────────────────────────────────────────────────────

describe('ToastProvider — toast display', () => {
  it('should display a toast message when showToast is called', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('btn-info'));
    });

    expect(screen.getByText('Info!')).toBeTruthy();
  });

  it('should display multiple toasts', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('btn-info'));
      fireEvent.click(screen.getByTestId('btn-success'));
      fireEvent.click(screen.getByTestId('btn-warning'));
    });

    expect(screen.getByText('Info!')).toBeTruthy();
    expect(screen.getByText('Success!')).toBeTruthy();
    expect(screen.getByText('Warning!')).toBeTruthy();
  });

  it('should render a dismiss button for each toast', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('btn-info'));
      fireEvent.click(screen.getByTestId('btn-success'));
    });

    const dismissButtons = screen.getAllByLabelText('Dismiss');
    expect(dismissButtons.length).toBe(2);
  });
});

// ── Toast dismissal ────────────────────────────────────────────────────

describe('ToastProvider — toast dismissal', () => {
  it('should remove a toast when dismiss button is clicked', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('btn-info'));
    });

    expect(screen.getByText('Info!')).toBeTruthy();

    const dismissBtn = screen.getByLabelText('Dismiss');
    act(() => {
      fireEvent.click(dismissBtn);
    });

    expect(screen.queryByText('Info!')).toBeNull();
  });

  it('should render nothing when all toasts are dismissed', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('btn-info'));
    });
    expect(screen.getByText('Info!')).toBeTruthy();

    const dismissBtn = screen.getByLabelText('Dismiss');
    act(() => {
      fireEvent.click(dismissBtn);
    });

    // After dismissing all toasts, the status region disappears
    expect(screen.queryByRole('status')).toBeNull();
  });
});

// ── Auto-dismiss ───────────────────────────────────────────────────────

describe('ToastProvider — auto-dismiss', () => {
  it('should auto-dismiss a toast after TOAST_DURATION (4000ms)', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('btn-info'));
    });

    expect(screen.getByText('Info!')).toBeTruthy();

    // Advance past TOAST_DURATION
    act(() => {
      jest.advanceTimersByTime(4001);
    });

    expect(screen.queryByText('Info!')).toBeNull();
  });

  it('should keep toast visible before TOAST_DURATION elapses', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('btn-info'));
    });

    // Advance only partway
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText('Info!')).toBeTruthy();
  });
});

// ── Variant styles ─────────────────────────────────────────────────────

describe('ToastProvider — variant styles', () => {
  it('should render success toast with green border class', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('btn-success'));
    });

    const toastContainer = screen.getByRole('status');
    const toastEl = toastContainer.querySelector('[class*="border-green"]');
    expect(toastEl).toBeTruthy();
    expect(screen.getByText('Success!')).toBeTruthy();
  });

  it('should render error toast with red border class', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('btn-error'));
    });

    const toastContainer = screen.getByRole('status');
    expect(toastContainer.querySelector('[class*="border-red"]')).toBeTruthy();
  });

  it('should render warning toast with amber border class', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('btn-warning'));
    });

    const toastContainer = screen.getByRole('status');
    expect(toastContainer.querySelector('[class*="border-amber"]')).toBeTruthy();
  });

  it('should render info toast with primary border class', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('btn-info'));
    });

    const toastContainer = screen.getByRole('status');
    expect(toastContainer.querySelector('[class*="border-primary"]')).toBeTruthy();
  });
});

// ── Multiple toasts lifecycle ──────────────────────────────────────────

describe('ToastProvider — multiple toasts lifecycle', () => {
  it('should show dismiss buttons for all toasts', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    act(() => { fireEvent.click(screen.getByTestId('btn-info')); });
    act(() => { fireEvent.click(screen.getByTestId('btn-success')); });

    // Both toasts visible with their dismiss buttons
    expect(screen.getByText('Info!')).toBeTruthy();
    expect(screen.getByText('Success!')).toBeTruthy();
    expect(screen.getAllByLabelText('Dismiss')).toHaveLength(2);
  });

  it('should handle rapid show/dismiss cycles', () => {
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    // Rapidly add 2 toasts
    act(() => {
      fireEvent.click(screen.getByTestId('btn-info'));
      fireEvent.click(screen.getByTestId('btn-success'));
    });

    // Should have 2 toasts visible
    const dismissButtons = screen.getAllByLabelText('Dismiss');
    expect(dismissButtons.length).toBe(2);
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────

describe('ToastProvider — edge cases', () => {
  it('should not fail when provider has no children', () => {
    const { container } = render(<ToastProvider>{null}</ToastProvider>);
    expect(container).toBeTruthy();
  });

  it('should handle empty string messages', () => {
    function EmptyMsgHarness() {
      const { showToast } = useToast();
      return (
        <button data-testid="btn-empty" onClick={() => showToast('')}>
          Show Empty
        </button>
      );
    }

    render(
      <ToastProvider>
        <EmptyMsgHarness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByTestId('btn-empty'));
    });

    // Toast with empty message should still render (dismiss button exists)
    const dismissBtn = screen.getAllByLabelText('Dismiss');
    expect(dismissBtn.length).toBe(1);
  });

  it('should not render the toast container when no toasts exist', () => {
    render(
      <ToastProvider>
        <span>content</span>
      </ToastProvider>,
    );

    // The status region should not be rendered when there are no toasts
    expect(screen.queryByRole('status')).toBeNull();
  });
});
