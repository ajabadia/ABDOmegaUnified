/**
 * @purpose Valida un manifest OMEGA contra las reglas industriales y devuelve problemas de validación.
 * @purpose_en ** Validates an OMEGA manifest against industrial rules and returns validation issues.
 * @refactorable ** true (contains too many state variables and UI parts)
 * @classification ** Business Service
 * @complexity ** Medium
 * @fingerprint exports:1,imports:4,sig:pi4khm
 * @lastUpdated 2026-06-15T17:03:24.031Z
 */

import type { OMEGA_Manifest, ManifestEntity, OmegaNode, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import type { ValidationIssue } from '@/types/validation';
import type { OmegaContract } from '../wasmLoader';
import { CircularityAuditor } from '@/omega-ui-core/utils/circularityAuditor';

export class IndustrialRules {
  static validate(manifest: OMEGA_Manifest, contract: (OmegaContract | OMEGA_Contract) | null): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (!manifest.schemaVersion?.startsWith('7')) return issues;

    const hp = manifest.metadata?.rack?.hp || 12;
    const rackWidth = hp * 15;
    const rackHeight = manifest.metadata?.rack?.height || manifest.ui.layout?.height || 420;
    
    const containers = manifest.ui.layout?.containers || [];
    const activePlanes = manifest.ui.layout?.planes || ['MAIN'];
    const usedIds = new Set<string>();

    // ERA 7.2.3 - UCA TREE COLLECTION (Phase 10.1)
    const allTreeNodes: OmegaNode[] = [];
    const collectNodes = (node: OmegaNode) => {
      allTreeNodes.push(node);
      node.children?.forEach(collectNodes);
    };
    if (manifest.ui.tree) collectNodes(manifest.ui.tree);

    const treeContainers = allTreeNodes.filter(n => n.kind === 'container' || n.kind === 'face' || n.kind === 'rack');
    const hasInfrastructure = containers.length > 0 || treeContainers.length > 0;

    // ERA 7.2.3 - MANDATORY INFRASTRUCTURE
    if (!hasInfrastructure) {
      issues.push({
        path: '/ui/layout/containers',
        message: `CRITICAL FAIL: No existen contenedores. Todo módulo OMEGA requiere al menos una placa base (Container).`,
        keyword: 'era7_infrastructure',
        severity: 'critical'
      });
    }

    if (hp % 2 !== 0) {
      issues.push({
        path: '/metadata/rack/hp',
        message: `PRO-MASTER: HP impar (${hp}). Se recomienda HP par para estética Eurorack.`,
        keyword: 'era7_style',
        severity: 'audit'
      });
    }

    const availableAssets = new Set(manifest.resources?.assets?.map(a => a.id) || []);

    // CHEQUEO DE ACTIVOS (Fase 13 — AGGRESSIVE)
    if (manifest.metadata?.icon && !availableAssets.has(manifest.metadata.icon)) {
        issues.push({
            path: '/metadata/icon',
            message: `CRITICAL: El icono '${manifest.metadata.icon}' no existe en el catálogo de recursos.`,
            keyword: 'era7_asset_critical',
            severity: 'critical'
        });
    }

    containers.forEach((c, idx) => {
        if (c.asset && !availableAssets.has(c.asset)) {
            issues.push({
                path: `/ui/layout/containers/${idx}/asset`,
                message: `CRITICAL: El fondo '${c.asset}' para '${c.id}' no existe.`,
                keyword: 'era7_asset_critical',
                severity: 'critical'
            });
        }
    });

    const validateEntity = (entity: ManifestEntity | OmegaNode, path: string) => {
      const isUCA = 'kind' in entity;
      let targetContainerId = isUCA ? '' : (entity as ManifestEntity).presentation?.container;
      
      // Try to find parent container in tree if UCA
      if (isUCA) {
        // This is a simplified check for Phase 10.1
        targetContainerId = 'MAIN_FACE'; // Fallback for root-level UCA cells
      }

      const container = containers.find(c => c.id === targetContainerId) || treeContainers.find(c => c.id === targetContainerId);
      const entityTab = container ? (container as { tab?: string }).tab || 'MAIN' : 'MAIN';

      // ERA 7.2.3 - MANDATORY ASSOCIATION
      if (!isUCA && !targetContainerId) {
        issues.push({
          path: `${path}/presentation/container`,
          message: `CRITICAL: El elemento '${entity.id}' no tiene contenedor asociado. Todas las cells deben pertenecer a una placa base.`,
          keyword: 'era7_orphan_cell',
          severity: 'error'
        });
      }

      // ERA 7.2.3 - PLANE INTEGRITY
      if (container && !activePlanes.includes(entityTab as string)) {
        issues.push({
          path: `${path}/presentation/container`,
          message: `CRITICAL: '${entity.id}' está en un contenedor asignado al plano '${entityTab}', pero este plano no está activo en el módulo.`,
          keyword: 'era7_plane_leak',
          severity: 'error'
        });
      }

      // Asset Validation (Fase 13 — AGGRESSIVE)
      const assetId = (entity as ManifestEntity).presentation?.asset || (entity as OmegaNode).style?.backgroundAsset;
      const isLogo = entity.bind === 'module_logo' || entity.id === 'logo';

      if ((assetId || isLogo) && !availableAssets.has((assetId || '') as string)) {
          issues.push({
              path: `${path}/presentation/asset`,
              message: `CRITICAL ASSET: El recurso '${assetId || 'module_logo'}' referenciado por '${entity.id}' no existe en el manifiesto.`,
              keyword: 'era7_asset_critical',
              severity: 'critical'
          });
      }

      // Golden Rule 1: Identity
      if (usedIds.has(entity.id)) {
        issues.push({ 
          path: `${path}/id`, 
          message: `DOUBLE IDENTITY: ID '${entity.id}' duplicado. Revisa si existe en el árbol UCA y en los arrays legacy simultáneamente.`, 
          keyword: 'era7_identity', 
          severity: 'error' 
        });
      }
      usedIds.add(entity.id);

      // Pro-Master: Rule of 5px
      const pos = (entity as ManifestEntity).pos || (entity as OmegaNode).layout?.pos;
      if (pos && (pos.x % 5 !== 0 || pos.y % 5 !== 0)) {
        issues.push({
          path: `${path}/pos`,
          message: `PRO-MASTER: Desalineado. La posición (${pos.x}, ${pos.y}) debe ser múltiplo de 5 (Regla de los 5px).`,
          keyword: 'era7_alignment',
          severity: 'audit'
        });
      }

      // Pro-Master: Port Normalization
      if (path.includes('/jacks/') || (isUCA && (entity as OmegaNode).cellRef?.includes('port'))) {
        const color = (entity as ManifestEntity).presentation?.color || (entity as OmegaNode).style?.color;
        if (!color) {
          issues.push({
            path: `${path}/presentation/color`,
            message: `PRO-MASTER: Puerto sin color. Usa B_cyan (Audio/CV), neon_amber (Mod), white (Gate) u orange (MIDI).`,
            keyword: 'era7_port_norm',
            severity: 'audit'
          });
        }
      }

      // Pro-Master: Missing Units
      const component = (entity as ManifestEntity).presentation?.component || (entity as OmegaNode).cellRef;
      const role = (entity as ManifestEntity).role || (entity as OmegaNode).role;
      const isIndicator = role === 'telemetry' || component === 'led' || component === 'display';
      
      const entityType = isUCA ? (entity as OmegaNode).kind : (entity as ManifestEntity).type;
      const entityUnit = isUCA ? undefined : (entity as ManifestEntity).unit;
      
      const isMidiOrString = entityType === 'string' || manifest.metadata?.family === 'midi';
      if (!entityUnit && role !== 'output' && !isIndicator && !isMidiOrString && !isUCA) {
        issues.push({ path: `${path}/unit`, message: `PRO-MASTER: Falta unidad (Hz, dB, ms, semi, %). Requerido para parámetros de control.`, keyword: 'era7_ux', severity: 'audit' });
      }

      // Advanced: Out of Bounds
      if (pos && (pos.x < 0 || pos.x > rackWidth || pos.y < 0 || pos.y > rackHeight)) {
        issues.push({ path: `${path}/pos`, message: `OUT OF BOUNDS: '${entity.id}' fuera del metal.`, keyword: 'era7_integrity', severity: 'error' });
      }

      // Advanced: Orphan Binds
      if (contract && entity.bind) {
        const cleanBind = String(entity.bind).trim().toLowerCase();
        const allBinds = [
          ...(contract.parameters?.map((p: { id: string }) => String(p.id).trim().toLowerCase()) || []),
          ...(contract.ports?.map((p: { id: string }) => String(p.id).trim().toLowerCase()) || [])
        ];
        
        if (!allBinds.includes(cleanBind)) {
          issues.push({ 
            path: `${path}/bind`, 
            message: `ORPHAN BIND: '${entity.bind}' no existe en el contrato WASM.`, 
            keyword: 'era7_binding', 
            severity: 'error' 
          });
        }
      }
    };

    const isUCAActive = manifest.ui?.useUCA !== false && !!manifest.ui?.tree;

    if (isUCAActive) {
      allTreeNodes.forEach((n) => validateEntity(n, `/ui/tree/node/${n.id}`));
    } else {
      (manifest.ui?.controls || []).forEach((e, idx) => validateEntity(e, `/ui/controls/${idx}`));
      (manifest.ui?.jacks || []).forEach((e, idx) => validateEntity(e, `/ui/jacks/${idx}`));
    }

    // PHASE 17.2 - MODULATION CIRCULARITY AUDIT
    const circularityIssues = CircularityAuditor.validate(manifest);
    issues.push(...circularityIssues);

    return issues;
  }
}

