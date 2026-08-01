'use client';

/**
 * @purpose Gestiona y renderiza el contenedor principal para el editor de manifesto OMEGA, encapsulando componentes UI y lógica para editar y gestionar manifests.
 * @purpose_en Manages and renders the main container for the OMEGA manifest editor, encapsulating UI components and logic for editing and managing manifests.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:18,sig:10pxw7r
 * @lastUpdated 2026-06-20T12:52:41.630Z
 */

import { useState, useCallback, useMemo } from 'react';

// UI Components
import Header from './layout/Header';
import { PreferencesModal } from '@/features/manifest-editor/components/settings/PreferencesModal';
import WorkbenchFooter from './layout/WorkbenchFooter';
import CommandPalette from './layout/CommandPalette';
import EditorModals from './modals/EditorModals';
import VisualModulationMatrix from './modulation/VisualModulationMatrix';
import { HiddenFileHandlers } from './shared/HiddenFileHandlers';
import OnboardingWalkthrough from './shared/OnboardingWalkthrough';
import TemplateGallery from './gallery/TemplateGallery';
import RightDockContainer from './inspector/RightDockContainer';
import { SplitDivider, HorizontalSplitDivider } from './workspace/SplitDivider';
import CellStudioContainer from './lab/CellStudioContainer';
import Toolbar from './layout/Toolbar';
import WorkbenchDropOverlay from './shared/WorkbenchDropOverlay';
import WorkbenchRenderPane from './workspace/WorkbenchRenderPane';
import { createWindowStates, createRenderPaneProps } from './workspace/workbenchPaneHelpers';
import { useWorkbenchLogs } from '@/features/manifest-editor/hooks/layout/useWorkbenchLogs';

