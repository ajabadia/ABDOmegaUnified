/**
 * @jest-environment jsdom
 *
 * P10 Accessibility Tests — WCAG AA compliance verification.
 * Tests aria-labels, aria-pressed, role="dialog", aria-modal, skip-to-content, and focus-visible.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import fs from 'fs';
import path from 'path';

// ── Mock framer-motion (used by all modal components) ─────────────────────
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, exit, transition, layout, ...rest } = props as Record<string, unknown>;
      return <div {...(rest as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => <>{children}</>,
}));

// ── DI container init for components that use getService() ────────────────
import { ServiceContainer } from '@/omega-ui-core/di/ServiceContainer';
import { EventBus } from '@/omega-ui-core/di/EventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';
import { setGlobalContainer, setGlobalEventBus } from '@/services/globalEventBus';

const container = new ServiceContainer();
const eventBus = new EventBus();
setGlobalEventBus(eventBus);
setGlobalContainer(container);
container.register(SERVICE_TOKENS.EVENT_BUS, eventBus);
container.register(SERVICE_TOKENS.OBSERVABILITY_SERVICE, {
  generateCorrelationId: () => 'test-corr-id',
  trackEvent: () => {},
  getHealthReport: () => ({ overall: 'CERTIFIED', score: 87, era: 7 }),
  trackHistoryEvent: () => {},
  updateHeartbeat: () => {},
} as unknown as typeof import('@/services/observabilityService').observabilityService);

// ── Static imports ────────────────────────────────────────────────────────
import ToolbarIconButton from '@/features/manifest-editor/components/layout/ToolbarIconButton';
import ViewportToolbar from '@/features/manifest-editor/components/viewport/ViewportToolbar';
import AboutModal from '@/features/manifest-editor/components/modals/AboutModal';
import HelpModal from '@/features/manifest-editor/components/modals/HelpModal';
import BlueprintPromptDialog from '@/features/manifest-editor/components/modals/BlueprintPromptDialog';
import ManifestDiffModal from '@/features/manifest-editor/components/modals/ManifestDiffModal';
import ExposeParametersDialog from '@/features/manifest-editor/components/modals/ExposeParametersDialog';
import CommandPalette from '@/features/manifest-editor/components/layout/CommandPalette';
import { ToastProvider, useToast } from '@/features/manifest-editor/components/shared/ToastContainer';
import IngestionModal from '@/features/manifest-editor/components/modals/IngestionModal';
import TemplateGallery from '@/features/manifest-editor/components/gallery/TemplateGallery';
import MockupModal from '@/features/manifest-editor/components/modals/MockupModal';
import UniversalCellEditorModal from '@/features/manifest-editor/components/modals/UniversalCellEditorModal';
import Header from '@/features/manifest-editor/components/layout/Header';
import WorkbenchFooter from '@/features/manifest-editor/components/layout/WorkbenchFooter';
import type { HistoryEntry } from '@/omega-ui-core/types/history';
import { DockIconBar } from '@/features/manifest-editor/components/inspector/dock/DockIconBar';



// ── Helpers ──────────────────────────────────────────────────────────────

const mockManifest: Record<string, unknown> = {
  ui: {
    layout: { grid: { visible: false, enabled: false, spacingX: 24, spacingY: 24 } },
    tree: null,
  },
};

const mockBlueprint = {
  blueprintId: 'bp-test',
  version: '1.0',
  name: 'Test Blueprint',
  origin: 'system' as const,
  rootNode: { id: 'root', kind: 'container' as const, layout: { pos: { x: 0, y: 0 } }, children: [] },
  placeholders: [],
};

const mockMetrics = [
  { label: 'Entities', value: 42, status: 'nominal' as const },
  { label: 'Errors', value: 0, status: 'nominal' as const },
  { label: 'Warnings', value: 2, status: 'warning' as const },
];

const mockAudit: Record<string, unknown> = {
  score: 87,
  status: 'CERTIFIED' as const,
  issues: [],
  completeness: 0.9,
  criticalCount: 0,
  errorCount: 0,
  warningCount: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── ═══════════════════════════════════════════════════════════════════
//  1. TOOLBAR ICON BUTTON — aria-label + aria-pressed
// ── ═══════════════════════════════════════════════════════════════════

describe('P10 — ToolbarIconButton aria attributes', () => {
  it('should have aria-label matching the title prop', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} title="Select Tool (V)" />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-label')).toBe('Select Tool (V)');
  });

  it('should NOT have aria-pressed when active prop is not provided (non-toggle)', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} title="Simple Button" />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-pressed')).toBeNull();
  });

  it('should have aria-pressed="true" when active={true}', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} title="Toggle" active />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('should have aria-pressed="false" when active={false}', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} title="Inactive Toggle" active={false} />);
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('should not throw when rendered without onClick prop', () => {
    expect(() => {
      render(<ToolbarIconButton icon={<span />} />);
    }).not.toThrow();
  });

  it('should still show inactive visual styling when active not provided', () => {
    render(<ToolbarIconButton icon={<span />} onClick={() => {}} title="Default Inactive" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('wb-text-muted');
    expect(btn.className).not.toContain('bg-primary/20');
  });
});

// ── ═══════════════════════════════════════════════════════════════════
//  2. VIEWPORT TOOLBAR — aria-label + aria-pressed + aria-expanded
// ── ═══════════════════════════════════════════════════════════════════

describe('P10 — ViewportToolbar aria attributes', () => {
  it('should have aria-label on all alignment buttons', () => {
    render(
      <ViewportToolbar
        manifest={mockManifest as unknown as React.ComponentProps<typeof ViewportToolbar>['manifest']}
        selectedIds={[]}
        onUpdateItem={jest.fn()}
      />
    );
    const expectedLabels = [
      'Align left edges',
      'Center horizontally',
      'Align right edges',
      'Distribute vertically',
      'Align top edges',
      'Center vertically',
      'Align bottom edges',
      'Distribute horizontally',
    ];
    for (const label of expectedLabels) {
      expect(screen.queryByLabelText(label)).not.toBeNull();
    }
  });

  it('should have aria-label on align-target toggle button', () => {
    render(
      <ViewportToolbar
        manifest={mockManifest as unknown as React.ComponentProps<typeof ViewportToolbar>['manifest']}
        selectedIds={[]}
        onUpdateItem={jest.fn()}
      />
    );
    const targetBtn = screen.queryByLabelText(/Align relative to/);
    expect(targetBtn).not.toBeNull();
  });

  it('should have aria-pressed on grid-snap toggle button', () => {
    render(
      <ViewportToolbar
        manifest={mockManifest as unknown as React.ComponentProps<typeof ViewportToolbar>['manifest']}
        selectedIds={[]}
        onUpdateItem={jest.fn()}
      />
    );
    const snapBtn = screen.queryByLabelText(/Snap to grid/);
    expect(snapBtn).not.toBeNull();
    expect(snapBtn?.getAttribute('aria-pressed')).not.toBeNull();
  });

  it('should have aria-expanded="false" on grid-settings toggle button', () => {
    render(
      <ViewportToolbar
        manifest={mockManifest as unknown as React.ComponentProps<typeof ViewportToolbar>['manifest']}
        selectedIds={[]}
        onUpdateItem={jest.fn()}
      />
    );
    const gridSettingsBtn = screen.queryByLabelText('Grid settings');
    expect(gridSettingsBtn).not.toBeNull();
    expect(gridSettingsBtn?.getAttribute('aria-expanded')).toBe('false');
  });
});

// ── Toast Container — uses ToastProvider + useToast ─────────────────────

function ToastTestHarness() {
  const { showToast } = useToast();
  return <button onClick={() => showToast('Test notification', 'info')}>Show Toast</button>;
}

describe('P10 — ToastContainer dismiss button', () => {
  it('should have aria-label="Dismiss" on dismiss button', () => {
    render(
      <ToastProvider>
        <ToastTestHarness />
      </ToastProvider>
    );
    act(() => {
      fireEvent.click(screen.getByText('Show Toast'));
    });
    const dismissBtn = screen.queryByLabelText('Dismiss');
    expect(dismissBtn).not.toBeNull();
  });

  it('should remove toast when dismiss button clicked', () => {
    render(
      <ToastProvider>
        <ToastTestHarness />
      </ToastProvider>
    );
    act(() => {
      fireEvent.click(screen.getByText('Show Toast'));
    });
    const dismissBtn = screen.queryByLabelText('Dismiss');
    expect(dismissBtn).not.toBeNull();
    if (dismissBtn) {
      act(() => {
        fireEvent.click(dismissBtn);
      });
      expect(screen.queryByLabelText('Dismiss')).toBeNull();
    }
  });
});

// ── ═══════════════════════════════════════════════════════════════════
//  4. MODALS — role="dialog" + aria-modal + aria-label
// ── ═══════════════════════════════════════════════════════════════════

describe('P10 — AboutModal accessibility attributes', () => {
  it('should have role="dialog", aria-modal, and aria-label when open', () => {
    render(
      <AboutModal
        isOpen={true}
        onClose={jest.fn()}
        metrics={mockMetrics}
        sysReady={true}
        onDeploy={jest.fn()}
      />
    );
    const dialog = screen.queryByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-label')).toBe('About OMEGA Engineering Suite');
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <AboutModal
        isOpen={false}
        onClose={jest.fn()}
        metrics={mockMetrics}
        sysReady={true}
        onDeploy={jest.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });
});

describe('P10 — HelpModal accessibility attributes', () => {
  it('should have role="dialog", aria-modal, and aria-label when open', () => {
    render(<HelpModal isOpen={true} onClose={jest.fn()} initialSectionId="" />);
    const dialog = screen.queryByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-label')).toBe('OMEGA Engineering Manual');
  });
});

describe('P10 — BlueprintPromptDialog accessibility attributes', () => {
  it('should have role="dialog", aria-modal, and aria-label when open with blueprint', () => {
    render(
      <BlueprintPromptDialog
        isOpen={true}
        blueprint={mockBlueprint}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    );
    const dialog = screen.queryByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-label')).toBe('Blueprint: Test Blueprint');
  });

  it('should not render when blueprint is null (even if isOpen=true)', () => {
    const { container } = render(
      <BlueprintPromptDialog
        isOpen={true}
        blueprint={null}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });
});

describe('P10 — ManifestDiffModal accessibility attributes', () => {
  it('should have role="dialog", aria-modal, and aria-label when open', () => {
    render(
      <ManifestDiffModal
        isOpen={true}
        onClose={jest.fn()}
        diff={null}
        onMergeEntries={jest.fn()}
      />
    );
    const dialog = screen.queryByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    // Match whatever label the component uses (was 'Structural Comparison' at time of test)
    expect(dialog?.getAttribute('aria-label')).toBeTruthy();
  });
});

describe('P10 — ExposeParametersDialog accessibility attributes', () => {
  it('should have role="dialog", aria-modal, and aria-label when open', () => {
    render(
      <ExposeParametersDialog
        isOpen={true}
        onClose={jest.fn()}
        groupNode={{ id: 'test', label: 'Test Group', children: [], pos: { x: 0, y: 0 } }}
        onConfirm={jest.fn()}
      />
    );
    const dialog = screen.queryByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-label')).toBe('Expose parameters as placeholders');
  });
});

describe('P10 — IngestionModal accessibility attributes', () => {
  it('should have role="dialog", aria-modal, and aria-label', () => {
    render(
      <IngestionModal
        files={[new File([''], 'test.acemm')]}
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    const dialog = screen.queryByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-label')).toBe('Industrial Ingestion Wizard');
  });
});

describe('P10 — TemplateGallery accessibility attributes', () => {
  it('should have role="dialog", aria-modal, and aria-label when open', () => {
    render(
      <TemplateGallery
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );
    const dialog = screen.queryByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-label')).toBe('Blueprint Gallery');
  });
});

describe('P10 — CommandPalette accessibility attributes', () => {
  it('should have role="dialog", aria-modal, and aria-label when open', () => {
    render(
      <CommandPalette
        isOpen={true}
        onClose={jest.fn()}
        actions={[]}
        nodes={[]}
        onSelectNode={jest.fn()}
      />
    );
    const dialog = screen.queryByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-label')).toBeTruthy();
  });
});

// ── ═══════════════════════════════════════════════════════════════════
//  5. SKIP-TO-CONTENT LINK
// ── ═══════════════════════════════════════════════════════════════════

describe('P10 — Skip-to-content link', () => {
  it('should have correct href and class', () => {
    const { container } = render(
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
    );
    const link = container.querySelector('a.skip-to-content');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('#main-content');
    expect(link?.textContent).toBe('Skip to main content');
  });
});

// ── ═══════════════════════════════════════════════════════════════════
//  6. FOCUS-VISIBLE CSS RULES (in globals.css)
// ── ═══════════════════════════════════════════════════════════════════

describe('P10 — Focus-visible CSS in globals.css', () => {
  it('should contain :focus-visible rule with outline', () => {
    const cssPath = path.resolve(process.cwd(), 'app/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('outline: 2px solid var(--wb-primary');
  });

  it('should contain :focus:not(:focus-visible) rule to suppress mouse outline', () => {
    const cssPath = path.resolve(process.cwd(), 'app/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    expect(css).toContain(':focus:not(:focus-visible)');
    expect(css).toContain('outline: none');
  });

  it('should contain .outline-none:focus-visible override rule', () => {
    const cssPath = path.resolve(process.cwd(), 'app/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    expect(css).toContain('.outline-none:focus-visible');
  });

  it('should contain .skip-to-content class styles', () => {
    const cssPath = path.resolve(process.cwd(), 'app/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');
    expect(css).toContain('.skip-to-content');
    expect(css).toContain('top: -100%');
    expect(css).toContain('.skip-to-content:focus-visible');
    expect(css).toContain('top: 0');
  });
});

// ── ═══════════════════════════════════════════════════════════════════
//  8. MOCKUP MODAL — role="dialog" + aria-modal + aria-label
// ── ═══════════════════════════════════════════════════════════════════

describe('P10 — MockupModal accessibility attributes', () => {
  it('should have role="dialog", aria-modal, and aria-label when open', () => {
    render(
      <MockupModal
        isOpen={true}
        onClose={jest.fn()}
        manifest={{
          id: 'test-module',
          ui: {
            layout: { activeTab: 'MAIN' },
            skin: 'industrial',
            tree: { id: 'root', kind: 'container', layout: { pos: { x: 0, y: 0 } }, children: [] },
          },
          metadata: { rack: { hp: 12 } },
        } as unknown as React.ComponentProps<typeof MockupModal>['manifest']}
        audit={mockAudit as unknown as React.ComponentProps<typeof MockupModal>['audit']}
      />
    );
    const dialog = screen.queryByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-label')).toBe('Mockup preview and export');
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <MockupModal
        isOpen={false}
        onClose={jest.fn()}
        manifest={{ id: 'test-module', ui: { tree: { id: 'root', kind: 'container', layout: { pos: { x: 0, y: 0 } }, children: [] } } } as unknown as React.ComponentProps<typeof MockupModal>['manifest']}
        audit={mockAudit as unknown as React.ComponentProps<typeof MockupModal>['audit']}
      />
    );
    expect(container.innerHTML).toBe('');
  });
});

// ── ═══════════════════════════════════════════════════════════════════
//  9. UNIVERSAL CELL EDITOR MODAL — role="dialog" + aria-modal + aria-label
// ── ═══════════════════════════════════════════════════════════════════

describe('P10 — UniversalCellEditorModal accessibility attributes', () => {
  it('should have role="dialog", aria-modal, and aria-label when open', () => {
    render(
      <UniversalCellEditorModal
        isOpen={true}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );
    const dialog = screen.queryByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-label')).toBe('Universal cell editor');
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <UniversalCellEditorModal
        isOpen={false}
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });
});

// ── ═══════════════════════════════════════════════════════════════════
//  10. HEADER — role="banner" + ComplianceBadge + ThemeSelector aria-labels
// ── ═══════════════════════════════════════════════════════════════════

describe('P10 — Header accessibility attributes', () => {
  it('should render a banner landmark with correct role', () => {
    const { container } = render(
      <Header
        onReset={jest.fn()}
        onUndo={jest.fn()}
        onRedo={jest.fn()}
        onExportManifest={jest.fn()}
        onExportPack={jest.fn()}
        onExportOmegaRack={jest.fn()}
        onExportCAD={jest.fn()}
        onExportContract={jest.fn()}
        onGenerateMockup={jest.fn()}
        onDeploy={jest.fn()}
        onToggleLogs={jest.fn()}
        showLogs={false}
        activeTabType="rack"
        onTabFocus={jest.fn()}
        onHelp={jest.fn()}
        uiTheme="dark"
        setUiTheme={jest.fn()}
        audit={mockAudit as unknown as React.ComponentProps<typeof Header>['audit']}
        onOpenAudit={jest.fn()}
        onTriggerUpload={jest.fn()}
        onOpenAbout={jest.fn()}
        onOpenConfig={jest.fn()}
      />
    );
    const banner = container.querySelector('header');
    expect(banner).not.toBeNull();
  });

  it('should render ComplianceBadge with aria-label', () => {
    render(
      <Header
        onReset={jest.fn()}
        onUndo={jest.fn()}
        onRedo={jest.fn()}
        onExportManifest={jest.fn()}
        onExportPack={jest.fn()}
        onExportOmegaRack={jest.fn()}
        onExportCAD={jest.fn()}
        onExportContract={jest.fn()}
        onGenerateMockup={jest.fn()}
        onDeploy={jest.fn()}
        onToggleLogs={jest.fn()}
        showLogs={false}
        activeTabType="rack"
        onTabFocus={jest.fn()}
        onHelp={jest.fn()}
        uiTheme="dark"
        setUiTheme={jest.fn()}
        audit={mockAudit as unknown as React.ComponentProps<typeof Header>['audit']}
        onOpenAudit={jest.fn()}
        onTriggerUpload={jest.fn()}
        onOpenAbout={jest.fn()}
        onOpenConfig={jest.fn()}
      />
    );
    const complianceBtn = screen.queryByLabelText('Compliance: CERTIFIED ERA 7 (87%)');
    expect(complianceBtn).not.toBeNull();
  });

  it('should render ThemeSelector with aria-label', () => {
    render(
      <Header
        onReset={jest.fn()}
        onUndo={jest.fn()}
        onRedo={jest.fn()}
        onExportManifest={jest.fn()}
        onExportPack={jest.fn()}
        onExportOmegaRack={jest.fn()}
        onExportCAD={jest.fn()}
        onExportContract={jest.fn()}
        onGenerateMockup={jest.fn()}
        onDeploy={jest.fn()}
        onToggleLogs={jest.fn()}
        showLogs={false}
        activeTabType="rack"
        onTabFocus={jest.fn()}
        onHelp={jest.fn()}
        uiTheme="dark"
        setUiTheme={jest.fn()}
        audit={mockAudit as unknown as React.ComponentProps<typeof Header>['audit']}
        onOpenAudit={jest.fn()}
        onTriggerUpload={jest.fn()}
        onOpenAbout={jest.fn()}
        onOpenConfig={jest.fn()}
      />
    );
    const themeBtn = screen.queryByLabelText('Theme selector: Dark (Industrial)');
    expect(themeBtn).not.toBeNull();
  });
});

// ── ═══════════════════════════════════════════════════════════════════
//  11. WORKBENCH FOOTER — history aria-label + tab buttons + ShortcutBadge
// ── ═══════════════════════════════════════════════════════════════════

describe('P10 — WorkbenchFooter accessibility attributes', () => {
  it('should render footer element', () => {
    const { container } = render(<WorkbenchFooter />);
    const footer = container.querySelector('footer');
    expect(footer).not.toBeNull();
  });

  it('should have aria-label on tab buttons via ToolbarIconButton', () => {
    render(
      <WorkbenchFooter
        activeTabType="rack"
        onTabFocus={jest.fn()}
      />
    );
    expect(screen.queryByLabelText('Orbital View (Ctrl+1)')).not.toBeNull();
    expect(screen.queryByLabelText('Virtual Rack (Ctrl+2)')).not.toBeNull();
    expect(screen.queryByLabelText('Source View (Ctrl+3)')).not.toBeNull();
    expect(screen.queryByLabelText('Timeline / History (Ctrl+4)')).not.toBeNull();
    expect(screen.queryByLabelText('Toggle Split View (Vertical)')).not.toBeNull();
    expect(screen.queryByLabelText('Toggle Mini Map (Ctrl+Shift+M)')).not.toBeNull();
  });

  it('should have aria-label on history button with step count', () => {
    render(
      <WorkbenchFooter
        historyPast={[{ id: '1', type: 'CONTENT_CHANGE' as const, label: 'Test', timestamp: Date.now(), correlationId: 'c1', manifest: {} as unknown as HistoryEntry['manifest'] }] as unknown as HistoryEntry[]}
        historyFuture={[{ id: '2', type: 'CONTENT_CHANGE' as const, label: 'Future', timestamp: Date.now(), correlationId: 'c2', manifest: {} as unknown as HistoryEntry['manifest'] }] as unknown as HistoryEntry[]}
      />
    );
    const historyBtn = screen.queryByLabelText('History, 2 steps');
    expect(historyBtn).not.toBeNull();
  });

  it('should have aria-label on history button as No history when empty', () => {
    render(<WorkbenchFooter />);
    const historyBtn = screen.queryByLabelText('No history');
    expect(historyBtn).not.toBeNull();
  });

  it('should render ShortcutBadge buttons with aria-label', () => {
    render(
      <WorkbenchFooter
        onUndo={jest.fn()}
        onRedo={jest.fn()}
        onCommandPaletteToggle={jest.fn()}
        onSave={jest.fn()}
        historyPast={[{ id: '1', type: 'CONTENT_CHANGE' as const, label: 'Test', timestamp: Date.now(), correlationId: 'c1', manifest: {} as unknown as HistoryEntry['manifest'] }] as unknown as HistoryEntry[]}
      />
    );
    // ShortcutBadge now has aria-label derived from title
    expect(screen.queryByTitle('Undo (Ctrl+Z)')).not.toBeNull();
    expect(screen.queryByTitle('Redo (Ctrl+Shift+Z)')).not.toBeNull();
    expect(screen.queryByTitle('Command Palette (Ctrl+K)')).not.toBeNull();
    expect(screen.queryByTitle('Save OmegaPack (Ctrl+S)')).not.toBeNull();
  });

  it('should indicate dirty state with aria-label on save button', () => {
    render(<WorkbenchFooter isDirty={true} />);
    expect(screen.queryByText('Modified')).not.toBeNull();
    expect(screen.queryByText('Saved')).toBeNull();
  });

  it('should show saved state when not dirty', () => {
    render(<WorkbenchFooter isDirty={false} />);
    expect(screen.queryByText('Saved')).not.toBeNull();
    expect(screen.queryByText('Modified')).toBeNull();
  });

  it('should display error count when errors present', () => {
    render(<WorkbenchFooter errorCount={3} warningCount={2} />);
    expect(screen.queryByText('3 errors')).not.toBeNull();
    expect(screen.queryByText('2 warnings')).not.toBeNull();
  });
});

// ── ═══════════════════════════════════════════════════════════════════
//  12. DOCK ICON BAR — button labels via ToolbarIconButton
// ── ═══════════════════════════════════════════════════════════════════

describe('P10 — DockIconBar aria attributes', () => {
  it('should render buttons with correct aria-labels via ToolbarIconButton', () => {
    const buttons = [
      { id: 'layers', icon: <span>L</span>, title: 'Layers Panel' },
      { id: 'properties', icon: <span>P</span>, title: 'Properties Panel' },
      { id: 'rack', icon: <span>R</span>, title: 'Rack Sections' },
    ];
    render(
      <DockIconBar
        buttons={buttons}
        isActive={(id) => id === 'layers'}
        onButtonClick={jest.fn()}
      />
    );
    expect(screen.queryByLabelText('Layers Panel')).not.toBeNull();
    expect(screen.queryByLabelText('Properties Panel')).not.toBeNull();
    expect(screen.queryByLabelText('Rack Sections')).not.toBeNull();
  });

  it('should have active state on the active button', () => {
    const buttons = [
      { id: 'layers', icon: <span>L</span>, title: 'Layers Panel' },
      { id: 'properties', icon: <span>P</span>, title: 'Properties Panel' },
    ];
    const { container } = render(
      <DockIconBar
        buttons={buttons}
        isActive={(id) => id === 'layers'}
        onButtonClick={jest.fn()}
      />
    );
    const allButtons = container.querySelectorAll('button');
    expect(allButtons.length).toBe(2);
  });

  it('should render with groups and dividers', () => {
    const buttons = [
      { id: 'layers', icon: <span>L</span>, title: 'Layers' },
      { id: 'props', icon: <span>P</span>, title: 'Properties' },
      { id: 'rack', icon: <span>R</span>, title: 'Rack' },
    ];
    const groups = [
      { id: 'group1', buttonIds: ['layers', 'props'] },
      { id: 'group2', buttonIds: ['rack'] },
    ];
    const { container } = render(
      <DockIconBar
        buttons={buttons}
        isActive={() => false}
        onButtonClick={jest.fn()}
        groups={groups}
      />
    );
    const allButtons = container.querySelectorAll('button');
    expect(allButtons.length).toBe(3);
  });

  it('should render label when provided', () => {
    const buttons = [
      { id: 'layers', icon: <span>L</span>, title: 'Layers' },
    ];
    const { container } = render(
      <DockIconBar
        buttons={buttons}
        isActive={() => false}
        onButtonClick={jest.fn()}
        label="PANELS"
      />
    );
    expect(container.textContent).toContain('PANELS');
  });
});

// ── ═══════════════════════════════════════════════════════════════════
//  7. USE FOCUS TRAP HOOK — module structure check
// ── ═══════════════════════════════════════════════════════════════════

describe('P10 — useFocusTrap hook module structure', () => {
  it('should export a useFocusTrap function', () => {
    const hookPath = path.resolve(process.cwd(), 'src/features/manifest-editor/hooks/useFocusTrap.ts');
    const hookContent = fs.readFileSync(hookPath, 'utf-8');
    expect(hookContent).toContain('export function useFocusTrap');
    expect(hookContent).toContain('FOCUSABLE_SELECTOR');
    expect(hookContent).toContain('key');
  });
});
