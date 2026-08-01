'use client';

/**
 * @purpose Gestiona teclas de atajo global para el panel de trabajo OMEGA.
 * @purpose_en Registers global keyboard shortcuts for the OMEGA workbench.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:2,imports:3,sig:1psqaji
 * @lastUpdated 2026-06-20T11:08:20.394Z
 */

import { useEffect } from 'react';
import { createHandleKeyDown } from './shortcutHandlers';
import type { WorkbenchEditor, ShortcutCallbacks } from './shortcutHandlers';

export type { WorkbenchEditor, ShortcutCallbacks };

export function useWorkbenchShortcuts(
  editor: WorkbenchEditor,
  selectedItemId: string | null,
  multiSelectedIds?: string[],
  onOpenCellStudio?: () => void,
  callbacks?: ShortcutCallbacks,
  bindings?: Record<string, string>,
) {
  useEffect(() => {
    const handleKeyDown = createHandleKeyDown(
      editor,
      selectedItemId,
      multiSelectedIds,
      onOpenCellStudio,
      callbacks,
      bindings,
    );

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, selectedItemId, multiSelectedIds, onOpenCellStudio, callbacks, bindings]);
}
