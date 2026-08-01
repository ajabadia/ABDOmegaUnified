'use client';

/**
 * @purpose Gestiona el ciclo de vida de las transacciones de documentos, incluyendo iniciar, comprometer con validación y registro, y abortar con rebote.
 * @purpose_en Manages the lifecycle of document transactions, including starting, committing with validation and history, and aborting with rollback.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:16utse0
 * @lastUpdated 2026-06-20T10:47:05.870Z
 */

import { useCallback } from 'react';
import type { OrchestratorState, OrchestratorAction } from '../../types/document';
import { BlueprintValidator } from '@/omega-ui-core/utils/blueprintValidator';
import { getService } from '@/services/globalEventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';

export function useDocumentTransactions(
  state: OrchestratorState,
  dispatch: React.Dispatch<OrchestratorAction>,
) {
  const observabilityService = getService(SERVICE_TOKENS.OBSERVABILITY_SERVICE);
  const startTransaction = useCallback((id: string, label: string) => {
    const correlationId = observabilityService.generateCorrelationId();
    dispatch({ type: 'START_TRANSACTION', id, label, correlationId });
    observabilityService.trackEvent({
      correlationId,
      phase: 'PHASE_20_TRANSACTION',
      component: 'ORCHESTRATOR',
      state: 'START',
      message: `Transaction started: ${label}`,
    });
  }, [dispatch, observabilityService]);

  const commitTransaction = useCallback((id: string) => {
    const doc = state.documentsById[id];
    if (!doc || !doc.activeTransaction) return;

    const correlationId = doc.activeTransaction.correlationId;
    const label = doc.activeTransaction.label;

    try {
      // Non-blocking validation warning
      if (doc.manifest.ui?.tree) {
        try {
          BlueprintValidator.validate(doc.manifest.ui.tree, doc.manifest);
        } catch (valErr: unknown) {
          console.warn('[OMEGA VALIDATION]', (valErr as Error).message);
        }
      }

      // Phase 21.1: Capture as historical revision
      dispatch({
        type: 'PUSH_HISTORY',
        id,
        entry: {
          id: `tx_${Date.now()}`,
          type: 'CONTENT_CHANGE',
          label: doc.activeTransaction.label,
          timestamp: Date.now(),
          correlationId: doc.activeTransaction.correlationId,
          manifest: doc.manifest,
          uiState: {
            selectedNodeId: null,
            multiSelectedNodeIds: [],
            pinnedNodeId: null,
            layoutRatio: 0.5,
          },
        },
      });

      dispatch({ type: 'COMMIT_TRANSACTION', id });

      observabilityService.trackEvent({
        correlationId,
        phase: 'PHASE_20_TRANSACTION',
        component: 'ORCHESTRATOR',
        state: 'SUCCESS',
        message: `Transaction committed: ${label}`,
      });
    } catch (err: unknown) {
      const error = err as Error;
      observabilityService.trackEvent({
        correlationId,
        phase: 'PHASE_20_TRANSACTION',
        component: 'ORCHESTRATOR',
        state: 'FAILURE',
        code: 'TRANSACTION_COMMIT_FAILED',
        message: error.message,
      });
      throw error;
    }
  }, [state.documentsById, dispatch, observabilityService]);

  const abortTransaction = useCallback((id: string) => {
    dispatch({ type: 'ABORT_TRANSACTION', id });
  }, [dispatch]);

  return { startTransaction, commitTransaction, abortTransaction };
}
