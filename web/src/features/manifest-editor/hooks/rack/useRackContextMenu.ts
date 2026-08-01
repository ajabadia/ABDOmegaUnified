'use client';

/**
 * @purpose Gestiona el estado y comportamiento del menú de contexto del rack, incluyendo abrir/cerrar, detectar grupos padres y habilitar/deshabilitar opciones de grupo/ungroup.
 * @purpose_en Manages the state and behavior of the rack context menu, including opening/closing, detecting parent groups, and enabling/disabling group/ungroup options.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:3,imports:3,sig:9cw8lc
 * @lastUpdated 2026-06-20T10:47:32.067Z
 */

import { useState, useCallback, useMemo } from 'react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { findNodeInTree, findParentInTree } from '@/omega-ui-core/uca/treeUtils';

export interface ContextMenuState {
  x: number;
  y: number;
  targetId: string | null;
  multiSelectedIds: string[];
  rackX?: number;
  rackY?: number;
}

export interface RackContextMenuResult {
  contextMenu: ContextMenuState | null;
  openContextMenu: (e: React.MouseEvent, multiSelectedIds: string[], onSelectItem: (id: string | null) => void, rackX?: number, rackY?: number) => void;
  closeContextMenu: () => void;
  targetGroupId: string | undefined;
  isGroupEnabled: boolean;
  isUngroupEnabled: boolean;
  selectedIds: string[];
}

export function useRackContextMenu(
  manifest: OMEGA_Manifest,
  isLiveMode: boolean,
  isGhostVisible: boolean,
  onGhostCancel: (() => void) | undefined,
): RackContextMenuResult {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const openContextMenu = useCallback((
    e: React.MouseEvent,
    multiSelectedIds: string[],
    onSelectItem: (id: string | null) => void,
    rackX?: number,
    rackY?: number,
  ) => {
    if (isLiveMode) return;
    e.preventDefault();
    e.stopPropagation();

    if (isGhostVisible) {
      onGhostCancel?.();
      return;
    }

    const target = e.target as HTMLElement;
    const ucaNode = target.closest('[id^="uca-"]');
    const targetId = ucaNode ? ucaNode.id.replace('uca-', '') : null;

    if (targetId) {
      const isAlreadySelected = multiSelectedIds.includes(targetId);
      const currentMultiSelection = multiSelectedIds.length >= 2 && isAlreadySelected
        ? [...multiSelectedIds]
        : [targetId];

      if (!isAlreadySelected) {
        onSelectItem(targetId);
      }

      setContextMenu({ x: e.clientX, y: e.clientY, targetId, multiSelectedIds: currentMultiSelection, ...(rackX !== undefined ? { rackX } : {}), ...(rackY !== undefined ? { rackY } : {}) });
    } else {
      setContextMenu({ x: e.clientX, y: e.clientY, targetId: null, multiSelectedIds: [], ...(rackX !== undefined ? { rackX } : {}), ...(rackY !== undefined ? { rackY } : {}) });
    }
  }, [isLiveMode, isGhostVisible, onGhostCancel]);

  // ── Derived values ──────────────────────────────────────────────

  const { targetGroupId, isGroupEnabled, isUngroupEnabled, selectedIds } = useMemo(() => {
    if (!contextMenu) return { targetGroupId: undefined, isGroupEnabled: false, isUngroupEnabled: false, selectedIds: [] as string[] };

    const cmMultiCount = contextMenu.multiSelectedIds.length;
    const targetId = contextMenu.targetId;
    const rootTree = manifest.ui?.tree;
    if (!rootTree) return { targetGroupId: undefined, isGroupEnabled: false, isUngroupEnabled: false, selectedIds: [] as string[] };

    const getParentGroupId = (id: string): string | undefined => {
      const rootId = manifest.ui?.tree?.id || 'root';
      const targetNode = findNodeInTree(rootTree, id);
      if (targetNode && targetNode.id !== rootId && (targetNode.kind === 'group' || targetNode.kind === 'container')) {
        return targetNode.id;
      }
      const parent = findParentInTree(rootTree, id);
      if (parent && parent.id !== rootId && (parent.kind === 'group' || parent.kind === 'container')) {
        return parent.id;
      }
      return undefined;
    };

    const tGroupId = targetId ? getParentGroupId(targetId) : undefined;
    const sIds = cmMultiCount >= 1 ? contextMenu.multiSelectedIds : (targetId ? [targetId] : []);
    const groupIds = sIds.map(id => getParentGroupId(id));
    const hasGroup = groupIds.some(gid => gid !== undefined);
    const allInSameGroup = sIds.length > 0 && groupIds.every(gid => gid !== undefined && gid === groupIds[0]);

    return {
      targetGroupId: tGroupId,
      isGroupEnabled: sIds.length > 0 && !allInSameGroup,
      isUngroupEnabled: hasGroup,
      selectedIds: sIds,
    };
  }, [contextMenu, manifest]);

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu,
    targetGroupId,
    isGroupEnabled,
    isUngroupEnabled,
    selectedIds,
  };
}
