/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Proporciona información sobre el tamaño y el color de las cadenas de strings industriales.
 * @purpose_en Parses industrial variant strings to extract size and color information.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:1ysjqqm
 * @lastUpdated 2026-06-15T16:09:58.273Z
 */

/**
 * OMEGA Variant Parser (Era 7.2.3)
 * Unified logic to extract size and color information from industrial variant strings.
 */
 
export interface ParsedVariant {
  size: string;
  colorId: string;
}
 
export function parseVariant(variant: string | undefined): ParsedVariant {
  const v = variant || 'B_cyan';
  const parts = v.split('_');
  
  let size = parts[0] || 'B';
  
  // Industrial exceptions for specific millimetric sizes
  if (v.includes('_3mm')) size = 'D';
  if (v.includes('_5mm')) size = 'C';
  
  // Color extraction (filter out size and technical suffixes)
  const colorId = parts.length > 1 
    ? parts.filter(p => p !== size && p !== '3mm' && p !== '5mm').join('_') 
    : 'cyan';
    
  return { size, colorId };
}
