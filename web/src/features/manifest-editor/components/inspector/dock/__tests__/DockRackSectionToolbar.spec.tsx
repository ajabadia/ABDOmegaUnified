/**
 * @jest-environment jsdom
 *
 * Tests for DockRackSectionToolbar — barra de secciones de rack.
 * Es un wrapper thin de DockIconBar que pasa 5 botones agrupados
 * en esenciales (3) y avanzados (2) con divisor y label.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { DockRackSectionToolbar } from '../DockRackSectionToolbar';

const defaultProps = {
  rackSections: {
    essentialIdentity: true,
    globalUiSkin: true,
    physicalEmulationProfile: true,
    aestheticsGlobals: true,
    architecture: true,
  },
  onToggleRackSection: jest.fn(),
};

// ── Rendering ──────────────────────────────────────────────────────────

describe('DockRackSectionToolbar — rendering', () => {
  it('should render the label', () => {
    render(<DockRackSectionToolbar {...defaultProps} />);
    expect(screen.getByText('RACK SECT')).toBeTruthy();
  });

  it('should render 5 section buttons', () => {
    const { container } = render(<DockRackSectionToolbar {...defaultProps} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(5);
  });

  it('should render all section titles', () => {
    render(<DockRackSectionToolbar {...defaultProps} />);
    expect(screen.getByTitle('Toggle Identity')).toBeTruthy();
    expect(screen.getByTitle('Toggle UI Skin')).toBeTruthy();
    expect(screen.getByTitle('Toggle Chassis')).toBeTruthy();
    expect(screen.getByTitle('Toggle Aesthetics')).toBeTruthy();
    expect(screen.getByTitle('Toggle Architecture')).toBeTruthy();
  });

  it('should apply the container classes', () => {
    const { container } = render(<DockRackSectionToolbar {...defaultProps} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('w-10');
    expect(outerDiv.className).toContain('wb-surface');
    expect(outerDiv.className).toContain('animate-in');
  });
});

// ── Groups ──────────────────────────────────────────────────────────────

describe('DockRackSectionToolbar — groups', () => {
  it('should render a divider between essential and advanced groups', () => {
    const { container } = render(<DockRackSectionToolbar {...defaultProps} />);
    const allDivs = container.querySelectorAll('div');
    const dividers = Array.from(allDivs).filter(d =>
      d.className.includes('bg-white') && d.className.includes('h-px')
    );
    expect(dividers.length).toBe(1);
  });

  it('should place essential buttons before the divider', () => {
    const { container } = render(<DockRackSectionToolbar {...defaultProps} />);
    const buttons = container.querySelectorAll('button');
    // First 3 buttons should be essential (essentialIdentity, globalUiSkin, physicalEmulationProfile)
    expect(buttons[0].getAttribute('title')).toBe('Toggle Identity');
    expect(buttons[1].getAttribute('title')).toBe('Toggle UI Skin');
    expect(buttons[2].getAttribute('title')).toBe('Toggle Chassis');
  });
});

// ── Active state ────────────────────────────────────────────────────────

describe('DockRackSectionToolbar — active state', () => {
  it('should highlight buttons when rackSections[id] is true', () => {
    render(<DockRackSectionToolbar {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.className).toContain('bg-primary/20');
    });
  });

  it('should not highlight buttons when rackSections[id] is false', () => {
    const rackSections = {
      essentialIdentity: false,
      globalUiSkin: false,
      physicalEmulationProfile: false,
      aestheticsGlobals: false,
      architecture: false,
    };
    render(<DockRackSectionToolbar {...defaultProps} rackSections={rackSections} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.className).toContain('wb-text-muted');
    });
  });

  it('should treat undefined rackSections[id] as inactive', () => {
    render(
      <DockRackSectionToolbar
        rackSections={{}}
        onToggleRackSection={defaultProps.onToggleRackSection}
      />
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach(btn => {
      expect(btn.className).not.toContain('bg-primary/20');
    });
  });

  it('should show mixed active/inactive states', () => {
    const rackSections = {
      essentialIdentity: true,
      globalUiSkin: false,
      physicalEmulationProfile: true,
      aestheticsGlobals: false,
      architecture: true,
    };
    render(<DockRackSectionToolbar {...defaultProps} rackSections={rackSections} />);
    const buttons = screen.getAllByRole('button');
    // essentialIdentity → active
    expect(buttons[0].className).toContain('bg-primary/20');
    // globalUiSkin → inactive
    expect(buttons[1].className).toContain('wb-text-muted');
    // physicalEmulationProfile → active
    expect(buttons[2].className).toContain('bg-primary/20');
  });
});

// ── Click handler ───────────────────────────────────────────────────────

describe('DockRackSectionToolbar — click handler', () => {
  it('should call onToggleRackSection with the correct section id', () => {
    const onToggleRackSection = jest.fn();
    render(
      <DockRackSectionToolbar {...defaultProps} onToggleRackSection={onToggleRackSection} />
    );
    const buttons = screen.getAllByRole('button');

    fireEvent.click(buttons[0]); // essentialIdentity
    expect(onToggleRackSection).toHaveBeenCalledWith('essentialIdentity');

    fireEvent.click(buttons[3]); // aestheticsGlobals (first advanced)
    expect(onToggleRackSection).toHaveBeenCalledWith('aestheticsGlobals');

    fireEvent.click(buttons[4]); // architecture (last)
    expect(onToggleRackSection).toHaveBeenCalledWith('architecture');
  });
});
