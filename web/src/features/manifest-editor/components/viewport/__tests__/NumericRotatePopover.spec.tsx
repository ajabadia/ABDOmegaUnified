/**
 * @jest-environment jsdom
 *
 * Tests for NumericRotatePopover component
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import NumericRotatePopover from '../NumericRotatePopover';

// ── Mocks ───────────────────────────────────────────────────────────────

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      return <div {...props}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Tests ───────────────────────────────────────────────────────────────

describe('NumericRotatePopover — rendering', () => {
  it('should render nothing when isOpen=false', () => {
    const { container } = render(
      <NumericRotatePopover isOpen={false} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render popover with correct header when open', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Numeric Rotate')).toBeTruthy();
    expect(screen.getByText('Ctrl+Alt+T')).toBeTruthy();
  });

  it('should render angle input field', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    expect(screen.getByLabelText('Rotation angle in degrees')).toBeTruthy();
  });

  it('should initialize with currentAngle value', () => {
    render(
      <NumericRotatePopover isOpen={true} onClose={() => {}} currentAngle={45} />
    );
    const input = screen.getByLabelText('Rotation angle in degrees') as HTMLInputElement;
    expect(input.value).toBe('45');
  });

  it('should initialize with 0 when no currentAngle provided', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    const input = screen.getByLabelText('Rotation angle in degrees') as HTMLInputElement;
    expect(input.value).toBe('0');
  });

  it('should render angle slider', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    expect(screen.getByLabelText('Rotation angle slider')).toBeTruthy();
  });

  it('should render 8 angle presets', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('0°')).toBeTruthy();
    expect(screen.getByText('45°')).toBeTruthy();
    expect(screen.getByText('90°')).toBeTruthy();
    expect(screen.getByText('135°')).toBeTruthy();
    expect(screen.getByText('180°')).toBeTruthy();
    expect(screen.getByText('225°')).toBeTruthy();
    expect(screen.getByText('270°')).toBeTruthy();
    expect(screen.getByText('315°')).toBeTruthy();
  });

  it('should render Apply, Cancel, and Reset buttons', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Apply')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Reset')).toBeTruthy();
  });
});

describe('NumericRotatePopover — input changes', () => {
  it('should update angle on manual input', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    const input = screen.getByLabelText('Rotation angle in degrees');
    fireEvent.change(input, { target: { value: '90' } });
    expect((input as HTMLInputElement).value).toBe('90');
  });
});

describe('NumericRotatePopover — presets', () => {
  it('should set angle when a preset is clicked', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByText('90°'));
    const input = screen.getByLabelText('Rotation angle in degrees') as HTMLInputElement;
    expect(input.value).toBe('90');
  });

  it('should set 180° when that preset is clicked', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByText('270°'));
    const input = screen.getByLabelText('Rotation angle in degrees') as HTMLInputElement;
    expect(input.value).toBe('270');
  });

  it('should highlight active preset', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByText('180°'));
    const preset = screen.getByText('180°');
    expect(preset.className).toContain('bg-[#00f0ff]/20');
  });
});

describe('NumericRotatePopover — validation', () => {
  it('should show error for invalid angle input', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    const input = screen.getByLabelText('Rotation angle in degrees');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(screen.getByText('Apply'));
    expect(screen.getByText(/Invalid/)).toBeTruthy();
  });

  it('should clear error on input change', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    const input = screen.getByLabelText('Rotation angle in degrees');
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(screen.getByText('Apply'));
    expect(screen.getByText(/Invalid/)).toBeTruthy();
    fireEvent.change(input, { target: { value: '45' } });
    expect(screen.queryByText(/Invalid/)).toBeNull();
  });
});

describe('NumericRotatePopover — apply workflow', () => {
  it('should call onApplyRotation with angle when Apply is clicked', () => {
    const onApplyRotation = jest.fn();
    const onClose = jest.fn();
    const commitTx = jest.fn();

    render(
      <NumericRotatePopover
        isOpen={true}
        onClose={onClose}
        onApplyRotation={onApplyRotation}
        commitTransaction={commitTx}
      />
    );

    const input = screen.getByLabelText('Rotation angle in degrees');
    fireEvent.change(input, { target: { value: '90' } });
    fireEvent.click(screen.getByText('Apply'));

    expect(onApplyRotation).toHaveBeenCalledWith(90);
    expect(commitTx).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should not call onApplyRotation on invalid input', () => {
    const onApplyRotation = jest.fn();

    render(
      <NumericRotatePopover
        isOpen={true}
        onClose={() => {}}
        onApplyRotation={onApplyRotation}
      />
    );

    const input = screen.getByLabelText('Rotation angle in degrees');
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.click(screen.getByText('Apply'));

    expect(onApplyRotation).not.toHaveBeenCalled();
  });

  it('should call abortTransaction on Cancel', () => {
    const abortTx = jest.fn();
    const onClose = jest.fn();

    render(
      <NumericRotatePopover
        isOpen={true}
        onClose={onClose}
        abortTransaction={abortTx}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(abortTx).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('NumericRotatePopover — reset', () => {
  it('should reset angle to 0', () => {
    render(
      <NumericRotatePopover isOpen={true} onClose={() => {}} currentAngle={90} />
    );
    const input = screen.getByLabelText('Rotation angle in degrees') as HTMLInputElement;
    expect(input.value).toBe('90');

    fireEvent.click(screen.getByText('Reset'));
    expect(input.value).toBe('0');
  });
});

describe('NumericRotatePopover — keyboard navigation', () => {
  it('should nudge angle up on ArrowUp', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    const input = screen.getByLabelText('Rotation angle in degrees');
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    const inputAfter = screen.getByLabelText('Rotation angle in degrees') as HTMLInputElement;
    expect(inputAfter.value).toBe('1');
  });

  it('should nudge angle down on ArrowDown', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    const input = screen.getByLabelText('Rotation angle in degrees');
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    const inputAfter = screen.getByLabelText('Rotation angle in degrees') as HTMLInputElement;
    expect(inputAfter.value).toBe('-1');
  });

  it('should nudge by 15 on Shift+ArrowUp', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    const input = screen.getByLabelText('Rotation angle in degrees');
    fireEvent.keyDown(input, { key: 'ArrowUp', shiftKey: true });

    const inputAfter = screen.getByLabelText('Rotation angle in degrees') as HTMLInputElement;
    expect(inputAfter.value).toBe('15');
  });

  it('should call apply on Enter key', () => {
    const onApplyRotation = jest.fn();
    const onClose = jest.fn();

    render(
      <NumericRotatePopover
        isOpen={true}
        onClose={onClose}
        onApplyRotation={onApplyRotation}
      />
    );

    const input = screen.getByLabelText('Rotation angle in degrees');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onApplyRotation).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('NumericRotatePopover — slider', () => {
  it('should update angle when slider changes', () => {
    render(<NumericRotatePopover isOpen={true} onClose={() => {}} />);
    const slider = screen.getByLabelText('Rotation angle slider');
    fireEvent.change(slider, { target: { value: '180' } });

    const input = screen.getByLabelText('Rotation angle in degrees') as HTMLInputElement;
    expect(input.value).toBe('180');
  });
});
