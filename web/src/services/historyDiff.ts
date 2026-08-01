/**
 * @purpose Gestiona el comparativo de dos versiones manifestadas para detectar cambios semánticos y generar un informe de diferencia de historia.
 * @purpose_en Manages the comparison of two manifest versions to detect semantic changes and generate a history diff report.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:fk8zde
 * @lastUpdated 2026-06-15T16:56:57.099Z
 */

import type { OmegaNode } from '@/omega-ui-core/types/manifest';
import type { HistoryDiff } from './historyTypes';

/**
 * OMEGA ERA 7.2.3 - SEMANTIC DIFF (Phase 21.2)
 * Logic for structural comparison of two manifest versions.
 */
export class SemanticDiffEngine {
  /**
   * compareRevisions
   * Performs a node-by-node comparison to detect semantic changes.
   */
  static compare(revAId: string, graphA: OmegaNode[], revBId: string, graphB: OmegaNode[]): HistoryDiff {
    const changes: HistoryDiff['changes'] = [];
    
    const mapA = this.flattenNodes(graphA);
    const mapB = this.flattenNodes(graphB);
    
    const allIds = new Set([...mapA.keys(), ...mapB.keys()]);

    for (const id of allIds) {
      const nodeA = mapA.get(id);
      const nodeB = mapB.get(id);

      if (!nodeA && nodeB) {
        changes.push({ path: id, type: 'ADD', details: { kind: nodeB.kind } });
      } else if (nodeA && !nodeB) {
        changes.push({ path: id, type: 'REMOVE', details: { kind: nodeA.kind } });
      } else if (nodeA && nodeB) {
        // Simple property comparison (can be expanded)
        const propsChanged = JSON.stringify(nodeA) !== JSON.stringify(nodeB);
        if (propsChanged) {
          changes.push({ path: id, type: 'UPDATE' });
        }
      }
    }

    return {
      revisionA: revAId,
      revisionB: revBId,
      changes
    };
  }

  private static flattenNodes(nodes: OmegaNode[], map: Map<string, OmegaNode> = new Map()): Map<string, OmegaNode> {
    for (const node of nodes) {
      map.set(node.id, node);
      if (node.children) {
        this.flattenNodes(node.children, map);
      }
    }
    return map;
  }
}
