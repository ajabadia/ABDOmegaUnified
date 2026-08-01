/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Renderiza plantillas para contenedores, grupos y platos según el nodo y las opciones proporcionadas.
 * @purpose_en Renders HTML for containers, groups, and plates based on the provided node and options.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:zhn77g
 * @lastUpdated 2026-06-19T18:57:16.049Z
 */

import type { OmegaNode, OmegaStyleNode } from '../types/manifest';
import type { CellOptions } from './cellRendererTypes';
import { ColorResolver } from '../utils/ColorResolver';

/**
 * ARCHITECTURAL RENDERER
 * Handles Containers, Groups and Plates.
 */
export function renderContainerHTML(node: OmegaNode, options: CellOptions): string {
  const { manifest, resolveAsset, isSelected, isError } = options;
  const style = node.style || {};
  const aesthetics = style as OmegaStyleNode;
  const variant = aesthetics.variant || 'default';

  const libStyles = manifest?.ui?.styles?.container || [];
  const libStyle = libStyles.find((s) => s.id === variant) || { aesthetics: {} as Partial<OmegaStyleNode> };
  const genetics = libStyle.aesthetics || {};

  const label = (node.meta?.label as string) || node.id || 'LABEL';

  // Resolved Chromatics
  const bgColor = ColorResolver.resolve(aesthetics.color || genetics.color, manifest);
  const borderColor = ColorResolver.resolve(aesthetics.indicatorColor || genetics.indicatorColor, manifest);
  const labelBg = ColorResolver.resolve(aesthetics.labelBg || genetics.labelBg, manifest);
  const fontColor = ColorResolver.resolve(aesthetics.fontColor || genetics.fontColor || '#ffffff', manifest);

  // Mechanical Properties
  const bgAsset = aesthetics.asset || genetics.asset;
  const bgUrl = resolveAsset ? resolveAsset(bgAsset) : undefined;
  const rounding = aesthetics.rounding ?? genetics.rounding ?? 0;
  const borderWidth = aesthetics.borderWidth ?? genetics.borderWidth ?? 0;
  const opacity = aesthetics.opacity ?? genetics.opacity ?? 1.0;

  // Spatial & Typographic Fragments
  const labelX = aesthetics.labelX ?? genetics.labelX ?? 0;
  const labelY = aesthetics.labelY ?? genetics.labelY ?? 0;
  const labelW = aesthetics.labelW ?? genetics.labelW ?? 0;
  const labelH = aesthetics.labelH ?? genetics.labelH ?? 0;
  const labelRounding = aesthetics.labelRounding ?? genetics.labelRounding ?? 0;
  const labelPadding = aesthetics.labelPadding ?? genetics.labelPadding ?? 4;
  const font = aesthetics.font || genetics.font || 'Inter';
  const fontSize = aesthetics.fontSize || genetics.fontSize || 10;
  const alignment = aesthetics.alignment || genetics.alignment || 'left';
  const flexAlign = alignment === 'left' ? 'flex-start' : (alignment === 'right' ? 'flex-end' : 'center');
  const spacing = aesthetics.spacing || genetics.spacing || 0;

  return `
      <div class="industrial-container-surface ${isSelected ? 'selected' : ''} ${isError ? 'error' : ''}"
        style="position: absolute; inset: 0; background-color: ${bgColor}; background-image: ${bgUrl ? `url(${bgUrl})` : 'none'}; background-size: cover; background-position: center; border: ${borderWidth}px solid ${borderColor}; border-radius: ${rounding}px; opacity: ${opacity}; overflow: hidden;">
        <div class="container-label-fragment"
          style="position: absolute; left: ${labelX}px; top: ${labelY}px; width: ${labelW ? `${labelW}px` : 'auto'}; height: ${labelH ? `${labelH}px` : 'auto'}; background-color: ${labelBg}; border-radius: ${labelRounding}px; display: flex; align-items: center; justify-content: ${flexAlign}; padding: ${labelPadding}px; white-space: nowrap; z-index: 10;">
          <span style="font-family: ${font}; font-size: ${fontSize}px; color: ${fontColor}; text-align: ${alignment}; letter-spacing: ${spacing}px; width: 100%;">
            ${isError ? '\u26A0\uFE0F INTEGRITY_LEAK' : label}
          </span>
        </div>
      </div>
    `.trim();
}
