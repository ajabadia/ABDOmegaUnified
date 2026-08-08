/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
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
