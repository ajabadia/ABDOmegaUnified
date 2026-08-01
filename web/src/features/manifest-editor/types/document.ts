/**
 * @purpose Gestiona el estado y las acciones para editar documentos en el editor de manifesto OMEGA.
 * @purpose_en Manages the state and actions for editing documents in the OMEGA manifest editor.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:5,imports:3,sig:141sl0f
 * @lastUpdated 2026-06-15T15:16:31.840Z
 */

import type { OMEGA_Manifest, OMEGA_Contract, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/omega-ui-core/types/contract';
import type { HistoryState, HistoryEntry } from './history';

export type { OMEGA_Manifest, OMEGA_Contract, OmegaNode, HistoryEntry };

/**
 * OMEGA Document State (v7.2.3 -> v8.0.0 History Engine)
 * Represents the complete state of a single manifest document.
 */
export interface DocumentState {
  id: string;
  manifest: OMEGA_Manifest;
  contract: (OmegaContract | OMEGA_Contract) | null;
  wasmBuffer: ArrayBuffer | null;
  extraResources: { name: string, data: ArrayBuffer, type: string }[];
  isDirty: boolean;
  lastStableHash: string | null;
  isInitializing: boolean;
  history: HistoryState;
  activeTransaction?: {
    label: string;
    correlationId: string;
    baseNodes: OmegaNode[];
  } | undefined;
}

export interface OrchestratorState {
  documentsById: Record<string, DocumentState>;
  activeDocumentId: string;
}

export type OrchestratorAction =
  | { type: 'OPEN_DOCUMENT'; id: string; manifest: OMEGA_Manifest }
  | { type: 'CLOSE_DOCUMENT'; id: string }
  | { type: 'UPDATE_DOCUMENT'; id: string; updates: Partial<Omit<DocumentState, 'manifest'>> & { manifest?: Partial<OMEGA_Manifest> } }
  | { type: 'SET_ACTIVE_DOCUMENT'; id: string }
  | { type: 'SET_DIRTY'; id: string; isDirty: boolean }
  | { type: 'CAPTURE_HASH'; id: string; hash: string }
  | { type: 'SET_INITIALIZED'; id: string }
  | { type: 'HYDRATE_SESSION'; state: OrchestratorState }
  | { type: 'RESET_DOCUMENT'; id: string }
  | { type: 'UNDO_DOCUMENT'; id: string }
  | { type: 'REDO_DOCUMENT'; id: string }
  | { type: 'UNDO_TO_INDEX'; id: string; index: number }
  | { type: 'PUSH_HISTORY'; id: string; entry: HistoryEntry }
  | { type: 'START_TRANSACTION'; id: string; label: string; correlationId: string }
  | { type: 'COMMIT_TRANSACTION'; id: string }
  | { type: 'ABORT_TRANSACTION'; id: string };

export interface DocumentOrchestrator {
  documentsById: Record<string, DocumentState>;
  activeDocumentId: string;
  activeDocument: DocumentState;
  openDocument: (id: string, manifest: OMEGA_Manifest) => void;
  closeDocument: (id: string) => void;
  updateDocument: (id: string, updates: Partial<Omit<DocumentState, 'manifest' | 'history'>> & { manifest?: Partial<OMEGA_Manifest> }) => void;
  setActiveDocument: (id: string) => void;
  captureStableSnapshot: (id: string) => Promise<void>;
  resetDocument: (id: string) => void;
  // History API
  undo: (id: string) => void;
  redo: (id: string) => void;
  undoTo: (id: string, index: number) => void;
  pushHistory: (id: string, entry: HistoryEntry) => void;
}
