/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Gestiona automáticamente la conexión de cables entre un nodo inyectado y el manifesto existente mediante una coincidencia de señales estrictamente determinista para planos industriales.
 * @purpose_en Manages automatically connecting wires between an injected node and the existing manifest using strict, deterministic signal matching for industrial blueprints.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:16u52ca
 * @lastUpdated 2026-06-15T16:54:44.734Z
 */

import type { 
  OMEGA_Manifest, 
  BlueprintDefinition, 
  BlueprintAutoWireDecision,
  OmegaNode
} from '../../types/manifest';

/**
 * OMEGA Phase 9.4A - Auto-Wire Resolver (Industrial Core)
 * Implements strict, deterministic signal matching for industrial blueprints.
 */
export class AutoWireResolver {
  
  /**
   * Resolves automatic wiring between an injected node and the existing manifest.
   */
  public resolve(
    manifest: OMEGA_Manifest, 
    blueprint: BlueprintDefinition
  ): { decisions: BlueprintAutoWireDecision[]; updatedManifest: OMEGA_Manifest } {
    
    const decisions: BlueprintAutoWireDecision[] = [];
    const mode = blueprint.autoWirePolicy?.mode || 'none';
    
    if (mode === 'none') {
      return { decisions, updatedManifest: manifest };
    }

    // Phase 11 Implementation: Strict mode (Exact Match by tag/id)
    if (mode === 'strict') {
      const nextManifest = { ...manifest };
      const allEntities = [...(nextManifest.ui.controls || []), ...(nextManifest.ui.jacks || [])];
      
      if (nextManifest.ui.tree) {
        this.walkTree(nextManifest.ui.tree, (node) => {
          if ((node.kind === 'cell' || node.kind === 'port') && (!node.bind || node.bind === 'none')) {
            const candidateId = allEntities.find(e => e.id === node.id || e.label === node.id)?.id;
            if (candidateId) {
              node.bind = candidateId;
              decisions.push({
                nodeId: node.id,
                targetId: candidateId,
                strategy: 'strict',
                status: 'bound' as const,
                reason: 'Strict ID/Label match'
              });
            }
          }
        });
      }

      return { 
        decisions, 
        updatedManifest: nextManifest 
      };
    }

    return { 
      decisions, 
      updatedManifest: manifest 
    };
  }

  private walkTree(node: OmegaNode, callback: (n: OmegaNode) => void) {
    callback(node);
    node.children?.forEach((c: OmegaNode) => this.walkTree(c, callback));
  }
}
