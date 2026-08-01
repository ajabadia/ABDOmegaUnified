/**
 * @purpose Gestiona transiciones de estado para documentos en el editor de manifesto OMEGA.
 * @purpose_en Manages state transitions for documents in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:3,imports:4,sig:1lsxwoh
 * @lastUpdated 2026-06-15T13:11:03.612Z
 */

import type { OMEGA_Manifest } from '../../types/document';
import type { DocumentState, OrchestratorState, OrchestratorAction } from '../../types/document';
import type { HistoryEntry } from '../../types/document';
import { DEFAULT_MANIFEST, normalizeManifest } from '../../constants/defaults';

/**
 * Helper: Crea una entrada de historial tipo snapshot con valores por defecto.
 * Extraída para evitar duplicación de patrón en múltiples acciones del reducer y callbacks.
 */
export function createSnapshotEntry(
  label: string,
  correlationId: string,
  manifest: OMEGA_Manifest,
  extraResources?: DocumentState['extraResources'],
  uiState?: HistoryEntry['uiState']
): HistoryEntry {
  return {
    id: `${correlationId}_${Date.now()}`,
    type: 'SNAPSHOT',
    label,
    timestamp: Date.now(),
    correlationId,
    manifest: normalizeManifest(manifest),
    extraResources,
    uiState: uiState ?? {
      selectedNodeId: null,
      multiSelectedNodeIds: [],
      pinnedNodeId: null,
      layoutRatio: 0.5
    }
  };
}

/**
 * OMEGA Orchestrator Reducer (v8.0.0)
 * Maneja todas las transiciones de estado de documentos multi-sesión.
 * Extraído de useDocumentOrchestrator.ts para facilitar testing y mantenimiento.
 */
