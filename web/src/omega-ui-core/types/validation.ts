/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Gestiona la estructura para problemas de validación en configuraciones del editor de manifesto OMEGA.
 * @purpose_en Defines the structure for validation issues in OMEGA manifest editor configurations.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1wwfdtb
 * @lastUpdated 2026-06-15T16:10:38.911Z
 */

/**
 * OMEGA Validation Types (Era 7.2.3)
 * Canonical source of truth for validation issues.
 */

export interface ValidationIssue {
  path: string;
  message: string;
  keyword: string;
  severity: 'critical' | 'error' | 'warning' | 'audit' | 'info';
}
