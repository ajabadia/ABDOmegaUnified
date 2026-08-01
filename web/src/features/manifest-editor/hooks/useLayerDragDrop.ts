/**
 * @purpose Gestiona la funcionalidad de arrastre y soltar para nodos de capas en el editor de manifesto OMEGA.
 * @purpose_en Manages drag-and-drop functionality for layer nodes in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:18n6x3y
 * @lastUpdated 2026-06-19T22:20:26.466Z
 */

import { useState, useCallback, useEffect } from 'react';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';
import type { FlatTreeItem, DropTarget } from '@/features/manifest-editor/components/inspector/LayerRow';
import { ROW_HEIGHT } from '@/features/manifest-editor/components/inspector/layersPanelUtils';
import { findNodeInTree } from '@/features/manifest-editor/hooks/entities/ucaInspectorAdapter';

interface UseLayerDragDropProps {
  flatItems: FlatTreeItem[];
  tree: OmegaNode | undefined;
  onMoveNode?: ((sourceId: string, targetParentId: string, index?: number) => void) | undefined;
  findParentId: (targetId: string) => string | undefined;
  listRef: { current: { element: HTMLElement | null } | null };
}

interface UseLayerDragDropReturn {
  dragGhost: { nodeId: string; color: string; label: string; x: number; y: number } | null;
  dropTarget: DropTarget | null;
  handleDragGhostStart: (nodeId: string, color: string, label: string, clientX: number, clientY: number) => void;
  handleTreeDragOver: (e: React.DragEvent) => void;
  handleTreeDrop: (e: React.DragEvent) => void;
}

export function useLayerDragDrop({
  flatItems,
  tree,
  onMoveNode,
  findParentId,
  listRef,
}: UseLayerDragDropProps): UseLayerDragDropReturn {
  const [dragGhost, setDragGhost] = useState<{
    nodeId: string; color: string; label: string; x: number; y: number;
  } | null>(null);

  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const handleDragGhostStart = useCallback((nodeId: string, color: string, label: string, clientX: number, clientY: number) => {
    setDragGhost({ nodeId, color, label, x: clientX, y: clientY });
  }, []);

  const handleDragGhostEnd = useCallback(() => {
    setDragGhost(null);
    setDropTarget(null);
  }, []);

  const handleTreeDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const containerRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!containerRect || flatItems.length === 0) return;
    const scrollEl = listRef.current?.element;
    const currentScrollOffset = scrollEl?.scrollTop ?? 0;
    const relativeY = e.clientY - containerRect.top;
    const absoluteY = relativeY + currentScrollOffset;
    const rowIndex = Math.floor(absoluteY / ROW_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(rowIndex, flatItems.length - 1));
    const targetItem = flatItems[clampedIndex];
    if (!targetItem) return;
    const rowOffset = absoluteY - clampedIndex * ROW_HEIGHT;
    let position: 'top' | 'bottom' | 'inside';
    if (rowOffset < ROW_HEIGHT * 0.25) position = 'top';
    else if (rowOffset > ROW_HEIGHT * 0.75) position = 'bottom';
    else position = targetItem.hasChildren ? 'inside' : 'bottom';
    setDropTarget({ rowIndex: clampedIndex, position, nodeId: targetItem.id });
  }, [flatItems, listRef]);

  const handleTreeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || !dropTarget || !onMoveNode || !tree) {
      handleDragGhostEnd();
      return;
    }
    const targetNode = findNodeInTree(tree, dropTarget.nodeId);
    if (!targetNode || sourceId === dropTarget.nodeId) {
      handleDragGhostEnd();
      return;
    }
    const isContainer = targetNode.kind === 'container' || targetNode.kind === 'rack' ||
      targetNode.kind === 'face' || targetNode.kind === 'group';
    if (dropTarget.position === 'inside' && isContainer) {
      onMoveNode(sourceId, dropTarget.nodeId, 0);
    } else {
      const parentId = findParentId(dropTarget.nodeId);
      if (parentId) {
        const parentNode = findNodeInTree(tree, parentId);
        if (parentNode?.children) {
          const currentIdx = parentNode.children.findIndex((c: OmegaNode) => c.id === dropTarget.nodeId);
          const targetIdx = dropTarget.position === 'top' ? currentIdx : currentIdx + 1;
          onMoveNode(sourceId, parentId, targetIdx);
        }
      }
    }
    handleDragGhostEnd();
  }, [dropTarget, onMoveNode, tree, findParentId, handleDragGhostEnd]);

  // Document-level ghost drag listeners
  useEffect(() => {
    if (!dragGhost) return;
    const handleDragOver = (e: DragEvent) => {
      setDragGhost((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    };
    const handleDragEnd = () => { setDragGhost(null); setDropTarget(null); };
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('drop', handleDragEnd);
    return () => {
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('drop', handleDragEnd);
    };
  }, [!!dragGhost]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    dragGhost,
    dropTarget,
    handleDragGhostStart,
    handleTreeDragOver,
    handleTreeDrop,
  };
}
