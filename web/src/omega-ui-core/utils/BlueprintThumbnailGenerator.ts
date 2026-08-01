/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @purpose Proporciona una cadena de SVG estática que representa el silhouette visual de un subarbol de plantilla basado en el tipo y posición del componente.
 * @purpose_en Generates a static SVG thumbnail string representing the visual silhouette of a blueprint subtree based on component type and position.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:104vegh
 * @lastUpdated 2026-06-15T16:55:26.911Z
 */

import type { OmegaNode } from '../types/manifest';

/**
 * Generates a static SVG thumbnail string representing the visual silhouette
 * of a blueprint subtree. Draws shapes based on component type and position.
 */
export function generateBlueprintThumbnail(
  rootNode: OmegaNode,
  options?: {
    width?: number;
    height?: number;
    padding?: number;
  }
): string {
  const pad = options?.padding ?? 8;
  const svgW = options?.width ?? 200;
  const svgH = options?.height ?? 140;

  // Compute bounding box of all children
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const walk = (node: OmegaNode) => {
    const px = node.layout?.pos?.x || 0;
    const py = node.layout?.pos?.y || 0;
    const pw = node.layout?.size?.width || 40;
    const ph = node.layout?.size?.height || 40;
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px + pw);
    maxY = Math.max(maxY, py + ph);
    node.children?.forEach(walk);
  };
  walk(rootNode);

  const contentW = maxX - minX || 100;
  const contentH = maxY - minY || 80;
  const scale = Math.min((svgW - pad * 2) / contentW, (svgH - pad * 2) / contentH, 3);
  const offsetX = (svgW - contentW * scale) / 2 - minX * scale;
  const offsetY = (svgH - contentH * scale) / 2 - minY * scale;

  const tx = (x: number) => offsetX + x * scale;
  const ty = (y: number) => offsetY + y * scale;
  const ts = (v: number) => v * scale;
  const sw = (v: number) => Math.max(0.5, ts(v));

  // Collect all leaf shapes from subtree
  const shapes: string[] = [];

  const renderNode = (node: OmegaNode) => {
    const cx = tx(node.layout?.pos?.x || 0);
    const cy = ty(node.layout?.pos?.y || 0);
    const w = ts(node.layout?.size?.width || 40);
    const h = ts(node.layout?.size?.height || 40);
    const cellRef = node.cellRef || node.kind;

    switch (cellRef) {
      case 'knob':
      case 'encoder':
      case 'pot':
        shapes.push(`<circle cx="${cx + w / 2}" cy="${cy + h / 2}" r="${Math.min(w, h) / 2 * 0.7}" fill="none" stroke="#00f0ff" stroke-width="${sw(1.5)}" />`);
        shapes.push(`<circle cx="${cx + w / 2}" cy="${cy + h / 2}" r="${Math.min(w, h) / 2 * 0.35}" fill="#00f0ff" opacity="0.3" />`);
        // Tick mark
        shapes.push(`<line x1="${cx + w / 2}" y1="${cy + h / 2 - Math.min(w, h) / 2 * 0.7}" x2="${cx + w / 2}" y2="${cy + h / 2 - Math.min(w, h) / 2 * 0.35}" stroke="#00f0ff" stroke-width="${sw(1.5)}" />`);
        break;
      case 'port':
      case 'jack':
      case 'input':
      case 'output':
        shapes.push(`<circle cx="${cx + w / 2}" cy="${cy + h / 2}" r="${Math.min(w, h) / 2 * 0.5}" fill="none" stroke="#ff6b35" stroke-width="${sw(1.5)}" />`);
        shapes.push(`<circle cx="${cx + w / 2}" cy="${cy + h / 2}" r="${Math.max(1, ts(2))}" fill="#ff6b35" />`);
        break;
      case 'led':
      case 'indicator':
        shapes.push(`<circle cx="${cx + w / 2}" cy="${cy + h / 2}" r="${Math.min(w, h) / 2 * 0.5}" fill="#ff0044" opacity="0.8" />`);
        break;
      case 'display':
      case 'screen':
        shapes.push(`<rect x="${cx + 2}" y="${cy + 2}" width="${w - 4}" height="${h - 4}" rx="3" fill="none" stroke="#00f0ff" stroke-width="${sw(1)}" opacity="0.6" />`);
        // Simulated text lines
        shapes.push(`<line x1="${cx + 6}" y1="${cy + h * 0.35}" x2="${cx + w - 6}" y2="${cy + h * 0.35}" stroke="#00f0ff" stroke-width="${sw(0.8)}" opacity="0.4" />`);
        shapes.push(`<line x1="${cx + 6}" y1="${cy + h * 0.55}" x2="${cx + w - 12}" y2="${cy + h * 0.55}" stroke="#00f0ff" stroke-width="${sw(0.8)}" opacity="0.3" />`);
        break;
      case 'slider':
      case 'fader':
        shapes.push(`<rect x="${cx + 2}" y="${cy + 2}" width="${w - 4}" height="${h - 4}" rx="2" fill="none" stroke="#00f0ff" stroke-width="${sw(1)}" opacity="0.5" />`);
        // Thumb
        shapes.push(`<rect x="${cx + 4}" y="${cy + h * 0.3}" width="${w - 8}" height="${h * 0.15}" fill="#00f0ff" opacity="0.5" rx="1" />`);
        break;
      case 'switch':
        shapes.push(`<rect x="${cx + w * 0.2}" y="${cy + h * 0.15}" width="${w * 0.6}" height="${h * 0.35}" rx="2" fill="none" stroke="#00f0ff" stroke-width="${sw(1.2)}" />`);
        shapes.push(`<circle cx="${cx + w / 2}" cy="${cy + h * 0.7}" r="${Math.max(1, ts(3))}" fill="#00f0ff" opacity="0.5" />`);
        break;
      case 'button':
      case 'push':
        shapes.push(`<rect x="${cx + w * 0.15}" y="${cy + h * 0.15}" width="${w * 0.7}" height="${h * 0.7}" rx="4" fill="none" stroke="#00f0ff" stroke-width="${sw(1.2)}" />`);
        break;
      case 'label':
      case 'text': {
        const labelText = String(node.meta?.label || node.id || '?').slice(0, 8);
        shapes.push(`<text x="${cx + w / 2}" y="${cy + h / 2 + 3}" fill="rgba(255,255,255,0.5)" font-family="monospace" font-size="${Math.max(2.5, ts(8))}" text-anchor="middle" dominant-baseline="middle">${labelText}</text>`);
        break;
      }
      case 'container':
      case 'face':
      case 'group':
        shapes.push(`<rect x="${cx}" y="${cy}" width="${w}" height="${h}" rx="4" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" stroke-width="${sw(1)}" stroke-dasharray="3,2" />`);
        // Label for containers
        if (node.meta?.label) {
          shapes.push(`<text x="${cx + 4}" y="${cy + 10}" fill="rgba(255,255,255,0.35)" font-family="monospace" font-size="${Math.max(2, ts(6))}" font-weight="bold">${String(node.meta.label).toUpperCase()}</text>`);
        }
        break;
      default:
        // Generic cell: draw a bordered box
        shapes.push(`<rect x="${cx + 1}" y="${cy + 1}" width="${w - 2}" height="${h - 2}" rx="3" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="${sw(1)}" />`);
        break;
    }

    // Render children for containers/groups
    if (node.children?.length) {
      node.children.forEach(renderNode);
    }
  };

  // Always render the root node FIRST (so container borders/labels appear),
  // then children on top (via renderNode's own recursion).
  renderNode(rootNode);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect width="100%" height="100%" fill="rgba(8,8,8,0.95)" rx="6" />
  ${shapes.join('\n  ')}
</svg>`;
}
