/**
 * @purpose Gestiona la creación de plantillas técnicas industriales (SVG) a partir de manifestos CAD OMEGA utilizando opciones y activos proporcionados.
 * @purpose_en Manages the creation of technical industrial blueprints (SVG) from OMEGA CAD manifests using provided options and assets.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:2,imports:1,sig:1p6pkkh
 * @lastUpdated 2026-06-15T16:56:42.154Z
 */

/**
 * OMEGA CAD Export Service (v7.2.3)
 * Generates technical industrial blueprints (SVG) from manifests.
 */
import type { OMEGA_Manifest } from '../types/manifest';

export interface CADOptions {
  skin: string;
  drillLayer: boolean;
  silkscreenLayer: boolean;
  dimensions: boolean;
  resolveAsset?: (id: string) => string | undefined; // Base64 or URL
}

const PIXELS_TO_MM = 0.33866; // 1 HP = 5.08mm = 15px

export class CADExportService {
  static generateSVGBlueprint(manifest: OMEGA_Manifest, options: CADOptions): string {
    const { skin, drillLayer, silkscreenLayer, dimensions, resolveAsset } = options;
    const hp = manifest.metadata?.rack?.hp || 12;
    const rackWidthPx = hp * 15 * 1.5;
    const rackHeightPx = (manifest.ui?.dimensions?.height || (manifest.metadata?.rack?.height_mode === 'compact' ? 140 : 420)) * 1.5;
    const margin = 100; // Larger margin for annotations

    const containers = manifest.ui?.layout?.containers || [];
    const elements = [
      ...(manifest.ui?.controls || []).map(e => ({ ...e, isJack: false })),
      ...(manifest.ui?.jacks || []).map(e => ({ ...e, isJack: true }))
    ];

    const skinColor = skin === 'carbon' ? '#080808' : skin === 'minimal' ? '#f0f0f0' : skin === 'glass' ? '#1a1a1a' : '#111111';
    const accentColor = skin === 'minimal' ? '#000000' : '#00f0ff';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rackWidthPx + margin * 2}" height="${rackHeightPx + margin * 2}" viewBox="0 0 ${rackWidthPx + margin * 2} ${rackHeightPx + margin * 2}">
      <rect width="100%" height="100%" fill="${silkscreenLayer && !drillLayer ? skinColor : '#000'}" />
      
      <g transform="translate(${margin}, ${margin})">
        <!-- RACK CHASSIS -->
        <rect width="${rackWidthPx}" height="${rackHeightPx}" fill="${skinColor}" stroke="${accentColor}" stroke-width="1" rx="2" opacity="${silkscreenLayer ? 1 : 0.2}" />
        
        <!-- TECHNICAL HEADER -->
        <text x="0" y="-40" fill="${accentColor}" font-family="monospace" font-size="12" font-weight="900">OMEGA CAD [ ${(manifest.id || 'anonymous').toUpperCase()} ]</text>
        <text x="0" y="-25" fill="rgba(255,255,255,0.4)" font-family="monospace" font-size="8">FORMAT: Era 7.2.3 Industrial | CALIBRATION: 1px = ${PIXELS_TO_MM}mm</text>

        ${silkscreenLayer ? `
        <!-- CONTAINERS & BRANDING -->
        ${containers.map(c => {
          const bgUrl = resolveAsset && c.asset ? resolveAsset(c.asset) : null;
          return `
          <g>
            <rect x="${c.pos.x * 1.5}" y="${c.pos.y * 1.5}" width="${(typeof c.size.w === 'number' ? c.size.w : 100) * 1.5}" height="${(typeof c.size.h === 'number' ? c.size.h : 100) * 1.5}" fill="${c.color || 'rgba(255,255,255,0.02)'}" stroke="rgba(255,255,255,0.1)" stroke-width="0.5" />
            ${bgUrl ? `<image x="${c.pos.x * 1.5}" y="${c.pos.y * 1.5}" width="${(typeof c.size.w === 'number' ? c.size.w : 100) * 1.5}" height="${(typeof c.size.h === 'number' ? c.size.h : 100) * 1.5}" href="${bgUrl}" />` : ''}
            <text x="${c.pos.x * 1.5 + 5}" y="${c.pos.y * 1.5 + 10}" fill="rgba(255,255,255,0.3)" font-family="monospace" font-size="7" font-weight="900">${c.label.toUpperCase()}</text>
          </g>`;
        }).join('')}
        ` : ''}

        <!-- ELEMENTS -->
        ${elements.map(e => {
          const ex = e.pos.x * 1.5;
          const ey = e.pos.y * 1.5;
          const assetId = e.presentation?.asset;
          const assetUrl = resolveAsset && assetId ? resolveAsset(assetId) : null;
          
          return `
          <g transform="translate(${ex}, ${ey})">
            ${drillLayer ? `
              <!-- DRILL CENTER MARK -->
              <line x1="-10" x2="10" y1="0" y2="0" stroke="#ff0000" stroke-width="0.5" />
              <line x1="0" x2="0" y1="-10" y2="10" stroke="#ff0000" stroke-width="0.5" />
              <circle r="${e.isJack ? 6 * 1.5 : 4 * 1.5}" fill="none" stroke="#ff0000" stroke-width="0.2" />
            ` : ''}

            ${silkscreenLayer ? `
              <!-- VISUAL PRIMITIVE -->
              ${assetUrl ? `<image x="-20" y="-20" width="40" height="40" href="${assetUrl}" />` : `
                <circle r="${e.isJack ? 10 : 15}" fill="none" stroke="${accentColor}" stroke-width="1" />
              `}
              <text y="30" fill="${accentColor}" font-family="monospace" font-size="8" font-weight="900" text-anchor="middle">${e.label?.toUpperCase() || e.id.toUpperCase()}</text>
              ${dimensions ? `<text y="40" fill="rgba(255,255,255,0.4)" font-family="monospace" font-size="5" text-anchor="middle">${Math.round(ex * PIXELS_TO_MM)}mm , ${Math.round(ey * PIXELS_TO_MM)}mm</text>` : ''}
            ` : ''}
          </g>`;
        }).join('')}
      </g>
    </svg>`;

    return svg;
  }
}
