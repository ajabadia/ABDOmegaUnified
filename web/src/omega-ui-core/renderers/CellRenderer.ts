/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Renderiza el HTML para una celda en el editor de manifesto OMEGA según el nodo y las opciones proporcionados.
 * @purpose_en Renders the HTML for a cell in the OMEGA manifest editor based on the provided node and options.
 * @refactorable true (contains complex rendering logic and multiple UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:3,imports:10,sig:x6wsp5
 * @lastUpdated 2026-06-19T18:56:38.821Z
 */

import type { OmegaNode, Attachment } from '../types/manifest';
import type { CellOptions, MasterRendererProps } from './cellRendererTypes';
import { COMP_RENDERER_MAP } from './cellRendererMap';
import { renderRackHTML } from './chassisRenderer';
import { renderContainerHTML } from './ContainerRenderer';
import { parseVariant } from './utils/VariantParser';
import { getComponentRadius } from './utils/CellMetrics';
import { renderAttachmentStackHTML } from './utils/AttachmentStack';
import { getInheritedTypography } from './utils/TypographyInheritance';
import { resolveNodeStyle } from '../utils/StyleResolver';

export type { CellOptions } from './cellRendererTypes';
export type { MasterRendererProps } from './cellRendererTypes';

export class CellRenderer {
  /**
   * MASTER DISPATCHER
   */
  static renderCellHTML(node: OmegaNode, options: CellOptions): string {
    const { runtimeValue, steps, isSelected, resolveAsset, manifest } = options;
    const compType = node.cellRef || node.kind || 'knob';

    // 1. RACK BRANCH
    if (compType === 'rack') {
      return renderRackHTML(node, options);
    }

    // 2. ARCHITECTURAL BRANCH
    const isArchitectural = compType === 'container' || compType === 'group' || compType === 'face';
    if (isArchitectural) {
      return `
        <div class="architectural-cell" style="width: 100%; height: 100%; position: relative;">
          ${renderContainerHTML(node, options)}
        </div>
      `.trim();
    }

    // 3. PRIMITIVE BRANCH
    const variant = node.style?.variant || 'B_cyan';
    const parsed = parseVariant(variant);
    const size = (node.style?.scale as string) || parsed.size;
    const colorId = parsed.colorId;
    const compRadius = getComponentRadius(node, manifest);

    const resolved = resolveNodeStyle(node, manifest);
    const resolvedStyle = resolved.style;

    const assetId = resolvedStyle.asset || node.style?.asset;
    const assetDef = manifest?.resources?.assets?.find((a) => a.id === assetId);
    const assetUrl = resolveAsset ? resolveAsset(assetId) : assetId;

    const inherited = getInheritedTypography(node.kind as string, manifest);

    const commonProps = {
      size, colorId, value: runtimeValue, id: node.id,
      isSelected: !!isSelected, isMain: true, style: resolvedStyle,
    };

    const renderer = COMP_RENDERER_MAP[compType];
    let mainHTML = '';
    try {
      mainHTML = renderer
        ? renderer(node, commonProps as MasterRendererProps, {
            assetUrl: assetUrl as string,
            assetDef,
            steps,
            runtimeValue,
            inherited: inherited as Record<string, unknown>,
            manifest,
            forceFrame: options.forceFrame,
          })
        : `<div class="unsupported-renderer">NO RENDERER: ${compType}</div>`;
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`[CELL RENDERER] Fatal error in primitive ${compType}:`, error);
      mainHTML = `
        <div class="renderer-error" style="color: #ff3300; font-family: monospace; font-size: 8px; border: 1px solid #ff3300; padding: 4px; background: rgba(255,51,0,0.1);">
          ERROR: ${error.message}
        </div>
      `;
    }

    const attachments = ((node.style as Record<string, unknown>)?.attachments as Attachment[]) || [];
    const stackOptions = { runtimeValue, steps, inherited, manifest, resolveAsset };

    const cellOffsetX = ((node.style as Record<string, unknown>)?.offsetX as number || 0) * 1.5;
    const cellOffsetY = ((node.style as Record<string, unknown>)?.offsetY as number || 0) * 1.5;

    const containerWidth = resolvedStyle.width !== undefined ? resolvedStyle.width : (compRadius * 2 * 1.5);
    const containerHeight = resolvedStyle.height !== undefined ? resolvedStyle.height : (compRadius * 2 * 1.5);

    return `
      <div class="control-cell variant-${variant}" style="--comp-radius: ${compRadius}px;">
        ${renderAttachmentStackHTML('top', attachments, stackOptions)}
        ${renderAttachmentStackHTML('bottom', attachments, stackOptions)}
        ${renderAttachmentStackHTML('left', attachments, stackOptions)}
        ${renderAttachmentStackHTML('right', attachments, stackOptions)}
        ${renderAttachmentStackHTML('center', attachments, stackOptions)}
        <div class="cell-main" style="width: ${containerWidth}px; height: ${containerHeight}px; transform: translate(calc(-50% + ${cellOffsetX}px), calc(-50% + ${cellOffsetY}px))">
          ${mainHTML}
        </div>
      </div>
    `.trim();
  }
}
