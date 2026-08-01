'use client';

/**
 * @purpose Gestiona las acciones y nodos del menú de comandos para el editor de manifesto OMEGA.
 * @purpose_en Builds and manages the command palette actions and nodes for the OMEGA manifest editor.
 * @refactorable true (contains multiple functions with distinct responsibilities)
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:2,sig:xcld1f
 * @lastUpdated 2026-06-20T11:08:41.711Z
 */

import type { OMEGA_Manifest, ManifestEntity, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { WorkbenchTabType } from '@/features/manifest-editor/hooks/useWorkbenchState';

// ── Types ─────────────────────────────────────────────────────────────

interface CommandAction {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  onExecute: () => void;
}

interface CommandNode {
  id: string;
  label: string;
  kind: string;
  type?: string;
}

interface ActionsCallbacks {
  openTab: (tab: { id: string; type: WorkbenchTabType; title: string }) => void;
  toggleWindow: (name: string) => void;
  toggleUIState: (key: 'isAboutModalOpen' | 'isOnboardingOpen' | 'showLogs' | 'isLiveMode' | 'showModGrid' | 'mockupOpen' | 'blueprintGalleryOpen' | 'isCellEditorOpen') => void;
  setHelpState: (open: boolean) => void;
  toggleZenMode: () => void;
}

interface EditorCallbacks {
  undo: () => void;
  redo: () => void;
  exportOmegaPack: () => void;
  exportManifest: (mode: 'work' | 'distilled') => void;
}

/** Build the list of command palette actions (Ctrl+K > Actions) */
export function buildCommandPaletteActions(
  editor: EditorCallbacks,
  actions: ActionsCallbacks,
  callbacks: {
    onDeploy: () => void;
    handleToggleGrid: () => void;
    handleToggleGuides: () => void;
    handleOpenConfig: () => void;
    handleOpenCellEditor: () => void;
    handleOpenAudit: () => void;
    onReset: () => void;
  },
): CommandAction[] {
  return [
    { id: 'undo', label: 'Undo', category: 'Edit', shortcut: 'Ctrl+Z', onExecute: () => editor.undo() },
    { id: 'redo', label: 'Redo', category: 'Edit', shortcut: 'Ctrl+Y', onExecute: () => editor.redo() },
    { id: 'save-pack', label: 'Save OmegaPack', category: 'File', shortcut: 'Ctrl+S', onExecute: () => editor.exportOmegaPack() },
    { id: 'save-distilled', label: 'Export Distilled Manifest', category: 'File', shortcut: 'Ctrl+Shift+S', onExecute: () => editor.exportManifest('distilled') },
    { id: 'deploy', label: 'Deploy to Engine', category: 'File', onExecute: () => callbacks.onDeploy() },
    { id: 'view-orbital', label: 'Orbital View', category: 'View', shortcut: 'Ctrl+1', onExecute: () => actions.openTab({ id: 'tab-orbital', type: 'orbital' as WorkbenchTabType, title: 'Orbital' }) },
    { id: 'view-rack', label: 'Virtual Rack', category: 'View', shortcut: 'Ctrl+2', onExecute: () => actions.openTab({ id: 'tab-rack', type: 'rack' as WorkbenchTabType, title: 'Rack' }) },
    { id: 'view-source', label: 'Source Code', category: 'View', shortcut: 'Ctrl+3', onExecute: () => actions.openTab({ id: 'tab-source', type: 'source' as WorkbenchTabType, title: 'Source' }) },
    { id: 'view-history', label: 'History Timeline', category: 'View', shortcut: 'Ctrl+4', onExecute: () => actions.openTab({ id: 'tab-history', type: 'history' as WorkbenchTabType, title: 'History' }) },
    { id: 'toggle-grid', label: 'Toggle Grid', category: 'View', shortcut: 'Ctrl+Shift+G', onExecute: () => callbacks.handleToggleGrid() },
    { id: 'toggle-guides', label: 'Toggle Guides', category: 'View', shortcut: 'Ctrl+Shift+U', onExecute: () => callbacks.handleToggleGuides() },
    { id: 'window-layers', label: 'Layers Panel', category: 'Window', shortcut: 'Ctrl+Shift+L', onExecute: () => actions.toggleWindow('window_layers') },
    { id: 'window-properties', label: 'Element Properties', category: 'Window', shortcut: 'Ctrl+Shift+P', onExecute: () => actions.toggleWindow('window_properties') },
    { id: 'window-blueprints', label: 'Blueprints Library', category: 'Window', shortcut: 'Ctrl+Shift+B', onExecute: () => actions.toggleWindow('window_blueprints') },
    { id: 'window-history', label: 'History Window', category: 'Window', shortcut: 'Ctrl+Shift+H', onExecute: () => actions.toggleWindow('window_history') },
    { id: 'window-console', label: 'Console Logs', category: 'Window', shortcut: 'Ctrl+Shift+C', onExecute: () => actions.toggleWindow('window_logs') },
    { id: 'window-compliance', label: 'Compliance (Audit)', category: 'Window', shortcut: 'Ctrl+Shift+A', onExecute: () => actions.toggleWindow('window_compliance') },
    { id: 'window-info', label: 'Information', category: 'Window', shortcut: 'Ctrl+Shift+I', onExecute: () => actions.toggleWindow('window_info') },
    { id: 'config', label: 'Module Global Configuration', category: 'Edit', onExecute: () => callbacks.handleOpenConfig() },
    { id: 'cell-studio', label: 'Universal Cell Laboratory', category: 'Edit', shortcut: 'Ctrl+Shift+E', onExecute: () => callbacks.handleOpenCellEditor() },
    { id: 'gallery', label: 'Blueprints Gallery', category: 'View', onExecute: () => actions.toggleWindow('window_blueprints') },
    { id: 'audit', label: 'Compliance Audit', category: 'Window', onExecute: () => callbacks.handleOpenAudit() },
    { id: 'reset', label: 'Reset Workspace', category: 'Edit', shortcut: 'Ctrl+Shift+R', onExecute: () => callbacks.onReset() },
    { id: 'toggle-zen', label: 'Toggle Zen Mode', category: 'View', onExecute: () => actions.toggleZenMode() },
    { id: 'help', label: 'Engineering Manual', category: 'Help', shortcut: 'F1', onExecute: () => actions.setHelpState(true) },
    { id: 'about', label: 'About OMEGA', category: 'Help', onExecute: () => actions.toggleUIState('isAboutModalOpen') },
    { id: 'tour', label: 'Take a Guided Tour', category: 'Help', onExecute: () => actions.toggleUIState('isOnboardingOpen') },
  ];
}

/** Build the list of command palette nodes (Ctrl+K > Nodes from manifest tree) */
export function buildCommandPaletteNodes(manifest: OMEGA_Manifest): CommandNode[] {
  const result: CommandNode[] = [];
  const collect = (node: OmegaNode | undefined) => {
    if (!node) return;
    result.push({
      id: node.id,
      label: (node.meta?.label as string) || node.id,
      kind: node.kind,
    });
    if (node.children) node.children.forEach(collect);
  };
  const tree = manifest?.ui?.tree;
  collect(tree);
  const controls = manifest?.ui?.controls || [];
  const jacks = manifest?.ui?.jacks || [];
  const existingIds = new Set(result.map(n => n.id));
  [...controls, ...jacks].forEach((e: ManifestEntity) => {
    if (!existingIds.has(e.id)) {
      result.push({ id: e.id, label: e.label || e.id, kind: 'control', type: e.type });
      existingIds.add(e.id);
    }
  });
  return result;
}
