/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Gestiona estilos y colores de señal según las propiedades de entrada.
 * @purpose_en Renders HTML for port components in the OMEGA manifest editor, managing styles and signal colors based on input properties.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:3,imports:1,sig:2v53w3
 * @lastUpdated 2026-06-15T16:08:12.044Z
 */

/**
 * OMEGA UI CORE — Stateless Port (Jack) Renderer (Era 7.2.3)
 * Single Source of Truth for Port HTML Structure.
 */
 
import type { OmegaStyleNode } from '../types/manifest';

export interface PortProps {
  size: string;          // A, B, C, D
  colorId: string;       // Default color from variant (cyan, accent, etc.)
  value: number;         // Signal value 0.0 to 1.0
  isSelected?: boolean | undefined;
  isMain?: boolean | undefined;
  id?: string | undefined;           // Canonical ID for data attributes
  label?: string | undefined;        // For color inference
  explicitColor?: string | undefined; // Explicit color from manifest (B_cyan, neon_amber)
  inheritedFont?: string | undefined;
  inheritedSize?: number | undefined;
  inheritedColor?: string | undefined;
  customSignalColor?: string | undefined; // Era 7.2.3 Custom Mode
  style?: OmegaStyleNode | undefined; // [NEW] Era 7.2.3 Granular Style Node
}

/**
 * Infers the technical signal color based on ID/Label/Variant
 * Syced with VPC v1.1 standards.
 */
export const inferPortSignalColor = (id: string = '', label: string = '', explicitColor?: string): string => {
  if (explicitColor) return `var(--signal-${explicitColor.toLowerCase().replace('b_', '')}, var(--wb-primary))`;
  
  const searchStr = `${id} ${label}`.toLowerCase();

  if (searchStr.includes('midi')) return 'var(--signal-midi)';
  if (searchStr.includes('gate') || searchStr.includes('trig')) return 'var(--signal-gate)';
  if (searchStr.includes('cv') || searchStr.includes('mod')) return 'var(--signal-cv)';
  if (searchStr.includes('pitch') || searchStr.includes('freq') || searchStr.includes('out') || searchStr.includes('in')) return 'var(--signal-audio)';
  
  return 'var(--wb-primary)';
};

export const renderPortHTML = (props: PortProps): string => {
  const { size, colorId, value, isSelected, isMain, id, label, explicitColor, customSignalColor, style: customStyle } = props;
  
  const signalColor = customSignalColor || inferPortSignalColor(id, label, explicitColor);
  const opacity = 0.3 + (value * 0.7);
  const selectedClass = isMain && isSelected ? 'selected' : '';
  
  const classes = [
    'port-socket',
    `size-${size}`,
    `color-${colorId}`,
    selectedClass
  ].filter(Boolean).join(' ');

  // ERA 7.2.3 - CSS VARIABLE INJECTION
  const inlineStyles = [
    customStyle?.color ? `--omega-color-override: ${customStyle.color}` : '',
    customStyle?.opacity !== undefined ? `opacity: ${customStyle.opacity}` : '',
    customStyle?.shadow ? `--omega-shadow: ${customStyle.shadow}` : ''
  ].filter(Boolean).join('; ');

  const ledStyle = `background-color: ${signalColor}; opacity: ${opacity};`;

  return `<div class="${classes}" ${id ? `data-source="${id}"` : ''} style="${inlineStyles}"><div class="port-inner"><div class="port-led" style="${ledStyle}"></div></div></div>`;
};
