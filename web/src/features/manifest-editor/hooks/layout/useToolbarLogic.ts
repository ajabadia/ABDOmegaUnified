'use client';

/**
 * @purpose Centraliza la lógica de estado, handlers y cálculos derivados del toolbar flotante del editor de manifesto OMEGA.
 * @purpose_en Centralizes state, handlers, and derived calculations for the OMEGA manifest editor floating toolbar.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:1tbk0z
 * @lastUpdated 2026-06-21T00:00:00.000Z
 */

import { useState, useEffect, useCallback, useMemo, startTransition, type Dispatch, type SetStateAction } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { findParentInTree, findNodeInTree } from '@/omega-ui-core/uca/treeUtils';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import { useToolbarCustomization } from '@/features/manifest-editor/hooks/useToolbarCustomization';
import { BUTTON_GROUPS } from '@/features/manifest-editor/constants/toolbarGroups';

// ── Tool type (shared with ToolbarProps) ────────────────────────────────
export type ToolType = 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null;

// ── Props consumed by this hook ─────────────────────────────────────────
export interface UseToolbarLogicParams {
  setActiveTool: (tool: ToolType) => void;
  selectedNodeId: string | null;
  multiSelectedIds: string[];
  onOpenCellStudio: () => void;
  findItem?: ((id: string) => unknown) | undefined;
  manifest?: OMEGA_Manifest | undefined;
  /** Popover state (controlled from parent) */
  showNumericResize?: boolean | undefined;
  showNumericRotate?: boolean | undefined;
  onOpenNumericResize?: (() => void) | undefined;
  onOpenNumericRotate?: (() => void) | undefined;
  onCloseNumericResize?: (() => void) | undefined;
  onCloseNumericRotate?: (() => void) | undefined;
}

// ── Return type ─────────────────────────────────────────────────────────
export interface UseToolbarLogicReturn {
  // Local UI state
  showAddMenu: boolean;
  setShowAddMenu: Dispatch<SetStateAction<boolean>>;
  showCustomize: boolean;
  setShowCustomize: Dispatch<SetStateAction<boolean>>;

  // Tool selection handler
  handleSelectTool: (tool: Exclude<ToolType, null>) => void;

  // Group / Ungroup enablement
  isGroupEnabled: boolean;
  isUngroupEnabled: boolean;
  targetGroupId: string | undefined;

  // Resolved selected node
  selectedNodeData: OmegaNode | null;

  // Keyboard navigation
  handleToolbarKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => void;

  // Numeric popover helpers
  showNumericResize: boolean;
  showNumericRotate: boolean;
  handleOpenNumericResize: () => void;
  handleOpenNumericRotate: () => void;
  handleCloseNumericResize: () => void;
  handleCloseNumericRotate: () => void;

  // Toolbar customization
  config: ReturnType<typeof useToolbarCustomization>['config'];
  moveButton: ReturnType<typeof useToolbarCustomization>['moveButton'];
  toggleVisibility: ReturnType<typeof useToolbarCustomization>['toggleVisibility'];
  resetToDefault: ReturnType<typeof useToolbarCustomization>['resetToDefault'];

