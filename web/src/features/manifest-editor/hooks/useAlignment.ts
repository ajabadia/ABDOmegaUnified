'use client';

/**
 * @purpose Gestiona la alineación y distribución de nodos seleccionados en el editor de manifesto OMEGA, incluyendo previsualización fantasma y atajos de teclado.
 * @purpose_en Manages alignment and distribution of selected nodes in the OMEGA manifest editor, including ghost preview and keyboard shortcuts.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:2,imports:4,sig:1sayiqn
 * @lastUpdated 2026-06-20T10:48:40.065Z
 */

import { useCallback, useEffect } from 'react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import {
  type AlignType,
  type DistType,
  type GhostItem,
  type UpdateManifestFn,
  SHORTCUT_TO_ALIGN,
  GHOST_TYPE_MAP,
} from '@/features/manifest-editor/utils/alignmentConstants';
import {
  gatherPositions,
  computeAlignedPositions,
  computeDistributedPositions,
  computeDistributedBothPositions,
  applyPositionBatch,
} from '@/features/manifest-editor/utils/alignmentUtils';

// ── Hook interface ─────────────────────────────────────────────────────

export interface UseAlignmentResult {
  showGhostPreview: (type: string | null) => void;
  hideGhostPreview: () => void;
  handleAlign: (type: AlignType) => void;
  handleDistribute: (type: DistType) => void;
  handleDistributeBoth: () => void;
  canAlign: boolean;
  canDistribute: boolean;
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useAlignment(
  manifest: OMEGA_Manifest,
  selectedIds: string[],
  onUpdateManifest: UpdateManifestFn | undefined,
  onGhostPreviewChange?: ((items: GhostItem[] | null, alignType?: string) => void) | undefined,
): UseAlignmentResult {

  // ── Ghost Preview ──────────────────────────────────────────────────
  const showGhostPreview = useCallback((type: string | null) => {
    if (!type || selectedIds.length < 2 || !manifest.ui?.tree) {
      onGhostPreviewChange?.(null);
      return;
    }
    const rootTree = manifest.ui.tree;
    const items = gatherPositions(rootTree, selectedIds);
    if (items.length === 0) {
      onGhostPreviewChange?.(null);
      return;
    }
    let newPositions: Map<string, { x: number; y: number }>;
    if (type === 'dist-h' || type === 'dist-v') {
      newPositions = computeDistributedPositions(items, type as DistType);
    } else {
      newPositions = computeAlignedPositions(items, type as AlignType);
    }
    const ghostList: GhostItem[] = items
      .filter(item => newPositions.has(item.id))
      .map(item => {
        const pos = newPositions.get(item.id)!;
        return { id: item.id, x: pos.x, y: pos.y, w: item.w, h: item.h };
      });
    if (ghostList.length === 0) {
      onGhostPreviewChange?.(null);
      return;
    }
    onGhostPreviewChange?.(ghostList, GHOST_TYPE_MAP[type] || type);
  }, [manifest, selectedIds, onGhostPreviewChange]);

  const hideGhostPreview = useCallback(() => {
    onGhostPreviewChange?.(null);
  }, [onGhostPreviewChange]);

  // ── Alignment actions ──────────────────────────────────────────────
  const handleAlign = useCallback((type: AlignType) => {
    if (selectedIds.length < 2) return;
    if (!onUpdateManifest) return;
    const rootTree = manifest.ui?.tree;
    if (!rootTree) return;
    const items = gatherPositions(rootTree, selectedIds);
    const newPositions = computeAlignedPositions(items, type);
    applyPositionBatch(newPositions, onUpdateManifest, `Align ${type}`);
  }, [manifest, selectedIds, onUpdateManifest]);

  const handleDistribute = useCallback((type: DistType) => {
    if (selectedIds.length < 2) return;
    if (!onUpdateManifest) return;
    const rootTree = manifest.ui?.tree;
    if (!rootTree) return;
    const items = gatherPositions(rootTree, selectedIds);
    const newPositions = computeDistributedPositions(items, type);
    applyPositionBatch(newPositions, onUpdateManifest, `Distribute ${type}`);
  }, [manifest, selectedIds, onUpdateManifest]);

  // ── Distribute both axes (Ctrl+Alt+E) ──────────────────────────────
  const handleDistributeBoth = useCallback(() => {
    if (selectedIds.length < 2) return;
    if (!onUpdateManifest) return;
    const rootTree = manifest.ui?.tree;
    if (!rootTree) return;
    const items = gatherPositions(rootTree, selectedIds);
    const newPositions = computeDistributedBothPositions(items);
    applyPositionBatch(newPositions, onUpdateManifest, 'Distribute evenly');
  }, [manifest, selectedIds, onUpdateManifest]);

  // ── Keyboard shortcuts: Ctrl+Shift + letter ────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active) {
        const tag = active.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || (active as HTMLElement).isContentEditable) return;
      }
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey) return;
      const key = e.key.toLowerCase();
      const alignType = SHORTCUT_TO_ALIGN[key];
      if (!alignType) return;

      e.preventDefault();
      e.stopPropagation();

      if (alignType === 'dist-both') {
        handleDistributeBoth();
      } else if (alignType === 'dist-h' || alignType === 'dist-v') {
        handleDistribute(alignType);
      } else {
        handleAlign(alignType);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAlign, handleDistribute, handleDistributeBoth]);

  // ── Keyboard shortcut: Ctrl+Alt+E for Distribute Evenly (both axes) ─
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.altKey || e.shiftKey) return;
      const key = e.key.toLowerCase();
      if (key !== 'e') return;
      e.preventDefault();
      e.stopPropagation();
      handleDistributeBoth();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDistributeBoth]);

  const canAlign = selectedIds.length >= 2;
  const canDistribute = selectedIds.length >= 2;

  return {
    showGhostPreview,
    hideGhostPreview,
    handleAlign,
    handleDistribute,
    handleDistributeBoth,
    canAlign,
    canDistribute,
  };
}
