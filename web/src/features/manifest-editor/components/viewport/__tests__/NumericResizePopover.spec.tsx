/**
 * @jest-environment jsdom
 *
 * Tests for NumericResizePopover component
 *
 * Strategy: no jest.mock for @/ aliased modules; instead provide a manifest
 * with a real tree so computeScaleUpdates can work with the real implementation.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NumericResizePopover from '../NumericResizePopover';
import type { OmegaNode, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

// ── Mocks ───────────────────────────────────────────────────────────────

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      return <div {...props}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Helpers ─────────────────────────────────────────────────────────────

const DEFAULT_NODE_ID = 'test-knob_001';

function createMockNode(overrides: Partial<OmegaNode> = {}): OmegaNode {
  return {
    id: DEFAULT_NODE_ID,
    kind: 'cell',
    cellRef: 'knob',
    layout: {
      pos: { x: 50, y: 50 },
      size: { width: 48, height: 48 },
    },
    ...overrides,
  } as OmegaNode;
}

function createMockManifest(nodeOverrides: Partial<OmegaNode> = {}): OMEGA_Manifest {
  return {
    schemaVersion: '7.2.3',
    id: 'test',
    metadata: { name: 'Test Module', family: 'test' },
    ui: {
      tree: {
        id: 'root',
        kind: 'structural',
        cellRef: 'container',
        layout: { pos: { x: 0, y: 0 }, size: { width: 200, height: 200 } },
        children: [
          {
            id: DEFAULT_NODE_ID,
            kind: 'cell',
            cellRef: nodeOverrides.cellRef ?? 'knob',
            layout: nodeOverrides.layout ?? { pos: { x: 50, y: 50 }, size: { width: 48, height: 48 } },
            children: [],
          },
        ],
      },
      layout: {
        width: 200,
        height: 200,
        containers: [],
        grid: { enabled: true, spacingX: 15, spacingY: 15, visible: true },
      },
    },
    controls: [],
    jacks: [],
  } as unknown as OMEGA_Manifest;
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('NumericResizePopover — rendering', () => {
  it('should render nothing when isOpen=false', () => {
    const { container } = render(
      <NumericResizePopover
        isOpen={false}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render nothing when node is null', () => {
    const { container } = render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={null}
        manifest={createMockManifest()}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render popover with correct header when open', () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );
    expect(screen.getByText('Numeric Resize')).toBeTruthy();
    expect(screen.getByText('Ctrl+Alt+R')).toBeTruthy();
  });

  it('should render W and H input fields', () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );
    expect(screen.getByLabelText('Width in pixels')).toBeTruthy();
    expect(screen.getByLabelText('Height in pixels')).toBeTruthy();
  });

  it('should initialize inputs with node dimensions', () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode({ layout: { pos: { x: 10, y: 20 }, size: { width: 64, height: 32 } } })}
        manifest={createMockManifest({ layout: { pos: { x: 10, y: 20 }, size: { width: 64, height: 32 } } })}
      />
    );
    const wInput = screen.getByLabelText('Width in pixels') as HTMLInputElement;
    const hInput = screen.getByLabelText('Height in pixels') as HTMLInputElement;
    expect(wInput.value).toBe('64');
    expect(hInput.value).toBe('32');
  });

  it('should render PX and % toggle buttons', () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );
    expect(screen.getByRole('button', { name: 'PX' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '%' })).toBeTruthy();
  });

  it('should render preset buttons', () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );
    expect(screen.getByRole('button', { name: '24' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '48' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '64' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '200' })).toBeTruthy();
  });

  it('should render Apply, Cancel, and Reset buttons', () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );
    expect(screen.getByRole('button', { name: /^Apply$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Reset$/i })).toBeTruthy();
  });

  it('should render aspect ratio lock button', () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );
    // After useEffect runs (knob is symmetric), aspectLocked=true → aria-label='Unlock aspect ratio'
    expect(screen.getByLabelText('Unlock aspect ratio')).toBeTruthy();
  });

  it('should show HP info when grid is available', () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );
    expect(screen.getByText(/HP/)).toBeTruthy();
  });
});

describe('NumericResizePopover — aspect ratio lock', () => {
  it('should lock aspect ratio by default for knobs', () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode({ cellRef: 'knob' })}
        manifest={createMockManifest({ cellRef: 'knob' })}
      />
    );
    expect(screen.getByText('Locked')).toBeTruthy();
  });

  it('should not lock aspect ratio by default for non-symmetric elements', () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode({ cellRef: 'slider-h' })}
        manifest={createMockManifest({ cellRef: 'slider-h' })}
      />
    );
    expect(screen.getByText('Free')).toBeTruthy();
  });

  it('should toggle aspect ratio when lock button is clicked', () => {
    const node = createMockNode({ cellRef: 'slider-h' });
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={node}
        manifest={createMockManifest({ cellRef: 'slider-h' })}
      />
    );
    const lockBtn = screen.getByLabelText('Lock aspect ratio');
    fireEvent.click(lockBtn);
    expect(screen.getByText('Locked')).toBeTruthy();
    expect(screen.getByLabelText('Unlock aspect ratio')).toBeTruthy();
  });
});

describe('NumericResizePopover — unit toggle', () => {
  it('should start in PX mode', () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );
    const pxBtn = screen.getByRole('button', { name: 'PX' });
    expect(pxBtn.className).toContain('bg-white/20');
  });

  it('should switch to % mode when % button is clicked', () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '%' }));
    const pctBtn = screen.getByRole('button', { name: '%' });
    expect(pctBtn.className).toContain('bg-white/20');
  });
});

describe('NumericResizePopover — validation', () => {
  it('should show error for invalid width input', async () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
        onUpdateNodes={() => {}}
      />
    );
    const wInput = screen.getByLabelText('Width in pixels');
    // Wait for useEffect to populate input
    await waitFor(() => expect((wInput as HTMLInputElement).value).toBe('48'));
    fireEvent.change(wInput, { target: { value: '-5' } });
    fireEvent.click(screen.getByRole('button', { name: /^Apply$/i }));
    expect(screen.getByText(/Invalid/)).toBeTruthy();
  });

  it('should show error for non-numeric input', async () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );
    const wInput = screen.getByLabelText('Width in pixels');
    await waitFor(() => expect((wInput as HTMLInputElement).value).toBe('48'));
    fireEvent.change(wInput, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: /^Apply$/i }));
    expect(screen.getByText(/Invalid/)).toBeTruthy();
  });

  it('should clear error on input change', async () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );
    const wInput = screen.getByLabelText('Width in pixels');
    await waitFor(() => expect((wInput as HTMLInputElement).value).toBe('48'));
    fireEvent.change(wInput, { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: /^Apply$/i }));
    expect(screen.getByText(/Invalid/)).toBeTruthy();
    fireEvent.change(wInput, { target: { value: '100' } });
    expect(screen.queryByText(/Invalid/)).toBeNull();
  });
});

describe('NumericResizePopover — apply workflow', () => {
  it('should call onUpdateNodes with correct updates when Apply is clicked', async () => {
    const onUpdateNodes = jest.fn();
    const onClose = jest.fn();
    const commitTx = jest.fn();

    render(
      <NumericResizePopover
        isOpen={true}
        onClose={onClose}
        node={createMockNode()}
        manifest={createMockManifest()}
        onUpdateNodes={onUpdateNodes}
        commitTransaction={commitTx}
      />
    );

    // Wait for useEffect to initialize widthVal/heightVal from node
    await waitFor(() => {
      expect((screen.getByLabelText('Width in pixels') as HTMLInputElement).value).toBe('48');
    });

    const wInput = screen.getByLabelText('Width in pixels');
    fireEvent.change(wInput, { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /^Apply$/i }));

    expect(onUpdateNodes).toHaveBeenCalledTimes(1);
    expect(commitTx).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should fall back to onUpdateNode when onUpdateNodes is not provided', async () => {
    const onUpdateNode = jest.fn();
    const node = createMockNode({ layout: { pos: { x: 10, y: 20 }, size: { width: 48, height: 48 } } });

    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={node}
        manifest={createMockManifest({ layout: { pos: { x: 10, y: 20 }, size: { width: 48, height: 48 } } })}
        onUpdateNode={onUpdateNode}
      />
    );

    // Wait for useEffect to initialize widthVal/heightVal from node
    await waitFor(() => {
      expect((screen.getByLabelText('Width in pixels') as HTMLInputElement).value).toBe('48');
    });

    fireEvent.click(screen.getByRole('button', { name: /^Apply$/i }));
    expect(onUpdateNode).toHaveBeenCalled();
  });

  it('should call abortTransaction on Cancel', () => {
    const abortTx = jest.fn();
    const onClose = jest.fn();

    render(
      <NumericResizePopover
        isOpen={true}
        onClose={onClose}
        node={createMockNode()}
        manifest={createMockManifest()}
        abortTransaction={abortTx}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }));
    expect(abortTx).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('NumericResizePopover — presets', () => {
  it('should set W and H when a preset is clicked (no aspect lock)', async () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode({ cellRef: 'slider-h', layout: { pos: { x: 0, y: 0 }, size: { width: 48, height: 48 } } })}
        manifest={createMockManifest({ cellRef: 'slider-h', layout: { pos: { x: 0, y: 0 }, size: { width: 48, height: 48 } } })}
      />
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Width in pixels') as HTMLInputElement).value).toBe('48');
    });

    fireEvent.click(screen.getByRole('button', { name: '64' }));

    const wInput = screen.getByLabelText('Width in pixels') as HTMLInputElement;
    const hInput = screen.getByLabelText('Height in pixels') as HTMLInputElement;
    expect(wInput.value).toBe('64');
    expect(hInput.value).toBe('64');
  });

  it('should set W and maintain aspect ratio when preset clicked with lock', async () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode({
          cellRef: 'knob',
          layout: { pos: { x: 0, y: 0 }, size: { width: 36, height: 36 } },
        })}
        manifest={createMockManifest({
          cellRef: 'knob',
          layout: { pos: { x: 0, y: 0 }, size: { width: 36, height: 36 } },
        })}
      />
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Width in pixels') as HTMLInputElement).value).toBe('36');
    });

    // Aspect is locked (knob is symmetric), ratio = 1
    fireEvent.click(screen.getByRole('button', { name: '96' }));

    const hInput = screen.getByLabelText('Height in pixels') as HTMLInputElement;
    expect(hInput.value).toBe('96'); // 96 / 1 = 96
  });
});

describe('NumericResizePopover — reset', () => {
  it('should reset inputs to original dimensions', async () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Width in pixels') as HTMLInputElement).value).toBe('48');
    });

    const wInput = screen.getByLabelText('Width in pixels') as HTMLInputElement;
    fireEvent.change(wInput, { target: { value: '200' } });
    expect(wInput.value).toBe('200');

    fireEvent.click(screen.getByRole('button', { name: /^Reset$/i }));
    expect(wInput.value).toBe('48');
  });
});

describe('NumericResizePopover — keyboard navigation', () => {
  it('should nudge width up on ArrowUp key', async () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Width in pixels') as HTMLInputElement).value).toBe('48');
    });

    const wInput = screen.getByLabelText('Width in pixels');
    fireEvent.keyDown(wInput, { key: 'ArrowUp' });

    const wInputAfter = screen.getByLabelText('Width in pixels') as HTMLInputElement;
    expect(wInputAfter.value).toBe('49'); // 48 + 1
  });

  it('should nudge width down on ArrowDown key', async () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Width in pixels') as HTMLInputElement).value).toBe('48');
    });

    const wInput = screen.getByLabelText('Width in pixels');
    fireEvent.keyDown(wInput, { key: 'ArrowDown' });

    const wInputAfter = screen.getByLabelText('Width in pixels') as HTMLInputElement;
    expect(wInputAfter.value).toBe('47'); // 48 - 1
  });

  it('should nudge by 24 on Shift+ArrowUp', async () => {
    render(
      <NumericResizePopover
        isOpen={true}
        onClose={() => {}}
        node={createMockNode()}
        manifest={createMockManifest()}
      />
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Height in pixels') as HTMLInputElement).value).toBe('48');
    });

    const hInput = screen.getByLabelText('Height in pixels');
    fireEvent.keyDown(hInput, { key: 'ArrowUp', shiftKey: true });

    const hInputAfter = screen.getByLabelText('Height in pixels') as HTMLInputElement;
    expect(hInputAfter.value).toBe('72'); // 48 + 24
  });

  it('should call apply on Enter key', async () => {
    const onUpdateNodes = jest.fn();
    const onClose = jest.fn();
    const commitTx = jest.fn();

    render(
      <NumericResizePopover
        isOpen={true}
        onClose={onClose}
        node={createMockNode()}
        manifest={createMockManifest()}
        onUpdateNodes={onUpdateNodes}
        commitTransaction={commitTx}
      />
    );

    await waitFor(() => {
      expect((screen.getByLabelText('Width in pixels') as HTMLInputElement).value).toBe('48');
    });

    const wInput = screen.getByLabelText('Width in pixels');
    fireEvent.keyDown(wInput, { key: 'Enter' });

    expect(onUpdateNodes).toHaveBeenCalled();
    expect(commitTx).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
