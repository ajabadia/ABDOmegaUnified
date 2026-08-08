/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Convierte un arreglo plano de manifest en un árbol OmegaNode recursivo para la renderización en el editor de manifest OMEGA.
 * @purpose_en Converts a flat manifest array into a recursive OmegaNode tree for rendering in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Medium
 * @fingerprint exports:1,imports:1,sig:7r2fhv
 * @lastUpdated 2026-08-02T00:00:00.000Z
 */

import type { OmegaNode } from '../../types/manifest';
import type { OMEGA_Manifest } from '../../types/manifest';

/**
 * manifestToTree
 * Hydrates a recursive OmegaNode tree from flat manifest arrays.
 *
 * Parity with flatToTree:
 * - jacks (role:'io' | type:*jack* | presentation.component:'port') → cellRef:'port'
 * - controls → cellRef from the VISUAL component (component-first), then type
 * - containers propagate their variant into node.style.variant
 * - when existingTree is supplied, any node with a matching id keeps its prior
 *   layout.pos / layout.size / zIndex / style / meta instead of being recomputed
 *   from the flat data — editor edits are never wiped on manifest load.
 */

/**
 * Indexes every node of a tree by id (recursive), so edit state can be preserved.
 */
function indexTree(tree: OmegaNode | undefined, out: Map<string, OmegaNode> = new Map()): Map<string, OmegaNode> {
  if (!tree) return out;
  out.set(tree.id, tree);
  (tree.children || []).forEach(child => indexTree(child, out));
  return out;
}

export function manifestToTree(manifest: OMEGA_Manifest, existingTree?: OmegaNode): OmegaNode {
  const ui = manifest.ui;
  const containers = ui?.layout?.containers || [];
  const controls = ui?.controls || [];
  const jacks = ui?.jacks || [];

  const existingById = indexTree(existingTree);

  // Try to recover MAIN_FACE from existing tree if available (Phase 10.1C)
  const existingMainFace = existingTree?.children?.find(c => c.id === 'MAIN_FACE');

  // 1. Create the Root Rack
  const root: OmegaNode = {
    id: manifest.id || 'anonymous_rack',
    kind: 'rack',
    role: 'root',
    layout: {
      pos: existingTree?.layout?.pos || { x: 0, y: 0 },
      size: existingTree?.layout?.size || ui?.dimensions
    },
    children: []
  };

  // 2. Create the Primary Face (MAIN)
  const mainFace: OmegaNode = {
    id: 'MAIN_FACE',
    kind: 'face',
    role: 'presentation',
    layout: {
      pos: existingMainFace?.layout?.pos || { x: 0, y: 0 },
      size: existingMainFace?.layout?.size || ui?.dimensions
    },
    children: []
  };
  root.children?.push(mainFace);

  // 3. Map Containers
  const containerMap = new Map<string, OmegaNode>();
  containers.forEach(c => {
    const existing = existingById.get(c.id);
    const node: OmegaNode = {
      id: c.id,
      kind: 'container',
      role: 'infrastructure',
      layout: {
        pos: existing?.layout?.pos || c.pos,
        size: existing?.layout?.size ||
          ((typeof c.size.width === 'number')
            ? { width: c.size.width, height: c.size.height }
            : (typeof c.size.w === 'number' && typeof c.size.h === 'number')
              ? { width: c.size.w, height: c.size.h }
              : undefined),
        zIndex: existing?.layout?.zIndex ?? c.zIndex
      },
      style: existing?.style || {
        color: c.color || undefined,
        indicatorColor: c.indicatorColor || undefined,
        rounding: c.rounding || undefined,
        borderWidth: c.borderWidth || undefined,
        variant: c.variant || undefined
      },
      children: existing?.children || []
    };
    containerMap.set(c.id, node);
    mainFace.children?.push(node);
  });

  // 4. Map Entities (Controls & Jacks)
  const allEntities = [...controls, ...jacks];
  allEntities.forEach((entity, idx) => {
    const id = entity.id || entity.bind || `entity_${idx}`;
    const existing = existingById.get(id);
    const component = entity.presentation?.component;
    const isJack = entity.role === 'io'
      || entity.type?.startsWith?.('jack')
      || component === 'port';
    const cellRef = isJack ? 'port' : (component || entity.type || 'knob');

    const node: OmegaNode = {
      id,
      kind: 'cell',
      role: existing?.role || entity.role || (isJack ? 'io' : 'control'),
      bind: entity.bind || id,
      layout: {
        pos: existing?.layout?.pos || entity.pos,
        size: existing?.layout?.size ||
          (entity.presentation?.size ? {
            width: entity.presentation.size.width,
            height: entity.presentation.size.height
          } : undefined),
        zIndex: existing?.layout?.zIndex ?? entity.presentation?.style?.zIndex
      },
      style: existing?.style || ({
        ...entity.presentation?.style,
        variant: entity.presentation?.variant ?? entity.presentation?.style?.variant
      }),
      cellRef,
      meta: existing?.meta ?? (entity.label ? { label: entity.label } : undefined)
    };

    const containerId = entity.presentation?.container;
    const targetParent = containerId ? containerMap.get(containerId) : mainFace;

    if (targetParent) {
      targetParent.children = targetParent.children || [];
      targetParent.children.push(node);
    } else {
      mainFace.children?.push(node);
    }
  });

  return root;
}
