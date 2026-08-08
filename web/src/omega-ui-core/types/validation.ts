/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
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
