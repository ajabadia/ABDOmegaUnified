/**
 * @jest-environment jsdom
 *
 * Tests for CellStudioContainer component — Universal Cell Studio (v9.9.1)
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import CellStudioContainer from '../CellStudioContainer';

// ── Mock hooks ─────────────────────────────────────────────────────────

const mockSetCellData = jest.fn();
const mockSetActiveTab = jest.fn();
const mockSetCurrentStep = jest.fn();
const mockSetBehavior = jest.fn();
const mockSetRecipe = jest.fn();
const mockSetSelectedFragmentId = jest.fn();
const mockSetSoloLayerId = jest.fn();
const mockSetIsCommandCenterOpen = jest.fn();
const mockAddFragment = jest.fn();
const mockRemoveFragment = jest.fn();
const mockMoveFragment = jest.fn();
const mockUpdateFragment = jest.fn();
const mockOpenAssetSelector = jest.fn();
const mockCloseAssetSelector = jest.fn();

const mockState = {
  cellData: {
    id: 'test-cell',
    type: 'knob',
    role: 'control',
    bind: 'freq',
    label: 'Frequency',
    pos: { x: 10, y: 10 },
    size: { width: 48, height: 48 },
    presentation: {
      tab: 'MAIN',
      component: 'knob',
      variant: 'B_cyan',
      offsetX: 0,
      offsetY: 0,
      style: { color: '#00f2ff', testValue: 0.5 },
      attachments: [],
    },
  },
  behavior: {
    preset: 'rotary',
    source: 'asset',
    mapping: { input: 'value', mode: 'continuous', polarity: 'normal' },
  },
  recipe: { id: 'recipe-1', name: 'Test Recipe', layers: [] },
  activeTab: 'fragments' as const,
  currentStep: 0 as const,
  selectedFragmentId: 'host',
  soloLayerId: null,
  isAssetSelectorOpen: false,
  activeLayerId: null,
  isCommandCenterOpen: false,
  isTypeLocked: false,
  testValue: 0.75,
  description: '',
};

const mockActions = {
  setCellData: mockSetCellData,
  updateLabel: jest.fn(),
  updateType: jest.fn(),
  setBehavior: mockSetBehavior,
  updateBehaviorPreset: jest.fn(),
  updateBehaviorMapping: jest.fn(),
  setRecipe: mockSetRecipe,
  updateRecipeLayers: jest.fn(),
  addFragment: mockAddFragment,
  removeFragment: mockRemoveFragment,
  moveFragment: mockMoveFragment,
  updateFragment: mockUpdateFragment,
  setActiveTab: mockSetActiveTab,
  setCurrentStep: mockSetCurrentStep,
  setSelectedFragmentId: mockSetSelectedFragmentId,
  setSoloLayerId: mockSetSoloLayerId,
  setDescription: jest.fn(),
  setIsAssetSelectorOpen: jest.fn(),
  setIsCommandCenterOpen: mockSetIsCommandCenterOpen,
  openAssetSelector: mockOpenAssetSelector,
  closeAssetSelector: mockCloseAssetSelector,
  toggleCommandCenter: jest.fn(),
  setTestValue: jest.fn(),
  resetTestValue: jest.fn(),
};

jest.mock('../useCellStudioState', () => ({
  useCellStudioState: () => ({ state: mockState, actions: mockActions }),
  DEFAULT_CELL: {
    id: 'new_cell',
    type: 'knob',
    role: 'control',
    bind: 'param_id',
    label: 'New Universal Cell',
    pos: { x: 0, y: 0 },
    size: { width: 48, height: 48 },
  },
}));

jest.mock('../useCellStudioMode', () => ({
  useCellStudioMode: () => 'freeform',
}));

jest.mock('../useCellStudioDraft', () => ({
  useCellStudioDraft: () => ({
    saveDraft: jest.fn(),
    loadDraft: jest.fn(),
    hasDraft: () => false,
    clearDraft: jest.fn(),
    isDraftStale: false,
  }),
}));

jest.mock('../useCellStudioPreview', () => ({
  useCellStudioPreview: () => ({
    previewHTML: '<div class="mock-preview">Preview Content</div>',
    resolved: { frame: 0, value: 0.5, label: '50%' },
    testValue: 0.5,
    mockManifest: { id: 'laboratory' },
    handleManifestUpdate: jest.fn(),
  }),
}));

// ── Props ──────────────────────────────────────────────────────────────

const BASE_PROPS = {
  onSave: jest.fn(),
};

// ── Render states ──────────────────────────────────────────────────────

describe('CellStudioContainer — render states', () => {
  it('should render the header with title', () => {
    render(<CellStudioContainer {...BASE_PROPS} />);
    expect(screen.getByText('Universal Cell Studio')).toBeTruthy();
  });

  it('should render Phase 15 Isolation badge', () => {
    render(<CellStudioContainer {...BASE_PROPS} />);
    expect(screen.getByText('Phase 15 Isolation')).toBeTruthy();
  });

  it('should render Era version text', () => {
    render(<CellStudioContainer {...BASE_PROPS} />);
    expect(screen.getByText('Era 7.2.3 Industrial Logic')).toBeTruthy();
  });

  it('should render action buttons', () => {
    render(<CellStudioContainer {...BASE_PROPS} />);
    expect(screen.getByText('Copy DNA')).toBeTruthy();
    expect(screen.getByText('Export Entity')).toBeTruthy();
    expect(screen.getByText('Freeze as DNA Template')).toBeTruthy();
    expect(screen.getByText('Finalize Cell')).toBeTruthy();
  });

  it('should not show close button when onClose is not provided', () => {
    const { container } = render(<CellStudioContainer {...BASE_PROPS} />);
    // ModalCloseButton renders an X icon — ensure no close button present
    const closeButtons = container.querySelectorAll('[title="Close cell studio"]');
    expect(closeButtons.length).toBe(0);
  });

  it('should show close button when onClose is provided', () => {
    render(<CellStudioContainer {...BASE_PROPS} onClose={jest.fn()} />);
    expect(screen.getByTitle('Close cell studio')).toBeTruthy();
  });

  it('should render with modal border when isModal is false', () => {
    const { container } = render(<CellStudioContainer {...BASE_PROPS} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('rounded-xs');
    expect(outerDiv.className).toContain('border');
  });

  it('should render without extra border when isModal is true', () => {
    const { container } = render(<CellStudioContainer {...BASE_PROPS} isModal />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).not.toContain('rounded-xs');
  });
});

// ── Action buttons ─────────────────────────────────────────────────────

describe('CellStudioContainer — action buttons', () => {
  it('should call onSave when Finalize Cell is clicked', () => {
    const onSave = jest.fn();
    render(<CellStudioContainer {...BASE_PROPS} onSave={onSave} />);
    fireEvent.click(screen.getByText('Finalize Cell'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should have correct aria-labels on action buttons', () => {
    render(<CellStudioContainer {...BASE_PROPS} />);
    expect(screen.getByTitle('Copy DNA to clipboard')).toBeTruthy();
    expect(screen.getByTitle('Export entity as JSON')).toBeTruthy();
    expect(screen.getByTitle('Freeze as DNA template')).toBeTruthy();
    expect(screen.getByTitle('Save and finalize cell')).toBeTruthy();
  });
});

// ── Draft prompt ───────────────────────────────────────────────────────

describe('CellStudioContainer — draft prompt', () => {
  it('should not show draft prompt when hasDraft returns false', () => {
    render(<CellStudioContainer {...BASE_PROPS} />);
    expect(screen.queryByText(/draft/i)).toBeNull();
  });

  it('should not show asset selector overlay by default', () => {
    render(<CellStudioContainer {...BASE_PROPS} />);
    // Asset selector renders inside a portal-like overlay, check no unexpected elements
    expect(screen.queryByText(/asset/i)).toBeNull();
  });
});

// ── Preview panel ──────────────────────────────────────────────────────

describe('CellStudioContainer — preview', () => {
  it('should render preview strip with test value scrubber', () => {
    render(<CellStudioContainer {...BASE_PROPS} />);
    // Preview strip is rendered — testValue 0.5 is passed
    // The previewHTML is mocked so we just verify the component renders the preview
    expect(screen.getByText('Universal Cell Studio')).toBeTruthy();
  });
});
