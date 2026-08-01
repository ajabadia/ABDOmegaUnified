'use client';

/**
 * @purpose Gestiona y calcula el diseño de un contenedor según los datos del manifesto, incluyendo ancho, alto, elementos, visibilidad y contenedores.
 * @purpose_en Manages and calculates the layout of a container based on manifest data, including width, height, elements, visibility, and containers.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:26wqej
 * @lastUpdated 2026-06-15T13:11:19.087Z
 */

import { useMemo } from 'react';
import type { OMEGA_Manifest, ManifestEntity, OmegaNode } from '@/omega-ui-core/types/manifest';
import { adaptNodeToManifestEntity, calculateWorldPosition } from '../entities/ucaInspectorAdapter';

/**
 * OMEGA ERA 7.2.3 - RACK LAYOUT ENGINE
 * Derived exclusively from the Canonical UCA Tree.
 */
export function useRackLayout(manifest: OMEGA_Manifest) {
  const hp = manifest?.metadata?.rack?.hp || 12;
  const isCompact = manifest?.metadata?.rack?.height_mode === 'compact';
  
  const width = useMemo(() => hp * 15 * 1.5, [hp]);
  const height = useMemo(() => (manifest.ui?.dimensions?.height || (isCompact ? 140 : 420)) * 1.5, [manifest.ui, isCompact]);
 
  // 1. FLATTEN CANONICAL TREE (Sovereign Source)
  const allElements = useMemo(() => {
    const tree = manifest.ui?.tree;
    if (!tree) return [];

    const entities: (ManifestEntity & { isJack: boolean })[] = [];

    const traverse = (node: OmegaNode) => {
      // We only project 'cell' nodes into the flat entity list for the rack engine
      if (node.kind === 'cell' || node.kind === 'port') {
        const projection = adaptNodeToManifestEntity(node);
        // Recalculate absolute position based on parent offsets
        const worldPos = calculateWorldPosition(tree, node.id) || projection.pos;
        
        entities.push({
          ...projection,
          pos: worldPos,
          isJack: node.role === 'port' || node.cellRef === 'port'
        });
      }

      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    traverse(tree);
    return entities;
  }, [manifest.ui?.tree]);
 
  // 2. EXTRACT CONTAINERS
  const containers = useMemo(() => manifest.ui?.layout?.containers || [], [manifest.ui?.layout?.containers]);
 
  // 3. RESOLVE VISIBILITY
  const visibleElements = useMemo(() => {
    // In Era 7.2.3, we rely on the tree structure. 
    // Filtering here ensures compatibility with legacy simulation hooks.
    return allElements; 
  }, [allElements]);

  return {
    width,
    height,
    allElements,
    visibleElements,
    containers
  };
}

