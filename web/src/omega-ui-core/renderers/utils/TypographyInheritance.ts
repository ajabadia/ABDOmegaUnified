/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Gestiona la herencia de tipografía según categorías de componentes dentro de un manifesto OMEGA.
 * @purpose_en Manages the inheritance of typography according to component categories within an OMEGA manifest.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:1fzxzny
 * @lastUpdated 2026-06-15T16:09:54.298Z
 */

import type { OMEGA_Manifest } from '../../types/manifest';
 
/**
 * OMEGA Typography Inheritance Engine
 * ---------------------------------------------------------------------------
 * Logic for resolving global design tokens based on component categories.
 */
export interface InheritedTypography {
  font?: string;
  size?: number;
  color?: string;
}
 
export const getInheritedTypography = (compType: string, manifest?: OMEGA_Manifest): InheritedTypography => {
  const mapping = manifest?.ui?.typography;
  if (!mapping) return {};
 
  let cat: 'headings' | 'labels' | 'displays' | 'technical' = 'labels';
  
  // Rule-based category resolution
  if (compType === 'display' || compType === 'scope' || compType === 'terminal') {
    cat = 'displays';
  } else if (compType === 'port' || compType === 'knob' || compType === 'slider-v' || compType === 'slider-h' || compType === 'switch') {
    cat = 'labels';
  } else if (compType === 'stepper' || compType === 'button' || compType === 'push') {
    cat = 'labels'; // Or headings depending on branding
  }
  
  return mapping[cat] || {};
};
