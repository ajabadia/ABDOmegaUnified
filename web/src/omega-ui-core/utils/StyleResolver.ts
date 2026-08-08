/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   web/src/omega-ui-core es la fuente unica de verdad del design system.
   Consumido por host/ui y web/public via junctions (sin sync scripts).
   Editable en su lugar.
   ================================================================= */

/**
 * @purpose Barrel file — re-exporta todas las funciones de estilo desde los módulos extraídos.
 * @purpose_en Barrel file — re-exports all style functions from the extracted modules.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:0,sig:1ucskoa
 * @lastUpdated 2026-06-20T13:03:04.572Z
 */

export type {
  ResolvedNodeStyle,
  UnusedResources,
  SubtreeResources,
} from './styleResolverTypes';

export {
  resolveNodeStyle,
  resolveSize,
  resolveColor,
} from './styleResolverCore';

export {
  expandNodeStyle,
  contractNodeStyle,
  contractManifest,
  pruneUnusedStyles,
  fossilizeLegacyStyles,
  distillManifest,
} from './styleResolverDistill';

export {
  getUnusedStylesAndAssets,
  extractSubtreeResources,
  pruneUnusedAssets,
} from './styleResolverAssets';
