/**
 * @purpose Gestiona el paso entre modos UI basados en pestañas y stepper utilizando parámetros URL.
 * @purpose_en Manages the switching between tab-based and stepper-based UI modes in the OMEGA manifest editor using URL parameters.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:4,imports:0,sig:ogarpv
 * @lastUpdated 2026-06-15T12:47:24.619Z
 */

/**
 * Phase 0: Feature Flag Infrastructure for CellStudio Migration
 * 
 * Provides URL-based mode switching between:
 * - 'tabs': Legacy tab-based UI (default for safety)
 * - 'stepper': New stepper-based workflow (opt-in)
 * 
 * Usage: Add ?mode=stepper or ?mode=tabs to URL
 */

export type CellStudioMode = 'tabs' | 'stepper';

const DEFAULT_MODE: CellStudioMode = 'stepper';

/**
 * Detects the current CellStudio mode from URL search params.
 * Defaults to 'stepper' if no param is present or invalid.
 */
export function useCellStudioMode(): CellStudioMode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  
  const searchParams = new URLSearchParams(window.location.search);
  const mode = searchParams.get('mode');
  
  return (mode === 'stepper') ? 'stepper' : DEFAULT_MODE;
}

/**
 * Returns the URL with the mode parameter set.
 * Useful for toggling between modes.
 */
export function getModeUrl(mode: CellStudioMode, baseUrl?: string): string {
  const url = baseUrl ? new URL(baseUrl) : new URL(window.location.href);
  url.searchParams.set('mode', mode);
  return url.toString();
}

/**
 * Checks if stepper mode is enabled.
 * Convenience wrapper for mode checks.
 */
export function isStepperMode(mode: CellStudioMode): boolean {
  return mode === 'stepper';
}
