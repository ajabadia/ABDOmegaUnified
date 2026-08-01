'use client';

/**
 * @purpose Construye los nodos y acciones para la paleta de comandos.
 * @purpose_en Builds nodes and actions for the command palette.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:new
 * @lastUpdated 2026-06-22
 */

import { useMemo, useCallback } from 'react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { buildCommandPaletteActions, buildCommandPaletteNodes } from '../utils/buildCommandPalette';
import type { CommandPaletteNode, CommandPaletteAction } from '../components/layout/CommandPalette';

export interface WorkbenchCommandPalette {
  commandNodes: CommandPaletteNode[];
  commandActions: CommandPaletteAction[];
  handleCommandPaletteSelectNode: (nodeId: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export function useWorkbenchCommandPalette(
  manifest: OMEGA_Manifest,
  editor: AnyRecord,
  actions: AnyRecord,
  handlers: {
    onDeploy: () => Promise<void>;
    handleToggleGrid: () => void;
    handleToggleGuides: () => void;
    handleOpenConfig: () => void;
    handleOpenCellEditor: () => void;
    handleOpenAudit: () => void;
    onReset: () => void;
  },
  handleSelectItem: (id: string | null) => void,
): WorkbenchCommandPalette {
  const commandNodes = useMemo(() => buildCommandPaletteNodes(manifest), [manifest]);

  const commandActions = useMemo(
    () => buildCommandPaletteActions(
      {
        undo: () => editor.undo(),
        redo: () => editor.redo(),
        exportOmegaPack: () => editor.exportOmegaPack(),
        exportManifest: (mode: 'work' | 'distilled') => editor.exportManifest(mode),
      },
      {
        openTab: (tab: { id: string; type: string; title: string }) => actions.openTab(tab),
        toggleWindow: (name: string) => actions.toggleWindow(name),
        toggleUIState: (key: string) => actions.toggleUIState(key),
        setHelpState: (open: boolean) => actions.setHelpState(open),
        toggleZenMode: () => actions.toggleZenMode(),
      },
      {
        onDeploy: handlers.onDeploy,
        handleToggleGrid: handlers.handleToggleGrid,
        handleToggleGuides: handlers.handleToggleGuides,
        handleOpenConfig: handlers.handleOpenConfig,
        handleOpenCellEditor: handlers.handleOpenCellEditor,
        handleOpenAudit: handlers.handleOpenAudit,
        onReset: handlers.onReset,
      },
    ),
    [editor, actions, handlers],
  );

  const handleCommandPaletteSelectNode = useCallback((nodeId: string) => {
    handleSelectItem(nodeId);
  }, [handleSelectItem]);

  return { commandNodes, commandActions, handleCommandPaletteSelectNode };
}
