/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Renderiza un menú desplegable sin estado para aplicaciones industriales utilizando OMEGA UI CORE.
 * @purpose_en Renders a stateless dropdown menu for industrial applications using OMEGA UI CORE.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:3,imports:0,sig:1b5tcwk
 * @lastUpdated 2026-06-15T16:09:07.743Z
 */

/**
 * OMEGA UI CORE — Stateless Select Renderer (Era 7.2.3)
 * Single Source of Truth for Industrial Dropdown Menus.
 */

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps {
  size: string;      // A, B, C, D
  colorId: string;   // cyan, orange, etc.
  value: number;     // Normalized index (0.0 to 1.0)
  options?: (string | SelectOption)[]; // List of available options or labels
  id?: string;       // Canonical ID
  inheritedFont?: string | undefined;
  inheritedSize?: number | undefined;
  inheritedColor?: string | undefined;
}

export const renderSelectHTML = (props: SelectProps): string => {
  const { size, colorId, value, options = [], id } = props;
  
  // Resolve current label based on normalized value
  const labels = options.length > 0 
    ? options.map(opt => typeof opt === 'string' ? opt : opt.label) 
    : ['NO OPTIONS'];
  
  const currentIndex = Math.min(labels.length - 1, Math.floor(value * labels.length));
  const currentLabel = labels[currentIndex];

  return `
    <div class="mini-select size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ''}>
      <div class="select-value">${(currentLabel || '').toUpperCase()}</div>

      <div class="select-arrow">▼</div>
    </div>
  `.trim();
};
