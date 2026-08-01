/**
 * @purpose Gestiona y prioriza diagnósticos desde múltiples fuentes para el editor de manifesto OMEGA.
 * @purpose_en Manages and prioritizes diagnostics from multiple sources for the OMEGA manifest editor.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:170jrga
 * @lastUpdated 2026-06-15T15:17:06.108Z
 */

/**
 * OMEGA ERA 7.2.3 - Diagnostic Utilities
 * Logic for merging and prioritizing multi-source diagnostics.
 */

import type { TabDiagnostics, Diagnostic } from '../types/diagnostics';

/**
 * Merges multiple diagnostic sets into one.
 * Prioritizes based on severity and source rules.
 */
export function mergeDiagnostics(sources: TabDiagnostics[]): TabDiagnostics {
  const merged: TabDiagnostics = {
    errors: [],
    warnings: [],
    infos: [],
    errorCount: 0,
    warningCount: 0,
    infoCount: 0
  };

  sources.forEach(source => {
    merged.errors.push(...source.errors);
    merged.warnings.push(...source.warnings);
    merged.infos.push(...source.infos);
  });

  // Unique by code/message and entityId to avoid redundant noise
  const dedupe = (list: Diagnostic[]) => {
    const seen = new Set<string>();
    return list.filter(d => {
      const key = `${d.source}:${d.code || d.message}:${d.entityId || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  merged.errors = dedupe(merged.errors);
  merged.warnings = dedupe(merged.warnings);
  merged.infos = dedupe(merged.infos);

  merged.errorCount = merged.errors.length;
  merged.warningCount = merged.warnings.length;
  merged.infoCount = merged.infos.length;

  return merged;
}

/**
 * Maps Monaco markers to our internal Diagnostic format.
 */
export function mapMonacoMarkers(markers: unknown[]): TabDiagnostics {
  const result = {
    errors: [] as Diagnostic[],
    warnings: [] as Diagnostic[],
    infos: [] as Diagnostic[],
    errorCount: 0,
    warningCount: 0,
    infoCount: 0
  };

  markers.forEach(raw => {
    const m = raw as { 
      owner: string; 
      startLineNumber: number; 
      startColumn: number; 
      message: string; 
      severity: number;
      code?: string | number | { value: string };
    };

    const code = typeof m.code === 'object' ? m.code.value : m.code?.toString();

    const diag: Diagnostic = {
      id: `monaco-${m.owner}-${m.startLineNumber}-${m.startColumn}`,
      source: 'Monaco',
      message: m.message,
      severity: m.severity === 8 ? 'error' : m.severity === 4 ? 'warning' : 'info',
      line: m.startLineNumber,
      column: m.startColumn,
      code: code || 'GENERIC'
    };

    if (diag.severity === 'error') result.errors.push(diag);
    else if (diag.severity === 'warning') result.warnings.push(diag);
    else result.infos.push(diag);
  });

  result.errorCount = result.errors.length;
  result.warningCount = result.warnings.length;
  result.infoCount = result.infos.length;

  return result;
}
