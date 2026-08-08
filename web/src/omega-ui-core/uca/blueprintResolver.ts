/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Normaliza y canonicaliza las estructuras OmegaNode para instancias de ejecución determinista en el editor de manifesto OMEGA.
 * @purpose_en Normalizes and canonicalizes OmegaNode structures for deterministic runtime instances in the OMEGA manifest editor.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1el0ql0
 * @lastUpdated 2026-06-15T16:10:51.285Z
 */

import type { OmegaNode, OMEGA_Manifest, LayoutMode } from '../types/manifest';

/**
 * OMEGA UCA - Blueprint Resolver (Phase 20.4)
 * Responsible for structural normalization and canonicalization.
 * Transforms an editable Blueprint into a deterministic runtime instance form.
 * 
 * Rules:
 * 1. Deep clone to prevent side-effects.
 * 2. Fill default values for mandatory structural fields.
 * 3. NO semantic corrections (e.g. signal path logic) - only structural normalization.
 */
export class BlueprintResolver {
  /**
   * Resolves an OmegaNode (Blueprint) into its canonical form.
   */
  public static resolve(node: OmegaNode, _manifest: OMEGA_Manifest): OmegaNode {
    // 1. Deep Clone
    const canonical = JSON.parse(JSON.stringify(node)) as OmegaNode;

    // 2. Structural Normalization (Recursive)
    this.normalizeNode(canonical);

    // 3. Inheritance / Template Flattening (Placeholder for Phase 21)
    // If cellRef matches a moduleTemplate, we would merge it here.

    return canonical;
  }

  /**
   * Recursive normalization of node properties.
   */
  private static normalizeNode(node: OmegaNode): void {
    // A. Defaults for Role
    if (!node.role) {
      node.role = (node.kind === 'asset-layer' || node.kind === 'layer') ? 'decor' : 'control';
    }

    // B. Defaults for Layout
    if (!node.layout) {
      node.layout = { pos: { x: 0, y: 0 } };
    } else {
      if (!node.layout.pos) node.layout.pos = { x: 0, y: 0 };
      if (!node.layout.mode) node.layout.mode = 'absolute' as LayoutMode;
    }

    // C. Defaults for Style
    if (!node.style) {
      node.style = {} as OmegaNode['style'];
    }

    // D. Defaults for Visibility
    if (node.visible === undefined) node.visible = true;
    if (node.locked === undefined) node.locked = false;

    // E. Recurse children
    if (node.children) {
      node.children.forEach(child => this.normalizeNode(child));
    }
  }
}
