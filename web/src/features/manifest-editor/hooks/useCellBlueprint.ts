'use client';

/**
 * @purpose Gestiona la creación y exportación de una célula como un plan en el editor de manifesto OMEGA.
 * @purpose_en Manages the creation and export of a cell as a blueprint in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:3,imports:4,sig:1qiebmv
 * @lastUpdated 2026-06-15T13:12:24.945Z
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest, ModuleTemplate } from '@/omega-ui-core/types/manifest';
import { toast } from '@/features/manifest-editor/utils/toast';
import { findNodeInTree } from './entities/ucaInspectorAdapter';

// ── Types ──────────────────────────────────────────────────────────────

export interface CellBlueprintEditor {
  addLog: (msg: string) => void;
  registerTemplate: (template: ModuleTemplate) => void;
  exportCellAsBlueprint?: (nodeId: string) => void;
}

export interface UseCellBlueprintResult {
  handleSaveCellAsBlueprint: (explicitId?: string) => void;
}

// ── Hook ───────────────────────────────────────────────────────────────

/**
 * useCellBlueprint — saves the currently selected cell as a blueprint.
 *
 * Extracted from WorkbenchContainer.tsx Phase 39.
 * Serializes the selected cell as a ModuleTemplate, registers it in
 * `manifest.moduleTemplates`, and optionally exports a physical .acepack file.
 *
 * Assumes the manifest has a UCA tree (manifest.ui.tree). Legacy flat-list
 * manifests without a tree will log an error and return early.
 */
export function useCellBlueprint(
  manifest: OMEGA_Manifest,
  selectedNodeId: string | null,
  editor: CellBlueprintEditor,
): UseCellBlueprintResult {
  const handleSaveCellAsBlueprint = useCallback((explicitId?: string) => {
    const targetId = explicitId || selectedNodeId;
    if (!targetId) {
      editor.addLog('[ERROR] No cell selected to save as blueprint.');
      return;
    }

    const tree = manifest.ui?.tree;
    if (!tree) {
      editor.addLog('[ERROR] No UCA tree found in manifest. Cannot save blueprint.');
      return;
    }

    const selectedNode = findNodeInTree(tree, targetId);
    if (!selectedNode) {
      editor.addLog(`[ERROR] Cell ${targetId} not found in UCA tree.`);
      return;
    }

    const blueprintId = `bp_${selectedNode.id}_${Date.now().toString(36)}`;
    const labelFromMeta = typeof selectedNode.meta?.label === 'string'
      ? (selectedNode.meta.label as string)
      : null;
    const template: ModuleTemplate = {
      id: selectedNode.id,
      label: labelFromMeta || selectedNode.id,
      category: selectedNode.kind === 'face'
        ? 'structure'
        : selectedNode.kind === 'container' || selectedNode.kind === 'group'
          ? 'composite'
          : 'control',
      baseNode: selectedNode,
      description: `Cell captured from rack as blueprint ${blueprintId}`,
      version: '1.0.0',
      family: 'user-saved',
      slots: [],
    };

    editor.registerTemplate(template);
    editor.exportCellAsBlueprint?.(targetId);
    toast.success(`Cell saved as blueprint: ${labelFromMeta || selectedNode.id}`);
  }, [manifest, selectedNodeId, editor]);

  return { handleSaveCellAsBlueprint };
}
