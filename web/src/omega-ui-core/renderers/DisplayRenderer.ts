/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Renderiza plantillas HTML para un componente de visualización basado en las propiedades proporcionadas.
 * @purpose_en Renders HTML templates for a display component based on provided properties.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:2,imports:0,sig:8g9jqy
 * @lastUpdated 2026-06-15T15:31:23.863Z
 */

/**
 * OMEGA UI CORE — Stateless Display Renderer (Era 7.2.3)
 * Single Source of Truth for Display HTML Structure.
 */

export interface DisplayProps {
  size: string;      // A, B, C, D
  colorId: string;   // cyan, orange, etc.
  mode: string;      // oled, lcd, led
  value: number;     // 0.0 to 1.0
  steps: number;     // Total steps to display
  id?: string | undefined;       // Canonical ID
  inheritedFont?: string | undefined;
  inheritedSize?: number | undefined;
  inheritedColor?: string | undefined;
  explicitGlassColor?: string | undefined; // Era 7.2.3 Custom Mode
  explicitTextColor?: string | undefined;  // Era 7.2.3 Custom Mode
}

export const renderDisplayHTML = (props: DisplayProps): string => {
  const { size, colorId, mode, value, steps, id, inheritedFont, inheritedSize, inheritedColor } = props;
  
  const displayValue = Math.round(value * (steps || 100));

  const contentColor = props.explicitTextColor || inheritedColor;

  const contentStyle = [
    inheritedFont ? `font-family: '${inheritedFont}'` : '',
    inheritedSize ? `font-size: ${inheritedSize}px` : '',
    contentColor ? `color: ${contentColor}` : ''
  ].filter(Boolean).join('; ');

  const glassStyle = props.explicitGlassColor ? `background-color: ${props.explicitGlassColor} !important; opacity: 0.3 !important;` : '';

  return `
    <div class="mini-display variant-${mode} size-${size} color-${colorId}" ${id ? `data-source="${id}"` : ''}>
      <div class="display-glass-overlay" style="${glassStyle}"></div>
      <div class="display-internal-glow"></div>
      <div class="display-scanlines"></div>
      <button class="display-btn minus" data-action="step-down">−</button>
      <div class="display-value" style="${contentStyle}">${displayValue}</div>
      <button class="display-btn plus" data-action="step-up">+</button>
    </div>
  `.trim();
};
