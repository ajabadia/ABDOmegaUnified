'use client';

/**
 * @purpose Gestiona manejo de atajos del teclado para el panel de trabajo OMEGA, proporcionando callbacks para diversas acciones de edición.
 * @purpose_en Manages keyboard shortcut handlers for the OMEGA workbench, providing callbacks for various editor actions.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:4,imports:3,sig:1sjeqgs
 * @lastUpdated 2026-06-20T10:48:17.024Z
 */

import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import { findNodeInTree } from '@/omega-ui-core/uca/treeUtils';
import { computeScaleUpdates, getOriginalNodeSize } from '@/omega-ui-core/renderers/utils/scaleUtils';

// ── Dynamic action mapping (Phase 5.2) ───────────────────────────────

export type EditorAction =
  | 'select_all' | 'copy' | 'cut' | 'paste' | 'duplicate' | 'delete'
  | 'undo' | 'redo' | 'deselect' | 'toggle_grid' | 'toggle_guides'
  | 'rename' | 'command_palette';

export const DEFAULT_BINDINGS: Record<string, string> = {
  select_all: 'ctrl+a',
  copy: 'ctrl+c',
  cut: 'ctrl+x',
  paste: 'ctrl+v',
  duplicate: 'ctrl+d',
  delete: 'delete',
  undo: 'ctrl+z',
  redo: 'ctrl+y',
  deselect: 'escape',
  toggle_grid: 'ctrl+shift+g',
  toggle_guides: 'ctrl+shift+u',
  rename: 'f2',
  command_palette: 'ctrl+k',
};

/**
 * Translates a KeyboardEvent into an EditorAction by matching against
 * the user's binding map (falling back to DEFAULT_BINDINGS for unbound keys).
 */
export function getActionFromEvent(
  e: KeyboardEvent,
  bindings?: Record<string, string>,
): EditorAction | null {
  const merged = { ...DEFAULT_BINDINGS, ...bindings };
  const pressed: string[] = [];
  if (e.ctrlKey || e.metaKey) pressed.push('ctrl');
  if (e.shiftKey) pressed.push('shift');
  if (e.altKey) pressed.push('alt');
  const key = e.key.toLowerCase();
  if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
    pressed.push(key);
  }
  const combo = pressed.join('+');

  for (const [action, binding] of Object.entries(merged)) {
    if (binding === combo) return action as EditorAction;
  }
  return null;
}

// ── Editor interface ─────────────────────────────────────────────────

export interface WorkbenchEditor {
  addLog: (msg: string) => void;
  exportManifest: (mode?: 'work' | 'distilled') => void;
  exportOmegaPack: () => void;
  copyToClipboard: (ids: string[]) => void;
  cutToClipboard: (ids: string[]) => void;
  pasteFromClipboard: (targetPos?: { x: number; y: number }) => void;
  undo: () => void;
  redo: () => void;
  groupSelected: (ids: string[]) => string | undefined;
  ungroupNode: (groupId: string) => string[] | undefined;
}

export interface ShortcutCallbacks {
  onTabFocus?: (type: 'orbital' | 'rack' | 'source' | 'history') => void;
  onToggleGrid?: () => void;
  onToggleGuides?: () => void;
  isLiveMode?: boolean;
  onToggleWindow?: (name: 'window_layers' | 'window_properties' | 'window_rack_properties' | 'window_blueprints' | 'window_compliance' | 'window_info' | 'window_history' | 'window_logs') => void;
  onOpenHelp?: () => void;
  onOpenAbout?: () => void;
  onOpenConfig?: () => void;
  onOpenAudit?: () => void;
  onReset?: () => void;
  onRemoveItem?: (id: string) => void;
  onDuplicateItem?: (id: string) => void;
  onSetTool?: (tool: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null) => void;
  onOpenGallery?: () => void;
  onToggleMiniMap?: () => void;
  activeTool?: 'select' | 'marquee' | 'add' | 'studio' | 'transform' | null;
  onUpdateItems?: (updatesMap: Record<string, Partial<OmegaNode>>) => void;
  manifest?: OMEGA_Manifest;
  onOpenNumericResize?: () => void;
  onOpenNumericRotate?: () => void;
  onCopyTransform?: () => void;
  onPasteTransform?: () => void;
  // Extended shortcuts
  onSelectAll?: () => void;
  onSelectItem?: (id: string | null) => void;
  onToggleCommandPalette?: () => void;
  onRenameItem?: (id: string) => void;
}