// Types
import type { OMEGA_Manifest, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import type { WorkbenchTabType } from '@/features/manifest-editor/hooks/useWorkbenchState';

// Hook
import { useWorkbenchContainer } from '@/features/manifest-editor/hooks/useWorkbenchContainer';

// --- Component ---

interface WorkbenchContainerProps {
  onOpenCellEditor?: () => void;
  isCellEditorOpen?: boolean;
  setIsCellEditorOpen?: (open: boolean) => void;
}

export default function WorkbenchContainer({
  onOpenCellEditor,
  isCellEditorOpen,
  setIsCellEditorOpen,
}: WorkbenchContainerProps) {
  // ── All logic extracted to hook ──────────────────────────────────────
  const {
    state, actions, derived, editor, manifest, contract, updateManifest,
    activeTool, showMiniMap, inspectorLevel, setInspectorLevel,
    inspectorActiveSection, showNumericResize, showNumericRotate,
    setShowNumericResize, setShowNumericRotate,
    isCommandPaletteOpen, setIsCommandPaletteOpen, isDirty, lastSavedTime,
    gridVisible, showGuides,
    auditResult, totalErrors, totalWarnings,
    batchHistory, selectedItemId, isGalleryOpen,
    userBlueprints, handleSaveGroupAsBlueprint, handleSaveCellAsBlueprint,
    handleSaveGroupFromId, handleSelectBlueprintFromPanel,
    handleAltClickBlueprintFromPanel, handleApplyTemplate,
    handleLoadAcepack, handleSelectUserBlueprint,
    ghostPreview, handleGhostClick, handleGhostMouseMove, handleGhostCancel,
    handleSelectItem, handleAddEntity, handleDuplicateItem, handleRemoveItem,
    handleExportOmegaRack, handleExportContract,
    handleOpenConfig: _ignoredOpenConfig, handleOpenAudit, handleOpenCellEditor,
    onDeploy, onReset, handleToggleMiniMap, handleToggleGrid, handleToggleGuides,
    handleOpenNumericResize, handleOpenNumericRotate,
    triggerUpload, handleImportDistilledJson,
    handleCompareWithHistory, handleDiagnosticClick, handleCaptureViewState,
    handleNavigateToIssue, highlightPath,
    activeTab, watchdog,
    setActiveTool,
    handleCopyTransform, handlePasteTransform,
    handleMenuAlign, handleMenuDistribute,
    handleCopy, handleCut, handlePaste, canCopy, canCut, canPaste,
    alignGhostItems, alignGhostType, handleGhostPreviewChange,
    isDragOver, dragHandlers, commandNodes, commandActions,
    handleCommandPaletteSelectNode, setIsGalleryOpen,
    selectedItem, studioCell, availableBinds, setIsCellLibraryOpen,
    rackSections, handleToggleRackSection,
    handleDragRatio, handleDragPrimarySplitRatio, handleDragSecondarySplitRatio,
    handleDragRatioEnd,
    tabDiagnostics, structuralDiagnostics, handleDiagnosticsUpdate,
    handleBatchUngroup, handleBatchUndoGroup,
    handleRenameItem, handleBringToFront, handleSendToBack, handleSaveAsBlueprintById: handleSaveAsBlueprint, handleSelectAll,
  } = useWorkbenchContainer(onOpenCellEditor);

  // ── Preferences modal ───────────────────────────────────────────────
  const [showPreferences, setShowPreferences] = useState(false);
  const handlePreferencesOpen = useCallback(() => setShowPreferences(true), []);
  const handlePreferencesClose = useCallback(() => setShowPreferences(false), []);

  // Override handleOpenConfig to open PreferencesModal
  const _handleOpenConfig = useCallback(() => {
    handlePreferencesOpen();
  }, [handlePreferencesOpen]);

  // ── Log terminal (local state, depends on editor from container) ─────
  const { showLogs, toggleLogs, LogTerminalPanel } = useWorkbenchLogs({
    logs: editor.logs,
  });

  // ── Memoized window states (used by both Header and RightDockContainer) ─
  const windowStates = useMemo(() => createWindowStates(state), [state]);

  // ── Tab focus handler (used by both Header and WorkbenchFooter) ────
  const onTabFocus = useCallback((type: string) => {
    actions.openTab({
      id: `tab-${type}`,
      type: type as WorkbenchTabType,
      title: type.charAt(0).toUpperCase() + type.slice(1),
    });
  }, [actions]);

  // ── Shared props for WorkbenchRenderPane (construcción en helper) ──
  const renderPaneProps = createRenderPaneProps({
    state, derived, actions, editor,
    manifest: manifest as OMEGA_Manifest,
    contract: contract as OMEGA_Contract | null,
    updateManifest,
    activeTool,
    showMiniMap,
    onToggleMiniMap: handleToggleMiniMap,
    auditResult,
    tabDiagnostics,
    structuralDiagnostics,
    handleDiagnosticClick,
    handleDiagnosticsUpdate,
    handleCaptureViewState,
    handleSelectItem,
    handleDuplicateItem,
    handleRemoveItem,
    handleCompareWithHistory,
    ghostPreview,
    handleGhostClick,
    handleGhostMouseMove,
    handleGhostCancel,
    alignGhostItems,
    alignGhostType,
    handleGhostPreviewChange,
    onAddModulation: editor.addModulation,
    onRemoveModulation: editor.removeModulation,
    onCopyItems: (ids: string[]) => editor.copyToClipboard(ids),
    onCutItems: (ids: string[]) => editor.cutToClipboard(ids),
    onPaste: handlePaste,
    canPaste,
    onToggleGrid: handleToggleGrid,
    onToggleGuides: handleToggleGuides,
    onAddEntity: handleAddEntity,
    onReset,
    onRenameItem: handleRenameItem,
    onBringToFront: handleBringToFront,
    onSendToBack: handleSendToBack,
    onSaveAsBlueprint: handleSaveAsBlueprint,
    onSelectAll: handleSelectAll,
  });

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div
      className="h-screen flex flex-col wb-bg wb-text font-sans overflow-hidden select-none relative transition-colors duration-500"
      data-ui-theme={state.uiTheme}
      onDragEnter={dragHandlers.onDragEnter}
      onDragOver={dragHandlers.onDragOver}
      onDragLeave={dragHandlers.onDragLeave}
      onDrop={dragHandlers.onDrop}
    >
      <WorkbenchDropOverlay isDragOver={isDragOver} />

      <HiddenFileHandlers onResourceUpload={editor.handleResourceUpload} setPendingFiles={actions.setPendingFiles} />

      {/* HEADER WRAPPER WITH ZEN HEIGHT TRANSITION */}
      <div className={`relative z-[100] transition-all duration-300 ${state.isZenMode ? 'h-0 opacity-0 pointer-events-none overflow-hidden' : 'h-auto'}`}>
        <Header
          onReset={onReset}
          onUndo={editor.undo}
          onRedo={editor.redo}
          activeTabType={(activeTab?.type && ['orbital', 'rack', 'source', 'history'].includes(activeTab.type)) ? (activeTab.type as 'orbital' | 'rack' | 'source' | 'history') : 'rack'}
          onTabFocus={onTabFocus}
          onExportManifest={editor.exportManifest}
          onExportPack={editor.exportOmegaPack}
          onExportOmegaRack={handleExportOmegaRack}
          onExportCAD={() => editor.exportCADBlueprint()}
          onExportContract={handleExportContract}
          onLinkDirectory={editor.linkDirectory}
          isDirectoryLinked={editor.isDirectoryLinked}
          onGenerateMockup={() => actions.toggleUIState('mockupOpen')}
          onDeploy={onDeploy}
          onToggleLogs={toggleLogs}
          showLogs={showLogs}
          uiTheme={state.uiTheme}
          setUiTheme={actions.setUiTheme}
          onHelp={() => actions.setHelpState(true)}
          audit={auditResult}
          onOpenAudit={handleOpenAudit}
          onTriggerUpload={triggerUpload}
          onOpenAbout={() => actions.toggleUIState('isAboutModalOpen')}
          onOpenConfig={_handleOpenConfig}
          onOpenCellEditor={handleOpenCellEditor}
          onToggleTour={() => actions.toggleUIState('isOnboardingOpen')}
          onOpenGallery={() => actions.toggleWindow('window_blueprints')}
          onImportDistilledJson={handleImportDistilledJson}
          windowStates={windowStates}
          onToggleWindow={actions.toggleWindow}
          simulationBridge={editor.simulationBridge}
          rackSections={rackSections}
          onToggleRackSection={handleToggleRackSection}
          gridVisible={gridVisible}
          showGuides={showGuides}
          onToggleGrid={handleToggleGrid}
          onToggleGuides={handleToggleGuides}
          miniMapVisible={showMiniMap}
          onToggleMiniMap={handleToggleMiniMap}
          selectedNodeId={state.selectedNodeId}
          multiSelectedIds={state.multiSelectedNodeIds}
          onSaveCellAsBlueprint={handleSaveCellAsBlueprint}
          inspectorLevel={inspectorLevel}
          onSetInspectorLevel={setInspectorLevel}
          manifest={manifest as OMEGA_Manifest}
          onUpdateManifest={updateManifest}
          onSetTool={setActiveTool}
          onOpenNumericResize={handleOpenNumericResize}
          onOpenNumericRotate={handleOpenNumericRotate}
          onCopyTransform={handleCopyTransform}
          onPasteTransform={handlePasteTransform}
          onAlign={(dir: string) => {
            if (['left', 'center-h', 'right', 'top', 'center-v', 'bottom'].includes(dir)) {
              handleMenuAlign(dir as 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom');
            }
          }}
          onDistribute={(dir: string) => {
            if (dir === 'horizontal') handleMenuDistribute('dist-h');
            else if (dir === 'vertical') handleMenuDistribute('dist-v');
          }}
          isLiveMode={state.isLiveMode}
          onCopy={handleCopy}
          onCut={handleCut}
          onPaste={handlePaste}
          canCopy={canCopy}
          canCut={canCut}
          canPaste={canPaste}
        />
      </div>

      {isGalleryOpen && (
        <TemplateGallery
          onSelect={handleApplyTemplate}
          onClose={() => setIsGalleryOpen(false)}
        />
      )}

      <main className="flex-1 flex overflow-hidden">
        {state.studioMode.isOpen ? (
          <div className="flex-1 p-4 bg-black/20 animate-in fade-in zoom-in-95 duration-500">
            <CellStudioContainer
              initialCell={studioCell}
              manifest={manifest as OMEGA_Manifest}
              resolveAsset={editor.resolveAsset}
              onFreeze={(template) => {
                editor.registerTemplate(template);
                actions.setStudioMode(false);
              }}
              onSave={(updatedCell) => {
                if (state.studioMode.cellId) {
                  editor.updateItem(state.studioMode.cellId, updatedCell);
                }
                actions.setStudioMode(false);
              }}
              onClose={() => actions.setStudioMode(false)}
            />
          </div>
        ) : (
          <>
            {/* LEFT WORKSPACE: PANES */}
            <div className="flex-1 flex overflow-hidden relative">
              <Toolbar
                isLiveMode={state.isLiveMode}
                onToggleLive={() => actions.toggleUIState('isLiveMode')}
                onOpenGallery={() => actions.toggleWindow('window_blueprints')}
                onOpenConfig={_handleOpenConfig}
                onOpenCellStudio={() => {
                  if (selectedItemId) {
                    actions.setStudioMode(true, selectedItemId);
                  }
                }}
                onAddEntity={handleAddEntity}
                isZenMode={state.isZenMode}
                onToggleZen={actions.toggleZenMode}
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                selectedNodeId={selectedItemId}
                multiSelectedIds={state.multiSelectedNodeIds}
                onGroupSelected={state.multiSelectedNodeIds.length >= 2 ? editor.groupSelected : undefined}
                onUngroupNode={state.multiSelectedNodeIds.length === 1 ? editor.ungroupNode : undefined}
                findItem={editor.findItem}
                manifest={manifest as OMEGA_Manifest}
                onUpdateItems={editor.updateItems}
                startTransaction={editor.startTransaction}
                commitTransaction={editor.commitTransaction}
                abortTransaction={editor.abortTransaction}
                showNumericResize={showNumericResize}
                showNumericRotate={showNumericRotate}
                onOpenNumericResize={handleOpenNumericResize}
                onOpenNumericRotate={handleOpenNumericRotate}
                onCloseNumericResize={() => setShowNumericResize(false)}
                onCloseNumericRotate={() => setShowNumericRotate(false)}
              />
              {/* PRIMARY PANE COLUMN */}
              <div
                className="flex flex-col overflow-hidden h-full"
                style={{ width: derived.isSplit ? `${state.layout.ratio * 100}%` : '100%' }}
              >
                {state.isPrimarySplitH ? (
                  <>
                    <div className="overflow-hidden min-h-[80px] flex flex-col" style={{ height: `${state.primarySplitRatio * 100}%` }}>
                      <WorkbenchRenderPane paneId="primary" {...renderPaneProps} />
                    </div>
                    <HorizontalSplitDivider onDrag={handleDragPrimarySplitRatio} />
                    <div className="flex-1 overflow-hidden min-h-[80px] flex flex-col" style={{ height: `${(1 - state.primarySplitRatio) * 100}%` }}>
                      <WorkbenchRenderPane paneId="primary_bottom" {...renderPaneProps} />
                    </div>
                  </>
                ) : (
                  <WorkbenchRenderPane paneId="primary" {...renderPaneProps} />
                )}
              </div>

              {/* SPLIT DIVIDER */}
              {derived.isSplit && <SplitDivider onDrag={handleDragRatio} />}

              {/* SECONDARY PANE COLUMN */}
              {derived.isSplit && (
                <div className="flex-1 border-l wb-outline flex flex-col overflow-hidden h-full animate-in slide-in-from-right duration-500">
                  {state.isSecondarySplitH ? (
                    <>
                      <div className="overflow-hidden min-h-[80px] flex flex-col" style={{ height: `${state.secondarySplitRatio * 100}%` }}>
                        <WorkbenchRenderPane paneId="secondary" {...renderPaneProps} />
                      </div>
                      <HorizontalSplitDivider onDrag={handleDragSecondarySplitRatio} />
                      <div className="flex-1 overflow-hidden min-h-[80px] flex flex-col" style={{ height: `${(1 - state.secondarySplitRatio) * 100}%` }}>
                        <WorkbenchRenderPane paneId="secondary_bottom" {...renderPaneProps} />
                      </div>
                    </>
                  ) : (
                    <WorkbenchRenderPane paneId="secondary" {...renderPaneProps} />
                  )}
                </div>
              )}
            </div>

            {/* RIGHT WORKSPACE: MODULAR DOCK SYSTEM */}
            <RightDockContainer
              manifest={manifest as OMEGA_Manifest}
              contract={contract as OMEGA_Contract | null}
              selectedItem={selectedItem}
              selectedItemId={selectedItemId}
              highlightPath={highlightPath}
              availableBinds={availableBinds}
              extraResources={editor.extraResources}
              audit={auditResult}
              isLiveMode={state.isLiveMode}
              uiTheme={state.uiTheme}
              pinnedNodeId={state.pinnedNodeId}
              layout={state.layout}
              multiSelectedIds={state.multiSelectedNodeIds}
              inspectorLevel={inspectorLevel}
              activeSection={inspectorActiveSection}
              pastHistory={editor.orchestrator.documentsById['primary']?.history?.past || []}
              onUndoTo={editor.undoTo}
              logs={editor.logs}
              windowStates={windowStates}
              onToggleWindow={actions.toggleWindow}
              hiddenNodeIds={state.hiddenNodeIds}
              lockedNodeIds={state.lockedNodeIds}
              onToggleVisibility={actions.toggleNodeVisibility}
              onToggleLock={actions.toggleNodeLock}
              onBatchSetVisibility={actions.batchSetVisibility}
              onBatchSetLocked={actions.batchSetLocked}
              isCollapsed={state.isRightPanelCollapsed}
              onToggleCollapse={actions.toggleRightPanel}
              onUpdateItem={editor.updateItem}
              onUpdateManifest={updateManifest}
              onSelectItem={handleSelectItem}
              onAddEntity={handleAddEntity}
              onDuplicateItem={handleDuplicateItem}
              onRemoveItem={handleRemoveItem}
              onAddModulation={editor.addModulation}
              onRemoveModulation={editor.removeModulation}
              onUpdateModulation={editor.updateModulation}
              onOpenModGrid={() => actions.toggleUIState('showModGrid')}
              addContainer={editor.addContainer}
              updateContainer={editor.updateContainer}
              removeContainer={editor.removeContainer}
              onHelp={(sectionId) => actions.setHelpState(true, sectionId)}
              onRemoveResource={editor.handleRemoveResource}
              resolveAsset={editor.resolveAsset}
              onTriggerUpload={triggerUpload}
              onOpenConfig={_handleOpenConfig}
              onOpenLibrary={() => setIsCellLibraryOpen(true)}
              onSelectBlueprint={handleSelectBlueprintFromPanel}
              onAltClickBlueprint={handleAltClickBlueprintFromPanel}
              onSelectUserBlueprint={handleSelectUserBlueprint}
              userBlueprints={userBlueprints}
              onLoadAcepack={handleLoadAcepack}
              exportSelectedAsBlueprint={editor.exportSelectedAsBlueprint}
              onSaveGroupAsBlueprint={handleSaveGroupAsBlueprint}
              onSaveGroupAsBlueprintFromNodeId={handleSaveGroupFromId}
              onUngroupNode={editor.ungroupNode}
              onGroupSelected={state.multiSelectedNodeIds.length >= 2 ? () => editor.groupSelected(state.multiSelectedNodeIds) : undefined}
              onBatchUngroup={state.multiSelectedNodeIds.some(id => {
                const node = editor.findItem(id);
                return node && 'kind' in node && (node.kind === 'group' || node.kind === 'container');
              }) ? handleBatchUngroup : undefined}
              onBatchUndoGroup={handleBatchUndoGroup}
              onGroupDown={editor.groupDown}
              onMoveNode={editor.moveNode}
              onMoveNodeUpDown={editor.moveNodeUpDown}
              onTogglePin={(id) => actions.setPinnedNode(id)}
              onSetLayoutRatio={actions.setLayoutRatio}
              onSetLayoutRatioEnd={handleDragRatioEnd}
              onSelectMultiple={actions.setMultiSelectedNodes}
              rackSections={rackSections}
              onToggleRackSection={handleToggleRackSection}
              onNavigate={handleNavigateToIssue}
            />
          </>
        )}

        {state.showModGrid && (
          <VisualModulationMatrix
            manifest={manifest as OMEGA_Manifest}
            onAdd={editor.addModulation}
            onRemove={editor.removeModulation}
            onUpdate={editor.updateModulation}
            onClose={() => actions.toggleUIState('showModGrid')}
          />
        )}
      </main>

      <EditorModals
        manifest={manifest as OMEGA_Manifest}
        pendingFiles={state.pendingFiles}
        setPendingFiles={(files) => actions.setPendingFiles(files || [])}
        handleBulkUpload={editor.handleBulkUpload}
        helpState={{ isOpen: state.helpState.isOpen, sectionId: state.helpState.sectionId || '' }}
        closeHelp={() => actions.setHelpState(false)}
        isAboutModalOpen={state.isAboutModalOpen}
        setIsAboutModalOpen={() => actions.toggleUIState('isAboutModalOpen')}
        auditResult={auditResult}
        mockupOpen={state.mockupOpen}
        setMockupOpen={() => actions.toggleUIState('mockupOpen')}
        resolveAsset={editor.resolveAsset}
        onDeploy={onDeploy}
        isCellEditorOpen={isCellEditorOpen !== undefined ? isCellEditorOpen : state.isCellEditorOpen}
        setIsCellEditorOpen={setIsCellEditorOpen ? (open) => setIsCellEditorOpen(open) : () => actions.toggleUIState('isCellEditorOpen')}
        isDiffModalOpen={state.isDiffModalOpen}
        setIsDiffModalOpen={actions.setIsDiffModalOpen}
        activeDiff={state.activeDiff}
        onMergeEntries={editor.handleMergeEntries}
        blueprintInjection={editor.blueprintInjection}
      />

      {/* ── Command Palette ── */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        actions={commandActions}
        nodes={commandNodes}
        onSelectNode={handleCommandPaletteSelectNode}
      />

      {!state.isZenMode && (
        <WorkbenchFooter
          watchdogStatus={watchdog.status}
          watchdogTime={watchdog.lastUpdate}
          activeTabType={(activeTab?.type && ['orbital', 'rack', 'source', 'history'].includes(activeTab.type)) ? (activeTab.type as 'orbital' | 'rack' | 'source' | 'history') : 'rack'}
          onTabFocus={onTabFocus}
          isSplit={derived.isSplit}
          onToggleSplit={() => {
            const nextMode = derived.isSplit ? 'single' : 'vertical';
            actions.setLayoutMode(nextMode);
          }}
          isDirty={isDirty}
          errorCount={totalErrors}
          warningCount={totalWarnings}
          lastSavedTime={lastSavedTime}
          activeTool={activeTool}
          historyPast={editor.orchestrator.documentsById[editor.activeId]?.history?.past || []}
          historyFuture={editor.orchestrator.documentsById[editor.activeId]?.history?.future || []}
          onUndo={editor.undo}
          onRedo={editor.redo}
          onUndoTo={editor.undoTo}
          onCommandPaletteToggle={() => setIsCommandPaletteOpen(prev => !prev)}
          onSave={() => editor.exportOmegaPack()}
          showMiniMap={showMiniMap}
          onToggleMiniMap={handleToggleMiniMap}
          batchEntries={batchHistory.batchHistory}
          onUndoBatchEntry={(index) => {
            const entry = batchHistory.batchHistory[index];
            if (!entry) return;
            if (entry.action === 'visibility') {
              actions.batchSetVisibility(entry.ids, !entry.value);
            } else if (entry.action === 'lock') {
              actions.batchSetLocked(entry.ids, !entry.value);
            } else if (entry.action === 'group' && entry.value === true) {
              handleBatchUndoGroup(entry.ids);
            } else return;
            batchHistory.setBatchHistory(prev => prev.filter((_, i) => i !== index));
          }}
        />
      )}

      {/* ── Floating Log Terminal ── */}
      {LogTerminalPanel}

      {/* ── Preferences Modal ── */}
      <PreferencesModal
        open={showPreferences}
        onClose={handlePreferencesClose}
      />

      {/* ── Onboarding Walkthrough ── */}
      <OnboardingWalkthrough
        isOpen={state.isOnboardingOpen}
        onClose={() => actions.toggleUIState('isOnboardingOpen')}
      />
    </div>
  );
}
