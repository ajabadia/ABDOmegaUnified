/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * OMEGA ERA 7.2.3 — Canonical Audit & Diagnostic Types
 * Single source of truth for audit/diagnostic contracts.
 */

import type { OMEGA_Manifest } from './manifest';

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'audit';

export interface Diagnostic {
  id: string;
  source: string;
  message: string;
  severity: DiagnosticSeverity;
  path?: string;
  keyword?: string;
  line?: number;
  column?: number;
  entityId?: string;
  code?: string;
}

export type AuditIssue = Diagnostic;

export interface TabDiagnostics {
  errors: Diagnostic[];
  warnings: Diagnostic[];
  infos: Diagnostic[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface AuditResult extends TabDiagnostics {
  score: number;
  status?: 'DRAFT' | 'CERTIFIED' | 'CRITICAL_FAIL';
  details?: string[];
  checks: {
    governance: boolean;
    integrity: boolean;
    technical: boolean;
    aesthetic: boolean;
  };
  isCompliant: boolean;
  isHashMatched?: boolean;
  fingerprint?: string;
  issues: Diagnostic[];
}

export interface DiagnosticContext {
  contract: unknown;
  [key: string]: unknown;
}

export interface DiagnosticSource {
  id: string;
  name: string;
  extractDiagnostics: (manifest: OMEGA_Manifest, context?: DiagnosticContext) => TabDiagnostics;
}

export const createEmptyDiagnostics = (): TabDiagnostics => ({
  errors: [],
  warnings: [],
  infos: [],
  errorCount: 0,
  warningCount: 0,
  infoCount: 0
});
