/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @purpose Gestiona la conversión y manipulación de datos manifest OMEGA para crear estructuras OmegaNode, aplicando overrides y manejo de placeholders para generar contenido dinámico.
 * @purpose_en Manages conversion and manipulation of OMEGA manifest data to create OmegaNode structures, applying overrides and handling placeholders for dynamic content generation.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:4,imports:4,sig:a4snuq
 * @lastUpdated 2026-06-15T16:54:26.114Z
 */

/**
 * OMEGA UCA BRIDGE - Phase 10.2
 * Formal Compilation Pipeline & Materialization Engine.
 */

import type { 
  OMEGA_Manifest, 
  OmegaNode, 
  BlueprintDefinition, 
  CellTemplate,
  BlueprintPlaceholderValues,
  OmegaBlueprintNode
} from '../types/manifest';
import { manifestToTree as legacyMigrator } from './converters/manifestToTree';
import { treeToManifest as legacySerializer } from './converters/treeToManifest';
import { resolvePath, normalizeModulationTarget } from './utils/pathResolver';

/**
 * formalizeUCA (Internal Gateway)
 * Ensures a node tree follows the latest Phase 10.2 constraints.
 */
function formalizeUCA(node: OmegaNode): OmegaNode {
  return {
    ...node,
    children: node.children?.map(formalizeUCA) || []
  };
}

/**
 * applyOverridesToTree
 * Surgical application of manifest-level overrides to a compiled tree.
 */
function applyOverridesToTree(node: OmegaNode, overrides: Record<string, unknown>): OmegaNode {
  const nextNode = { ...node };
  
  // 0. Genetic Guard (Phase 11): Locked nodes cannot be overridden at the instance level
  if (node.locked) {
    return nextNode;
  }

  // 1. Direct ID match (Simple authority)
  if (overrides[node.id]) {
    const patch = overrides[node.id] as Partial<OmegaNode>;
    if (patch.style) nextNode.style = { ...nextNode.style, ...patch.style };
    if (patch.layout) nextNode.layout = { ...nextNode.layout, ...patch.layout };
    if (patch.overrides) nextNode.overrides = { ...nextNode.overrides, ...patch.overrides };
    // Genetic Authority: Instance level can't unlock a blueprint-locked node
    if (patch.locked === false && node.locked) {
      nextNode.locked = true; 
    } else if (patch.locked !== undefined) {
      nextNode.locked = patch.locked;
    }
  }

  // 2. Recursive propagation
  if (nextNode.children) {
    nextNode.children = nextNode.children.map(child => applyOverridesToTree(child, overrides));
  }

  return nextNode;
}

export interface CompilationResult {
  tree: OmegaNode;
  errors: string[];
  warnings: string[];
  metadata: {
    nodeCount: number;
    unresolvedPlaceholders: string[];
    missingTemplates: string[];
    depth: number;
  };
}

/**
 * materializePlaceholders
 * Industrial substitution engine for blueprints.
 * Supports:
 * 1. Literal Substitution: {{key}}
 * 2. Arithmetic Expressions: {{x + 10}}, {{y * 2}}
 */
function materializePlaceholders(root: OmegaBlueprintNode, values: BlueprintPlaceholderValues): OmegaBlueprintNode {
  let json = JSON.stringify(root);
  
  // 1. Literal Substitution
  Object.entries(values).forEach(([key, value]) => {
    const regex = new RegExp(`\\\\{\\\\{${key}\\\\s*\\\\}\\\\}`, 'g');
    json = json.replace(regex, String(value));
  });

  // 2. Expression Evaluation (e.g. {{x + 10}})
  const exprRegex = /\\{\\{\\s*([a-zA-Z0-9_]+)\\s*([\\+\\-\\*\\/])\\s*([0-9\\.]+)\\s*\\}\\}/g;
  json = json.replace(exprRegex, (match, varName, op, valStr) => {
    const baseVal = Number(values[varName]);
    const modifier = Number(valStr);
    if (isNaN(baseVal) || isNaN(modifier)) return match;
    
    switch(op) {
      case '+': return String(baseVal + modifier);
      case '-': return String(baseVal - modifier);
      case '*': return String(baseVal * modifier);
      case '/': return String(baseVal / modifier);
      default: return match;
    }
  });

  return JSON.parse(json) as OmegaBlueprintNode;
}

