'use client';

/**
 * @purpose Tipos del contrato del WorkbenchContainer (extraído de useWorkbenchContainer.ts en Fase 4).
 * @purpose_en WorkbenchContainer contract types (extracted from useWorkbenchContainer.ts in Fase 4).
 * @refactorable false
 * @classification Type Definition
 * @complexity Medium
 * @lastUpdated 2026-07-31
 */

import type { ManifestEntity, ModuleTemplate, OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { V2BlueprintData, BlueprintDefinition } from '@/omega-ui-core/types';
import type { GhostItem, AlignType, DistType } from '@/features/manifest-editor/utils/alignmentConstants';
import type { CommandPaletteNode, CommandPaletteAction } from '../components/layout/CommandPalette';
import type { useWorkbenchState } from '../hooks/useWorkbenchState';
import type { useManifestEditor } from '../hooks/useManifestEditor';
import type { useAudit } from '../hooks/useAudit';
import type { useBatchHistory } from '../hooks/useBatchHistory';
import type { useGroupBlueprint } from '../hooks/useGroupBlueprint';
import type { useCellBlueprint } from '../hooks/useCellBlueprint';
import type { useEntityCrud } from '../hooks/useEntityCrud';
import type { useExportOperations } from '../hooks/useExportOperations';
import type { useWorkbenchFileOperations } from '../hooks/useWorkbenchFileOperations';
import type { useAuditNavigator } from '../hooks/useAuditNavigator';
import type { useWatchdog } from '../hooks/useWatchdog';
import type { useRackSections } from '../hooks/useRackSections';
import type { useTabDiagnostics } from '../hooks/useTabDiagnostics';
import type { useBatchUngroup } from '../hooks/useBatchUngroup';
import type { useFileDrop } from '../hooks/useFileDrop';
import type { useGhostPreview } from '../hooks/useGhostPreview';

export interface WorkbenchContainerLogic {
  // Core state & actions
  state: ReturnType<typeof useWorkbenchState>['state'];
  actions: ReturnType<typeof useWorkbenchState>['actions'];
  derived: ReturnType<typeof useWorkbenchState>['derived'];
  editor: ReturnType<typeof useManifestEditor>;
  manifest: OMEGA_Manifest;
  contract: ReturnType<typeof useManifestEditor>['contract'];
  updateManifest: ReturnType<typeof useManifestEditor>['updateManifest'];

  // UI state
  activeTool: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null;
  setActiveTool: React.Dispatch<React.SetStateAction<'select' | 'marquee' | 'add' | 'studio' | 'transform' | null>>;
  showMiniMap: boolean;
  inspectorLevel: 'simple' | 'medium' | 'advanced';
  setInspectorLevel: React.Dispatch<React.SetStateAction<'simple' | 'medium' | 'advanced'>>;
  inspectorActiveSection: string | undefined;
  showNumericResize: boolean;
  showNumericRotate: boolean;
  setShowNumericResize: React.Dispatch<React.SetStateAction<boolean>>;
  setShowNumericRotate: React.Dispatch<React.SetStateAction<boolean>>;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isDirty: boolean;
  lastSavedTime: string | null;

  // Grid
  gridVisible: boolean;
  showGuides: boolean;

  // Audit
  auditResult: ReturnType<typeof useAudit>['auditResult'];
  totalErrors: number;
  totalWarnings: number;

  // Batch history
  batchHistory: ReturnType<typeof useBatchHistory>;
  selectedItemId: string | null;
  isGalleryOpen: boolean;

  // Blueprints
  userBlueprints: ReturnType<typeof useGroupBlueprint>['userBlueprints'];
  handleSaveGroupAsBlueprint: ReturnType<typeof useGroupBlueprint>['handleSaveGroupAsBlueprint'];
  handleSaveCellAsBlueprint: ReturnType<typeof useCellBlueprint>['handleSaveCellAsBlueprint'];
  handleSaveGroupFromId: (id: string) => void;
  handleSelectBlueprintFromPanel: (v2data: V2BlueprintData) => void;
  handleAltClickBlueprintFromPanel: (v2data: V2BlueprintData) => void;
  handleApplyTemplate: (template: ModuleTemplate) => void;
  handleLoadAcepack: () => void;
  handleSelectUserBlueprint: (blueprint: BlueprintDefinition) => void;

  // Ghost preview
  ghostPreview: ReturnType<typeof useGhostPreview>;
  handleGhostClick: (x: number, y: number) => void;
  handleGhostMouseMove: (rackX: number, rackY: number) => void;
  handleGhostCancel: () => void;

  // Selection & entity CRUD
  handleSelectItem: (id: string | null) => void;
  handleAddEntity: ReturnType<typeof useEntityCrud>['handleAddEntity'];
  handleDuplicateItem: ReturnType<typeof useEntityCrud>['handleDuplicateItem'];
  handleRemoveItem: ReturnType<typeof useEntityCrud>['handleRemoveItem'];

  // Export
  handleExportOmegaRack: ReturnType<typeof useExportOperations>['handleExportOmegaRack'];
  handleExportContract: ReturnType<typeof useExportOperations>['handleExportContract'];

  // Actions
  handleOpenConfig: () => void;
  handleOpenAudit: () => void;
  handleOpenCellEditor: () => void;
  onDeploy: () => Promise<void>;
  onReset: () => void;
  handleToggleMiniMap: () => void;
  handleToggleGrid: () => void;
  handleToggleGuides: () => void;
  handleOpenNumericResize: () => void;
  handleOpenNumericRotate: () => void;
  triggerUpload: (id: string) => void;
  handleImportDistilledJson: ReturnType<typeof useWorkbenchFileOperations>['handleImportDistilledJson'];
  handleLoadOmegaProject: ReturnType<typeof useWorkbenchFileOperations>['handleLoadOmegaProject'];
  handleCompareWithHistory: (index: number) => void;
  handleDiagnosticClick: (tabId: string, diagRaw: unknown) => void;
  handleCaptureViewState: (tabId: string, viewState: unknown) => void;
  setActiveTab: (tabId: string) => void;
  handleNavigateToIssue: ReturnType<typeof useAuditNavigator>['handleNavigateToIssue'];
  highlightPath: string | null;
  activeTab: ReturnType<typeof useWorkbenchState>['state']['tabsById'][string] | null;
  watchdog: ReturnType<typeof useWatchdog>;

  // Transform
  handleCopyTransform: () => void;
  handlePasteTransform: () => void;
  handleMenuAlign: (type: AlignType) => void;
  handleMenuDistribute: (type: DistType) => void;

  // Clipboard (Copy/Cut/Paste)
  handleCopy: () => void;
  handleCut: () => void;
  handlePaste: (targetPos?: { x: number; y: number }) => void;
  canCopy: boolean;
  canCut: boolean;
  canPaste: boolean;

  // Extended actions
  handleSelectAll: () => void;
  handleRenameItem: (id: string) => void;
  handleBringToFront: (id: string) => void;
  handleSendToBack: (id: string) => void;
  handleSaveAsBlueprintById: (id: string) => void;

  setIsCellLibraryOpen: (open: boolean) => void;

  // Alignment ghost preview
  alignGhostItems: GhostItem[];
  alignGhostType: string;
  handleGhostPreviewChange: (items: GhostItem[] | null, type?: string) => void;

  // Dialogs & windows
  isDragOver: boolean;
  dragHandlers: ReturnType<typeof useFileDrop>['dragHandlers'];
  commandNodes: CommandPaletteNode[];
  commandActions: CommandPaletteAction[];
  handleCommandPaletteSelectNode: (nodeId: string) => void;
  setIsGalleryOpen: (open?: boolean) => void;
  selectedItem: OmegaNode | ManifestEntity | OMEGA_Manifest | null;
  studioCell: ManifestEntity | undefined;
  availableBinds: string[];
  rackSections: ReturnType<typeof useRackSections>['rackSections'];
  handleToggleRackSection: ReturnType<typeof useRackSections>['handleToggleRackSection'];
  handleDragRatio: (delta: number) => void;
  handleDragPrimarySplitRatio: (delta: number) => void;
  handleDragSecondarySplitRatio: (delta: number) => void;
  handleDragRatioEnd: () => void;
  tabDiagnostics: ReturnType<typeof useTabDiagnostics>['tabDiagnostics'];
  structuralDiagnostics: ReturnType<typeof useTabDiagnostics>['structuralDiagnostics'];
  handleDiagnosticsUpdate: ReturnType<typeof useTabDiagnostics>['handleDiagnosticsUpdate'];
  handleBatchUngroup: ReturnType<typeof useBatchUngroup>['handleBatchUngroup'];
  handleBatchUndoGroup: ReturnType<typeof useBatchUngroup>['handleBatchUndoGroup'];

  // Workspace export/import (Phase 5.5)
  exportWorkspaceState: () => void;
  importWorkspaceState: (file: File) => Promise<void>;
}
