'use client';

/**
 * @purpose Gestiona el árbol UCA filtrado dentro de un VirtualRack, delegando la renderización a UniversalRenderer.
 * @purpose_en Renders the filtered UCA tree inside a VirtualRack, delegating rendering to UniversalRenderer.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:3,sig:shvue2
 * @lastUpdated 2026-06-20T18:48:57.567Z
 */

import { memo, useMemo } from 'react';
import type { OMEGA_Manifest, HybridEntityUpdate, OmegaNode } from '@/omega-ui-core/types/manifest';
import { UniversalRenderer } from '@/omega-ui-core/renderers/UniversalRenderer';
import { filterTree } from '../../utils/rackUtils';

export interface RenderedRackTreeProps {
  manifest: OMEGA_Manifest;
  hiddenNodeIds: string[];
  resolveAsset: ((ref: string | undefined) => string | undefined) | undefined;
  selectedItemId: string | null;
  multiSelectedIds: string[];
  onSelectItem: (id: string | null) => void;
  onSelectMultiple: (ids: string[]) => void;
  onUpdateItem: (id: string, updates: HybridEntityUpdate) => void;
  onUpdateItems: ((updatesMap: Record<string, Partial<OmegaNode>>) => void) | undefined;
  runtimeValues: Record<string, number>;
  lockedNodeIds: string[];
  isLiveMode: boolean;
  updateValue: (id: string, value: number) => void;
  zoom: number;
  pan: { x: number; y: number } | undefined;
  activeDragOffset: { x: number; y: number; draggedNodeId: string } | null;
  setActiveDragOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number; draggedNodeId: string } | null>>;
  activeResizeOffset: { x: number; y: number; width: number; height: number; resizedNodeId: string } | null;
  setActiveResizeOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number; width: number; height: number; resizedNodeId: string } | null>>;
  activeRotationOffset?: { angle: number; rotatedNodeId: string } | null;
  setActiveRotationOffset?: React.Dispatch<React.SetStateAction<{ angle: number; rotatedNodeId: string } | null>>;
  startTransaction: ((label: string) => void) | undefined;
  commitTransaction: (() => void) | undefined;
  activeTool: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null | undefined;
}

function RenderedRackTreeInner({
  manifest,
  hiddenNodeIds,
  resolveAsset,
  selectedItemId,
  multiSelectedIds,
  onSelectItem,
  onSelectMultiple,
  onUpdateItem,
  onUpdateItems,
  runtimeValues,
  lockedNodeIds,
  isLiveMode,
  updateValue,
  zoom,
  pan,
  activeDragOffset,
  setActiveDragOffset,
  activeResizeOffset,
  setActiveResizeOffset,
  activeRotationOffset = null,
  setActiveRotationOffset = () => {},
  startTransaction,
  commitTransaction,
  activeTool,
}: RenderedRackTreeProps) {
  const rootTree = manifest.ui?.tree;
  if (!rootTree) return null;
  const filteredTree = filterTree(rootTree, hiddenNodeIds);
  if (!filteredTree) return null;

  const debugContext = useMemo(() => ({
    enabled: manifest.ui?.ucaDebug?.enabled || false,
    showLabels: manifest.ui?.ucaDebug?.showLabels !== false,
    hideDecorative: manifest.ui?.ucaDebug?.hideDecorative || false,
    showCADOverlay: manifest.ui?.ucaDebug?.showCADOverlay || false,
    selectedId: selectedItemId,
    multiSelectedIds,
    onSelect: onSelectItem,
    onSelectMultiple,
    onUpdateNode: onUpdateItem,
    onUpdateNodes: onUpdateItems,
    runtimeValues,
    lockedNodeIds,
    isLiveMode,
    onUpdateRuntimeValue: updateValue,
    zoom,
    pan,
    activeDragOffset,
    onUpdateDragOffset: setActiveDragOffset,
    activeResizeOffset,
    onUpdateResizeOffset: setActiveResizeOffset,
    activeRotationOffset,
    onUpdateRotationOffset: setActiveRotationOffset,
    startTransaction,
    commitTransaction,
    activeTool,
  }), [
    manifest.ui?.ucaDebug?.enabled,
    manifest.ui?.ucaDebug?.showLabels,
    manifest.ui?.ucaDebug?.hideDecorative,
    manifest.ui?.ucaDebug?.showCADOverlay,
    selectedItemId,
    multiSelectedIds,
    onSelectItem,
    onSelectMultiple,
    onUpdateItem,
    onUpdateItems,
    runtimeValues,
    lockedNodeIds,
    isLiveMode,
    updateValue,
    zoom,
    pan,
    activeDragOffset,
    setActiveDragOffset,
    activeResizeOffset,
    setActiveResizeOffset,
    activeRotationOffset,
    setActiveRotationOffset,
    startTransaction,
    commitTransaction,
    activeTool,
  ]);

  return (
    <UniversalRenderer
      node={filteredTree}
      manifest={manifest}
      catalog={manifest.moduleTemplates || {}}
      resolveAsset={resolveAsset}
      debugContext={debugContext}
    />
  );
}

const RenderedRackTree = memo(RenderedRackTreeInner);
export default RenderedRackTree;
