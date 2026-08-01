/**
 * @purpose Gestiona tipos para el manejo de historia en el editor de manifesto OMEGA, incluyendo razones de captura, metadata de revisión, entradas y diferencias.
 * @purpose_en Manages types for managing history in the OMEGA manifest editor, including capture reasons, revision metadata, entries, and differences.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:4,imports:1,sig:cylxs3
 * @lastUpdated 2026-06-15T17:00:10.379Z
 */

import type { OmegaNode } from '@/omega-ui-core/types/manifest';

/**
 * OMEGA ERA 7.2.3 - HISTORY TYPES (Phase 21)
 */

export type HistoryCaptureReason = 'TRANSACTION_COMMIT' | 'SNAPSHOT_SYNC' | 'RECOVERY_POINT' | 'MANUAL_SAVE';

export interface HistoryRevisionMeta {
  revisionId: string;
  parentRevisionId: string | null;
  timestamp: number;
  correlationId: string;
  reason: HistoryCaptureReason;
  label?: string;
  schemaVersion: string;
}

export interface HistoryEntry {
  meta: HistoryRevisionMeta;
  graph: OmegaNode[];
}

export interface HistoryDiff {
  revisionA: string;
  revisionB: string;
  changes: {
    path: string;
    type: 'ADD' | 'REMOVE' | 'UPDATE' | 'MOVE';
    details?: unknown;
  }[];
}
