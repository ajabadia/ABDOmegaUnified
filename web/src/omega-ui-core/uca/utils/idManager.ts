/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @purpose Gestiona IDs únicos para nodos en un manifesto OMEGA, asegurando la unicidad de los IDs a través de la rama UCA y proporcionando funcionalidad para generar nuevos IDs y remapear existentes.
 * @purpose_en Manages unique IDs for nodes in an OMEGA manifest, ensuring ID uniqueness across the UCA tree and providing functionality to generate new IDs and remap existing ones.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:1,sig:79sd86
 * @lastUpdated 2026-06-15T16:54:56.688Z
 */

import type { OmegaNode, OMEGA_Manifest } from '../../types/manifest';

/**
 * OMEGA Phase 9.4A - ID Manager Service (Industrial Core)
 * Centralized governance for ID uniqueness across the UCA tree.
 */
export class IdManager {
  private usedIds: Set<string>;

  constructor(manifest: OMEGA_Manifest) {
    this.usedIds = new Set();
    // 1. Scan Legacy Arrays
    (manifest.ui?.controls || []).forEach(c => this.usedIds.add(c.id));
    (manifest.ui?.jacks || []).forEach(j => this.usedIds.add(j.id));
    (manifest.ui?.layout?.containers || []).forEach(c => this.usedIds.add(c.id));
    
    // 2. Scan UCA Tree
    if (manifest.ui?.tree) {
      this.scanTree(manifest.ui.tree);
    }
  }

  /**
   * Scans the entire tree and populates the usedIds set.
   */
  private scanTree(node: OmegaNode) {
    if (!node) return;
    this.usedIds.add(node.id);
    if (node.children) {
      node.children.forEach(child => this.scanTree(child));
    }
  }

  /**
   * Generates a unique ID with an optional prefix.
   */
  generateId(prefix: string = 'node'): string {
    let newId: string;
    do {
      newId = `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
    } while (this.usedIds.has(newId));
    
    this.usedIds.add(newId);
    return newId;
  }

  /**
   * Recursively remaps all IDs in a subtree.
   */
  remapSubtree(node: OmegaNode): { node: OmegaNode; remapLog: Record<string, string> } {
    const remapLog: Record<string, string> = {};

    const process = (n: OmegaNode): OmegaNode => {
      const oldId = n.id;
      const prefix = oldId.includes('_') ? oldId.split('_')[0] : 'node';
      const newId = this.generateId(prefix);
      
      remapLog[oldId] = newId;

      const cloned: OmegaNode = {
        ...structuredClone(n),
        id: newId
      };

      if (cloned.children) {
        cloned.children = cloned.children.map(c => process(c));
      }

      return cloned;
    };

    const newNode = process(node);
    return { node: newNode, remapLog };
  }
}
