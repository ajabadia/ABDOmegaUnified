'use client';

/**
 * @purpose Hook que rehidrata el item del inspector desde el árbol UCA y construye el manifest enriquecido con recursos extra.
 * @purpose_en Hook that rehydrates the inspector item from the UCA tree and builds the enriched manifest with extra resources.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:3,imports:3,sig:4wuq0m
 * @lastUpdated 2026-06-20T22:29:06.533Z
 */

import { useMemo } from 'react';
import type { ManifestEntity, OMEGA_Manifest, ExtraResource, OmegaNode } from '@/omega-ui-core/types/manifest';
import { findNodeInTree, findLegacyItem } from '@/features/manifest-editor/hooks/entities/ucaInspectorAdapter';

export interface UseLiveInspectorItemOptions {
  item: ManifestEntity | OmegaNode | OMEGA_Manifest | null;
  manifest: OMEGA_Manifest;
  extraResources?: ExtraResource[] | undefined;
}

export interface UseLiveInspectorItemReturn {
  /** Item rehidratado desde el árbol UCA (o fallback a legacy arrays) */
  liveItem: ManifestEntity | OmegaNode | OMEGA_Manifest | null;
  /** Manifest enriquecido con recursos extra inyectados */
  enrichedManifest: OMEGA_Manifest;
  /** Raíz del árbol UCA */
  rootTree: OmegaNode | null | undefined;
}

/**
 * Rehidrata el item seleccionado desde el árbol UCA para evitar referencias stale,
 * y construye un manifest enriquecido con recursos extra para los selectores.
 */
export function useLiveInspectorItem({
  item,
  manifest,
  extraResources,
}: UseLiveInspectorItemOptions): UseLiveInspectorItemReturn {
  const rootTree = manifest?.ui?.tree;

  // LIVE REHYDRATION — find latest node from tree to avoid stale references
  const liveItem = useMemo(() => {
    if (!item || !rootTree) return item;
    const itemId = ('id' in item ? item.id : undefined) || '';
    if (!itemId) return item;

    const treeNode = findNodeInTree(rootTree, itemId);
    if (treeNode) return treeNode;

    // Fallback to legacy arrays if not in tree
    return findLegacyItem(manifest, itemId) || item;
  }, [item, rootTree, manifest]);

  // Enriched manifest with extra resources injected for selectors
  const enrichedManifest = useMemo((): OMEGA_Manifest => {
    const assetsFromResources = extraResources?.map(r => ({
      id: `resources/${r.name}`,
      url: `resources/${r.name}`,
      type: (r.type?.includes('svg') ? 'svg' : 'image') as 'svg' | 'image',
    })) || [];

    return {
      ...manifest,
      resources: {
        ...manifest.resources,
        assets: assetsFromResources.length > 0 ? assetsFromResources : (manifest.resources?.assets || []),
      },
    };
  }, [manifest, extraResources]);

  return { liveItem, enrichedManifest, rootTree };
}
