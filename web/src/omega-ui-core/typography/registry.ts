/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @purpose Gestiona definiciones y categorías de fuentes para el editor de manifesto OMEGA.
 * @purpose_en Manages definitions and categories of fonts for the OMEGA manifest editor.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:5,imports:0,sig:raxq2z
 * @lastUpdated 2026-06-15T16:10:43.061Z
 */

/**
 * ⚠️ OMEGA UI CORE — DO NOT EDIT (READ-ONLY REPLICA NOTICE)
 * ---------------------------------------------------------------------------
 * This file is part of the central OMEGA UI Core (abd-ia_synths).
 * Any changes made directly in ABDOmega/ui/omega-ui-core WILL BE OVERWRITTEN.
 * 
 * Master Source: d:/desarrollos/ABDSynthsWeb/abd-ia_synths/src/omega-ui-core/
 * ---------------------------------------------------------------------------
 */
 
export interface OmegaFont {
  id: string;
  name: string;
  category: 'ui' | 'branding' | 'digital' | 'technical';
  description: string;
  isProtected: boolean;
}
 
export const OMEGA_OFFICIAL_FONTS: OmegaFont[] = [
  {
    id: 'inter',
    name: 'Inter',
    category: 'ui',
    description: 'Standard Industrial UI & Labeling',
    isProtected: true
  },
  {
    id: 'outfit',
    name: 'Outfit',
    category: 'branding',
    description: 'Headlines, Branding & High-Density Titles',
    isProtected: true
  },
  {
    id: 'seven-segment',
    name: 'Seven Segment',
    category: 'digital',
    description: 'LCD / LED Digital Displays',
    isProtected: true
  },
  {
    id: 'microgramma',
    name: 'Microgramma',
    category: 'technical',
    description: 'Technical Specs & Vintage Aero-Industrial Labels',
    isProtected: true
  }
];
 
export const PROTECTED_FONT_NAMES = OMEGA_OFFICIAL_FONTS.map(f => f.name);
 
export type TypographyCategory = 'headings' | 'labels' | 'displays' | 'technical';
 
export const TYPOGRAPHY_CATEGORIES: { id: TypographyCategory; label: string; defaultFont: string; defaultSize: number }[] = [
  { id: 'headings', label: 'Module Headings', defaultFont: 'Outfit', defaultSize: 12 },
  { id: 'labels', label: 'Component Labels', defaultFont: 'Inter', defaultSize: 8 },
  { id: 'displays', label: 'Digital Displays', defaultFont: 'Seven Segment', defaultSize: 14 },
  { id: 'technical', label: 'Technical Specs', defaultFont: 'Microgramma', defaultSize: 7 }
];
