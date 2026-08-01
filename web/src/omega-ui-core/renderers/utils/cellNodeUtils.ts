/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:05
   ================================================================= */

/**
 * @purpose Constantes y utilidades compartidas para nodos de celda UCA: mapeo de tipos de componente y conversión de OmegaNode a ComponentNode.
 * @purpose_en Shared constants and utilities for UCA cell nodes: component type mapping and OmegaNode to ComponentNode conversion.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:3,imports:2,sig:ojllbt
 * @lastUpdated 2026-06-20T22:29:06.555Z
 */

import type { OmegaNode } from '../../types/manifest';
import type { ComponentNode, ComponentType } from '../../types/rack';

/** Maps OmegaNode cellRef/kind to ComponentType */
export const COMP_TYPE_MAP: Record<string, ComponentType> = {
  'knob': 'knob', 'slider-v': 'slider', 'slider-h': 'slider',
  'slider': 'slider', 'switch': 'switch', 'button': 'button',
  'port': 'port', 'led': 'led', 'display': 'display', 'label': 'label',
};

/** Describes the base (unscaled) size for each cell kind */
export const BASE_CELL_SIZES: Record<string, { width: number; height: number }> = {
  'knob': { width: 36, height: 36 },
  'slider-v': { width: 20, height: 64 },
  'slider-h': { width: 64, height: 20 },
  'button': { width: 24, height: 24 },
  'switch': { width: 24, height: 40 },
  'led': { width: 14, height: 14 },
  'display': { width: 80, height: 40 },
  'label': { width: 60, height: 16 },
};

/**
 * Converts an OmegaNode to a ComponentNode for rendering via primitives.
 */
export function omegaNodeToComponentNode(node: OmegaNode): ComponentNode {
  const compType = node.cellRef || node.kind || 'knob';
  const type = COMP_TYPE_MAP[compType] || 'knob';
  return {
    id: node.id,
    type,
    label: (node.meta?.label as string) || node.id || '',
    pos: { x: node.layout?.pos?.x || 0, y: node.layout?.pos?.y || 0 },
    size: node.layout?.size
      ? { width: node.layout.size.width || 48, height: node.layout.size.height || 48 }
      : { width: 48, height: 48 },
    style: (node.style || {}) as ComponentNode['style'],
    bind: node.bind ? { target: node.bind } : undefined,
    visible: node.visible,
    locked: node.locked,
  };
}
