/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:04
   ================================================================= */

/**
 * @purpose Gestiona tokens de diseño inmutables para la gobernanza industrial en el editor de manifesto OMEGA.
 * @purpose_en Manages immutable design tokens for industrial governance in the OMEGA manifest editor.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:29psuq
 * @lastUpdated 2026-06-15T15:17:55.778Z
 */

/**
 * OMEGA ERA 7.2.3 - INDUSTRIAL DESIGN TOKENS
 * Immutable base constants for industrial governance.
 */

export const DESIGN_TOKENS = {
  colors: {
    primary: '#00f2ff',
    background: '#0e0e0f',
    surface: '#1a1c1e',
    weak: '#555555',
    text: '#ffffff',
  },
  radii: {
    xs: '2px',
    sm: '4px',
    md: '6px',
    panel: '8px',
  },
  materials: {
    rack: 'brushed-steel',
    faceplate: 'matte-carbon',
    control: 'matte-polymer',
  },
  lighting: {
    shadowAngle: 135,
    ambientIntensity: 0.5,
    specularIntensity: 0.2,
    surfaceGrain: 0.1,
    globalBlur: 0,
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
