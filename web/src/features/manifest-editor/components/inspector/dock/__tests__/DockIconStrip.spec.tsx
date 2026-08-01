/**
 * @jest-environment jsdom
 *
 * Tests for DockIconStrip — barra de iconos vertical para dock panels.
 * Es un wrapper thin de DockIconBar que pasa 8 botones de ventanas.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { DockIconStrip } from '../DockIconStrip';

const defaultProps = {
  isCollapsed: false,
  windowStates: {
    window_layers: false,
    window_rack_properties: false,
    window_properties: false,
    window_blueprints: false,
    window_compliance: false,
    window_info: false,
    window_history: false,
    window_logs: false,
  },
  onToggleWindow: jest.fn(),
};

// ── Rendering ──────────────────────────────────────────────────────────

describe('DockIconStrip — rendering', () => {
  it('should render 8 icon buttons', () => {
    const { container } = render(<DockIconStrip {...defaultProps} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(8);
  });

  it('should render all window titles', () => {
    render(<DockIconStrip {...defaultProps} />);
    expect(screen.getByTitle('Layers')).toBeTruthy();
    expect(screen.getByTitle('Rack Properties')).toBeTruthy();
    expect(screen.getByTitle('Element Properties')).toBeTruthy();
    expect(screen.getByTitle('Blueprint Library')).toBeTruthy();
    expect(screen.getByTitle('Compliance')).toBeTruthy();
    expect(screen.getByTitle('Information')).toBeTruthy();
    expect(screen.getByTitle('History')).toBeTruthy();
    expect(screen.getByTitle('Terminal Logs')).toBeTruthy();
  });

  it('should apply the container classes from DockIconBar', () => {
    const { container } = render(<DockIconStrip {...defaultProps} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('w-10');
    expect(outerDiv.className).toContain('wb-surface');
    expect(outerDiv.className).toContain('shrink-0');
  });
});

// ── Active state ────────────────────────────────────────────────────────

describe('DockIconStrip — active state', () => {
  it('should highlight buttons when window is active and not collapsed', () => {
    const windowStates = { ...defaultProps.windowStates, window_layers: true };
    render(<DockIconStrip {...defaultProps} windowStates={windowStates} isCollapsed={false} />);
    const buttons = screen.getAllByRole('button');
    // The Layers button (first) should have active classes
    expect(buttons[0].className).toContain('bg-primary/20');
  });

  it('should not highlight buttons when isCollapsed is true', () => {
    const windowStates = { ...defaultProps.windowStates, window_layers: true };
    render(<DockIconStrip {...defaultProps} windowStates={windowStates} isCollapsed={true} />);
    const buttons = screen.getAllByRole('button');
    // Even though window_layers is true, collapsed overrides it
    expect(buttons[0].className).not.toContain('bg-primary/20');
    expect(buttons[0].className).toContain('wb-text-muted');
  });

  it('should not highlight buttons when window is not active', () => {
    render(<DockIconStrip {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.className).toContain('wb-text-muted');
    });
  });
});

// ── Click handler ───────────────────────────────────────────────────────

describe('DockIconStrip — click handler', () => {
  it('should call onToggleWindow with the correct window id', () => {
    const onToggleWindow = jest.fn();
    render(<DockIconStrip {...defaultProps} onToggleWindow={onToggleWindow} />);
    const buttons = screen.getAllByRole('button');

    fireEvent.click(buttons[0]); // Layers
    expect(onToggleWindow).toHaveBeenCalledWith('window_layers');

    fireEvent.click(buttons[3]); // Blueprint Library
    expect(onToggleWindow).toHaveBeenCalledWith('window_blueprints');

    fireEvent.click(buttons[7]); // Terminal Logs
    expect(onToggleWindow).toHaveBeenCalledWith('window_logs');
  });
});

// ── Snapshot ────────────────────────────────────────────────────────────

describe('DockIconStrip — snapshots', () => {
  it('should match snapshot with all windows inactive', () => {
    const { container } = render(<DockIconStrip {...defaultProps} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot with some windows active', () => {
    const windowStates = {
      ...defaultProps.windowStates,
      window_layers: true,
      window_properties: true,
      window_blueprints: true,
    };
    const { container } = render(
      <DockIconStrip {...defaultProps} windowStates={windowStates} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should match snapshot when collapsed overrides active windows', () => {
    const windowStates = {
      ...defaultProps.windowStates,
      window_layers: true,
      window_properties: true,
    };
    const { container } = render(
      <DockIconStrip {...defaultProps} windowStates={windowStates} isCollapsed={true} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
