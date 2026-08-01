'use client';

/**
 * @purpose Gestiona la restauración de revisiones históricas para un documento, promoviendo el estado histórico al manifiesto activo y capturando un punto de recuperación.
 * @purpose_en Manages restoring historical revisions for a document, promoting the historical state to the active manifest and capturing a recovery point.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:2uspy1
 * @lastUpdated 2026-06-20T13:03:04.567Z
 */

import { useCallback } from 'react';
import type { OrchestratorState, OrchestratorAction } from '../../types/document';
import { HistoryRestoreEngine } from '@/services/historyRestore';

export function useHistoricalRestore(
  state: OrchestratorState,
  dispatch: React.Dispatch<OrchestratorAction>,
) {
  const restoreHistoricalRevision = useCallback(async (id: string, revisionId: string) => {
    const doc = state.documentsById[id];
    if (!doc) return;

    const graph = await HistoryRestoreEngine.prepareRestore(revisionId, doc.manifest);
    if (!graph) return;

    dispatch({
      type: 'UPDATE_DOCUMENT',
      id,
      updates: { manifest: { nodes: graph } },
    });

    dispatch({
      type: 'PUSH_HISTORY',
      id,
      entry: {
        id: `restore_${Date.now()}`,
        type: 'RECOVERY_POINT',
        label: `Restored Revision: ${revisionId}`,
        timestamp: Date.now(),
        correlationId: `restore_${Date.now()}_${revisionId}`,
        manifest: doc.manifest,
        uiState: {
          selectedNodeId: null,
          multiSelectedNodeIds: [],
          pinnedNodeId: null,
          layoutRatio: 0.5,
        },
      },
    });
  }, [state.documentsById, dispatch]);

  return { restoreHistoricalRevision };
}
