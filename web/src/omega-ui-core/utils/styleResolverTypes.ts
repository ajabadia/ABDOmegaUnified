/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Gestiona tipos y interfaces para el resolver de estilo y el flujo de estilos.
 * @purpose_en Defines types and interfaces for the StyleResolver and the styling pipeline.
 * @refactorable false
 * @classification Type Definition
 * @complexity Low
 * @fingerprint exports:3,imports:1,sig:laj1qf
 * @lastUpdated 2026-06-19T18:57:58.121Z
 */

import type { OmegaStyleNode, StyleVariant, OMEGA_Asset } from '../types/manifest';

export interface ResolvedNodeStyle {
  /** The fully resolved style object with all tokens converted to hex */
  style: Partial<OmegaStyleNode>;
  /** Which variant was used for resolution */
  variant: string;
  /** Which cellRef (component type) was used for lookup */
  cellRef: string;
}

export interface UnusedResources {
  unusedStyles: { type: string; variantId: string }[];
  unusedAssets: string[];
}

export interface SubtreeResources {
  /** Filtered styles — only types and variants used by the subtree */
  styles: Record<string, StyleVariant[]>;
  /** Filtered assets — only assets referenced by the subtree */
  assets: OMEGA_Asset[];
}
