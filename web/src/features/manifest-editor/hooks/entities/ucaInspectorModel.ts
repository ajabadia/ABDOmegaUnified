/**
 * @purpose Gestiona y mapea datos para el inspector de entidad en el editor de manifesto OMEGA.
 * @purpose_en Manages and maps data for the model inspector of entity in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:5,imports:2,sig:nxd8nk
 * @lastUpdated 2026-06-15T13:10:23.045Z
 */

import type { OmegaNode, OmegaStyleNode, Position, OverrideMode, OverridePolicy, ModuleTemplate, ManifestEntity } from '@/omega-ui-core/types/manifest';
import { findParentInTree } from './ucaInspectorAdapter';

export interface InspectorViewModel {
  id: string;
  role: string;
  bind: string;
  pos: Position;
  style: OmegaStyleNode;
  component: string;
  parentId?: string | undefined;
  constraints?: {
    clampToParent?: boolean | undefined;
    margin?: number | undefined;
  } | undefined;
  governance?: Record<string, OverrideMode>; 
  container?: string | undefined;
  colSpan?: number | undefined;
}

export function isUcaNode(item: unknown): item is OmegaNode {
  return !!item && typeof item === 'object' && 'kind' in (item as object);
}

export function mapNodeToInspectorModel(item: OmegaNode): InspectorViewModel {
  return {
    id: item.id,
    role: item.role || 'control',
    bind: item.bind || 'none',
    pos: item.layout?.pos || { x: 0, y: 0 },
    style: item.style || {} as OmegaStyleNode,
    component: item.cellRef || 'container',
    container: item.kind || 'cell',
    colSpan: (item.layout as { colSpan?: number })?.colSpan || 1
  };
}

export function getInspectorModel(
  item: ManifestEntity | OmegaNode, 
  rootTree?: OmegaNode,
  moduleTemplates?: Record<string, ModuleTemplate> 
): InspectorViewModel {
  if (!('kind' in item)) {
    // Legacy Adaptation for ManifestEntity
    return {
      id: item.id,
      role: item.role || (item.type as string) || 'control',
      bind: item.bind || 'none',
      pos: item.pos,
      style: (item.presentation?.style as unknown as OmegaStyleNode) || {},
      component: item.presentation?.component || 'knob',
      governance: {},
      container: item.presentation?.container
    };
  }

  // Freshness is now handled by PropertyPanel (Phase 4.2)
  const parent = rootTree ? findParentInTree(rootTree, item.id) : undefined;
  
  // Resolve Governance (Phase 5.1)
  let governance: Record<string, OverrideMode> = {};
  if (item.templateRef && moduleTemplates?.[item.templateRef]) {
    const template = moduleTemplates[item.templateRef];
    governance = resolveGovernance(template.policy);
  }

  return {
    id: item.id,
    role: item.role || 'control',
    bind: item.bind || 'none',
    pos: item.layout?.pos || { x: 0, y: 0 },
    style: item.style || {} as OmegaStyleNode,
    component: item.cellRef || (item.kind !== 'cell' ? item.kind : 'knob'),
    parentId: parent?.id,
    constraints: item.constraints,
    governance
  };
}

export function buildInspectorPatch(
  item: ManifestEntity | OmegaNode, 
  patch: Partial<InspectorViewModel>
): Partial<ManifestEntity> | Partial<OmegaNode> {
  if (!('kind' in item)) {
    // Legacy ManifestEntity Patch
    const legacyPatch: Partial<ManifestEntity> = {};
    if (patch.id !== undefined) legacyPatch.id = patch.id;
    if (patch.pos !== undefined) legacyPatch.pos = patch.pos;
    if (patch.role !== undefined) legacyPatch.role = patch.role;
    if (patch.bind !== undefined) legacyPatch.bind = patch.bind;
    return legacyPatch;
  }

  const nodePatch: Partial<OmegaNode> = {};
  if (patch.pos !== undefined) {
    nodePatch.layout = { ...item.layout, pos: patch.pos };
  }
  if (patch.style !== undefined) {
    nodePatch.style = { ...item.style, ...patch.style };
  }
  if (patch.role !== undefined) nodePatch.role = patch.role;
  if (patch.bind !== undefined) nodePatch.bind = patch.bind;
  if (patch.component !== undefined) nodePatch.cellRef = patch.component;
  if (patch.constraints !== undefined) nodePatch.constraints = patch.constraints;
  if (patch.container !== undefined) {
    nodePatch.layout = { 
      ...item.layout, 
      ...(nodePatch.layout || {}), 
      mode: patch.container as 'absolute' | 'stack-v' | 'stack-h'
    };
  }
  if (patch.colSpan !== undefined) {
    nodePatch.layout = { 
      ...item.layout, 
      ...(nodePatch.layout || {}), 
      colSpan: patch.colSpan 
    } as OmegaNode['layout'];
  }
  
  return nodePatch;
}

/**
 * resolveGovernance
 * Flattens the policy array into a direct path-to-mode map for the Inspector.
 */
function resolveGovernance(policy?: OverridePolicy[]): Record<string, OverrideMode> {
  const gov: Record<string, OverrideMode> = {};
  (policy || []).forEach((p: OverridePolicy) => {
    gov[p.path] = p.mode;
  });
  return gov;
}
