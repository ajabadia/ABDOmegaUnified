/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * OMEGA ERA 7.2.3 — Canonical History Types
 * Single source of truth for history/undo-redo contracts.
 */

import type { OMEGA_Manifest } from './manifest';

export type HistoryEventType =
  | 'CONTENT_CHANGE'
  | 'UI_SELECTION'
  | 'UI_PINNING'
  | 'UI_LAYOUT_RATIO'
  | 'MODE_CHANGE'
  | 'SNAPSHOT'
  | 'RECOVERY_POINT';

export interface HistoryEntry {
  id: string;
  type: HistoryEventType;
  label: string;
  timestamp: number;
  correlationId: string;

  manifest: OMEGA_Manifest;
  extraResources?: { name: string; data: ArrayBuffer; type: string }[] | undefined;

  uiState?: {
    selectedNodeId: string | null;
    multiSelectedNodeIds?: string[];
    pinnedNodeId: string | null;
    layoutRatio: number;
    viewMode?: string;
    isSplit?: boolean;
  };

  metadata?: Record<string, unknown>;
}

export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  lastSavedIndex: number;
}

export const INITIAL_HISTORY_STATE: HistoryState = {
  past: [],
  future: [],
  lastSavedIndex: -1,
};
