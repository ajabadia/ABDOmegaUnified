/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:07
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
