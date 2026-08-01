/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @purpose Gestiona y manipula nodos en una estructura de árbol para el editor de manifesto OMEGA, incluyendo mover nodos, calcular índices de inserción, fusionar overrides, aplicar mapeos de slots y encontrar nodos dentro del árbol.
 * @purpose_en Manages and manipulates nodes in a tree structure for the OMEGA manifest editor, including moving nodes, calculating insertion indices, merging overrides, applying slot mappings, and finding nodes within the tree.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Medium
 * @fingerprint exports:9,imports:1,sig:jw13qi
 * @lastUpdated 2026-06-15T16:54:20.140Z
 */

import type { OmegaNode, ModuleTemplate, OverridePolicy } from '../types/manifest';

/**
 * reorderChildren
 * Move a node within its parent's children array.
 */
export function moveChildInTree(root: OmegaNode, parentId: string, nodeId: string, targetIndex: number): OmegaNode {
  if (root.id === parentId) {
    const children = [...(root.children || [])];
    const currentIndex = children.findIndex(c => c.id === nodeId);
    if (currentIndex === -1) return root;

    const [item] = children.splice(currentIndex, 1);
    if (item) {
      children.splice(targetIndex, 0, item);
    }

    return {
      ...root,
      children: children.map(c => ({
        ...c,
        style: {
          color: c.style?.color || undefined,
          indicatorColor: c.style?.indicatorColor || undefined,
          rounding: c.style?.rounding || undefined,
          borderWidth: c.style?.borderWidth || undefined
        }
      }))
    };
  }

  if (root.children) {
    return {
      ...root,
      children: root.children.map((c: OmegaNode) => moveChildInTree(c, parentId, nodeId, targetIndex))
    };
  }

  return root;
}

/**
 * calculateTargetIndex
 * Determines the insertion index based on pointer position relative to siblings.
 */
export function calculateTargetIndex(
  nodeId: string,
  pointerPos: { x: number; y: number },
  siblings: OmegaNode[],
  mode: 'stack-v' | 'stack-h'
): number {
  if (siblings.length === 0) return 0;

  const axis = mode === 'stack-v' ? 'y' : 'x';
  const sizeAxis = mode === 'stack-v' ? 'height' : 'width';

  // Filter out the node itself to avoid jumpiness during calculation
  const otherSiblings = siblings.filter(s => s.id !== nodeId);
  
  for (let i = 0; i < otherSiblings.length; i++) {
    const sibling = otherSiblings[i];
    if (!sibling) continue;
    const pos = (sibling.layout?.pos as unknown as Record<string, number> | undefined)?.[axis] || 0;
    const size = (sibling.layout?.size as unknown as Record<string, number> | undefined)?.[sizeAxis] || 48;
    const midpoint = pos + size / 2;

    if (pointerPos[axis as 'x' | 'y'] < midpoint) {
      return i;
    }
  }

  return otherSiblings.length;
}

/**
 * mergeWithOverrides
 * Deeply merges a base object with overrides, respecting a set of locked/editable paths.
 * Following Era 7.2.3 Genetic Merge standards.
 */
export function mergeWithOverrides(base: unknown, overrides: Record<string, unknown>, policy: OverridePolicy[]): unknown {
  const result = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;

  for (const [path, value] of Object.entries(overrides)) {
    // Find matching policies, sorted by path length descending (most specific first)
    const matchingRules = policy
      .filter(p => path === p.path || path.startsWith(p.path + '.'))
      .sort((a, b) => b.path.length - a.path.length);

    const activeRule = matchingRules[0];

    // Era 7.2.3 Enforcement Logic
    if (activeRule) {
      if (activeRule.mode === 'locked') {
        console.warn(`[UCA] Path is locked by policy: ${path}`);
        continue;
      }
      if (activeRule.mode === 'hidden') {
        continue;
      }
    }

    // Default: If no rule exists, or rule is editable/extendable, apply override
    setPathValue(result, path, value);
  }

  return result;
}

/**
 * setPathValue
 * Helper to set a value in a nested object using a dot-notation path.
 */
function setPathValue(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part === undefined) continue;
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  const lastPart = parts[parts.length - 1];
  if (lastPart !== undefined) {
    current[lastPart] = value;
  }
}

export function applySlotMappings(node: OmegaNode, mappings: Record<string, string>) {
  if (node.bind && mappings[node.bind]) {
    node.bind = mappings[node.bind] || undefined;
  }
  
  if (node.children) {
    node.children.forEach((child: OmegaNode) => applySlotMappings(child, mappings));
  }
}

/**
 * congealSnapshot
 * Creates a "frozen" version of a template root with overrides applied and slots resolved.
 */
export function congealSnapshot(node: OmegaNode, template: ModuleTemplate): OmegaNode {
  // 1. Deep clone the blueprint root
  const blueprint = JSON.parse(JSON.stringify(template.baseNode)) as OmegaNode;

  // 2. Apply Genetic Overrides
  const congealed = mergeWithOverrides(blueprint as unknown as Record<string, unknown>, node.overrides || {}, template.policy || []) as OmegaNode;
  
  // 3. Resolve Slot Bindings permanently
  if (node.slotMappings) {
    applySlotMappings(congealed, node.slotMappings);
  }

  // 4. Preserve ID authority
  congealed.id = node.id;

  return congealed;
}
/**
 * findNodeInTree
 * Performs a deep DFS search in the UCA tree.
 */
export function findNodeInTree(root: OmegaNode, id: string): OmegaNode | undefined {
  if (root.id === id) return root;

  if (root.children) {
    for (const child of root.children) {
      const found = findNodeInTree(child, id);
      if (found) return found;
    }
  }
  
  return undefined;
}

/**
 * findParentInTree
 * Finds the parent node of a target node ID.
 */
export function findParentInTree(root: OmegaNode, targetId: string): OmegaNode | undefined {
  if (!root.children) return undefined;
  
  if (root.children.some((c: OmegaNode) => c.id === targetId)) return root;
  
  for (const child of root.children) {
    const found = findParentInTree(child, targetId);
    if (found) return found;
  }
  return undefined;
}

/**
 * calculateWorldPosition
 * Recursively sums local offsets to find the absolute rack position.
 */
export function calculateWorldPosition(root: OmegaNode, targetId: string, currentOffset: { x: number, y: number } = { x: 0, y: 0 }): { x: number, y: number } | undefined {
  const absoluteX = currentOffset.x + (root.layout?.pos?.x || 0);
  const absoluteY = currentOffset.y + (root.layout?.pos?.y || 0);

  if (root.id === targetId) {
    return { x: absoluteX, y: absoluteY };
  }

  if (root.children) {
    for (const child of root.children) {
      const found = calculateWorldPosition(child, targetId, { x: absoluteX, y: absoluteY });
      if (found) return found;
    }
  }

  return undefined;
}

/**
 * getAllIdsInTree
 * Helper to collect all IDs for collision detection.
 */
export function getAllIdsInTree(root: OmegaNode): string[] {
  const ids = [root.id];
  if (root.children) {
    root.children.forEach((c: OmegaNode) => ids.push(...getAllIdsInTree(c)));
  }
  return ids;
}
