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
    // 1. El árbol manda, siempre. Antes lo saltábamos si `useUCA` era false;
    // con la bandera ya no existe, y buscar solo en las listas planas hacía que
    // un nodo del árbol no se encontrara por id.
    const tree = manifest.ui?.tree;
    if (tree) {
      const ucaNode = findNodeInTree(tree, id);
      if (ucaNode) return ucaNode;
    }

    // 2. Legacy Fallback — LECTURA, y se queda: es lo que permite abrir y
    // editar un documento antiguo que aún no tiene árbol. Todas las escrituras
    // van ya al árbol, así que esto solo se usa al importar.
    return findLegacyItem(manifest, id);
  }, [manifest]);

  return { findItem };
};
