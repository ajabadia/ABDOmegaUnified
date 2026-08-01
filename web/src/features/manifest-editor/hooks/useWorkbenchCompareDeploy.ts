'use client';

/**
 * @purpose Gestiona la acción de comparar con historial, deploy y reset del workbench.
 * @purpose_en Manages compare-with-history, deploy and reset actions.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:new
 * @lastUpdated 2026-06-22
 */

import { useCallback } from 'react';

export interface WorkbenchCompareDeploy {
  handleCompareWithHistory: (index: number) => void;
  onDeploy: () => Promise<void>;
  onReset: () => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useWorkbenchCompareDeploy(
  editor: Record<string, any>,
  actions: Record<string, any>,
  state: Record<string, any>,
): WorkbenchCompareDeploy {
/* eslint-enable @typescript-eslint/no-explicit-any */
  const handleCompareWithHistory = useCallback((index: number) => {
    const diff = editor.compareWithHistory(index);
    if (diff) {
      actions.setActiveDiff(diff);
      actions.setIsDiffModalOpen(true);
    }
  }, [editor, actions]);

  const onDeploy = useCallback(async () => {
    if (await editor.handleDeploy() === 'AUDIT_FAIL') {
      if (state.isRightPanelCollapsed) actions.toggleRightPanel();
      if (!state.window_compliance) actions.toggleWindow('window_compliance');
    }
  }, [editor, actions, state.isRightPanelCollapsed, state.window_compliance]);

  const onReset = useCallback(() => {
    editor.reset();
  }, [editor]);

  return { handleCompareWithHistory, onDeploy, onReset };
}
