/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

/**
 * OMEGA ERA 7.2.3 — Canonical Storage Constants
 * Centralized keys for localStorage persistence.
 */

export const STORAGE_VERSION = 'v1';

export const STORAGE_KEYS = {
  SESSION_DOCS: `omega_${STORAGE_VERSION}_session_docs`,
  WORKBENCH_SESSION: `omega_${STORAGE_VERSION}_workbench_session`,
  CELL_LIBRARY: `omega_${STORAGE_VERSION}_cell_library`,
  CLIPBOARD: `omega_${STORAGE_VERSION}_clipboard`,
  AUDIT_LOGS: `omega_${STORAGE_VERSION}_audit_logs`,
};
