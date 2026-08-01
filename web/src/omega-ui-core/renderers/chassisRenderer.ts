/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Renderiza el marco principal del frame del módulo (chassis) con posiciónación de tornillos canónica.
 * @purpose_en Renders the main module frame (chassis) with canonical screw positioning.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:1cnfklc
 * @lastUpdated 2026-06-19T18:57:06.508Z
 */

import type { OmegaNode, OmegaStyleNode, StyleVariant, Attachment } from '../types/manifest';
import type { CellOptions } from './cellRendererTypes';
import { ColorResolver } from '../utils/ColorResolver';

/**
 * Renders the main module frame (chassis) with canonical screw positioning.
 */
export function renderRackHTML(node: OmegaNode, options: CellOptions): string {
  const { manifest, resolveAsset, activeTab = 'MAIN' } = options;
  const style = node.style || {};
  const variant = style.variant || 'default';

  // Resolve the style for this specific tab if mapping exists
  const tabStyleId = manifest?.ui?.layout?.tabStyles?.[activeTab];
  const targetStyleId = tabStyleId || variant;

  const rackStyles = manifest?.ui?.styles?.rack || [];
  const libStyle = rackStyles.find((s: StyleVariant) => s.id === targetStyleId) || { aesthetics: {} as Partial<OmegaStyleNode> };
  const genetics = libStyle.aesthetics || {};
  const aesthetics = style as OmegaStyleNode;

  const bgColor = ColorResolver.resolve(aesthetics.color || genetics.color || 'chassis', manifest);

  // Resolve bgAsset with Tab-Awareness
  const faceplateConfig = manifest?.ui?.faceplate;
  let bgAsset = aesthetics.asset || genetics.asset;

  if (!bgAsset && faceplateConfig) {
    if (typeof faceplateConfig === 'string') {
      bgAsset = faceplateConfig;
    } else {
      bgAsset = (faceplateConfig as Record<string, string>)[activeTab] || (faceplateConfig as Record<string, string>)['MAIN'];
    }
  }

  const resolveBackgroundCSS = (assetId: string | undefined, fitting: string = 'stretch') => {
    const url = resolveAsset ? resolveAsset(assetId) : undefined;
    if (!url) return '';

    let bgSize = '100% 100%';
    let repeat = 'no-repeat';
    const position = 'center';

    switch (fitting) {
      case 'cover': bgSize = 'cover'; break;
      case 'contain': bgSize = 'contain'; break;
      case 'tile': bgSize = 'auto'; repeat = 'repeat'; break;
      case 'center': bgSize = 'auto'; break;
    }

    return `background-image: url('${url}') !important; background-size: ${bgSize} !important; background-repeat: ${repeat} !important; background-position: ${position} !important;`;
  };

  const faceplateMode = (manifest?.ui?.faceplate as Record<string, unknown>)?.mode as string || 'stretch';
  const bgStyles = resolveBackgroundCSS(bgAsset, faceplateMode);

  const rounding = aesthetics.rounding ?? genetics.rounding ?? 0;
  const borderWidth = aesthetics.borderWidth ?? genetics.borderWidth ?? 0;

  const attachments = ((style as Record<string, unknown>)?.attachments as Attachment[]) || [];
  const screwFragment = attachments?.find((a: Attachment) => a.type === 'knob' && a.variant === 'rack-screw');

  const sAesthetics = (screwFragment?.style || {}) as OmegaStyleNode;
  const rackScrewStyles = manifest?.ui?.styles?.['rack-screw'] || [];
  const sGenetics = rackScrewStyles.find((s) => s.id === (screwFragment?.variant || 'default'))?.aesthetics || {};

  const hardware = (manifest?.ui?.hardware || {}) as Record<string, unknown>;
  const screwSpacing = sAesthetics.spacing ?? sGenetics.spacing ?? 8;
  const screwCount = (hardware.screwCount as number) ?? 4;
  const screwMapping = (hardware.screwMapping as string[]) || [];
  const masterScrewOffset = hardware.screwOffset as number | undefined;
  const finalScrewSpacing = masterScrewOffset !== undefined ? masterScrewOffset : screwSpacing;

  // Define standard positions based on count
  const positions: { top: boolean; left: boolean; xPercent?: number; yPercent?: number }[] = [];
  if (screwCount >= 4) {
    positions.push({ top: true, left: true });
    positions.push({ top: true, left: false });
    positions.push({ top: false, left: true });
    positions.push({ top: false, left: false });
  }
  if (screwCount === 6) {
    positions.push({ top: true, left: false, xPercent: 50 }); // Top Mid
    positions.push({ top: false, left: false, xPercent: 50 }); // Bottom Mid
  } else if (screwCount === 8) {
    positions.push({ top: true, left: false, xPercent: 33 }); // Top Mid L
    positions.push({ top: true, left: false, xPercent: 66 }); // Top Mid R
    positions.push({ top: false, left: false, xPercent: 33 }); // Bottom Mid L
    positions.push({ top: false, left: false, xPercent: 66 }); // Bottom Mid R
  }

  const renderScrew = (pos: typeof positions[0], idx: number) => {
    // Resolve style for this specific position
    const posStyleId = screwMapping[idx];
    const posLibStyle = manifest?.ui?.styles?.['mounting-screw']?.find((s: StyleVariant) => s.id === posStyleId);
    const posAesthetics = posLibStyle?.aesthetics || {};

    const sColor = ColorResolver.resolve(posAesthetics.color || sAesthetics.color || sGenetics.color || 'hardware', manifest);
    const sAssetId = posAesthetics.asset || sAesthetics.asset || sGenetics.asset;
    const sFitting = posAesthetics.fitting || sAesthetics.fitting || sGenetics.fitting || 'cover';
    const sAssetCSS = resolveBackgroundCSS(sAssetId, sFitting);

    const stylePos = `
        position: absolute;
        ${pos.top ? 'top' : 'bottom'}: ${finalScrewSpacing}px;
        ${pos.xPercent ? `left: ${pos.xPercent}%; transform: translateX(-50%);` : (pos.left ? 'left' : 'right') + `: ${finalScrewSpacing}px;`}
      `;

    return `
        <div style="
          ${stylePos}
          width: 14px;
          height: 14px;
          background-color: ${sAssetCSS ? 'transparent' : sColor};
          ${sAssetCSS || `
            background-image:
              radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 40%),
              radial-gradient(circle at center, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 20%, transparent 60%),
              linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.2) 100%) !important;
            background-size: cover !important;
          `}
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${sAssetCSS ? '' : `
            <div style="
              width: 8px;
              height: 2px;
              background-color: rgba(0,0,0,0.4);
              transform: rotate(45deg);
              border-radius: 1px;
            "></div>
          `}
        </div>
      `;
  };

  return `
      <div class="industrial-rack-chassis"
        style="position: absolute; inset: 0; background-color: ${bgColor}; ${bgStyles} border-radius: ${rounding}px; border: ${borderWidth}px solid rgba(255,255,255,0.05); overflow: hidden;">
        ${screwFragment ? positions.map((p, i) => renderScrew(p, i)).join('') : ''}
      </div>
    `.trim();
}