/**
 * Determines if the currently focused element is an input-like element
 * where most keyboard shortcuts should be suppressed.
 */
export function isInputFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    active.hasAttribute('contenteditable') ||
    active.classList.contains('monaco-editor') ||
    active.closest('.monaco-editor') !== null
  );
}

/**
 * Creates the main keydown handler for the workbench.
 * Encapsulates all shortcut logic so the hook only manages the lifecycle.
 */
export function createHandleKeyDown(
  editor: WorkbenchEditor,
  selectedItemId: string | null,
  multiSelectedIds: string[] | undefined,
  onOpenCellStudio: (() => void) | undefined,
  callbacks: ShortcutCallbacks | undefined,
  bindings?: Record<string, string>,
): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    const skipDueToInput = isInputFocused();

    // ── Dynamic action dispatch (Phase 5.2) ──────────────────────────
    const action = getActionFromEvent(e, bindings);
    if (action) {
      const ids = multiSelectedIds && multiSelectedIds.length > 0 ? multiSelectedIds : (selectedItemId ? [selectedItemId] : []);
      switch (action) {
        case 'select_all':
          if (!skipDueToInput) { e.preventDefault(); callbacks?.onSelectAll?.(); }
          return;
        case 'copy':
          if (!skipDueToInput && ids.length > 0) { editor.copyToClipboard(ids); }
          return;
        case 'cut':
          if (!skipDueToInput && ids.length > 0) { editor.cutToClipboard(ids); }
          return;
        case 'paste':
          if (!skipDueToInput) { e.preventDefault(); editor.pasteFromClipboard(); }
          return;
        case 'duplicate':
          if (!skipDueToInput && selectedItemId) { e.preventDefault(); callbacks?.onDuplicateItem?.(selectedItemId); }
          return;
        case 'delete':
          if (!skipDueToInput && selectedItemId) { e.preventDefault(); callbacks?.onRemoveItem?.(selectedItemId); }
          return;
        case 'undo':
          if (!skipDueToInput) { e.preventDefault(); editor.undo(); }
          return;
        case 'redo':
          if (!skipDueToInput) { e.preventDefault(); editor.redo(); }
          return;
        case 'deselect':
          if (!skipDueToInput) { callbacks?.onSelectItem?.(null); }
          return;
        case 'toggle_grid':
          if (!skipDueToInput) { e.preventDefault(); callbacks?.onToggleGrid?.(); }
          return;
        case 'toggle_guides':
          if (!skipDueToInput && !callbacks?.isLiveMode) { e.preventDefault(); callbacks?.onToggleGuides?.(); }
          return;
        case 'rename':
          if (!skipDueToInput && selectedItemId) { e.preventDefault(); callbacks?.onRenameItem?.(selectedItemId); }
          return;
        case 'command_palette':
          if (!skipDueToInput) { e.preventDefault(); callbacks?.onToggleCommandPalette?.(); }
          return;
      }
    }

    // ── View tab switching (Ctrl+1/2/3/4) ────────────────────────────
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !skipDueToInput) {
      const tabMap: Record<string, 'orbital' | 'rack' | 'source' | 'history'> = {
        '1': 'orbital',
        '2': 'rack',
        '3': 'source',
        '4': 'history',
      };
      const tabType = tabMap[e.key];
      if (tabType && callbacks?.onTabFocus) {
        e.preventDefault();
        callbacks.onTabFocus(tabType);
        return;
      }
    }

    // ── F1: Help manual ──────────────────────────────────────────────
    if (e.key === 'F1' && !skipDueToInput) {
      e.preventDefault();
      callbacks?.onOpenHelp?.();
      return;
    }

    // ── Skip the rest if input is focused ────────────────────────────
    if (skipDueToInput) return;

    // 1. Persistence (Ctrl+S) — export .omega pack
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      editor.addLog("[INPUT] Ctrl+S detected. Exporting .omega pack...");
      editor.exportOmegaPack();
      return;
    }

    // ── Ctrl+Shift+S: Export Definitive Mode (Distilled) ────────────
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
      e.preventDefault();
      editor.addLog("[INPUT] Ctrl+Shift+S detected. Exporting distilled manifest...");
      editor.exportManifest('distilled');
      return;
    }

    // 4. Group/Ungroup (Ctrl+G / Ctrl+Shift+Alt+G)
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'g' && !e.shiftKey) {
      e.preventDefault();
      const ids = multiSelectedIds && multiSelectedIds.length > 1 ? multiSelectedIds : (selectedItemId ? [selectedItemId] : []);
      if (ids.length >= 2) {
        editor.groupSelected(ids);
      }
      return;
    }

    // Ungroup (Ctrl+Shift+Alt+G)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      if (selectedItemId) {
        editor.ungroupNode(selectedItemId);
      }
      return;
    }

    // 5. Cell Studio (Ctrl+Shift+E)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      onOpenCellStudio?.();
      return;
    }

    // ── Window panel toggles (Ctrl+Shift + letter) ───────────────────
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey) {
      const windowMap: Record<string, 'window_layers' | 'window_properties' | 'window_blueprints' | 'window_info' | 'window_history' | 'window_logs' | 'window_compliance'> = {
        'l': 'window_layers',
        'p': 'window_properties',
        'b': 'window_blueprints',
        'i': 'window_info',
        'h': 'window_history',
        'c': 'window_logs',
        'a': 'window_compliance',
      };
      const key = e.key.toLowerCase();
      const windowName = windowMap[key];
      const skipForAlignment = (key === 'l' || key === 'h' || key === 'b') && (multiSelectedIds?.length ?? 0) >= 2;
      if (windowName && callbacks?.onToggleWindow && !skipForAlignment) {
        e.preventDefault();
        callbacks.onToggleWindow(windowName);
        return;
      }
    }

    // ── Ctrl+Shift+M: Toggle Mini Map ───────────────────────────────
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      callbacks?.onToggleMiniMap?.();
      return;
    }

    // ── Ctrl+Shift+R: Reset Workspace / Align Right ────────────────
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
      if ((multiSelectedIds?.length ?? 0) >= 2) {
        // Let the event fall through to the alignment handler in useAlignment.ts
      } else {
        e.preventDefault();
        callbacks?.onReset?.();
        return;
      }
    }

    // ── Ctrl+Shift+Alt+R: Rack Properties ───────────────────────────
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      callbacks?.onToggleWindow?.('window_rack_properties');
      return;
    }

    // ── V: Select tool ─────────────────────────────────────────────
    if (e.key === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      callbacks?.onSetTool?.('select');
      return;
    }

    // ── T: Transform tool ──────────────────────────────────────────
    if (e.key === 't' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      callbacks?.onSetTool?.('transform');
      return;
    }

    // ── Ctrl+Alt+R: Numeric Resize Popover ──────────────────────────
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'r' && !e.shiftKey) {
      e.preventDefault();
      callbacks?.onOpenNumericResize?.();
      return;
    }

    // ── Ctrl+Alt+T: Numeric Rotate Popover ──────────────────────────
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      callbacks?.onOpenNumericRotate?.();
      return;
    }

    // ── Ctrl+Alt+C: Copy Transform ─────────────────────────────────
    if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'C' || e.key === 'c') && !e.shiftKey) {
      e.preventDefault();
      callbacks?.onCopyTransform?.();
      return;
    }

    // ── Ctrl+Alt+V: Paste Transform ─────────────────────────────────
    if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'V' || e.key === 'v') && !e.shiftKey) {
      e.preventDefault();
      callbacks?.onPasteTransform?.();
      return;
    }

    // ── Keyboard Arrow Nudge: Move (Arrow keys alone) ────────────────
    if (
      selectedItemId &&
      callbacks?.manifest &&
      callbacks.onUpdateItems &&
      !e.ctrlKey && !e.metaKey && !e.altKey &&
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
    ) {
      e.preventDefault();
      const root = callbacks.manifest.ui?.tree;
      if (!root) return;
      const targetNode = findNodeInTree(root, selectedItemId);
      if (!targetNode) return;

      const grid = callbacks.manifest.ui?.layout?.grid;
      const spacingX = grid?.spacingX ?? 24;
      const step = e.shiftKey ? (grid?.enabled ? spacingX : 24) : 1;

      let dx = 0, dy = 0;
      if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowDown') dy = step;
      else if (e.key === 'ArrowUp') dy = -step;

      const pos = targetNode.layout?.pos || { x: 0, y: 0 };
      callbacks.onUpdateItems({
        [selectedItemId]: {
          layout: {
            ...targetNode.layout,
            pos: { x: (pos.x ?? 0) + dx, y: (pos.y ?? 0) + dy }
          }
        }
      });
      return;
    }

    // ── Alt+Arrow: Resize by nudging ──────────────────────────────────
    if (
      selectedItemId &&
      callbacks?.manifest &&
      callbacks.onUpdateItems &&
      e.altKey && !e.ctrlKey && !e.metaKey &&
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
    ) {
      e.preventDefault();
      const root = callbacks.manifest.ui?.tree;
      if (!root) return;
      const targetNode = findNodeInTree(root, selectedItemId);
      if (!targetNode) return;

      const size = getOriginalNodeSize(targetNode);
      const grid = callbacks.manifest.ui?.layout?.grid;
      const step = e.shiftKey ? (grid?.enabled ? (grid.spacingX ?? 24) : 24) : 1;

      let newW = size.width;
      let newH = size.height;

      if (e.key === 'ArrowRight') newW += step;
      else if (e.key === 'ArrowLeft') newW = Math.max(8, newW - step);
      else if (e.key === 'ArrowDown') newH += step;
      else if (e.key === 'ArrowUp') newH = Math.max(8, newH - step);

      const pos = targetNode.layout?.pos || { x: 0, y: 0 };
      const updates = computeScaleUpdates(
        selectedItemId,
        Math.round(newW),
        Math.round(newH),
        pos.x ?? 0,
        pos.y ?? 0,
        callbacks.manifest
      );
      callbacks.onUpdateItems(updates);
      return;
    }

    // ── Ctrl+Arrow (legacy) Keyboard Arrow Resizing (a11y) ────────────
    if (
      callbacks?.activeTool === 'transform' &&
      selectedItemId &&
      callbacks.manifest &&
      (e.ctrlKey || e.metaKey) &&
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
    ) {
      e.preventDefault();
      const root = callbacks.manifest.ui?.tree;
      if (!root) return;
      const targetNode = findNodeInTree(root, selectedItemId);
      if (!targetNode) return;

      const size = getOriginalNodeSize(targetNode);
      const grid = callbacks.manifest.ui?.layout?.grid;
      const spacingX = grid?.spacingX ?? 24;
      const spacingY = grid?.spacingY ?? 24;
      const stepX = grid?.enabled ? spacingX : 10;
      const stepY = grid?.enabled ? spacingY : 10;

      let newW = size.width;
      let newH = size.height;

      if (e.key === 'ArrowRight') {
        newW += stepX;
      } else if (e.key === 'ArrowLeft') {
        newW = Math.max(16, newW - stepX);
      } else if (e.key === 'ArrowDown') {
        newH += stepY;
      } else if (e.key === 'ArrowUp') {
        newH = Math.max(16, newH - stepY);
      }

      if (e.shiftKey) {
        const ratio = size.width > 0 ? size.width / size.height : 1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          newH = newW / ratio;
        } else {
          newW = newH * ratio;
        }
      }

      const updates = computeScaleUpdates(
        selectedItemId,
        Math.round(newW),
        Math.round(newH),
        targetNode.layout?.pos?.x ?? 0,
        targetNode.layout?.pos?.y ?? 0,
        callbacks.manifest
      );

      if (callbacks.onUpdateItems) {
        callbacks.onUpdateItems(updates);
      }
      return;
    }

    // ── M: Marquee tool ─────────────────────────────────────────────
    if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      callbacks?.onSetTool?.('marquee');
      return;
    }

    // ── A: Add primitives tool ───────────────────────────────────────
    if (e.key === 'a' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      callbacks?.onSetTool?.('add');
      return;
    }

    // ── B: Blueprints Gallery ────────────────────────────────────────
    if (e.key === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      callbacks?.onOpenGallery?.();
      callbacks?.onSetTool?.('select');
      return;
    }
  };
}
