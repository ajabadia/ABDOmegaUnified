'use client';

/**
 * @purpose Gestiona la selección de nodos y la apertura de paneles contextuales.
 * @purpose_en Manages node selection and contextual panel opening.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:new
 * @lastUpdated 2026-06-22
 */

import { useCallback, useMemo, useState } from 'react';
import type { OMEGA_Manifest, OmegaNode, ManifestEntity } from '@/omega-ui-core/types/manifest';

export interface WorkbenchSelectionPanel {
  selectedItemId: string | null;
  inspectorActiveSection: string | undefined;
  handleSelectItem: (id: string | null) => void;
  handleOpenConfig: () => void;
  handleOpenAudit: () => void;
  handleOpenCellEditor: () => void;
  selectedItem: OmegaNode | ManifestEntity | OMEGA_Manifest | null;
  studioCell: ManifestEntity | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export function useWorkbenchSelectionPanel(
  editor: AnyRecord,
  state: AnyRecord,
  actions: AnyRecord,
  onOpenCellEditor: (() => void) | undefined,
  manifest: OMEGA_Manifest,
): WorkbenchSelectionPanel {
  const selectedItemId = state.selectedNodeId;
  const [inspectorActiveSection, setInspectorActiveSection] = useState<string | undefined>(undefined);

  const handleSelectItem = useCallback((id: string | null) => {
    actions.setSelectedNode(id);
    setInspectorActiveSection(undefined);
    if (id) {
      if (state.isRightPanelCollapsed) {
        actions.toggleRightPanel();
      }
      if (!state.window_properties) {
        actions.toggleWindow('window_properties');
      }
    }
  }, [actions, state.isRightPanelCollapsed, state.window_properties]);

  const handleOpenConfig = useCallback(() => {
    if (state.isRightPanelCollapsed) actions.toggleRightPanel();
    if (!state.window_rack_properties) actions.toggleWindow('window_rack_properties');
    handleSelectItem(null);
    setInspectorActiveSection('globals');
  }, [actions, state.isRightPanelCollapsed, state.window_rack_properties, handleSelectItem]);

  const handleOpenAudit = useCallback(() => {
    if (state.isRightPanelCollapsed) actions.toggleRightPanel();
    if (!state.window_compliance) actions.toggleWindow('window_compliance');
  }, [actions, state.isRightPanelCollapsed, state.window_compliance]);

  const handleOpenCellEditor = useMemo(
    () => onOpenCellEditor || (() => {
      if (state.selectedNodeId) {
        actions.setStudioMode(true, state.selectedNodeId);
      }
    }),
    [onOpenCellEditor, state.selectedNodeId, actions],
  );

  const selectedItem = useMemo((): OmegaNode | ManifestEntity | OMEGA_Manifest | null =>
    selectedItemId
      ? editor.findItem(selectedItemId) ?? null
      : (state.selectedNodeId
        ? (manifest.ui?.controls as ManifestEntity[])?.find((c: ManifestEntity) => c.id === state.selectedNodeId)
          || (manifest.ui?.jacks as ManifestEntity[])?.find((c: ManifestEntity) => c.id === state.selectedNodeId)
        : manifest) || null,
    [selectedItemId, state.selectedNodeId, editor, manifest],
  );

  const studioCell = useMemo((): ManifestEntity | undefined => {
    if (!state.studioMode.isOpen || !state.studioMode.cellId) return undefined;
    return editor.findItem(state.studioMode.cellId) as ManifestEntity | undefined;
  }, [state.studioMode.isOpen, state.studioMode.cellId, editor]);

  return {
    selectedItemId,
    inspectorActiveSection,
    handleSelectItem,
    handleOpenConfig,
    handleOpenAudit,
    handleOpenCellEditor,
    selectedItem,
    studioCell,
  };
}