/**
 * blueprintToTree
 * Compiles a declarative Blueprint into a concrete OmegaNode tree.
 * Refactored for Phase 15/16 industrial reporting and unified materialization.
 */
export function blueprintToTree(
  blueprint: BlueprintDefinition,
  options: {
    placeholders?: BlueprintPlaceholderValues;
    templates?: Record<string, CellTemplate>;
    manifestOverrides?: Record<string, unknown>;
    targetParent?: OmegaNode | null; // For compatibility checks
    strict?: boolean; // If true, missing placeholders are errors
  }
): CompilationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const unresolvedPlaceholders = new Set<string>();
  const missingTemplates = new Set<string>();
  let nodeCount = 0;
  let maxDepth = 0;

  // 0. Compatibility Check (Genetic Guard)
  if (options.targetParent && blueprint.compatibility) {
    const comp = blueprint.compatibility;
    if (comp.allowedParentKinds && comp.allowedParentKinds.length > 0) {
      if (!comp.allowedParentKinds.includes(options.targetParent.kind)) {
        errors.push(`[UCA BRIDGE] Incompatible parent kind: '${options.targetParent.kind}'. Allowed: ${comp.allowedParentKinds?.join(', ') || ''}`);
      }
    }
    if (comp.deniedParentKinds && comp.deniedParentKinds.includes(options.targetParent.kind)) {
      errors.push(`[UCA BRIDGE] Explicitly denied parent kind: '${options.targetParent.kind}'`);
    }
  }

  // 1. Materialize Placeholders (Preprocessing)
  const materialBlueprintRoot = options.placeholders 
    ? materializePlaceholders(blueprint.rootNode, options.placeholders)
    : blueprint.rootNode;

  /**
   * resolveNodes
   * Recursive expansion with hierarchical identity prefixing via PathResolver.
   */
  const resolveNodes = (node: OmegaBlueprintNode, depth: number, visited: Set<string>, parentPath?: string): OmegaNode => {
    nodeCount++;
    maxDepth = Math.max(maxDepth, depth);

    const localId = node.id || 'anonymous_node';
    
    // Unified Hierarchical Identity (Phase 17.3)
    const id = resolvePath(localId, parentPath);

    // Circular detection (Genetic Guard)
    if (visited.has(id)) {
      errors.push(`[UCA BRIDGE] Circular reference detected at node: ${id}`);
      return { ...node, id: `${id}_ERR_CIRCULAR` } as unknown as OmegaNode;
    }
    const nextVisited = new Set(visited);
    nextVisited.add(id);

    // Check for leftover placeholders (if not materialized)
    if (typeof localId === 'string' && localId.startsWith('{{') && localId.endsWith('}}')) {
      const key = localId.slice(2, -2);
      unresolvedPlaceholders.add(key);
      if (options.strict) {
        errors.push(`[UCA BRIDGE] Unresolved required placeholder: {{${key}}}`);
      } else {
        warnings.push(`[UCA BRIDGE] Unresolved placeholder: {{${key}}}`);
      }
    }

    const materialNode: OmegaNode = {
      ...node,
      id,
      signalPath: id, // Canonical hierarchical path
      ports: node.ports?.map(port => ({
        ...port,
        // Deterministic Port IDs: Prefix with Full Node Path
        id: resolvePath(port.id, id)
      })),
      modulationTargets: node.modulationTargets?.map((target: string) => 
        normalizeModulationTarget(target, id)
      ) || [],
      children: node.children?.map(child => resolveNodes(child, depth + 1, nextVisited, id)) || []
    } as OmegaNode;

    // Template Expansion
    if (materialNode.kind === 'cell' && materialNode.cellRef) {
      const primitives = ['knob', 'port', 'slider_v', 'slider_h', 'display', 'led', 'switch', 'button', 'label', 'asset-layer', 'illustration', 'rack-screw'];
      const isPrimitive = primitives.includes(materialNode.cellRef);
      
      const template = options.templates?.[materialNode.cellRef];
      if (template) {
        return {
          ...template.baseNode,
          ...materialNode,
          style: { ...template.baseNode.style, ...materialNode.style },
          layout: { ...template.baseNode.layout, ...materialNode.layout },
          overrides: { ...template.baseNode.overrides, ...materialNode.overrides },
          slotMappings: { ...template.baseNode.slotMappings, ...materialNode.slotMappings },
          locked: template.baseNode.locked || materialNode.locked || false,
          id: (materialNode.id || template.baseNode.id) as string,
          signalPath: materialNode.signalPath || template.baseNode.signalPath || id,
          ports: [
            ...(template.baseNode.ports?.map(p => ({
              ...p,
              id: resolvePath(p.id, id)
            })) || []),
            ...(materialNode.ports || [])
          ].filter((p, i, self) => i === self.findLastIndex(other => other.id === p.id)),
          modulationTargets: [
            ...(template.baseNode.modulationTargets?.map(t => normalizeModulationTarget(t, id)) || []),
            ...(materialNode.modulationTargets?.map(t => normalizeModulationTarget(t, id)) || [])
          ].filter((t, i, self) => i === self.findLastIndex(other => other === t))
        };
      } else if (!isPrimitive) {
        missingTemplates.add(materialNode.cellRef);
        errors.push(`[UCA BRIDGE] Missing template: ${materialNode.cellRef}`);
        materialNode.role = 'decor';
        materialNode.style = { ...materialNode.style, color: '#FF00FF', opacity: 0.5 };
      }
    }

    return materialNode;
  };

  const compiledTree = resolveNodes(materialBlueprintRoot, 0, new Set());

  // Apply Authority Overrides if present
  const finalTree = options.manifestOverrides 
    ? applyOverridesToTree(compiledTree, options.manifestOverrides)
    : compiledTree;

  return {
    tree: formalizeUCA(finalTree),
    errors,
    warnings,
    metadata: {
      nodeCount,
      unresolvedPlaceholders: Array.from(unresolvedPlaceholders),
      missingTemplates: Array.from(missingTemplates),
      depth: maxDepth
    }
  };
}

