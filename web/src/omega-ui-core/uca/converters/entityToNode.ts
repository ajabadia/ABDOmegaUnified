/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @purpose Gestiona un ManifestEntity plano en una node formal UCA OmegaNode para su renderizado en el editor de manifestos OMEGA.
 * @purpose_en Converts a flat ManifestEntity into a formal UCA OmegaNode for rendering in the OMEGA manifest editor.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1pi7u7e
 * @lastUpdated 2026-06-15T16:11:03.830Z
 */

import type { ManifestEntity, OmegaNode, NodeRole } from '../../types/manifest';

/**
 * OMEGA UCA - Entity to Node Converter
 * Converts a flat ManifestEntity (Era 7.2 legacy structure) into a formal UCA OmegaNode.
 */
export function entityToNode(entity: ManifestEntity): OmegaNode {
  return {
    id: entity.id,
    kind: 'cell',
    role: (entity.role as NodeRole) || 'control',
    bind: entity.bind || undefined,
    layout: {
      pos: { x: 0, y: 0 }, // Relative to its parent (usually 0 in isolation)
      size: entity.presentation?.size ? {
        width: entity.presentation.size.width,
        height: entity.presentation.size.height
      } : undefined
    },
    style: {
      ...entity.presentation?.style,
      // Ensure key visual properties are preserved
      asset: entity.presentation?.asset || entity.presentation?.style?.asset,
      fitting: entity.presentation?.fitting || entity.presentation?.style?.fitting
    },
    cellRef: entity.type || entity.presentation?.component,
    children: (entity.presentation?.attachments || []).map(a => ({
      id: a.id,
      kind: 'asset-layer',
      role: (a.role as NodeRole) || 'decor',
      bind: a.bind || undefined,
      layout: {
        pos: { x: a.offsetX, y: a.offsetY }
      },
      style: {
        ...a.style,
        font: a.fontFamily || a.style?.font,
        fontSize: a.fontSize || a.style?.fontSize,
        fontColor: a.fontColor || a.style?.fontColor
      }
    })) as OmegaNode[]
  };
}
