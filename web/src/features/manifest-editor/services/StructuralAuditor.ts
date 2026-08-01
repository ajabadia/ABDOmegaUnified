/**
 * @purpose Valida la integridad estructural y coherencia de los manifestos OMEGA a través del análisis semántico, incluyendo colisiones de IDs, referencias de entidades, rangos de parámetros y resolubilidad de enlaces.
 * @purpose_en Validates the structural integrity and coherence of OMEGA manifests through semantic analysis, including ID collisions, entity references, parameter ranges, and link resolvability.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:2,imports:5,sig:1vihr4w
 * @lastUpdated 2026-06-15T15:16:16.310Z
 */

import type { OMEGA_Manifest, OmegaNode, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/omega-ui-core/types/contract';
import type { DiagnosticSource, TabDiagnostics, DiagnosticContext, AuditResult } from '../types/diagnostics';
import { createEmptyDiagnostics } from '../types/diagnostics';
import { CircularityAuditor } from '@/omega-ui-core/utils/circularityAuditor';
// import { parsePath } from '@/legacy/uca/utils/pathResolver';

/**
 * OMEGA ERA 7.2.3 - Structural Auditor
 * Semantic analysis of manifest integrity and coherence.
 * Phase 15: Recursive UCA Tree Support.
 */
export class StructuralAuditor implements DiagnosticSource {
  id = 'structural-auditor';
  name = 'Structural';

  extractDiagnostics(manifest: OMEGA_Manifest, context?: DiagnosticContext): AuditResult {
    const diagnostics = createEmptyDiagnostics();

    // 1. CANONICAL UCA GRAPH (Phase 18)
    const rootNode = manifest.nodes?.[0];
    const ucaTree = rootNode || manifest.ui.tree; // Fallback to deprecated tree
    const isSovereign = !!rootNode;

    // 2. RESOURCE INVENTORY
    const contract = context?.contract as (OmegaContract | OMEGA_Contract) | null;
    
    // Safely extract parameters and ports regardless of which contract schema is provided
    const parameters = (contract as OmegaContract)?.parameters || (contract as OMEGA_Contract)?.parameters || [];
    const ports = (contract as OmegaContract)?.ports || (contract as OMEGA_Contract)?.ports || [];

    const paramIds = new Set(parameters.map((p) => p.id));
    const portIds = new Set(ports.map((p) => p.id));
    const assetIds = new Set((manifest.resources?.assets || []).map(a => a.id));

    // 3. LEGACY ADAPTATION (Shadow Audits in Sovereign Mode)
    const allEntities = [
      ...(manifest.ui?.controls || []),
      ...(manifest.ui?.jacks || [])
    ];
    const containerIds = new Set((manifest.ui?.layout?.containers || []).map((c: { id: string }) => c.id));

    // A. ID Collision Check (Legacy)
    const idCounts = new Map<string, number>();
    [...containerIds, ...allEntities.map(e => e.id)].forEach(id => {
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    });

    idCounts.forEach((count, id) => {
      if (count > 1) {
        diagnostics.errors.push({
          id: `collision-${id}`,
          source: this.name,
          message: `ID Collision: '${id}' is defined multiple times.`,
          severity: 'error',
          code: 'ID_COLLISION',
          entityId: id
        });
      }
    });

    // B. Legacy Entity Validation
    allEntities.forEach(entity => {
      const containerId = entity.presentation?.container;
      const legacySeverity = isSovereign ? 'warning' : 'error'; // Downgrade to warning in Sovereign Mode
      const shadowPrefix = isSovereign ? '[SHADOW AUDIT] ' : '';

      if (containerId && !containerIds.has(containerId)) {
        diagnostics.errors.push({
          id: `broken-container-${entity.id}`,
          source: this.name,
          message: `${shadowPrefix}Entity '${entity.id}' references non-existent container '${containerId}'.`,
          severity: legacySeverity,
          code: 'BROKEN_CONTAINER_REF',
          entityId: entity.id
        });
      }

      if (entity.bind && entity.bind !== 'none') {
        const isParam = paramIds.has(entity.bind);
        const isPort = portIds.has(entity.bind);
        if (!isParam && !isPort) {
          diagnostics.warnings.push({
            id: `broken-bind-${entity.id}`,
            source: this.name,
            message: `${shadowPrefix}Broken Bind: Entity '${entity.id}' binds to unknown target '${entity.bind}'.`,
            severity: 'warning',
            code: 'BROKEN_BIND',
            entityId: entity.id
          });
        }
      }

      const assetId = entity.presentation?.asset;
      if (assetId && assetId !== 'none' && !assetIds.has(assetId)) {
        diagnostics.warnings.push({
          id: `broken-asset-${entity.id}`,
          source: this.name,
          message: `${shadowPrefix}Missing Asset: Entity '${entity.id}' references unknown asset '${assetId}'.`,
          severity: 'warning',
          code: 'BROKEN_ASSET_REF',
          entityId: entity.id
        });
      }
    });

    // 4. RECURSIVE UCA TREE AUDIT
    let validSignalPaths = new Set<string>();
    if (ucaTree) {
      validSignalPaths = this.auditUCATree(ucaTree, manifest, diagnostics, paramIds, portIds, assetIds);
    }

    // 5. CANONICAL LINKS & MODULATION (Phase 18)
    this.auditLinks(manifest, diagnostics, validSignalPaths);

    // 4. Parameter & Range Integrity (Contract Audit)
    if (contract?.parameters) {
      contract.parameters.forEach(param => {
        if (param.min >= param.max) {
          diagnostics.errors.push({
            id: `invalid-range-${param.id}`,
            source: this.name,
            message: `Invalid Range: Parameter '${param.id}' has min (${param.min}) >= max (${param.max}).`,
            severity: 'error',
            code: 'INVALID_PARAM_RANGE'
          });
        }
        if (param.default < param.min || param.default > param.max) {
          diagnostics.errors.push({
            id: `invalid-default-${param.id}`,
            source: this.name,
            message: `Out of Bounds: Parameter '${param.id}' default (${param.default}) is outside [${param.min}, ${param.max}].`,
            severity: 'error',
            code: 'INVALID_PARAM_DEFAULT'
          });
        }
      });
    }

    diagnostics.errorCount = diagnostics.errors.length;
    diagnostics.warningCount = diagnostics.warnings.length;
    diagnostics.infoCount = diagnostics.infos.length;

    return {
      ...diagnostics,
      score: 100 - (diagnostics.errorCount * 10 + diagnostics.warningCount * 2),
      checks: { governance: true, integrity: true, technical: true, aesthetic: true },
      isCompliant: diagnostics.errorCount === 0,
      issues: [...diagnostics.errors, ...diagnostics.warnings]
    };
  }

  /**
   * Recursive walk through the UCA tree.
   */
  private auditUCATree(
    root: OmegaNode, 
    manifest: OMEGA_Manifest, 
    diagnostics: TabDiagnostics,
    paramIds: Set<string>,
    portIds: Set<string>,
    assetIds: Set<string>
  ): Set<string> {
    const validPaths = new Set<string>();
    const visited = new Set<string>();
    const cellLibrary = manifest.moduleTemplates || {};

    const walk = (node: OmegaNode, depth: number) => {
      const path = node.signalPath || node.id;
      validPaths.add(path);

      // Collect ports
      if (node.ports) {
        node.ports.forEach(port => validPaths.add(port.id));
      }

      if (depth > 32) {
        diagnostics.errors.push({
          id: `max-depth-${node.id}`,
          source: this.name,
          message: `UCA ERROR: Max recursion depth exceeded at node '${node.id}'.`,
          severity: 'error',
          code: 'MAX_DEPTH_EXCEEDED',
          entityId: node.id
        });
        return;
      }

      if (visited.has(node.id)) {
        diagnostics.errors.push({
          id: `circular-tree-${node.id}`,
          source: this.name,
          message: `UCA ERROR: Circular reference detected at node '${node.id}'.`,
          severity: 'error',
          code: 'CIRCULAR_TREE_REF',
          entityId: node.id
        });
        return;
      }
      visited.add(node.id);

      // A. Template Reference Check
      if ((node.kind === 'cell' || node.kind === 'port') && node.cellRef) {
        if (!cellLibrary[node.cellRef]) {
          diagnostics.errors.push({
            id: `broken-cellref-${node.id}`,
            source: this.name,
            message: `UCA ERROR: Cell '${node.id}' references unknown template '${node.cellRef}'.`,
            severity: 'error',
            code: 'BROKEN_CELL_REF',
            entityId: node.id
          });
        }
      }

      // B. Bind Integrity
      if (node.bind && node.bind !== 'none') {
        const isParam = paramIds.has(node.bind);
        const isPort = portIds.has(node.bind);
        if (!isParam && !isPort) {
          diagnostics.warnings.push({
            id: `uca-broken-bind-${node.id}`,
            source: this.name,
            message: `UCA Warning: Node '${node.id}' binds to unknown target '${node.bind}'.`,
            severity: 'warning',
            code: 'BROKEN_BIND',
            entityId: node.id
          });
        }
      }

      // C. Asset Integrity (Style Node)
      const assetId = node.style?.asset;
      if (assetId && assetId !== 'none' && !assetIds.has(assetId)) {
        diagnostics.warnings.push({
          id: `uca-broken-asset-${node.id}`,
          source: this.name,
          message: `UCA Missing Asset: Node '${node.id}' references unknown asset '${assetId}'.`,
          severity: 'warning',
          code: 'BROKEN_ASSET_REF',
          entityId: node.id
        });
      }

      // D. Recursive Step
      if (node.children) {
        node.children.forEach(child => walk(child, depth + 1));
      }
    };

    walk(root, 0);
    return validPaths;
  }

  /**
   * auditLinks (Phase 18 Canonical)
   * Validates OmegaLinks for source/target resolvability and cycle detection.
   */
  private auditLinks(manifest: OMEGA_Manifest, diagnostics: TabDiagnostics, validPaths: Set<string>) {
    const links = manifest.links || [];
    
    // A. Link Resolvability
    links.forEach((link, index) => {
      if (!link.source || !link.target) {
        diagnostics.errors.push({
          id: `broken-link-fields-${index}`,
          source: this.name,
          message: `OMEGA_LINK ERROR: Link ${index} has missing source or target definition.`,
          severity: 'error',
          code: 'BROKEN_LINK'
        });
        return;
      }

      // Validate Source Path
      if (!validPaths.has(link.source)) {
        diagnostics.errors.push({
          id: `broken-link-source-${index}`,
          source: this.name,
          message: `OMEGA_LINK ERROR: Source path '${link.source}' not found in UCA hierarchy.`,
          severity: 'error',
          code: 'UNRESOLVED_LINK_SOURCE'
        });
      }

      // Validate Target Path
      if (!validPaths.has(link.target)) {
        diagnostics.errors.push({
          id: `broken-link-target-${index}`,
          source: this.name,
          message: `OMEGA_LINK ERROR: Target path '${link.target}' not found in UCA hierarchy.`,
          severity: 'error',
          code: 'UNRESOLVED_LINK_TARGET'
        });
      }
    });

    // B. Circularity Audit (Phase 17.2/18)
    const circularityIssues = CircularityAuditor.validate(manifest);
    circularityIssues.forEach(issue => {
      diagnostics.errors.push({
        id: `circular-link-${issue.keyword}`,
        source: this.name,
        message: issue.message,
        severity: 'error',
        code: 'CIRCULAR_MODULATION'
      });
    });
  }
}

export const structuralAuditor = new StructuralAuditor();

