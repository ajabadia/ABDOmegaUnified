/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @purpose Gestiona semánticas de nodo expandiendo plantillas, aplicando overrides y heredando estilos recursivamente.
 * @purpose_en Manages node semantics by expanding templates, applying overrides, and inheriting styles recursively.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Medium
 * @fingerprint exports:2,imports:2,sig:ridrya
 * @lastUpdated 2026-06-15T16:54:38.615Z
 */

import type { OmegaNode, CellTemplate, OmegaStyleNode, ModuleTemplate } from '../types/manifest';
import { mergeWithOverrides, applySlotMappings } from './treeUtils';

/**
 * UCA SEMANTICS (Phase 1)
 * Rules for node resolution, template expansion, and style inheritance.
 */

export interface ResolutionContext {
  catalog: Record<string, CellTemplate>;
  moduleTemplates?: Record<string, ModuleTemplate> | undefined; // [Phase 5] Global template registry
  parentStyle?: OmegaStyleNode | undefined;
}

/**
 * resolveNodeSemantics
 * Expands a node based on its template and applies the inheritance chain.
 */
export function resolveNodeSemantics(
  node: OmegaNode, 
  ctx: ResolutionContext
): OmegaNode {
  // 1. EXPAND TEMPLATE (Cell, Module, or Snapshot)
  let templateBase: Partial<OmegaNode> = {};

  // Strategy A: Portable Snapshot (Highest Priority)
  if (node.snapshot) {
    templateBase = JSON.parse(JSON.stringify(node.snapshot)) as Partial<OmegaNode>;
  } 
  // Strategy B: Module Template (Blueprint)
  else if (node.cellRef && ctx.moduleTemplates?.[node.cellRef]) {
    const template = ctx.moduleTemplates[node.cellRef];
    if (template) {
      const baseNode = template.baseNode;
      if (baseNode) {
        const blueprint = JSON.parse(JSON.stringify(baseNode)) as OmegaNode;
        // Apply Genetic Overrides
        templateBase = mergeWithOverrides(blueprint, node.overrides || {}, template.policy || []) as Partial<OmegaNode>;

        // Apply Slot Mappings (Recursive Binding Injection)
        if (node.slotMappings) {
          applySlotMappings(templateBase as OmegaNode, node.slotMappings);
        }
      }
    }
  }
  // Strategy C: Cell Template (Legacy Primitive)
  else if (node.kind === 'cell' && (node.cellRef || node.templateRef)) {
    const ref = node.cellRef || node.templateRef;
    const template = ctx.catalog[ref!];
    if (template) {
      templateBase = JSON.parse(JSON.stringify(template.baseNode)) as Partial<OmegaNode>;
    }
  }

  // 2. MERGE INSTANCE OVERRIDES
  const resolved: OmegaNode = {
    ...templateBase,
    ...node,
    layout: {
      ...templateBase.layout,
      ...node.layout,
      // Ensure position is at least 0,0 if not provided
      pos: node.layout?.pos || templateBase.layout?.pos || { x: 0, y: 0 }
    },
    style: {
      ...templateBase.style,
      ...node.style
    },
    children: [
      ...(templateBase.children || []),
      ...(node.children || [])
    ]
  };

  // 3. APPLY INHERITED STYLE/TOKENS (Era 7.2.3 Genetic Propagation)
  if (ctx.parentStyle) {
    resolved.style = {
      ...resolved.style,
      font: resolved.style?.font || ctx.parentStyle.font || undefined,
      fontColor: resolved.style?.fontColor || ctx.parentStyle.fontColor || undefined,
    };
  }

  // 4. RESOLVE LAYOUT/FRAME
  // If the instance didn't provide a size but the template did, ensure it's kept
  if (resolved.layout && !resolved.layout.size && templateBase.layout?.size) {
    resolved.layout.size = { ...templateBase.layout.size };
  }

  // 5. COMPUTE RENDERABLE CHILDREN (Recursive Resolution)
  if (resolved.children && resolved.children.length > 0) {
    resolved.children = resolved.children.map((child, index) => {
      const childCtx = {
        ...ctx,
        parentStyle: resolved.style
      };
      
      const resolvedChild = resolveNodeSemantics(child, childCtx);
      
      // Prevent ID collisions for nested template children
      // If the child doesn't have an ID or comes from a generic template
      if (!child.id) {
        resolvedChild.id = `${resolved.id}_child_${index}`;
      } else if (templateBase.children?.some(tc => tc.id === child.id)) {
        resolvedChild.id = `${resolved.id}_${child.id}`;
      }

      return resolvedChild;
    });
  }

  // 6. DISPATCH PRIMITIVE/COMPOUND
  return resolved;
}