export const orchestratorReducer = (state: OrchestratorState, action: OrchestratorAction): OrchestratorState => {
  switch (action.type) {
    case 'OPEN_DOCUMENT':
      if (state.documentsById[action.id]) {
        return { ...state, activeDocumentId: action.id };
      }
      return {
        ...state,
        activeDocumentId: action.id,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            id: action.id,
            manifest: normalizeManifest(action.manifest),
            isDirty: false,
            lastStableHash: '',
            history: { past: [], future: [], lastSavedIndex: -1 },
            isInitializing: true,
            contract: null,
            wasmBuffer: null,
            extraResources: []
          }
        }
      };

    case 'CLOSE_DOCUMENT':
      const { [action.id]: _removed, ...remainingDocs } = state.documentsById;
      const nextActiveId = state.activeDocumentId === action.id 
        ? Object.keys(remainingDocs)[0] || 'primary'
        : state.activeDocumentId;
      return {
        ...state,
        activeDocumentId: nextActiveId,
        documentsById: remainingDocs
      };

    case 'UPDATE_DOCUMENT': {
      const doc = state.documentsById[action.id];
      if (!doc) return state;

      const updatedManifest = action.updates.manifest 
        ? normalizeManifest({ ...doc.manifest, ...action.updates.manifest })
        : doc.manifest;

      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...doc,
            ...action.updates,
            manifest: updatedManifest
          }
        }
      };
    }

    case 'SET_ACTIVE_DOCUMENT':
      return { ...state, activeDocumentId: action.id };

    case 'SET_DIRTY': {
      const dirtyDoc = state.documentsById[action.id];
      if (!dirtyDoc) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: { ...dirtyDoc, isDirty: action.isDirty }
        }
      };
    }

    case 'CAPTURE_HASH': {
      const hashDoc = state.documentsById[action.id];
      if (!hashDoc) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: { ...hashDoc, lastStableHash: action.hash, isDirty: false }
        }
      };
    }

    case 'SET_INITIALIZED': {
      const initDoc = state.documentsById[action.id];
      if (!initDoc) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: { ...initDoc, isInitializing: false }
        }
      };
    }

    case 'HYDRATE_SESSION':
      return action.state;

    case 'RESET_DOCUMENT': {
      const resetDoc = state.documentsById[action.id];
      if (!resetDoc) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...resetDoc,
            manifest: DEFAULT_MANIFEST,
            isDirty: false,
            lastStableHash: '',
            history: { past: [], future: [], lastSavedIndex: -1 }
          }
        }
      };
    }

    case 'UNDO_DOCUMENT': {
      const d = state.documentsById[action.id];
      if (!d || d.history.past.length === 0) return state;

      const lastPast = d.history.past[d.history.past.length - 1];
      const newPast = d.history.past.slice(0, -1);

      const currentEntry = createSnapshotEntry(
        'Current State', 'undo_op', d.manifest, d.extraResources
      );

      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            manifest: normalizeManifest(lastPast.manifest),
            extraResources: lastPast.extraResources || d.extraResources,
            history: {
              ...d.history,
              past: newPast,
              future: [currentEntry, ...d.history.future]
            }
          }
        }
      };
    }

    case 'UNDO_TO_INDEX': {
      const d = state.documentsById[action.id];
      if (!d || action.index < 0 || action.index >= d.history.past.length) return state;

      const targetEntry = d.history.past[action.index];
      const newPast = d.history.past.slice(0, action.index);
      const poppedEntries = d.history.past.slice(action.index + 1);

      const currentEntry = createSnapshotEntry(
        'State before Timeline Jump', 'undo_to_op', d.manifest, d.extraResources
      );

      const newFuture = [
        ...poppedEntries.map((entry, idx) => ({
          ...entry,
          manifest: idx + 1 < poppedEntries.length ? poppedEntries[idx + 1].manifest : d.manifest,
          extraResources: idx + 1 < poppedEntries.length ? poppedEntries[idx + 1].extraResources : d.extraResources
        })),
        currentEntry,
        ...d.history.future
      ];

      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            manifest: normalizeManifest(targetEntry.manifest),
            extraResources: targetEntry.extraResources || d.extraResources,
            history: {
              ...d.history,
              past: newPast,
              future: newFuture
            }
          }
        }
      };
    }

    case 'REDO_DOCUMENT': {
      const d = state.documentsById[action.id];
      if (!d || d.history.future.length === 0) return state;

      const firstFuture = d.history.future[0];
      const nextFuture = d.history.future.slice(1);

      const currentEntry = createSnapshotEntry(
        'Previous State', 'redo_op', d.manifest, d.extraResources
      );

      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            manifest: normalizeManifest(firstFuture.manifest),
            extraResources: firstFuture.extraResources || d.extraResources,
            history: {
              ...d.history,
              past: [...d.history.past, currentEntry],
              future: nextFuture
            }
          }
        }
      };
    }

    case 'PUSH_HISTORY': {
      const d = state.documentsById[action.id];
      if (!d) return state;

      const newPast = [...d.history.past, action.entry];
      if (newPast.length > 50) newPast.shift();

      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            history: {
              ...d.history,
              past: newPast,
              future: []
            }
          }
        }
      };
    }

    case 'START_TRANSACTION': {
      const d = state.documentsById[action.id];
      if (!d) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            activeTransaction: {
              label: action.label,
              correlationId: action.correlationId,
              baseNodes: d.manifest.nodes || []
            }
          }
        }
      };
    }

    case 'COMMIT_TRANSACTION': {
      const d = state.documentsById[action.id];
      if (!d) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            activeTransaction: undefined
          }
        }
      };
    }

    case 'ABORT_TRANSACTION': {
      const d = state.documentsById[action.id];
      if (!d || !d.activeTransaction) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            manifest: { ...d.manifest, nodes: d.activeTransaction.baseNodes },
            activeTransaction: undefined
          }
        }
      };
    }

    default:
      return state;
  }
};

export const initialOrchestratorState: OrchestratorState = {
  documentsById: {
    'primary': {
      id: 'primary',
      manifest: DEFAULT_MANIFEST,
      isDirty: false,
      lastStableHash: '',
      history: { past: [], future: [], lastSavedIndex: -1 },
      isInitializing: true,
      contract: null,
      wasmBuffer: null,
      extraResources: []
    }
  },
  activeDocumentId: 'primary'
};