  // Layout computation
  renderedButtons: { id: string }[];
  cols: number;
  maxRows: number;
  items: ({ type: 'button'; id: string } | { type: 'divider' })[];
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useToolbarLogic(params: UseToolbarLogicParams): UseToolbarLogicReturn {
  const {
    setActiveTool,
    selectedNodeId,
    multiSelectedIds,
    onOpenCellStudio,
    findItem,
    manifest,
    showNumericResize: showNumericResizeProp,
    showNumericRotate: showNumericRotateProp,
    onOpenNumericResize,
    onOpenNumericRotate,
    onCloseNumericResize,
    onCloseNumericRotate,
  } = params;

  // ── Local UI state ────────────────────────────────────────────────────
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [windowHeight, setWindowHeight] = useState(800);

  // ── Toolbar customization (reorder, visibility) ───────────────────────
  const {
    config,
    moveButton,
    toggleVisibility,
    resetToDefault,
  } = useToolbarCustomization();

  // ── Window height tracking ────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    startTransition(() => {
      setWindowHeight(window.innerHeight);
    });
    const handleResize = () => startTransition(() => setWindowHeight(window.innerHeight));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Numeric Popover: controlled from parent ───────────────────────────
  const showNumericResize = showNumericResizeProp ?? false;
  const showNumericRotate = showNumericRotateProp ?? false;

  const handleOpenNumericResize = useCallback(() => {
    if (selectedNodeId) onOpenNumericResize?.();
  }, [selectedNodeId, onOpenNumericResize]);

  const handleOpenNumericRotate = useCallback(() => {
    if (selectedNodeId) onOpenNumericRotate?.();
  }, [selectedNodeId, onOpenNumericRotate]);

  const handleCloseNumericResize = useCallback(() => {
    onCloseNumericResize?.();
  }, [onCloseNumericResize]);

  const handleCloseNumericRotate = useCallback(() => {
    onCloseNumericRotate?.();
  }, [onCloseNumericRotate]);

  // ── Resolve selected node data for popovers ───────────────────────────
  const selectedNodeData = useMemo((): OmegaNode | null => {
    if (!selectedNodeId || !manifest?.ui?.tree) return null;
    return findNodeInTree(manifest.ui.tree, selectedNodeId) ?? null;
  }, [selectedNodeId, manifest]);

  // ── Tool selection handler ────────────────────────────────────────────
  const handleSelectTool = useCallback(
    (tool: Exclude<ToolType, null>) => {
      setActiveTool(tool);
      if (tool === 'add') {
        setShowAddMenu((prev) => !prev);
      } else {
        setShowAddMenu(false);
      }
      if (tool === 'studio') {
        onOpenCellStudio();
        // Auto revert to select tool after launching studio
        setTimeout(() => setActiveTool('select'), 500);
      }
    },
    [setActiveTool, onOpenCellStudio],
  );

  // ── Group / Ungroup enablement ────────────────────────────────────────
  const isGroupEnabled = multiSelectedIds.length >= 2;

  const targetGroupId = useMemo(() => {
    if (multiSelectedIds.length !== 1 || !manifest) return undefined;
    const selectedId = multiSelectedIds[0];
    const rootTree = manifest.ui?.tree;
    if (!rootTree) return undefined;

    // Check if the selected node itself is a group
    const item = findItem?.(selectedId);
    if (item && typeof item === 'object' && 'kind' in (item as Record<string, unknown>)) {
      const nodeItem = item as { kind?: string };
      if (nodeItem.kind === 'group' || nodeItem.kind === 'container') {
        return selectedId;
      }
    }

    // Otherwise check if it belongs to a parent group
    const parent = findParentInTree(rootTree, selectedId);
    const rootId = manifest.ui?.tree?.id || 'root';
    if (parent && parent.id !== rootId && (parent.kind === 'group' || parent.kind === 'container')) {
      return parent.id;
    }
    return undefined;
  }, [multiSelectedIds, manifest, findItem]);

  const isUngroupEnabled = targetGroupId !== undefined;

  // ── Keyboard navigation (roving tabindex within toolbar) ──────────────
  const handleToolbarKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(
      (e.currentTarget as HTMLDivElement).querySelectorAll<HTMLButtonElement>('button[aria-label]'),
    );
    const currentIdx = buttons.indexOf(document.activeElement as HTMLButtonElement);

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight': {
        e.preventDefault();
        const next = buttons[(currentIdx + 1) % buttons.length];
        next?.focus();
        break;
      }
      case 'ArrowUp':
      case 'ArrowLeft': {
        e.preventDefault();
        const prev = buttons[(currentIdx - 1 + buttons.length) % buttons.length];
        prev?.focus();
        break;
      }
      case 'Home': {
        e.preventDefault();
        buttons[0]?.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        buttons[buttons.length - 1]?.focus();
        break;
      }
    }
  }, []);

  // ── Layout computation ────────────────────────────────────────────────

  /** Visible button IDs in configured order */
  const orderedIds = useMemo(
    () => config.order.filter((id) => !config.hidden.includes(id)),
    [config.order, config.hidden],
  );

  /** Only visible buttons, in configured order */
  const renderedButtons = useMemo(() => {
    return orderedIds
      .filter((id) => {
        switch (id) {
          case 'studio':
          case 'numeric-resize':
          case 'numeric-rotate':
            return selectedNodeId != null;
          case 'group':
            return isGroupEnabled;
          case 'ungroup':
            return isUngroupEnabled;
          default:
            return true;
        }
      })
      .map((id) => ({ id }));
  }, [orderedIds, selectedNodeId, isGroupEnabled, isUngroupEnabled]);

  /** Grid columns based on window height */
  const B = renderedButtons.length;
  const H_item = 34;
  const H_other = 36;
  const maxHeight = Math.max(200, windowHeight - 140);
  const maxRows = Math.max(1, Math.floor((maxHeight - H_other) / H_item));
  const cols = Math.ceil(B / maxRows);

  /** Items interspersed with dividers (for single-column mode) */
  const items = useMemo(() => {
    const result: ({ type: 'button'; id: string } | { type: 'divider' })[] = [];
    let lastGroup: string | null = null;
    for (const btn of renderedButtons) {
      const group = BUTTON_GROUPS[btn.id] || 'tools';
      if (lastGroup !== null && group !== lastGroup) {
        result.push({ type: 'divider' });
      }
      result.push({ type: 'button', id: btn.id });
      lastGroup = group;
    }
    return result;
  }, [renderedButtons]);

  return {
    showAddMenu,
    setShowAddMenu,
    showCustomize,
    setShowCustomize,
    handleSelectTool,
    isGroupEnabled,
    isUngroupEnabled,
    targetGroupId,
    selectedNodeData,
    handleToolbarKeyDown,
    showNumericResize,
    showNumericRotate,
    handleOpenNumericResize,
    handleOpenNumericRotate,
    handleCloseNumericResize,
    handleCloseNumericRotate,
    config,
    moveButton,
    toggleVisibility,
    resetToDefault,
    renderedButtons,
    cols,
    maxRows,
    items,
  };
}

