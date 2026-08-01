/* =================================================================
   OMEGA - Audit Service Type Stub
   Provides the AuditResult type used by synced omega-ui-core components.
   Source of truth: ABDSynthsWeb/abd-ia_synths/src/services/auditService.ts
   ================================================================= */

export interface AuditResult {
  isCompliant: boolean;
  score: number;
  status: 'CERTIFIED' | 'CRITICAL_FAIL' | 'DRAFT';
  checks: {
    governance: boolean;
    technical: boolean;
    aesthetic: boolean;
    integrity: boolean;
  };
  details: string[];
  issues: Diagnostic[];
  errors: Diagnostic[];
  warnings: Diagnostic[];
  infos: Diagnostic[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface Diagnostic {
  severity: 'critical' | 'error' | 'warning' | 'audit' | 'info';
  message: string;
  path?: string;
  keyword?: string;
  code?: string;
}
