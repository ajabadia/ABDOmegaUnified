'use client';

/**
 * @purpose Gestiona la funcionalidad de búsqueda para entidades dentro de un manifesto OMEGA, priorizando nodos UCA y cayendo hacia los items legados.
 * @purpose_en Manages the search functionality for entities within an OMEGA manifest, prioritizing UCA nodes and falling back to legacy items.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:1jb9yy
 * @lastUpdated 2026-06-19T18:49:27.284Z
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest, ManifestEntity, OmegaNode } from '@/omega-ui-core/types/manifest';
import { findNodeInTree, findLegacyItem } from './ucaInspectorAdapter';

export const useEntityFinder = (manifest: OMEGA_Manifest) => {
  const findItem = useCallback((id: string): ManifestEntity | OmegaNode | undefined => {
    // 1. UCA Priority (Industrial Rule - Phase 4.2)
    if (manifest.ui?.useUCA !== false) {
      const tree = manifest.ui?.tree;
      if (tree) {
        const ucaNode = findNodeInTree(tree, id);
        if (ucaNode) return ucaNode;
      }
    }

    // 2. Legacy Fallback
    return findLegacyItem(manifest, id);
  }, [manifest]);

  return { findItem };
};
