'use client';

/**
 * @purpose Gestiona manejo de manejadores de clic y estado de vista capturados.
 * @purpose_en Manages diagnostic click and view state capture handlers.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:2,imports:4,sig:149l3p1
 * @lastUpdated 2026-06-20T10:49:09.879Z
 */

import { useCallback } from 'react';
import type { Diagnostic } from '../types/diagnostics';
import type { WorkbenchPaneId } from './useWorkbenchState';
import type { WorkbenchTabViewState } from '../types/workbench';

export interface DiagnosticHandlers {
  handleDiagnosticClick: (tabId: string, diagRaw: unknown) => void;
  handleCaptureViewState: (tabId: string, viewState: unknown) => void;
}

export function useDiagnosticHandlers(
  actions: {
    focusTab: (paneId: WorkbenchPaneId, tabId: string) => void;
    captureTabViewState: (tabId: string, state: Partial<WorkbenchTabViewState>) => void;
  },
  handleSelectItem: (id: string | null) => void,
): DiagnosticHandlers {
  const handleDiagnosticClick = useCallback((_tabId: string, diagRaw: unknown) => {
    const diag = diagRaw as Diagnostic;
    if (diag.source === 'Monaco' || diag.line) {
      actions.focusTab('primary', 'tab-source');
    } else if (diag.entityId) {
      handleSelectItem(diag.entityId);
    }
  }, [actions, handleSelectItem]);

  const handleCaptureViewState = useCallback((tabId: string, viewState: unknown) => {
    actions.captureTabViewState(tabId, { editorViewState: viewState });
  }, [actions]);

  return { handleDiagnosticClick, handleCaptureViewState };
}
