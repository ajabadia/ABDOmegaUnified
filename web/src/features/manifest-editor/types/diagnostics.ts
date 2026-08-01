/**
 * @purpose Re-export canonical audit/diagnostic types from omega-ui-core.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:8,imports:0,sig:deprecated
 * @lastUpdated 2026-06-22
 * @deprecated Import directly from '@/omega-ui-core/types/audit'
 */

export type {
  DiagnosticSeverity,
  Diagnostic,
  AuditIssue,
  TabDiagnostics,
  AuditResult,
  DiagnosticContext,
  DiagnosticSource,
} from '@/omega-ui-core/types/audit';

export { createEmptyDiagnostics } from '@/omega-ui-core/types/audit';
