import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/services/wasmLoader';

/**
 * Phase 7.1 Multi-Document Contracts
 * Certified for SYS_READY_FOR_PHASE_8
 */

export interface DocumentState {
  id: string;
  manifest: OMEGA_Manifest;
  contract: OmegaContract | null;
  wasmBuffer: ArrayBuffer | null;
  extraResources: { name: string, data: ArrayBuffer, type: string }[];
  isDirty: boolean;
  lastStableHash: string | null;
  isInitializing: boolean;
}

export interface DocumentOrchestrator {
  documentsById: Record<string, DocumentState>;
  activeDocumentId: string;
  activeDocument: DocumentState;
  
  // Lifecycle Actions
  openDocument: (id: string, manifest: OMEGA_Manifest) => void;
  closeDocument: (id: string) => void;
  updateDocument: (id: string, updates: Partial<DocumentState>) => void;
  setActiveDocument: (id: string) => void;
  
  // Integrity Actions
  captureStableSnapshot: (id: string) => Promise<void>;
}

export interface ClipboardEntry {
  data: string; // JSON stringified ManifestEntity or OmegaNode
  timestamp: string;
  sourceDocumentId: string;
}

/**
 * Workbench Tab Integration
 */
export interface WorkbenchTabPayload {
  documentId: string;
  plane?: string;
  viewState?: unknown;
}
