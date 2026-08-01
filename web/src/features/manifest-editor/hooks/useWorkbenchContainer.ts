'use client';

/**
 * @purpose Hook de composición del WorkbenchContainer — delega toda la lógica en sub-hooks especializados.
 * @purpose_en WorkbenchContainer composition hook — delegates all logic to specialized sub-hooks.
 * @refactorable false
 * @classification Custom Hook
 * @complexity High
 * @fingerprint exports:2,imports:34,sig:g180te
 * @lastUpdated 2026-06-22
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAllIdsInTree, findNodeInTree, updateNodeInTree } from '@/features/manifest-editor/hooks/entities/ucaInspectorAdapter';
import { buildManifestFromTree } from '@/features/manifest-editor/hooks/entities/entityCRUDUtils';
import type { OMEGA_Contract, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { GhostItem } from '@/features/manifest-editor/utils/alignmentConstants';
import type { WorkbenchContainerLogic } from '../types/workbenchTypes';
import type { WorkbenchTabType } from './useWorkbenchState';
import { useAlignment } from './useAlignment';
import { useTransformClipboard } from './useTransformClipboard';
import { useWorkbenchDragHandlers } from './useWorkbenchDragHandlers';
import { useDiagnosticHandlers } from './useDiagnosticHandlers';
import { useManifestEditor } from './useManifestEditor';
import { useAudit } from './useAudit';
import { useWorkbenchState } from './useWorkbenchState';
import { useAuditNavigator } from './useAuditNavigator';
import { useWatchdog } from './useWatchdog';
import { useDynamicFonts } from './useDynamicFonts';
import { useGhostPreview } from './useGhostPreview';
import { useFileDrop } from './useFileDrop';
import { useRackSections } from './useRackSections';
import { useTabDiagnostics } from './useTabDiagnostics';
import { useEntityCrud } from './useEntityCrud';
import { useExportOperations } from './useExportOperations';
import { useBatchUngroup } from './useBatchUngroup';
import { useCellBlueprint } from './useCellBlueprint';
import { useGroupBlueprint } from './useGroupBlueprint';
import { useBatchHistory } from './useBatchHistory';
import { useWorkspaceExportImport } from './useWorkspaceExportImport';
import { useWorkbenchShortcuts } from './useWorkbenchShortcuts';
import { useWorkbenchFileOperations } from './useWorkbenchFileOperations';
import { useWorkbenchUIState } from './useWorkbenchUIState';
import { useWorkbenchDirtyTracker } from './useWorkbenchDirtyTracker';
import { useWorkbenchGrid } from './useWorkbenchGrid';
import { useWorkbenchOnboarding } from './useWorkbenchOnboarding';
import { useWorkbenchKeyboard } from './useWorkbenchKeyboard';
import { useWorkbenchTabSync } from './useWorkbenchTabSync';
import { useWorkbenchBlueprintActions } from './useWorkbenchBlueprintActions';
import { useWorkbenchGhostCoordination } from './useWorkbenchGhostCoordination';
import { useWorkbenchSelectionPanel } from './useWorkbenchSelectionPanel';
import { useWorkbenchCommandPalette } from './useWorkbenchCommandPalette';
import { useWorkbenchAvailableBinds } from './useWorkbenchAvailableBinds';
import { usePreferences } from '../providers/PreferencesProvider';
import { useWorkbenchCompareDeploy } from './useWorkbenchCompareDeploy';

export function useWorkbenchContainer(
  onOpenCellEditor?: () => void,
): WorkbenchContainerLogic {
  // ── State ────────────────────────────────────────────────────────────
  const { state, actions, derived, dispatch } = useWorkbenchState();
  const { rackSections, handleToggleRackSection } = useRackSections();
  const ui = useWorkbenchUIState();

  // ── Onboarding ────────────────────────────────────────────────────────
  useWorkbenchOnboarding(state.isOnboardingOpen, actions.toggleUIState as (key: string) => void);

  // ── Core Data ─────────────────────────────────────────────────────────
  const editor = useManifestEditor(state, actions);
  const manifest = editor.manifest;
  // `contract` puede ser el canonical `OmegaContract` o el legacy `OMEGA_Contract`;
  // estrechamos al tipo legacy que esperan los consumidores del workbench.
  const contract = editor.contract as OMEGA_Contract | null;
  const updateManifest = editor.updateManifest;

  // ── Dirty Tracker ─────────────────────────────────────────────────────
  const { isDirty, lastSavedTime } = useWorkbenchDirtyTracker(
    editor.orchestrator.documentsById,
  );

  // ── File Operations ───────────────────────────────────────────────────
  const { handleImportDistilledJson, handleLoadOmegaProject, handleFileDrop } = useWorkbenchFileOperations(editor);

  // ── Keyboard Shortcuts ────────────────────────────────────────────────
  useWorkbenchKeyboard(handleLoadOmegaProject, ui.setIsCommandPaletteOpen);

  // ── Blueprints ────────────────────────────────────────────────────────
  const { userBlueprints, handleSaveGroupAsBlueprint, handleSaveGroupAsBlueprintFromNodeId, addUserBlueprintEntry } = useGroupBlueprint(editor);
  const { handleSaveCellAsBlueprint } = useCellBlueprint(manifest, state.selectedNodeId, editor);

  const isGalleryOpen = state.blueprintGalleryOpen;
  const setIsGalleryOpen = (open?: boolean) => {
    if (typeof open === 'boolean') {
      if (open !== state.blueprintGalleryOpen) actions.toggleUIState('blueprintGalleryOpen');
    } else {
      actions.toggleUIState('blueprintGalleryOpen');
    }
  };

  const ghostPreview = useGhostPreview();
  const ghostCoordination = useWorkbenchGhostCoordination(ghostPreview, editor, manifest);
  const blueprintActions = useWorkbenchBlueprintActions(
    editor as Parameters<typeof useWorkbenchBlueprintActions>[0],
    addUserBlueprintEntry, handleSaveGroupAsBlueprintFromNodeId,
    manifest, ghostPreview, setIsGalleryOpen,
  );

  // ── Grid ──────────────────────────────────────────────────────────────
  const grid = useWorkbenchGrid(manifest, updateManifest);

  // ── Audit & Diagnostics ───────────────────────────────────────────────
  const { auditResult } = useAudit(manifest, contract);
  const { tabDiagnostics, structuralDiagnostics, handleDiagnosticsUpdate } = useTabDiagnostics(manifest, contract as OMEGA_Contract);

  const totalErrors = structuralDiagnostics
    ? structuralDiagnostics.errorCount + Object.values(tabDiagnostics).reduce((s, d) => s + d.errorCount, 0)
    : Object.values(tabDiagnostics).reduce((s, d) => s + d.errorCount, 0);

  const totalWarnings = structuralDiagnostics
    ? structuralDiagnostics.warningCount + Object.values(tabDiagnostics).reduce((s, d) => s + d.warningCount, 0)
    : Object.values(tabDiagnostics).reduce((s, d) => s + d.warningCount, 0);

  // ── Tab Sync ──────────────────────────────────────────────────────────
  const activeTabId = state.panesById[state.focusedPaneId].activeTabId;
  const activeTab = activeTabId ? state.tabsById[activeTabId] : null;
  const { setActiveTab } = useWorkbenchTabSync(manifest, updateManifest, activeTab?.type, actions.focusTab as (paneId: string, tabId: string) => void);

  // ── Selection & Panels ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selection = useWorkbenchSelectionPanel(editor, state as any, actions as any, onOpenCellEditor, manifest);

  // ── Alignment Ghost ───────────────────────────────────────────────────
  const [alignGhostItems, setAlignGhostItems] = useState<GhostItem[]>([]);
  const [alignGhostType, setAlignGhostType] = useState<string>('');
  const handleGhostPreviewChange = (items: GhostItem[] | null, type?: string) => {
    setAlignGhostItems(items ?? []);
    setAlignGhostType(type ?? '');
  };

  const { handleAlign: handleMenuAlign, handleDistribute: handleMenuDistribute } = useAlignment(
    manifest, state.multiSelectedNodeIds, updateManifest, handleGhostPreviewChange,
  );

  // ── Copy/Paste Transform ──────────────────────────────────────────────
  const { handleCopyTransform, handlePasteTransform } = useTransformClipboard(
    selection.selectedItemId,
    { findItem: editor.findItem, updateItems: editor.updateItems, addLog: editor.addLog },
    manifest,
  );

  // ── Audit Navigator ───────────────────────────────────────────────────
  const { handleNavigateToIssue, highlightPath } = useAuditNavigator(
    manifest, selection.handleSelectItem, setActiveTab,
  );

  // ── Watchdog & Fonts ──────────────────────────────────────────────────
  const handleWatchdogUpdate = (content: string) => editor.handleBulkUpload([new File([content], 'auto-reload.acemm')]);
  const watchdog = useWatchdog(handleWatchdogUpdate);
  useDynamicFonts(manifest, editor.resolveAsset);

  // ── Diff / Deploy / Reset ─────────────────────────────────────────────
  const { handleCompareWithHistory, onDeploy, onReset } = useWorkbenchCompareDeploy(
    editor as Parameters<typeof useWorkbenchCompareDeploy>[0], actions as Parameters<typeof useWorkbenchCompareDeploy>[1], state,
  );

  // ── Entity CRUD ───────────────────────────────────────────────────────
  const { handleAddEntity, handleDuplicateItem, handleRemoveItem } = useEntityCrud(
    editor, selection.handleSelectItem, selection.selectedItemId,
  );

  // ── Clipboard (Copy/Cut/Paste) ──────────────────────────────────────
  const clipboardIds = useMemo(() => {
    if (state.multiSelectedNodeIds?.length > 0) return state.multiSelectedNodeIds;
    if (selection.selectedItemId) return [selection.selectedItemId];
    return [];
  }, [state.multiSelectedNodeIds, selection.selectedItemId]);

  const canCopy = clipboardIds.length > 0;
  const canCut = clipboardIds.length > 0;
  const [clipboardHasContent, setClipboardHasContent] = useState(
    () => editor.hasClipboardContent?.() ?? false
  );

  const handleClipboardChange = useCallback(() => {
    setClipboardHasContent(editor.hasClipboardContent?.() ?? false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.hasClipboardContent]);

  useEffect(() => {
    window.addEventListener('clipboard-storage-changed', handleClipboardChange);
    return () => window.removeEventListener('clipboard-storage-changed', handleClipboardChange);
  }, [handleClipboardChange]);

  const handleCopy = useCallback(() => {
    if (clipboardIds.length > 0) {
      editor.copyToClipboard(clipboardIds);
    }
  }, [editor, clipboardIds]);

  const handleCut = useCallback(() => {
    if (clipboardIds.length > 0) {
      editor.cutToClipboard(clipboardIds);
    }
  }, [editor, clipboardIds]);

  const handlePaste = useCallback((targetPos?: { x: number; y: number }) => {
    editor.pasteFromClipboard(targetPos);
  }, [editor]);

  // ── Export ────────────────────────────────────────────────────────────
  const { handleExportOmegaRack, handleExportContract } = useExportOperations(manifest, editor);

  // ── Numeric Modals ────────────────────────────────────────────────────
  const handleOpenNumericResize = () => {
    if (selection.selectedItemId) {
      editor.startTransaction?.('Numeric Resize');
      ui.setShowNumericResize(true);
    }
  };
  const handleOpenNumericRotate = () => {
    if (selection.selectedItemId) {
      editor.startTransaction?.('Numeric Rotate');
      ui.setShowNumericRotate(true);
    }
  };

  const handleRenameItem = useCallback((id: string) => {
    const item = editor.findItem(id);
    if (!item) return;
    const currentLabel = (item.meta?.label as string) || id;
    const newLabel = window.prompt(`Rename entity "${id}":`, currentLabel);
    if (newLabel !== null && newLabel.trim() !== '') {
      editor.updateItem(id, { meta: { ...item.meta, label: newLabel.trim() } });
    }
  }, [editor]);

  const handleBringToFront = useCallback((id: string) => {
    updateManifest((latestManifest) => {
      const tree = latestManifest.ui?.tree;
      if (!tree) return {};

      const existing = findNodeInTree(tree, id);
      if (!existing) return {};

      let maxZ = 0;
      const findMaxZ = (node: OmegaNode) => {
        if (node.layout?.zIndex && typeof node.layout.zIndex === 'number') {
          maxZ = Math.max(maxZ, node.layout.zIndex);
        }
        if (node.children) {
          node.children.forEach(findMaxZ);
        }
      };
      findMaxZ(tree);

      const zUpdate: Partial<OmegaNode> = {
        layout: { ...existing.layout, zIndex: maxZ + 1 }
      };
      const nextTree = updateNodeInTree(tree, id, zUpdate);

      return buildManifestFromTree(latestManifest, nextTree);
    }, `Bring to Front: ${id}`, true);
  }, [updateManifest]);

  const handleSendToBack = useCallback((id: string) => {
    updateManifest((latestManifest) => {
      const tree = latestManifest.ui?.tree;
      if (!tree) return {};

      const existing = findNodeInTree(tree, id);
      if (!existing) return {};

      let minZ = 0;
      const findMinZ = (node: OmegaNode) => {
        if (node.layout?.zIndex && typeof node.layout.zIndex === 'number') {
          minZ = Math.min(minZ, node.layout.zIndex);
        }
        if (node.children) {
          node.children.forEach(findMinZ);
        }
      };
      findMinZ(tree);

      const zUpdate: Partial<OmegaNode> = {
        layout: { ...existing.layout, zIndex: minZ - 1 }
      };
      const nextTree = updateNodeInTree(tree, id, zUpdate);

      return buildManifestFromTree(latestManifest, nextTree);
    }, `Send to Back: ${id}`, true);
  }, [updateManifest]);

  const handleSaveAsBlueprintById = useCallback((id: string) => {
    const item = editor.findItem(id);
    if (!item) return;

    if ('kind' in item && item.kind === 'group') {
      blueprintActions.handleSaveGroupFromId(id);
    } else {
      selection.handleSelectItem(id);
      handleSaveCellAsBlueprint(id);
    }
  }, [editor, blueprintActions, selection, handleSaveCellAsBlueprint]);

  const handleSelectAll = useCallback(() => {
    const tree = manifest.ui?.tree;
    if (!tree) return;
    const allIds = getAllIdsInTree(tree).filter(id => id !== tree.id && id !== 'MAIN_FACE');
    if (allIds.length > 0) {
      actions.setMultiSelectedNodes(allIds);
      if (allIds.length === 1) {
        selection.handleSelectItem(allIds[0]);
      } else {
        selection.handleSelectItem(null);
      }
    }
  }, [manifest, actions, selection]);

  // ── User Preferences (Phase 5.1) ─────────────────────────────────────
  const { preferences } = usePreferences();

  // ── Workspace Export/Import (Phase 5.5) ───────────────────────────────
  const { exportWorkspaceState, importWorkspaceState } = useWorkspaceExportImport(
    state, dispatch, preferences,
  );

  // ── Keyboard Shortcuts (composed) ─────────────────────────────────────
  useWorkbenchShortcuts(
    editor, selection.selectedItemId, state.multiSelectedNodeIds, selection.handleOpenCellEditor,
    {
      onTabFocus: (type) => actions.openTab({ id: `tab-${type}`, type: type as WorkbenchTabType, title: type.charAt(0).toUpperCase() + type.slice(1) }),
      onToggleGrid: grid.handleToggleGrid,
      onToggleGuides: grid.handleToggleGuides,
      isLiveMode: state.isLiveMode,
      onToggleWindow: actions.toggleWindow,
      onOpenHelp: () => actions.setHelpState(true),
      onOpenAbout: () => actions.toggleUIState('isAboutModalOpen'),
      onOpenConfig: selection.handleOpenConfig,
      onOpenAudit: selection.handleOpenAudit,
      onReset,
      onRemoveItem: handleRemoveItem,
      onDuplicateItem: handleDuplicateItem,
      onSetTool: ui.setActiveTool,
      activeTool: ui.activeTool,
      onUpdateItems: editor.updateItems,
      manifest,
      onOpenGallery: () => actions.toggleWindow('window_blueprints'),
      onToggleMiniMap: ui.handleToggleMiniMap,
      onOpenNumericResize: handleOpenNumericResize,
      onOpenNumericRotate: handleOpenNumericRotate,
      onCopyTransform: handleCopyTransform,
      onPasteTransform: handlePasteTransform,
      onSelectAll: handleSelectAll,
      onSelectItem: selection.handleSelectItem,
      onToggleCommandPalette: () => ui.setIsCommandPaletteOpen(prev => !prev),
      onRenameItem: handleRenameItem,
    },
    preferences.shortcutBindings,
  );

  // ── Trigger Upload ────────────────────────────────────────────────────
  const triggerUpload = (id: string) => document.getElementById(id)?.click();

  // ── Command Palette ───────────────────────────────────────────────────
  const cmd = useWorkbenchCommandPalette(
    manifest, editor as Parameters<typeof useWorkbenchCommandPalette>[1], actions as Parameters<typeof useWorkbenchCommandPalette>[2],
    { onDeploy, handleToggleGrid: grid.handleToggleGrid, handleToggleGuides: grid.handleToggleGuides, handleOpenConfig: selection.handleOpenConfig, handleOpenCellEditor: selection.handleOpenCellEditor, handleOpenAudit: selection.handleOpenAudit, onReset },
    selection.handleSelectItem,
  );

  // ── Available Binds ───────────────────────────────────────────────────
  const availableBinds = useWorkbenchAvailableBinds(contract);

  // ── Cell Library (no-op) ──────────────────────────────────────────────
  const setIsCellLibraryOpen = (_open: boolean) => {};

  // ── Drag Handlers ─────────────────────────────────────────────────────
  const dragHandlers = useWorkbenchDragHandlers(
    { setLayoutRatio: actions.setLayoutRatio, setPrimarySplitRatio: actions.setPrimarySplitRatio, setSecondarySplitRatio: actions.setSecondarySplitRatio },
    { ratio: state.layout.ratio, primarySplitRatio: state.primarySplitRatio, secondarySplitRatio: state.secondarySplitRatio },
  );

  // ── Diagnostic Handlers ───────────────────────────────────────────────
  const { handleDiagnosticClick, handleCaptureViewState } = useDiagnosticHandlers(
    { focusTab: actions.focusTab as (paneId: string, tabId: string) => void, captureTabViewState: actions.captureTabViewState },
    selection.handleSelectItem,
  );

  // ── File Drop ─────────────────────────────────────────────────────────
  const { isDragOver, dragHandlers: fileDropHandlers } = useFileDrop(handleFileDrop);

  // ── Batch ─────────────────────────────────────────────────────────────
  const batchHistory = useBatchHistory();
  const { handleBatchUngroup, handleBatchUndoGroup } = useBatchUngroup(manifest, updateManifest, editor);

  // ── Return ────────────────────────────────────────────────────────────
  return useMemo(() => ({
    state, actions, derived, editor, manifest, contract, updateManifest,
    activeTool: ui.activeTool, setActiveTool: ui.setActiveTool,
    showMiniMap: ui.showMiniMap, inspectorLevel: ui.inspectorLevel, setInspectorLevel: ui.setInspectorLevel,
    inspectorActiveSection: selection.inspectorActiveSection,
    showNumericResize: ui.showNumericResize, showNumericRotate: ui.showNumericRotate,
    setShowNumericResize: ui.setShowNumericResize, setShowNumericRotate: ui.setShowNumericRotate,
    isCommandPaletteOpen: ui.isCommandPaletteOpen, setIsCommandPaletteOpen: ui.setIsCommandPaletteOpen,
    isDirty, lastSavedTime,
    gridVisible: grid.gridVisible, showGuides: grid.showGuides,
    auditResult, totalErrors, totalWarnings,
    batchHistory, selectedItemId: selection.selectedItemId, isGalleryOpen,
    userBlueprints, handleSaveGroupAsBlueprint, handleSaveCellAsBlueprint,
    handleSaveGroupFromId: blueprintActions.handleSaveGroupFromId,
    handleSelectBlueprintFromPanel: blueprintActions.handleSelectBlueprintFromPanel,
    handleAltClickBlueprintFromPanel: blueprintActions.handleAltClickBlueprintFromPanel,
    handleApplyTemplate: blueprintActions.handleApplyTemplate,
    handleLoadAcepack: blueprintActions.handleLoadAcepack,
    handleSelectUserBlueprint: blueprintActions.handleSelectUserBlueprint,
    ghostPreview, handleGhostClick: ghostCoordination.handleGhostClick,
    handleGhostMouseMove: ghostCoordination.handleGhostMouseMove,
    handleGhostCancel: ghostCoordination.handleGhostCancel,
    handleSelectItem: selection.handleSelectItem, handleAddEntity, handleDuplicateItem, handleRemoveItem,
    handleExportOmegaRack, handleExportContract,
    handleOpenConfig: selection.handleOpenConfig, handleOpenAudit: selection.handleOpenAudit,
    handleOpenCellEditor: selection.handleOpenCellEditor,
    onDeploy, onReset, handleToggleMiniMap: ui.handleToggleMiniMap,
    handleToggleGrid: grid.handleToggleGrid, handleToggleGuides: grid.handleToggleGuides,
    handleOpenNumericResize, handleOpenNumericRotate,
    triggerUpload, handleImportDistilledJson, handleLoadOmegaProject,
    handleCompareWithHistory, handleDiagnosticClick, handleCaptureViewState,
    setActiveTab, handleNavigateToIssue, highlightPath,
    activeTab, watchdog,
    handleCopyTransform, handlePasteTransform,
    handleMenuAlign, handleMenuDistribute,
    handleCopy, handleCut, handlePaste, canCopy, canCut, canPaste: clipboardHasContent,
    alignGhostItems, alignGhostType, handleGhostPreviewChange,
    isDragOver, dragHandlers: fileDropHandlers,
    commandNodes: cmd.commandNodes, commandActions: cmd.commandActions,
    handleCommandPaletteSelectNode: cmd.handleCommandPaletteSelectNode,
    setIsGalleryOpen, selectedItem: selection.selectedItem,
    studioCell: selection.studioCell, availableBinds, setIsCellLibraryOpen,
    rackSections, handleToggleRackSection,
    handleDragRatio: dragHandlers.handleDragRatio,
    handleDragPrimarySplitRatio: dragHandlers.handleDragPrimarySplitRatio,
    handleDragSecondarySplitRatio: dragHandlers.handleDragSecondarySplitRatio,
    handleDragRatioEnd: dragHandlers.handleDragRatioEnd,
    tabDiagnostics, structuralDiagnostics, handleDiagnosticsUpdate,
    handleBatchUngroup, handleBatchUndoGroup,
    handleRenameItem, handleBringToFront, handleSendToBack, handleSaveAsBlueprintById, handleSelectAll,
    exportWorkspaceState, importWorkspaceState,
  }), [
    state, actions, derived, editor, manifest, contract, updateManifest,
    ui.activeTool, ui.setActiveTool, ui.showMiniMap, ui.inspectorLevel, ui.setInspectorLevel,
    ui.showNumericResize, ui.showNumericRotate, ui.setShowNumericResize, ui.setShowNumericRotate,
    ui.isCommandPaletteOpen, ui.setIsCommandPaletteOpen, ui.handleToggleMiniMap,
    selection.inspectorActiveSection, selection.selectedItemId, selection.handleSelectItem,
    selection.handleOpenConfig, selection.handleOpenAudit, selection.handleOpenCellEditor,
    selection.selectedItem, selection.studioCell,
    isDirty, lastSavedTime,
    grid.gridVisible, grid.showGuides, grid.handleToggleGrid, grid.handleToggleGuides,
    auditResult, totalErrors, totalWarnings,
    batchHistory, isGalleryOpen,
    userBlueprints, handleSaveGroupAsBlueprint, handleSaveCellAsBlueprint,
    blueprintActions.handleSaveGroupFromId,
    blueprintActions.handleSelectBlueprintFromPanel,
    blueprintActions.handleAltClickBlueprintFromPanel,
    blueprintActions.handleApplyTemplate,
    blueprintActions.handleLoadAcepack,
    blueprintActions.handleSelectUserBlueprint,
    ghostPreview, ghostCoordination.handleGhostClick,
    ghostCoordination.handleGhostMouseMove, ghostCoordination.handleGhostCancel,
    handleAddEntity, handleDuplicateItem, handleRemoveItem,
    handleExportOmegaRack, handleExportContract,
    onDeploy, onReset,
    handleOpenNumericResize, handleOpenNumericRotate,
    triggerUpload, handleImportDistilledJson, handleLoadOmegaProject,
    handleCompareWithHistory, handleDiagnosticClick, handleCaptureViewState,
    setActiveTab, handleNavigateToIssue, highlightPath,
    activeTab, watchdog,
    handleCopyTransform, handlePasteTransform,
    handleMenuAlign, handleMenuDistribute,
    handleCopy, handleCut, handlePaste, canCopy, canCut, clipboardHasContent,
    alignGhostItems, alignGhostType, handleGhostPreviewChange,
    isDragOver, fileDropHandlers,
    cmd.commandNodes, cmd.commandActions, cmd.handleCommandPaletteSelectNode,
    setIsGalleryOpen, availableBinds, setIsCellLibraryOpen,
    rackSections, handleToggleRackSection,
    dragHandlers.handleDragRatio, dragHandlers.handleDragPrimarySplitRatio,
    dragHandlers.handleDragSecondarySplitRatio, dragHandlers.handleDragRatioEnd,
    tabDiagnostics, structuralDiagnostics, handleDiagnosticsUpdate,
    handleBatchUngroup, handleBatchUndoGroup,
    handleRenameItem, handleBringToFront, handleSendToBack, handleSaveAsBlueprintById, handleSelectAll,
    exportWorkspaceState, importWorkspaceState,
  ]);
}
