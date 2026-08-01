/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Renderiza plantillas HTML para un botón de estado personalizable con opciones de tamaño, color y estado activo.
 * @purpose_en Renders HTML for a customizable state toggle switch with options for size, color, and active state.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:1cp1sea
 * @lastUpdated 2026-06-15T16:09:24.532Z
 */

/**
 * OMEGA UI CORE — Stateless Switch Renderer (Era 7.2.3)
 * Single Source of Truth for Industrial Toggle Switches.
 */

export interface SwitchProps {
  size: string;      // A, B, C, D
  colorId: string;   // cyan, red, orange, etc.
  value: number;     // 0 (off) or 1 (on)
  id?: string;       // Canonical ID
  inheritedFont?: string | undefined;
  inheritedSize?: number | undefined;
  inheritedColor?: string | undefined;
}

export const renderSwitchHTML = (props: SwitchProps): string => {
  const { size, colorId, value, id } = props;
  const isActive = value >= 0.5;

  return `
    <div class="switch-container size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ''}>
      <div class="sw-led ${!isActive ? 'active' : ''}"></div>
      <div class="sw-led ${isActive ? 'active' : ''}"></div>
    </div>
  `.trim();
};
