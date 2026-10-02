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
  /**
   * Marcador de migraciones de sesion YA aplicadas (array de ids).
   *
   * Vive en `STORAGE_VERSION` y no en una version nueva a proposito: subir la
   * version renombraria TODAS las claves y dejaria orfanas las sesiones de
   * todo el mundo. Una migracion debe arreglar datos viejos sin invalidar los
   * que no tocan. Ver `utils/sessionMigrations.ts`.
   */
  SESSION_MIGRATIONS: `omega_${STORAGE_VERSION}_session_migrations`,
};
