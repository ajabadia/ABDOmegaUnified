/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Gestiona el renderizado de HTML para estackear y posicionar elementos orbitantes alrededor de un componente central según las opciones especificadas.
 * @purpose_en Manages the rendering of HTML for stacking and positioning orbitant attachments around a central component according to specified options.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:3,sig:r2f2li
 * @lastUpdated 2026-06-15T16:09:44.471Z
 */

/**
 * OMEGA Attachment Stack Renderer (Era 7.2.3)
 * Logic for stacking and positioning orbitant attachments around a central component.
 */
 
import type { Attachment, OMEGA_Manifest } from '../../types/manifest';
import { AttachmentRenderer } from '../AttachmentRenderer';
import { ColorResolver } from '../../utils/ColorResolver';
 
export interface StackOptions {
  runtimeValue: number;
  steps: number;
  inherited?: { font?: string | undefined; size?: number | undefined; color?: string | undefined } | undefined;
  manifest?: OMEGA_Manifest | undefined;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
}
 
export function renderAttachmentStackHTML(
  pos: 'top' | 'bottom' | 'left' | 'right' | 'center', 
  attachments: Attachment[], 
  options: StackOptions
): string {
  const { runtimeValue, steps, inherited, resolveAsset } = options;
  const stackItems = attachments.filter((a) => a.position === pos);
 
  if (stackItems.length === 0) return '';
  
  const itemsHTML = stackItems.map((a) => {
    const resolvedStyle = ColorResolver.resolveStyle(a.style || {}, options.manifest);
    
    const html = AttachmentRenderer.renderAttachmentHTML({
      type: a.type,
      variant: a.variant,
      text: a.text || '',
      value: runtimeValue,
      steps: steps,
      style: {
        ...resolvedStyle,
        fontSize: a.fontSize,
        fontFamily: a.fontFamily,
        fontColor: a.fontColor,
      },
      inherited,
      manifest: options.manifest,
      resolveAsset: resolveAsset || undefined
    });
 
    // Apply manual offsets from manifest if present (1.5x scaling)
    const s = resolvedStyle as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawS = s as any;
    const offX = (rawS.offsetX !== undefined ? Number(rawS.offsetX) : (a.offsetX || 0)) * 1.5;
    const offY = (rawS.offsetY !== undefined ? Number(rawS.offsetY) : (a.offsetY || 0)) * 1.5;
    return `<div style="transform: translate(${offX}px, ${offY}px)">${html}</div>`;
  }).join('');
 
  return `<div class="attachment-stack stack-${pos}">${itemsHTML}</div>`;
}
