'use client';

/**
 * @purpose Gestiona el estado de los documentos y coordina acciones como abrir, cerrar, actualizar y guardar documentos en el editor de manifesto OMEGA.
 * @purpose_en Manages the state of documents and coordinates actions like opening, closing, updating, and saving documents in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:8,sig:1cpszze
 * @lastUpdated 2026-06-20T12:52:46.411Z
 */

import { useReducer, useCallback, useMemo } from 'react';
import type { OMEGA_Manifest, HistoryEntry, DocumentState } from '../types/document';
// Type-only used in return memo; eslint may flag as unused but is needed for inference
import { IntegrityService } from '@/services/integrityService';
import { orchestratorReducer, initialOrchestratorState } from './orchestrator/orchestratorReducer';
import { useSessionPersistence } from './orchestrator/useSessionPersistence';
import { useDocumentDirtyWatcher } from './orchestrator/useDocumentDirtyWatcher';
import { useDocumentTransactions } from './orchestrator/useDocumentTransactions';
import { useHistoricalRestore } from './orchestrator/useHistoricalRestore';

/**
 * Resuelve el documento activo por su id.
 *
 * Existe como función pura y exportada por una razón concreta: es la línea
 * que separa un tipo honesto de una mentira. Antes estaba escrito como
 *
 *     state.documentsById[activeDocumentId] || state.documentsById['primary']
 *
 * dentro del `useMemo`, y ese `||` hacía que el hook devolviera SIEMPRE un
 * documento. El tipo `DocumentState` era entonces cierto por casualidad, no
 * por contrato, y un `activeDocumentId` colgante pasaba desapercibido.
 *
 * Ahora devuelve `undefined` cuando el id no existe, que es lo que el tipo
 * `DocumentState | undefined` promete. Ser una función pura la hace
 * verificable con un estado inválido a propósito, cosa imposible de
 * alcanzar a través del hook (el reducer no deja construir ese estado).
 */
export function resolveActiveDocument(
  documentsById: Record<string, DocumentState>,
  activeDocumentId: string
): DocumentState | undefined {
  return documentsById[activeDocumentId];
}

export const useDocumentOrchestrator = () => {
  const [state, dispatch] = useReducer(orchestratorReducer, initialOrchestratorState);

  // Session persistence (load on mount, save on change)
  useSessionPersistence(state, dispatch);

  // Dirty state watcher (debounced hash comparison)
  const { flushPendingHash } = useDocumentDirtyWatcher(state.documentsById, dispatch);

  // Transaction lifecycle (start / commit / abort)
  const { startTransaction, commitTransaction, abortTransaction } =
    useDocumentTransactions(state, dispatch);

  // Historical revision restore
  const { restoreHistoricalRevision } = useHistoricalRestore(state, dispatch);

  // ── Derived state ──────────────────────────────────────────────────
  const activeDocumentId = state.activeDocumentId;

  // Sin el `|| state.documentsById['primary']` de antes. Ese fallback era
  // una segunda fuente de verdad disfrazada de red de seguridad: si
  // `activeDocumentId` no era ninguna clave, `primary` respondía igual y el
  // error quedaba enterrado. Con el invariante del reducer una búsqueda
  // fallida ya no debería ocurrir, y si ocurre quiero que se vea.
  const activeDocument = useMemo(
    () => resolveActiveDocument(state.documentsById, activeDocumentId),
    [state.documentsById, activeDocumentId],
  );

  // ── Basic dispatch wrappers ────────────────────────────────────────
  const openDocument = useCallback((id: string, manifest: OMEGA_Manifest) => {
    dispatch({ type: 'OPEN_DOCUMENT', id, manifest });
  }, []);

  const closeDocument = useCallback((id: string) => {
    dispatch({ type: 'CLOSE_DOCUMENT', id });
  }, []);

  const updateDocument = useCallback(
    (id: string, updates: Partial<Omit<DocumentState, 'manifest'>> & { manifest?: Partial<OMEGA_Manifest> }) => {
      dispatch({ type: 'UPDATE_DOCUMENT', id, updates });
    },
    [],
  );

  const setActiveDocument = useCallback((id: string) => {
    dispatch({ type: 'SET_ACTIVE_DOCUMENT', id });
  }, []);

  const resetDocument = useCallback((id: string) => {
    dispatch({ type: 'RESET_DOCUMENT', id });
  }, []);

  const undo = useCallback((id: string) => dispatch({ type: 'UNDO_DOCUMENT', id }), []);
  const redo = useCallback((id: string) => dispatch({ type: 'REDO_DOCUMENT', id }), []);
  const undoTo = useCallback((id: string, index: number) => dispatch({ type: 'UNDO_TO_INDEX', id, index }), []);
  const pushHistory = useCallback((id: string, entry: HistoryEntry) => dispatch({ type: 'PUSH_HISTORY', id, entry }), []);

  // ── Composite actions ──────────────────────────────────────────────
  const captureStableSnapshot = useCallback(
    async (id: string) => {
      await flushPendingHash(id);
      const doc = state.documentsById[id];
      if (!doc) return;
      const hash = await IntegrityService.generateManifestHash(doc.manifest);
      dispatch({ type: 'CAPTURE_HASH', id, hash });
    },
    [state.documentsById, flushPendingHash],
  );

  // ── Return memo ────────────────────────────────────────────────────
  return useMemo(
    () => ({
      documentsById: state.documentsById,
      activeDocumentId: state.activeDocumentId,
      activeDocument,
      openDocument,
      closeDocument,
      updateDocument,
      setActiveDocument,
      captureStableSnapshot,
      flushPendingHash,
      resetDocument,
      undo,
      redo,
      undoTo,
      pushHistory,
      startTransaction,
      commitTransaction,
      abortTransaction,
      restoreHistoricalRevision,
    }),
    [
      state.documentsById,
      state.activeDocumentId,
      activeDocument,
      openDocument,
      closeDocument,
      updateDocument,
      setActiveDocument,
      captureStableSnapshot,
      flushPendingHash,
      resetDocument,
      undo,
      redo,
      undoTo,
      pushHistory,
      startTransaction,
      commitTransaction,
      abortTransaction,
      restoreHistoricalRevision,
    ],
  );
};

