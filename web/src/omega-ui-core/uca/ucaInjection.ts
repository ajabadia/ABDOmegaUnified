/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @purpose Gestiona el arrastre y soltar de plantillas dentro de manifestaciones OMEGA a través de una serie de pasos que incluyen compilación, gobernanza de identidad, integración de árbol y resolución automática del arrastre.
 * @purpose_en Manages the drag-and-drop of templates within OMEGA manifestations through a series of steps including compilation, identity governance, tree integration, and auto-drag resolution.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:1x99asf
 * @lastUpdated 2026-06-15T16:54:34.152Z
 */

/**
 * OMEGA UCA INJECTION SERVICE - Phase 16
 * Canonical Orchestrator for Blueprint Materialization and Integration.
 */

import type { 
  OMEGA_Manifest, 
  OmegaNode, 
  BlueprintDefinition,
  CellTemplate
} from '../types/manifest';
import type { 
  BlueprintInjectionRequest, 
  BlueprintInjectionResult, 
  BlueprintInjectionReport,
  BlueprintInsertionStrategy
} from '../types/blueprint';
import { blueprintToTree, treeToManifest, manifestToTree } from './ucaBridge';
import { IdManager } from './utils/idManager';
import { AutoWireResolver } from './utils/autoWireResolver';

/**
 * injectBlueprint
 * The Canonical Entry Point for industrial blueprint injection.
 * Implements the 10-step pipeline from ADR-011 §B.2 (Consolidated).
 */
export async function injectBlueprint(
  manifest: OMEGA_Manifest,
  blueprint: BlueprintDefinition,
  request: BlueprintInjectionRequest,
  options?: {
    templates?: Record<string, CellTemplate>;
  }
): Promise<BlueprintInjectionResult> {
  const startTime = Date.now();
  
  // 0. Aseptic Tree Initialization (Ensures UCA mode)
  const activeManifest = { ...manifest };
  const rootNode = activeManifest.nodes?.[0] || activeManifest.ui.tree;
  
  if (!rootNode) {
    const initializedTree = manifestToTree(activeManifest);
    activeManifest.nodes = [initializedTree];
  } else if (!activeManifest.nodes || activeManifest.nodes.length === 0) {
    activeManifest.nodes = [rootNode];
  }

  const report: BlueprintInjectionReport = {
    blueprintId: blueprint.blueprintId,
    blueprintVersion: blueprint.version,
    timestamp: new Date().toISOString(),
    mode: request.mode,
    dryRun: request.strategy.dryRun,
    compatibilityStatus: 'compliant',
    validationIssues: [],
    idRemapLog: {},
    autoWireDecisions: [],
    insertedNodeIds: [],
    createdWireIds: [],
    durationMs: 0
  };

  try {
    // 1 & 2 & 3 & 4. Formal Compilation (Bridge handles pre-validation & materialization)
    const rootNode = activeManifest.nodes[0];
    const targetParent = findNodeById(rootNode, request.strategy.targetParentNodeId);
    
    const compilation = blueprintToTree(blueprint, {
      placeholders: request.placeholderValues,
      templates: options?.templates || {}, // Ensure Record
      targetParent: targetParent || null,
      strict: true
    });

    // Map compilation errors/warnings to blueprint validation issues
    report.validationIssues.push(...compilation.errors.map(err => ({
      severity: 'error' as const,
      code: 'COMPILATION_ERROR',
      message: err
    })));
    report.validationIssues.push(...compilation.warnings.map(warn => ({
      severity: 'warning' as const,
      code: 'COMPILATION_WARNING',
      message: warn
    })));

    report.compatibilityStatus = compilation.errors.length > 0 ? 'incompatible' : 'compliant';
    
    if (compilation.errors.length > 0) {
      return fatal('COMPILATION_FAILURE', 'Blueprint compilation failed.', report);
    }

    let materializedNode = compilation.tree;

    // 5. Identity Governance (ID Remapping)
    const idManager = new IdManager(activeManifest);
    if (request.strategy.forceIdRemap) {
      const { node: remappedNode, remapLog } = idManager.remapSubtree(materializedNode);
      materializedNode = remappedNode;
      report.idRemapLog = remapLog;
    }

    // 7. Tree Integration (Merge)
    let nextManifest = performMerge(activeManifest, materializedNode, request.strategy);

    // 8. Auto-wiring Resolution
    const autoWireResolver = new AutoWireResolver();
    const { decisions, updatedManifest } = autoWireResolver.resolve(
      nextManifest, 
      blueprint
    );
    report.autoWireDecisions = decisions;
    nextManifest = updatedManifest;

    // 10. Finalize Report
    report.durationMs = Date.now() - startTime;
    report.insertedNodeIds = [materializedNode.id];

    return {
      success: true,
      mode: request.mode,
      resultManifest: request.strategy.dryRun ? undefined : nextManifest,
      injectedSubtree: materializedNode,
      report
    };

  } catch (err) {
    report.durationMs = Date.now() - startTime;
    return fatal('INTERNAL_ERROR', err instanceof Error ? err.message : String(err), report);
  }
}

/**
 * performMerge
 * Internal helper to splice the compiled node into the manifest tree.
 */
function performMerge(manifest: OMEGA_Manifest, node: OmegaNode, strategy: BlueprintInsertionStrategy): OMEGA_Manifest {
  const rootNode = manifest.nodes?.[0] || manifest.ui?.tree;
  if (!rootNode) throw new Error('Manifest root node not found.');

  const targetId = strategy.targetParentNodeId || rootNode.id;
  
  const updateTree = (root: OmegaNode): OmegaNode => {
    if (root.id === targetId) {
      const children = [...(root.children || [])];
      if (strategy.insertAtIndex !== undefined) {
        children.splice(strategy.insertAtIndex, 0, node);
      } else {
        children.push(node);
      }
      return { ...root, children };
    }
    if (root.children) {
      return { ...root, children: root.children.map(c => updateTree(c)) };
    }
    return root;
  };

  const nextTree = updateTree(rootNode);
  const canonicalUpdates = treeToManifest(nextTree);

  return {
    ...manifest,
    ...canonicalUpdates,
    ui: {
      ...manifest.ui,
      ...canonicalUpdates.ui,
    }
  };
}

/**
 * findNodeById (Utility)
 */
function findNodeById(root: OmegaNode | undefined, id: string | null): OmegaNode | undefined {
  if (!root || !id) return root;
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return undefined;
}

function fatal(code: string, message: string, report: BlueprintInjectionReport): BlueprintInjectionResult {
  return {
    success: false,
    mode: report.mode,
    report,
    fatalError: { code, message }
  };
}
