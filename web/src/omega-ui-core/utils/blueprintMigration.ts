/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @purpose Gestiona plantillas de Blueprint para uso del editor de manifesto OMEGA.
 * @purpose_en Converts legacy BlueprintDefinitions to GroupNode format for OMEGA manifest editor usage.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:nbax0t
 * @lastUpdated 2026-06-15T16:55:15.921Z
 */

/**
 * Blueprint migration utility: converts legacy BlueprintDefinition
 * (OmegaBlueprintNode tree) to new GroupNode format.
 *
 * Phase 4 — usage: convertBlueprintToGroupNode(oldBlueprint)
 */

import type { GroupNode, ComponentNode, ComponentStyle } from '../types/rack';

interface LegacyBlueprint {
  blueprintId: string;
  version: string;
  name: string;
  origin: string;
  description?: string;
  rootNode: LegacyNode;
}

interface LegacyNode {
  id: string;
  kind: string;
  role?: string;
  layout?: {
    pos: { x: number; y: number };
    size?: { width: number; height: number };
    mode?: string;
    padding?: number;
    gap?: number;
  };
  style?: Record<string, unknown>;
  children?: LegacyNode[];
  cellRef?: string;
  bind?: string;
  overrides?: Record<string, unknown>;
}

const CELL_REF_TO_TYPE: Record<string, string> = {
  knob: 'knob',
  'slider-v': 'slider',
  'slider-h': 'slider',
  port: 'port',
  led: 'led',
  switch: 'switch',
  display: 'display',
  label: 'label',
  button: 'button',
  stepper: 'button',
  push: 'button',
};

function extractStyle(legacyStyle?: Record<string, unknown>): ComponentStyle {
  if (!legacyStyle) return {};
  const s: ComponentStyle = {};
  if (legacyStyle.variant) s.variant = String(legacyStyle.variant);
  if (legacyStyle.color) s.color = String(legacyStyle.color);
  if (legacyStyle.indicatorColor) s.indicatorColor = String(legacyStyle.indicatorColor);
  if (legacyStyle.glowColor) s.glowColor = String(legacyStyle.glowColor);
  if (legacyStyle.asset) s.asset = String(legacyStyle.asset);
  if (legacyStyle.frames !== undefined) s.frames = Number(legacyStyle.frames);
  if (legacyStyle.font) s.font = String(legacyStyle.font);
  if (legacyStyle.fontSize !== undefined) s.fontSize = Number(legacyStyle.fontSize);
  if (legacyStyle.fontColor) s.fontColor = String(legacyStyle.fontColor);
  if (legacyStyle.opacity !== undefined) s.opacity = Number(legacyStyle.opacity);
  return s;
}

function convertLegacyNode(node: LegacyNode): ComponentNode {
  const type = CELL_REF_TO_TYPE[node.cellRef || ''] || 'knob';
  const style = extractStyle(node.style);

  if (node.overrides?.text) {
    style.label = String(node.overrides.text);
  }

  const result: ComponentNode = {
    id: node.id,
    type: type as ComponentNode['type'],
    label: (node.overrides?.label as string) || node.id,
    pos: {
      x: node.layout?.pos?.x ?? 0,
      y: node.layout?.pos?.y ?? 0,
    },
    size: {
      width: node.layout?.size?.width ?? 48,
      height: node.layout?.size?.height ?? 48,
    },
    style,
  };

  if (node.bind) {
    result.bind = { target: node.bind };
  }

  return result;
}

export function convertBlueprintToGroupNode(blueprint: LegacyBlueprint): GroupNode {
  const root = blueprint.rootNode;

  if (root.kind === 'container' || root.kind === 'group') {
    const children = (root.children || []).map(convertLegacyNode);

    const group: GroupNode = {
      id: blueprint.blueprintId,
      label: blueprint.name,
      pos: {
        x: root.layout?.pos?.x ?? 0,
        y: root.layout?.pos?.y ?? 0,
      },
      children,
    };

    return group;
  }

  // If root is not a container (single node), wrap it in a group
  const singleChild = convertLegacyNode(root);
  return {
    id: blueprint.blueprintId,
    label: blueprint.name,
    pos: { x: 0, y: 0 },
    children: [singleChild],
  };
}

export function groupNodeToBlueprintJson(group: GroupNode): string {
  return JSON.stringify(group, null, 2);
}
