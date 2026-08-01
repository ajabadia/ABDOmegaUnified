'use client';

/**
 * @purpose Gestiona la renderización e interacción de una pestaña de trabajo en el editor de manifest OMEGA, mostrando pestañas con diferentes vistas y manejando las interacciones del usuario como la selección, cierre y diagnósticos de pestañas.
 * @purpose_en Manages the rendering and interaction of a workbench pane in the OMEGA manifest editor, displaying tabs with different views and handling user interactions such as tab selection, closing, and diagnostics.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:0,imports:11,sig:1fivw2d
 * @lastUpdated 2026-06-20T10:45:07.503Z
 */

import React, { useEffect } from 'react';
import type { WorkbenchPaneId, WorkbenchTab } from '../../types/workbench';
import MultiTabHeader from '../layout/MultiTabHeader';
import { WorkbenchViewport } from '../viewport/WorkbenchViewport';
import { SourceView } from '../views/SourceView';
import type { OMEGA_Manifest, OMEGA_Contract, OMEGA_Modulation, HybridEntityUpdate, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { SimulationBridgeState } from '../../hooks/useSimulationBridge';
import type { AuditResult } from '@/omega-ui-core/types/audit';
import type { DocumentOrchestrator } from '../../types/document';
import type { UpdateManifestFn, GhostItem } from '@/features/manifest-editor/utils/alignmentConstants';
import { useViewport } from '../../hooks/useViewport';
 
interface WorkbenchPaneProps {
  paneId: WorkbenchPaneId;
  tabs: WorkbenchTab[];
  activeTabId: string | null;
  isFocused: boolean;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onPaneFocus: () => void;
  onDiagnosticClick: (tabId: string, diag: unknown) => void;
  simulationBridge: SimulationBridgeState;
  
  // Drag and drop & horizontal split
  onMoveTab?: ((tabId: string, paneId: WorkbenchPaneId) => void) | undefined;
  isSplitH?: boolean | undefined;
  onToggleSplitH?: (() => void) | undefined;
  isSplitV?: boolean | undefined;
  onToggleSplitV?: (() => void) | undefined;
  onClosePane?: (() => void) | undefined;
  
  // Data
  manifest: OMEGA_Manifest;
  contract: OMEGA_Contract | null;
  orchestrator: Pick<DocumentOrchestrator, 'documentsById' | 'updateDocument'>;
  activeId: string;
  
  // View State
  tabViewState: Record<string, unknown>;
  onCaptureViewState: (tabId: string, viewState: unknown) => void;
  onDiagnosticsUpdate: (tabId: string, diagnostics: unknown) => void;
  
  // Operations
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  updateItem: (id: string, updates: HybridEntityUpdate) => void;
  /** Batch update multiple nodes atomically (Bug 1 fix) */
  updateItems?: ((updatesMap: Record<string, Partial<OmegaNode>>) => void) | undefined;
  updateContainer: (id: string, updates: Record<string, unknown>) => void;
  onUpdateManifest?: UpdateManifestFn | undefined;
  auditResult: AuditResult;
  resolveAsset: (id: string | undefined) => string | undefined;
  
  // Live Mode
  isLiveMode: boolean;
  setIsLiveMode: (live: boolean) => void;
  
  // History
  onUndoTo: (index: number) => void;
  onCompareWithHistory: (index: number) => void;
  multiSelectedIds: string[];
  onSelectMultiple: (ids: string[]) => void;
  hiddenNodeIds?: string[] | undefined;
  lockedNodeIds?: string[] | undefined;
  onDuplicateItem?: (id: string) => void;
  onRemoveItem?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onGroupSelected?: (ids: string[]) => void;
  onUngroupNode?: (groupId: string) => void;
  activeTool?: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null | undefined;
  uiTheme?: 'dark' | 'light' | 'amber' | 'cyberpunk' | 'high-contrast' | undefined;

  // v9.1.7-dev — RackStartupAssistant wiring (REGRESSION_RECOVERY_PLAN.md item 23)
  onOpenGallery?: (() => void) | undefined;
  onLinkWorkspace?: (() => void) | undefined;
  onCreateFromScratch?: (() => void) | undefined;
  isDirectoryLinked?: boolean | undefined;

  // v9.2.1 — Interactive Ghost Preview Layer
  ghostPosition?: { x: number; y: number } | null | undefined;
  ghostSize?: { width: number; height: number } | undefined;
  isGhostCollision?: boolean | undefined;
  isGhostVisible?: boolean | undefined;
  onGhostMouseMove?: ((clientX: number, clientY: number) => void) | undefined;
  onGhostClick?: ((x: number, y: number) => void) | undefined;
  onGhostCancel?: (() => void) | undefined;
  showMiniMap?: boolean | undefined;
  onToggleMiniMap?: (() => void) | undefined;

  // P11 — Visual Connection Editor
  onAddModulation?: ((mod: OMEGA_Modulation) => void) | undefined;
  onRemoveModulation?: ((id: string) => void) | undefined;
  startTransaction?: ((label: string) => void) | undefined;
  commitTransaction?: (() => void) | undefined;
  // Transform context menu
  onNumericResize?: (() => void) | undefined;
  onNumericRotate?: (() => void) | undefined;
  onCopyTransform?: (() => void) | undefined;
  onPasteTransform?: (() => void) | undefined;
  onAlign?: ((dir: string) => void) | undefined;
  onDistribute?: ((dir: string) => void) | undefined;
  // Alignment ghost preview (shared between ViewportToolbar & MenuBar)
  alignGhostItems?: GhostItem[] | undefined;
  alignGhostType?: string | undefined;
  onGhostPreviewChange?: ((items: GhostItem[] | null, type?: string) => void) | undefined;

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
  // Extended context menu / shortcuts
  onRenameItem?: ((id: string) => void) | undefined;
  onBringToFront?: ((id: string) => void) | undefined;
  onSendToBack?: ((id: string) => void) | undefined;
  onSaveAsBlueprint?: ((id: string) => void) | undefined;
  onSelectAll?: (() => void) | undefined;
}
 
const WorkbenchPane = React.memo((props: WorkbenchPaneProps) => {
  const { 
    paneId, 
    tabs, 
    activeTabId, 
    isFocused, 
    onTabSelect, 
    onTabClose, 
    onPaneFocus, 
    onDiagnosticClick, 
    simulationBridge,
    onMoveTab,
    isSplitH,
    onToggleSplitH,
    isSplitV,
    onToggleSplitV,
    onClosePane
  } = props;
  
  const activeTab = activeTabId ? tabs.find(t => t.id === activeTabId) : null;
  
  // OMEGA Phase 7 - Multi-Document Aware Rendering
  const tabDocId = (activeTab?.payload?.documentId as string) || props.activeId;
  const tabDoc = props.orchestrator.documentsById[tabDocId];
  const tabManifest = tabDoc?.manifest || props.manifest;
  const tabContract = (tabDoc?.contract as OMEGA_Contract | null) || props.contract;

  // Local viewports per tab — independent states for rack and orbital views
  const viewState = activeTabId ? (props.tabViewState[activeTabId] as Record<string, { zoom: number; offsetX: number; offsetY: number } | undefined>) : undefined;
  
  const rackViewport = useViewport(viewState?.rackViewport);
  const orbitalViewport = useViewport(viewState?.orbitalViewport);

  const activeViewport = activeTab?.type === 'orbital' ? orbitalViewport : rackViewport;
  const viewportKey = activeTab?.type === 'orbital' ? 'orbitalViewport' : 'rackViewport';

  useEffect(() => {
    if (activeTabId && activeTab && (activeTab.type === 'rack' || activeTab.type === 'orbital')) {
      const t = setTimeout(() => {
        props.onCaptureViewState(activeTabId, { [viewportKey]: { zoom: activeViewport.zoom, offsetX: activeViewport.pan.x, offsetY: activeViewport.pan.y } });
      }, 500);
      return () => clearTimeout(t);
    }
  // `tabs` se omite intencionalmente — cambios en la lista de tabs (agregar/eliminar)
  // no deben recapturar el viewport state. `activeTabId` ya cubre el cambio de tab activo,
  // y `activeTab` se recalcula desde `tabs` antes de cada ejecución del effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeViewport.zoom, activeViewport.pan.x, activeViewport.pan.y, activeTabId, activeTab?.type, viewportKey, props.onCaptureViewState]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <MultiTabHeader 
        paneId={paneId}
        tabs={tabs}
        activeTabId={activeTabId}
        isFocused={isFocused}
        onTabSelect={onTabSelect}
        onTabClose={onTabClose}
        onPaneFocus={onPaneFocus}
        onDiagnosticClick={onDiagnosticClick}
        onMoveTab={onMoveTab}
        isSplitH={isSplitH}
        onToggleSplitH={onToggleSplitH}
        isSplitV={isSplitV}
        onToggleSplitV={onToggleSplitV}
        onClosePane={onClosePane}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {!activeTab && (
          <div className="flex-1 flex items-center justify-center bg-black/20">
            <span className="text-[10px] font-black wb-text-muted uppercase tracking-[0.2em] opacity-30">
              Empty Workspace Pane
            </span>
          </div>
        )}
        
        {activeTab && ['orbital', 'rack', 'history'].includes(activeTab.type) && (
          <WorkbenchViewport 
            activeTool={props.activeTool}
            uiTheme={props.uiTheme}
            viewMode={activeTab.type as 'orbital' | 'rack' | 'source' | 'history'} 
            showMiniMap={props.showMiniMap}
            onToggleMiniMap={props.onToggleMiniMap}
            manifest={tabManifest} 
            contract={tabContract}
            selectedItemId={props.selectedItemId} 
            onSelectItem={props.onSelectItem}
            updateItem={props.updateItem} 
            updateItems={props.updateItems} 
            updateContainer={props.updateContainer} 
            onUpdateManifest={props.onUpdateManifest}
            auditResult={props.auditResult}
            zoom={activeViewport.zoom} 
            pan={activeViewport.pan} 
            handleZoom={activeViewport.handleZoom} 
            handlePan={activeViewport.handlePan}
            handleResetViewport={activeViewport.handleResetViewport} 
            handleFitViewport={activeViewport.handleFitViewport}
            isLiveMode={props.isLiveMode} 
            setIsLiveMode={props.setIsLiveMode}
            resolveAsset={props.resolveAsset}
            pushParameterUpdate={simulationBridge.pushParameterUpdate}
            past={tabDoc?.history.past || []}
            onUndoTo={props.onUndoTo}
            onCompareWithHistory={props.onCompareWithHistory}
            multiSelectedIds={props.multiSelectedIds}
            onSelectMultiple={props.onSelectMultiple}
            hiddenNodeIds={props.hiddenNodeIds}
            lockedNodeIds={props.lockedNodeIds}
            {...(props.onDuplicateItem != null ? { onDuplicateItem: props.onDuplicateItem } : {})}
            {...(props.onRemoveItem != null ? { onRemoveItem: props.onRemoveItem } : {})}
            {...(props.onToggleLock != null ? { onToggleLock: props.onToggleLock } : {})}
            {...(props.onToggleVisibility != null ? { onToggleVisibility: props.onToggleVisibility } : {})}
            {...(props.onGroupSelected != null ? { onGroupSelected: props.onGroupSelected } : {})}
            {...(props.onUngroupNode != null ? { onUngroupNode: props.onUngroupNode } : {})}
            {...(props.onOpenGallery != null ? { onOpenGallery: props.onOpenGallery } : {})}
            {...(props.onLinkWorkspace != null ? { onLinkWorkspace: props.onLinkWorkspace } : {})}
            {...(props.onCreateFromScratch != null ? { onCreateFromScratch: props.onCreateFromScratch } : {})}
            {...(props.isDirectoryLinked != null ? { isDirectoryLinked: props.isDirectoryLinked } : {})}
            ghostPosition={props.ghostPosition}
            ghostSize={props.ghostSize}
            isGhostCollision={props.isGhostCollision}
            isGhostVisible={props.isGhostVisible}
            {...(props.onGhostMouseMove != null ? { onGhostMouseMove: props.onGhostMouseMove } : {})}
            {...(props.onGhostClick != null ? { onGhostClick: props.onGhostClick } : {})}
            {...(props.onGhostCancel != null ? { onGhostCancel: props.onGhostCancel } : {})}
            {...(props.onAddModulation != null ? { onAddModulation: props.onAddModulation } : {})}
            {...(props.onRemoveModulation != null ? { onRemoveModulation: props.onRemoveModulation } : {})}
            startTransaction={props.startTransaction}
            commitTransaction={props.commitTransaction}
            alignGhostItems={props.alignGhostItems}
            alignGhostType={props.alignGhostType}
            onGhostPreviewChange={props.onGhostPreviewChange}
            onNumericResize={props.onNumericResize}
            onNumericRotate={props.onNumericRotate}
            onCopyTransform={props.onCopyTransform}
            onPasteTransform={props.onPasteTransform}
            onAlign={props.onAlign}
            onDistribute={props.onDistribute}
            onCopyItems={props.onCopyItems}
            onCutItems={props.onCutItems}
            onPaste={props.onPaste}
            canPaste={props.canPaste}
            onToggleGrid={props.onToggleGrid}
            onToggleGuides={props.onToggleGuides}
            onAddEntity={props.onAddEntity}
            onReset={props.onReset}
            onRenameItem={props.onRenameItem}
            onBringToFront={props.onBringToFront}
            onSendToBack={props.onSendToBack}
            onSaveAsBlueprint={props.onSaveAsBlueprint}
            onSelectAll={props.onSelectAll}
          />
        )}

        {activeTab?.type === 'source' && (
          <SourceView 
            tabId={activeTab.id}
            manifestId={tabDocId}
            value={JSON.stringify(tabManifest, null, 2)}
            language="json"
            editorViewState={(props.tabViewState[activeTab.id] as { editorViewState?: unknown })?.editorViewState}
            onChange={(next) => {
              try {
                const updated = JSON.parse(next);
                props.orchestrator.updateDocument(tabDocId, { manifest: updated });
              } catch {}
            }}
            onCaptureViewState={(viewState) => props.onCaptureViewState(activeTab.id, viewState)}
            onDiagnosticsUpdate={(diagnostics) => props.onDiagnosticsUpdate(activeTab.id, diagnostics)}
            selectedItemId={props.selectedItemId}
          />
        )}
      </div>
    </div>
  );
});

WorkbenchPane.displayName = 'WorkbenchPane';
export default WorkbenchPane;
