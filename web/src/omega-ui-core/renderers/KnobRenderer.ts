/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Renderiza plantillas HTML para un componente de tornillo según las propiedades proporcionadas, como tamaño, color, valor y otros atributos visuales.
 * @purpose_en Renders HTML for a knob component based on provided properties such as size, color, value, and other visual attributes.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:2,imports:1,sig:8ej6ng
 * @lastUpdated 2026-06-15T15:32:33.737Z
 */

/**
 * OMEGA UI CORE — Stateless Knob Renderer (Era 7.2.3)
 * Single Source of Truth for Knob HTML Structure.
 */
 
import type { OmegaStyleNode } from '../types/manifest';

export interface KnobProps {
  size: string;          // A, B, C, D
  colorId: string;       // cyan, orange, etc.
  value: number;         // 0.0 to 1.0
  isSelected?: boolean | undefined;
  isMain?: boolean | undefined;
  id?: string | undefined;           // Canonical ID
  rotationOffset?: number | undefined; // Standard: -135
  rotationRange?: number | undefined;  // Standard: 270
  assetUrl?: string | undefined;       // URL del recurso (blob o external)
  frames?: number | undefined;         // Número de frames en el filmstrip
  orientation?: 'v' | 'h' | undefined; // Orientación del strip
  inheritedFont?: string | undefined;
  inheritedSize?: number | undefined;
  inheritedColor?: string | undefined;
  explicitMarkerColor?: string | undefined; // Era 7.2.3 Custom Mode
  style?: OmegaStyleNode | undefined; // [NEW] Era 7.2.3 Granular Style Node
}

export const renderKnobHTML = (props: KnobProps): string => {
  const { 
    size, 
    colorId, 
    value, 
    isSelected, 
    isMain, 
    id, 
    rotationOffset = -135, 
    rotationRange = 270,
    assetUrl,
    frames,
    orientation = 'v',
    style: customStyle
  } = props;
  
  // Canonical rotation formula
  const rotation = rotationOffset + (value * rotationRange);
  const selectedClass = isMain && isSelected ? 'selected' : '';
  const hasAssetClass = assetUrl ? 'has-asset' : '';
  
  const classes = [
    'knob-container',
    `size-${size}`,
    `color-${colorId}`,
    selectedClass,
    hasAssetClass
  ].filter(Boolean).join(' ');
  
  // ERA 7.2.3 - CSS VARIABLE INJECTION
  const markerColor = props.explicitMarkerColor || customStyle?.indicatorColor || customStyle?.color;
  
  const inlineStyles = [
    customStyle?.color ? `--omega-color-override: ${customStyle.color}` : '',
    markerColor ? `--omega-indicator-color: ${markerColor}` : '',
    customStyle?.shadow ? `--omega-shadow: ${customStyle.shadow}` : '',
    customStyle?.opacity !== undefined ? `opacity: ${customStyle.opacity}` : ''
  ].filter(Boolean).join('; ');

  const capStyle = customStyle?.color ? `background-color: ${customStyle.color} !important;` : '';

  let assetHTML = '';
  if (assetUrl) {
    let backgroundStyle = `background-image: url(${assetUrl});`;
    if (frames && frames > 1) {
        // Filmstrip Logic: Calculate which frame to show
        const frameIndex = Math.min(Math.floor(value * frames), frames - 1);
        const percent = (frameIndex / (frames - 1)) * 100;
        backgroundStyle += orientation === 'v' 
            ? `background-position: 0% ${percent}%;` 
            : `background-position: ${percent}% 0%;`;
    }
    assetHTML = `<div class="knob-asset filmstrip-${orientation}" style="${backgroundStyle}"></div>`;
  }

  const markerStyle = `--knob-rotation: ${rotation}deg; ${markerColor ? `background-color: ${markerColor} !important;` : ''}`;

  return `
    <div class="${classes}" ${id ? `data-source="${id}"` : ''} style="${inlineStyles}">
      <div class="knob-shadow-ring"></div>
      ${assetHTML}
      <div class="knob-cap" style="${capStyle}">
        <div class="knob-specular"></div>
      </div>
      <div class="knob-marker" style="${markerStyle}"></div>
    </div>
  `.trim();
};
