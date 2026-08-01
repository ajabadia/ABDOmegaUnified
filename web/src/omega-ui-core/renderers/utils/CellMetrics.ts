/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Proporciona un radio para componentes industriales según su tipo, tamaño y datos manifestados, con un fallback a valores fijos por defecto.
 * @purpose_en Calculates and returns the radius for industrial components based on their type, size, and manifest data, with a fallback to hardcoded values if necessary.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:e3m4c6
 * @lastUpdated 2026-06-15T16:09:49.752Z
 */

/**
 * OMEGA Cell Metrics (Era 7.2.3)
 * Physical dimensions and geometric mapping for industrial components.
 * 
 * Now uses manifest.ui.sizes as primary source, with hardcoded RADIUS_MAP
 * as fallback for manifests that haven't been migrated yet.
 */
 
import type { OmegaNode, OMEGA_Manifest } from '../../types/manifest';
import { parseVariant } from './VariantParser';
 
const RADIUS_MAP: Record<string, Record<string, number>> = {
  knob: { A: 24, B: 18, C: 12, D: 9 },
  port: { A: 21, B: 18, C: 15, D: 12 },
  display: { A: 16.5, B: 13, C: 10, D: 7 },
  led: { A: 6, B: 4, C: 2.5, D: 1.5 },
  slider: { A: 6, B: 6, C: 6, D: 6 },
  switch: { A: 16, B: 12, C: 10, D: 8 },
  stepper: { A: 12, B: 9, C: 7, D: 6 },
  select: { A: 12, B: 12, C: 12, D: 12 }
};

/** Default fallback radius in pixels if no matching entry is found */
const DEFAULT_RADIUS = 12;
 
export function getComponentRadius(node: OmegaNode, manifest?: OMEGA_Manifest): number {
  const variantStr = node.style?.variant || 'default';
  const { size } = parseVariant(variantStr);
  const comp = node.cellRef || node.kind || 'knob';
  const typeKey = comp.includes('slider') ? 'slider' : comp;
  
  // Priority 1: manifest.ui.sizes (self-contained manifest)
  if (manifest?.ui?.sizes && size) {
    const resolvedSize = manifest.ui.sizes[size];
    if (resolvedSize !== undefined) {
      return resolvedSize;
    }
  }
  
  // Priority 2: RADIUS_MAP (legacy fallback)
  const sizeMap = RADIUS_MAP[typeKey] || RADIUS_MAP.knob;
  const radius = sizeMap ? sizeMap[size] : DEFAULT_RADIUS;
  
  return radius || DEFAULT_RADIUS;
}
