/**
 * @purpose Renderiza un WorkbenchPane con todos los callbacks y datos necesarios.
 * @purpose_en Renders a WorkbenchPane with all necessary callbacks and data.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:11,sig:1qlwxb
 * @lastUpdated 2026-06-20T10:45:28.408Z
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest, OMEGA_Contract, OMEGA_Modulation } from '@/omega-ui-core/types/manifest';
import type { WorkbenchState, WorkbenchPaneId, WorkbenchLayoutMode } from '@/features/manifest-editor/types/workbench';
import type { DocumentState, DocumentOrchestrator } from '@/features/manifest-editor/types/document';
import type { AuditResult } from '@/omega-ui-core/types/audit';
import type { TabDiagnostics } from '@/omega-ui-core/types/audit';
import type { SimulationBridgeState } from '@/features/manifest-editor/hooks/useSimulationBridge';
import type { GhostItem } from '@/features/manifest-editor/utils/alignmentConstants';
import { createEmptyDiagnostics } from '@/omega-ui-core/types/audit';
import { mergeDiagnostics } from '@/features/manifest-editor/utils/diagnosticUtils';
import WorkbenchPane from './WorkbenchPane';

export interface WorkbenchRenderPaneProps {
  paneId: WorkbenchPaneId;
  state: WorkbenchState;
  derived: { isSplit: boolean };
  actions: {
    focusTab: (paneId: WorkbenchPaneId, tabId: string) => void;
    closeTab: (tabId: string) => void;
    focusPane: (paneId: WorkbenchPaneId) => void;
    setMultiSelectedNodes: (nodeIds: string[]) => void;
    toggleUIState: (key: 'isLiveMode') => void;
    toggleNodeLock: (nodeId: string) => void;
    toggleNodeVisibility: (nodeId: string) => void;
    moveTabToPane: (tabId: string, targetPaneId: WorkbenchPaneId, index?: number) => void;
    toggleHorizontalSplit: (paneId: 'primary' | 'secondary') => void;
    setLayoutMode: (mode: WorkbenchLayoutMode) => void;
    closePane: (paneId: WorkbenchPaneId) => void;
    toggleWindow: (name: 'window_blueprints') => void;
  };
  editor: {
    orchestrator: Pick<DocumentOrchestrator, 'documentsById' | 'updateDocument'> & { activeDocumentId: string };
    simulationBridge: SimulationBridgeState;
    activeId: string;
    updateItem: (id: string, updates: Record<string, unknown>) => void;
    updateContainer: (id: string, updates: Record<string, unknown>) => void;
    updateItems: (updates: Record<string, Record<string, unknown>>) => void;
    groupSelected: (ids: string[]) => void;
    ungroupNode: (id: string) => void;
    addModulation: (mod: OMEGA_Modulation) => void;
    removeModulation: (id: string) => void;
    resolveAsset: (ref: string | undefined) => string | undefined;
    linkDirectory: () => void;
    isDirectoryLinked: boolean;
    reset: () => void;
    startTransaction: (label: string) => void;
    commitTransaction: () => void;
    undoTo: (index: number) => void;
  };
  manifest: OMEGA_Manifest;
  contract: OMEGA_Contract | null;
  updateManifest: (updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>), label?: string, forceHistory?: boolean) => void;
  activeTool: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null;
  showMiniMap: boolean;
  onToggleMiniMap: () => void;
  auditResult: AuditResult;
  tabDiagnostics: Record<string, TabDiagnostics>;
  structuralDiagnostics: TabDiagnostics;
  handleDiagnosticClick: (tabId: string, diag: unknown) => void;
  handleDiagnosticsUpdate: (paneId: string, diagnostics: unknown) => void;
  handleCaptureViewState: (tabId: string, viewState: unknown) => void;
  handleSelectItem: (id: string | null) => void;
  handleDuplicateItem: (id: string) => void;
  handleRemoveItem: (id: string) => void;
  handleCompareWithHistory: (index: number) => void;
  ghostPreview: {
    ghostPosition: { x: number; y: number } | null;
    ghostSize: { width: number; height: number };
    isCollision: boolean;
    isGhostVisible: boolean;
  };
  handleGhostClick: (x: number, y: number) => void;
  handleGhostMouseMove: (rackX: number, rackY: number) => void;
  handleGhostCancel: () => void;
  alignGhostItems: GhostItem[];
  alignGhostType: string | null;
  handleGhostPreviewChange: (items: GhostItem[] | null, type?: string) => void;
  onAddModulation: (mod: OMEGA_Modulation) => void;
  onRemoveModulation: (id: string) => void;
  // Clipboard actions
  onCopyItems?: ((ids: string[]) => void) | undefined;
  onCutItems?: ((ids: string[]) => void) | undefined;
  onPaste?: ((targetPos?: { x: number; y: number }) => void) | undefined;
  canPaste?: boolean | undefined;
  // Empty space context menu
  onToggleGrid?: (() => void) | undefined;
  onToggleGuides?: (() => void) | undefined;
  onAddEntity?: ((type: 'control' | 'jack', template?: Partial<import('@/omega-ui-core/types/manifest').ManifestEntity>) => void) | undefined;
  onReset?: (() => void) | undefined;
  onRenameItem?: ((id: string) => void) | undefined;
  onBringToFront?: ((id: string) => void) | undefined;
  onSendToBack?: ((id: string) => void) | undefined;
  onSaveAsBlueprint?: ((id: string) => void) | undefined;
  onSelectAll?: (() => void) | undefined;
}

export default function WorkbenchRenderPane({
  paneId, state, derived, actions, editor,
  manifest, contract, updateManifest,
  activeTool, showMiniMap, onToggleMiniMap,
  auditResult, tabDiagnostics, structuralDiagnostics,
  handleDiagnosticClick, handleDiagnosticsUpdate, handleCaptureViewState,
  handleSelectItem, handleDuplicateItem, handleRemoveItem,
  handleCompareWithHistory,
  ghostPreview, handleGhostClick, handleGhostMouseMove, handleGhostCancel,
  alignGhostItems, alignGhostType, handleGhostPreviewChange,
  onAddModulation, onRemoveModulation,
  onCopyItems, onCutItems, onPaste, canPaste,
  onToggleGrid, onToggleGuides, onAddEntity, onReset,
  onRenameItem, onBringToFront, onSendToBack, onSaveAsBlueprint, onSelectAll,
}: WorkbenchRenderPaneProps) {
  const pane = state.panesById[paneId];
  const activeId = pane.activeTabId;

  const paneTabs = pane.tabIds.map(id => {
    const t = state.tabsById[id];
    const monacoDiags = tabDiagnostics[id] || createEmptyDiagnostics();
    const isManifestView = ['source', 'rack', 'orbital', 'inspector', 'uca-tree'].includes(t.type);
    const diagnostics = isManifestView ? mergeDiagnostics([monacoDiags, structuralDiagnostics]) : monacoDiags;
    const documentId = (t.payload?.documentId as string) || 'primary';
    const docs = editor.orchestrator.documentsById as Record<string, DocumentState>;
    const isDocumentDirty = docs[documentId]?.isDirty ?? false;

    return { ...t, isDirty: isDocumentDirty, diagnostics };
  });

  const handleTabClose = useCallback((tabId: string) => {
    const t = state.tabsById[tabId];
    const isManifestView = ['source', 'rack', 'orbital', 'inspector', 'uca-tree'].includes(t.type);
    const documentId = (t.payload?.documentId as string) || 'primary';
    const docs = editor.orchestrator.documentsById as Record<string, DocumentState>;
    const isTabDirty = isManifestView && docs[documentId]?.isDirty;
    if (isTabDirty && !confirm(`Tab "${t.title}" has unsaved changes. Close anyway?`)) return;
    actions.closeTab(tabId);
  }, [state.tabsById, editor.orchestrator.documentsById, actions]);

  return (
    <WorkbenchPane
      activeTool={activeTool}
      paneId={paneId}
      showMiniMap={showMiniMap}
      onToggleMiniMap={onToggleMiniMap}
      tabs={paneTabs}
      activeTabId={activeId}
      isFocused={state.focusedPaneId === paneId}
      onTabSelect={(tabId) => actions.focusTab(paneId, tabId)}
      onTabClose={handleTabClose}
      onPaneFocus={() => actions.focusPane(paneId)}
      onDiagnosticClick={handleDiagnosticClick}
      simulationBridge={editor.simulationBridge}
      manifest={manifest as OMEGA_Manifest}
      contract={contract as OMEGA_Contract | null}
      orchestrator={editor.orchestrator}
      activeId={editor.activeId}
      tabViewState={state.tabViewState}
      onCaptureViewState={handleCaptureViewState}
      onDiagnosticsUpdate={handleDiagnosticsUpdate}
      selectedItemId={state.selectedNodeId}
      multiSelectedIds={state.multiSelectedNodeIds}
      onSelectItem={handleSelectItem}
      onSelectMultiple={actions.setMultiSelectedNodes}
      updateItem={editor.updateItem}
      updateContainer={editor.updateContainer}
      auditResult={auditResult}
      resolveAsset={editor.resolveAsset}
      isLiveMode={state.isLiveMode}
      setIsLiveMode={() => actions.toggleUIState('isLiveMode')}
      uiTheme={state.uiTheme}
      onUndoTo={editor.undoTo}
      onCompareWithHistory={handleCompareWithHistory}
      hiddenNodeIds={state.hiddenNodeIds}
      lockedNodeIds={state.lockedNodeIds}
      onUpdateManifest={updateManifest}
      onDuplicateItem={handleDuplicateItem}
      onRemoveItem={handleRemoveItem}
      onToggleLock={actions.toggleNodeLock}
      onToggleVisibility={actions.toggleNodeVisibility}
      onGroupSelected={editor.groupSelected}
      onUngroupNode={editor.ungroupNode}
      updateItems={editor.updateItems}
      onOpenGallery={() => actions.toggleWindow('window_blueprints')}
      onLinkWorkspace={editor.linkDirectory}
      onCreateFromScratch={() => editor.reset()}
      isDirectoryLinked={editor.isDirectoryLinked}
      ghostPosition={ghostPreview.ghostPosition}
      ghostSize={ghostPreview.ghostSize}
      isGhostCollision={ghostPreview.isCollision}
      isGhostVisible={ghostPreview.isGhostVisible}
      onGhostMouseMove={handleGhostMouseMove}
      onGhostClick={handleGhostClick}
      onGhostCancel={handleGhostCancel}
      onAddModulation={onAddModulation}
      onRemoveModulation={onRemoveModulation}
      onMoveTab={actions.moveTabToPane}
      startTransaction={editor.startTransaction}
      commitTransaction={editor.commitTransaction}
      alignGhostItems={alignGhostItems}
      alignGhostType={alignGhostType ?? undefined}
      onGhostPreviewChange={handleGhostPreviewChange}
      isSplitH={paneId === 'primary' || paneId === 'primary_bottom' ? state.isPrimarySplitH : state.isSecondarySplitH}
      onToggleSplitH={paneId === 'primary' || paneId === 'secondary' ? () => actions.toggleHorizontalSplit(paneId) : undefined}
      isSplitV={paneId === 'primary' ? derived.isSplit : undefined}
      onToggleSplitV={paneId === 'primary' ? () => {
        const nextMode = derived.isSplit ? 'single' : 'vertical';
        actions.setLayoutMode(nextMode);
      } : undefined}
      onClosePane={paneId !== 'primary' ? () => actions.closePane(paneId) : undefined}
      onCopyItems={onCopyItems}
      onCutItems={onCutItems}
      onPaste={onPaste}
      canPaste={canPaste}
      onToggleGrid={onToggleGrid}
      onToggleGuides={onToggleGuides}
      onAddEntity={onAddEntity}
      onReset={onReset}
      onRenameItem={onRenameItem}
      onBringToFront={onBringToFront}
      onSendToBack={onSendToBack}
      onSaveAsBlueprint={onSaveAsBlueprint}
      onSelectAll={onSelectAll}
    />
  );
}