/**
 * manifestToOmegaTree
 * Legacy Migration Bridge.
 */
export function manifestToOmegaTree(manifest: OMEGA_Manifest, existingTree?: OmegaNode): OmegaNode {
  // 1. Canonical Source (Phase 18)
  if (manifest.nodes && manifest.nodes.length > 0 && manifest.nodes[0]) {
    return formalizeUCA(manifest.nodes[0]);
  }
  
  // 2. Transitory UCA (Phase 10.2)
  if (manifest.ui.tree && manifest.ui.useUCA) {
    return formalizeUCA(manifest.ui.tree);
  }
  
  // 3. Legacy Migration
  return legacyMigrator(manifest, existingTree);
}

/** Alias for compatibility with existing orchestrator logic */
export { manifestToOmegaTree as manifestToTree };

/** Alias for compatibility with existing logic */
export { omegaTreeToManifest as treeToManifest };

/**
 * omegaTreeToManifest
 * Serialization Bridge (Canonical).
 */
export function omegaTreeToManifest(tree: OmegaNode): Partial<OMEGA_Manifest> {
  const legacyProjections = legacySerializer(tree);
  return {
    nodes: [tree], // Canonical root
    ui: {
      ...legacyProjections,
      tree, // [DEPRECATED] Keep for transient compatibility
      useUCA: true,
      dimensions: undefined // Explicitly handle dimensions to satisfy strict checks if needed
    }
  } as Partial<OMEGA_Manifest>;
}

export { legacyMigrator as _rawManifestToTree };
export { legacySerializer as _rawTreeToManifest };
export { congealSnapshot } from './treeUtils';
