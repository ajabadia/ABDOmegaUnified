/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:07
   ================================================================= */

/**
 * @purpose Gestiona el detectar y la podar de activos no utilizados en un manifesto OMEGA.
 * @purpose_en Manages the detection and pruning of unused assets in an OMEGA manifest.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:3,imports:2,sig:18nxsjq
 * @lastUpdated 2026-06-19T18:57:24.114Z
 */

import type { OmegaNode, OMEGA_Manifest, StyleVariant } from '../types/manifest';
import type { UnusedResources, SubtreeResources } from './styleResolverTypes';

// ═════════════════════════════════════════════════════════════════════
//  UNUSED DETECTION
// ═════════════════════════════════════════════════════════════════════

/** Walk a node subtree and collect used types, variants, and asset IDs. */
function walkUsage(
  node: OmegaNode,
  usedTypes: Set<string>,
  usedVariants: Map<string, Set<string>>,
  usedAssets: Set<string>,
) {
  const cellRef = node.cellRef || node.kind || 'knob';
  const variant = node.style?.variant || 'default';
  usedTypes.add(cellRef);

  if (!usedVariants.has(cellRef)) usedVariants.set(cellRef, new Set());
  usedVariants.get(cellRef)!.add(variant);

  if (node.style?.asset) usedAssets.add(node.style.asset);
  if (node.style?.backgroundAsset) usedAssets.add(node.style.backgroundAsset);
  if ('asset' in node && typeof (node as { asset?: unknown }).asset === 'string') {
    usedAssets.add((node as { asset: string }).asset);
  }

  if (node.children) node.children.forEach((c) => walkUsage(c, usedTypes, usedVariants, usedAssets));
}

/**
 * Scans styles to find unused variants and collect assets from kept styles.
 */
function scanStyles(
  styles: Record<string, StyleVariant[]>,
  usedTypes: Set<string>,
  usedVariants: Map<string, Set<string>>,
): { unusedStyles: { type: string; variantId: string }[]; keptStyleAssets: string[] } {
  const unusedStyles: { type: string; variantId: string }[] = [];
  const keptStyleAssets = new Set<string>();

  for (const [type, variants] of Object.entries(styles)) {
    if (!usedTypes.has(type)) {
      // All non-default variants are unused
      variants.forEach((v) => {
        if (v.id !== 'default') unusedStyles.push({ type, variantId: v.id });
      });
    } else {
      const typeVariants = usedVariants.get(type)!;
      variants.forEach((v) => {
        if (v.id !== 'default' && !typeVariants.has(v.id)) {
          unusedStyles.push({ type, variantId: v.id });
        } else {
          // Kept variant — collect asset references
          if (v.aesthetics?.asset) keptStyleAssets.add(v.aesthetics.asset);
          if (v.aesthetics?.texture) keptStyleAssets.add(v.aesthetics.texture as string);
        }
      });
    }
  }

  return { unusedStyles, keptStyleAssets: Array.from(keptStyleAssets) };
}

/**
 * Detects all unused style variants and assets in the manifest.
 */
export function getUnusedStylesAndAssets(manifest: OMEGA_Manifest): UnusedResources {
  const usedTypes = new Set<string>();
  const usedVariants = new Map<string, Set<string>>();
  const usedAssets = new Set<string>();

  // 1. Walk all nodes/trees
  if (manifest.nodes) manifest.nodes.forEach((n) => walkUsage(n, usedTypes, usedVariants, usedAssets));
  if (manifest.ui?.tree) walkUsage(manifest.ui.tree, usedTypes, usedVariants, usedAssets);

  // 2. Scan faceplate
  const faceplate = manifest.ui?.faceplate;
  if (typeof faceplate === 'string') {
    usedAssets.add(faceplate);
  } else if (faceplate && typeof faceplate === 'object') {
    if (faceplate.asset) usedAssets.add(faceplate.asset as string);
    if (faceplate.texture) usedAssets.add(faceplate.texture as string);
  }

  // 3. Scan hardware screw mapping
  const hardware = manifest.ui?.hardware;
  if (hardware && typeof hardware === 'object') {
    const screwMapping = (hardware as Record<string, unknown>).screwMapping;
    if (Array.isArray(screwMapping)) {
      screwMapping.forEach((asset) => {
        if (typeof asset === 'string') usedAssets.add(asset);
      });
    }
  }

  // 4. Scan styles → unused variants + kept style assets
  const styles = manifest.ui?.styles || {};
  const { unusedStyles, keptStyleAssets } = scanStyles(styles, usedTypes, usedVariants);
  keptStyleAssets.forEach((id) => usedAssets.add(id));

  // 5. Compare with resources.assets
  const currentAssets = manifest.resources?.assets || [];
  const unusedAssets = currentAssets
    .filter((asset) => !usedAssets.has(asset.id))
    .map((asset) => asset.id);

  return { unusedStyles, unusedAssets };
}

// ═════════════════════════════════════════════════════════════════════
//  SUBTREE RESOURCES
// ═════════════════════════════════════════════════════════════════════

/**
 * Extract the minimal set of styles and assets required by a specific subtree.
 */
export function extractSubtreeResources(
  rootNode: OmegaNode,
  manifest: OMEGA_Manifest,
): SubtreeResources {
  const usedTypes = new Set<string>();
  const usedVariants = new Map<string, Set<string>>();
  const usedAssetIds = new Set<string>();

  walkUsage(rootNode, usedTypes, usedVariants, usedAssetIds);

  // Filter ui.styles
  const allStyles = manifest.ui?.styles || {};
  const prunedStyles: Record<string, StyleVariant[]> = {};

  for (const [type, variants] of Object.entries(allStyles)) {
    if (!usedTypes.has(type)) continue;
    const typeVariants = usedVariants.get(type)!;
    const keep = variants.filter(
      (v) => v.id === 'default' || typeVariants.has(v.id),
    );
    if (keep.length > 0) prunedStyles[type] = keep;
  }

  // Collect assets from kept style variants
  for (const variants of Object.values(prunedStyles)) {
    for (const v of variants) {
      if (v.aesthetics?.asset) usedAssetIds.add(v.aesthetics.asset);
      if (v.aesthetics?.texture) usedAssetIds.add(v.aesthetics.texture as string);
    }
  }

  // Filter resources.assets
  const allAssets = manifest.resources?.assets || [];
  const prunedAssets = allAssets.filter((a) => usedAssetIds.has(a.id));

  return { styles: prunedStyles, assets: prunedAssets };
}

// ═════════════════════════════════════════════════════════════════════
//  PRUNE UNUSED ASSETS
// ═════════════════════════════════════════════════════════════════════

/**
 * Prunes the specified unused asset IDs from the manifest.
 */
export function pruneUnusedAssets(
  manifest: OMEGA_Manifest,
  unusedAssetIds?: string[],
): OMEGA_Manifest {
  const targetIds = unusedAssetIds || getUnusedStylesAndAssets(manifest).unusedAssets;
  if (targetIds.length === 0) return manifest;

  const currentAssets = manifest.resources?.assets || [];
  const purgedAssets = currentAssets.filter((a) => !targetIds.includes(a.id));

  return {
    ...manifest,
    resources: {
      ...manifest.resources,
      assets: purgedAssets.length > 0 ? purgedAssets : undefined,
    } as OMEGA_Manifest['resources'],
  };
}
