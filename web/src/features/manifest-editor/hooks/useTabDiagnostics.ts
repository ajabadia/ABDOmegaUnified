'use client';

/**
 * @purpose Gestiona diagnósticos de tab y diagnósticos estructurales globales para el editor de manifesto OMEGA.
 * @purpose_en Manages tab diagnostics and global structural diagnostics for the OMEGA manifest editor.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:12ytphf
 * @lastUpdated 2026-06-15T13:22:54.828Z
 */

import { useCallback, useMemo, useState } from 'react';
import type { OMEGA_Manifest, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import type { TabDiagnostics } from '@/omega-ui-core/types/audit';
import { structuralAuditor } from '@/features/manifest-editor/services/StructuralAuditor';

/**
 * Aggregates per-tab diagnostics (Monaco, layout, etc.) and memoises global
 * structural diagnostics from the StructuralAuditor.
 *
 * Dependencies: manifest, contract — recomputes structural diagnostics when either changes.
 */
export function useTabDiagnostics(manifest: OMEGA_Manifest, contract: OMEGA_Contract) {
  const [tabDiagnostics, setTabDiagnostics] = useState<Record<string, TabDiagnostics>>({});

  // Memoize Structural Diagnostics (Global)
  const structuralDiagnostics = useMemo(
    () => structuralAuditor.extractDiagnostics(manifest, { contract }),
    [manifest, contract],
  );

  const handleDiagnosticsUpdate = useCallback((tabId: string, diagnosticsRaw: unknown) => {
    const diagnostics = diagnosticsRaw as TabDiagnostics;
    setTabDiagnostics(prev => {
      const current = prev[tabId];
      if (
        current &&
        current.errorCount === diagnostics.errorCount &&
        current.warningCount === diagnostics.warningCount &&
        current.infoCount === diagnostics.infoCount
      )
        return prev;

      return { ...prev, [tabId]: diagnostics };
    });
  }, []);

  return { tabDiagnostics, structuralDiagnostics, handleDiagnosticsUpdate };
}
