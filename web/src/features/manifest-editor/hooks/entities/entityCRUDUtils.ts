'use client';

/**
 * @purpose Gestiona la conversión de una estructura de árbol a un formato manifest, asegurando que las proyecciones legadas estén sincronizadas con el árbol UCA canonical.
 * @purpose_en Manages the conversion of a tree structure to a manifest format, ensuring legacy projections are synchronized with the canonical UCA tree.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:18stcd7
 * @lastUpdated 2026-06-20T10:45:53.257Z
 */

import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import { treeToManifest } from '@/omega-ui-core/utils/ucaBridge';

/**
 * buildManifestFromTree
 * Helper that consolidates the "walk tree → project to legacy arrays → return new manifest slice" pattern
 * used by every write operation. Keeps the legacy `controls`/`jacks`/`layout.containers`
 * projections in sync with the canonical UCA tree.
 */
export function buildManifestFromTree(latestManifest: OMEGA_Manifest, nextTree: OmegaNode) {
  const legacyProjections = treeToManifest(nextTree);
  return {
    nodes: [nextTree],
    ui: {
      ...latestManifest.ui,
      tree: nextTree,
      controls: legacyProjections.ui?.controls ?? legacyProjections.controls ?? latestManifest.ui?.controls ?? [],
      jacks: legacyProjections.ui?.jacks ?? legacyProjections.jacks ?? latestManifest.ui?.jacks ?? [],
      layout: {
        ...(latestManifest.ui?.layout as Record<string, unknown>),
        width: latestManifest.ui?.layout?.width || 800,
        height: latestManifest.ui?.layout?.height || 600,
        containers: legacyProjections.ui?.layout?.containers ?? legacyProjections.layout?.containers ?? latestManifest.ui?.layout?.containers ?? []
      }
    }
  };
}
