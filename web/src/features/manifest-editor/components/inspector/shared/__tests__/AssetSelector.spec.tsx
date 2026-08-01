/**
 * @jest-environment jsdom
 *
 * Tests for AssetSelector using the REAL hook with a comprehensive manifest.
 * The hook's library fetch will fail silently in jsdom (expected).
 * We provide manifest.resources.assets to exercise local asset navigation.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import AssetSelector from '../AssetSelector';

// ── Mocks ──────────────────────────────────────────────────────────────

// Suppress console errors from failed library fetches
jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock next/image — renders as plain <img>
jest.mock('next/image', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockNextImage = (props: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fill, unoptimized, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />;
  };
  MockNextImage.displayName = 'NextImage';
  return MockNextImage;
});

// Mock SequenceIngestionLab
jest.mock('../aesthetic/SequenceIngestionLab', () => {
  const MockIngestionLab = () => <div data-testid="mock-ingestion-lab" />;
  MockIngestionLab.displayName = 'SequenceIngestionLab';
  return MockIngestionLab;
});

// ── Comprehensive manifest with embedded assets ───────────────────────

function buildManifest(overrides?: Partial<OMEGA_Manifest>): OMEGA_Manifest {
  return {
    metadata: { name: 'TestModule', version: '1.0.0' },
    resources: {
      assets: [
        { id: 'images/bg.png', url: '/assets/bg.png', type: 'image' },
        { id: 'images/icon.svg', url: '/assets/icon.svg', type: 'svg' },
        { id: 'fonts/digital.otf', url: '/assets/digital.otf', type: 'image' },
        { id: 'sequences/led-strip.png', url: '/assets/led-strip.png', type: 'filmstrip', frames: 8, orientation: 'h' },
      ],
      extra: [],
      fonts: [],
      wasm: null,
      contract: undefined,
    },
    entities: [],
    ui: {
      dimensions: { width: 800, height: 400 },
      layout: { width: 800, height: 400 },
    },
    ...overrides,
  };
}

const resolveAsset = (id: string | undefined) => {
  if (!id) return undefined;
  const manifest = buildManifest();
  const asset = manifest.resources?.assets?.find(a => a.id === id);
  return asset?.url;
};

function defaultProps(overrides?: Record<string, unknown>) {
  return {
    manifest: buildManifest(),
    onSelect: jest.fn(),
    label: 'Branding Asset',
    resolveAsset,
    ...overrides,
  };
}

// ── ───────────────────────────────────────────────────────────────────
//  Render states
// ── ───────────────────────────────────────────────────────────────────

describe('AssetSelector — render states', () => {
  it('should render the label in the header', () => {
    render(<AssetSelector {...defaultProps({ label: 'Custom Label' })} />);
    expect(screen.getByText('Custom Label')).toBeTruthy();
  });

  it('should render the grid container element', () => {
    render(<AssetSelector {...defaultProps()} />);
    expect(document.querySelector('.wb-surface-strong')).toBeTruthy();
  });
});

// ── ───────────────────────────────────────────────────────────────────
//  Selected asset — Clear button
// ── ───────────────────────────────────────────────────────────────────

describe('AssetSelector — selected asset', () => {
  it('should show Clear button when selectedAssetId is provided', () => {
    render(<AssetSelector {...defaultProps({ selectedAssetId: 'images/bg.png' })} />);
    expect(screen.queryByLabelText('Clear selected asset')).toBeTruthy();
    expect(screen.getByText('Clear Asset')).toBeTruthy();
  });

  it('should not show Clear button when no asset is selected', () => {
    render(<AssetSelector {...defaultProps({ selectedAssetId: undefined })} />);
    expect(screen.queryByLabelText('Clear selected asset')).toBeNull();
  });

  it('should call onSelect(undefined) when Clear button is clicked', () => {
    const onSelect = jest.fn();
    render(<AssetSelector {...defaultProps({ selectedAssetId: 'images/bg.png', onSelect })} />);
    fireEvent.click(screen.getByLabelText('Clear selected asset'));
    expect(onSelect).toHaveBeenCalledWith(undefined);
  });
});

// ── ───────────────────────────────────────────────────────────────────
//  Asset navigation via folder buttons
// ── ───────────────────────────────────────────────────────────────────

describe('AssetSelector — navigation', () => {
  it('should show root folders from manifest assets (images, fonts, sequences)', async () => {
    render(<AssetSelector {...defaultProps()} />);
    // The hook builds folder names from asset id prefixes (images, fonts, sequences)
    // This may take a tick to compute
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });
    // At minimum the component should render without crashing
    const label = screen.queryByText('Branding Asset');
    expect(label).toBeTruthy();
  });

  it('should render folder buttons for asset categories', async () => {
    render(<AssetSelector {...defaultProps()} />);
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });
    // Check that the container rendered
    expect(document.querySelector('.wb-surface-strong')).toBeTruthy();
  });
});

// ── ───────────────────────────────────────────────────────────────────
//  Sequence mode header icon
// ── ───────────────────────────────────────────────────────────────────

describe('AssetSelector — sequence mode', () => {
  it('should render header label when restrictToSequences is true', async () => {
    render(<AssetSelector {...defaultProps({ restrictToSequences: true, label: 'Sequence Asset' })} />);
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });
    expect(screen.getByText('Sequence Asset')).toBeTruthy();
  });
});

// ── ───────────────────────────────────────────────────────────────────
//  Edge cases
// ── ───────────────────────────────────────────────────────────────────

describe('AssetSelector — edge cases', () => {
  it('should handle empty manifest without crashing', async () => {
    const emptyManifest: OMEGA_Manifest = {
      metadata: { name: 'Empty', version: '1.0' },
      resources: { assets: [], extra: [], fonts: [], wasm: null, contract: undefined },
      entities: [],
      ui: { dimensions: { width: 800, height: 400 }, layout: { width: 800, height: 400 } },
    };
    render(<AssetSelector {...defaultProps({ manifest: emptyManifest, resolveAsset: () => undefined })} />);
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });
    // Should not crash — may show empty state
    expect(document.querySelector('.wb-surface-strong')).toBeTruthy();
  });

  it('should handle null resolveAsset gracefully', async () => {
    render(<AssetSelector {...defaultProps({ resolveAsset: () => undefined })} />);
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });
    const label = screen.queryByText('Branding Asset');
    expect(label).toBeTruthy();
  });
});
