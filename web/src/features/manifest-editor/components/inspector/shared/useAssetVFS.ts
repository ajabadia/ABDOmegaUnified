'use client';

/**
 * @purpose Gestiona un sistema de archivos virtuales (hierarquia de carpetas) a partir de activos de biblioteca y activos del manifesto local para su uso en el editor de manifesto OMEGA.
 * @purpose_en Builds a virtual file system (folder hierarchy) from library assets and local manifest assets for use in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:1h4hti8
 * @lastUpdated 2026-06-15T11:50:30.004Z
 */

import { useMemo } from 'react';
import type { LibraryAsset, OMEGA_Asset } from '@/omega-ui-core/types/manifest';
import type { AssetSelectionMetadata } from './AssetSelector';

/**
 * Hook extracted from AssetSelector.
 * Builds a virtual file system (folder hierarchy) from library assets and local manifest assets.
 */
export function useAssetVFS(
  assets: OMEGA_Asset[],
  library: LibraryAsset[],
  restrictToSequences: boolean | undefined,
  resolveAsset: (id: string | undefined) => string | undefined
) {
  return useMemo(() => {
    const map = new Map<string, AssetSelectionMetadata[]>();
    const subfolders = new Map<string, Set<string>>();

    if (library.length > 0) {
      const modeKey = restrictToSequences ? 'sequences' : 'statics';
      const rootKey = `lib:${modeKey}`;
      if (!map.has(rootKey)) map.set(rootKey, []);
      if (!subfolders.has(rootKey)) subfolders.set(rootKey, new Set());

      library.forEach((item: LibraryAsset) => {
        const path = item.path || item.id;
        const pathMarker = `/${modeKey}/`;
        const pathParts = path.split(pathMarker);

        if (pathParts.length > 1) {
          const relativePath = pathParts[1];
          const folderParts = relativePath.split('/');

          if (folderParts.length > 1) {
            const folderName = folderParts[0];
            const fullFolderKey = `${rootKey}/${folderName}`;
            subfolders.get(rootKey)?.add(fullFolderKey);

            let currentParent = rootKey;
            for (let i = 0; i < folderParts.length - 1; i++) {
              const fName = folderParts[i];
              const fKey = `${currentParent}/${fName}`;
              if (!map.has(fKey)) map.set(fKey, []);
              if (!subfolders.has(fKey)) subfolders.set(fKey, new Set());

              if (i > 0) {
                subfolders.get(currentParent)?.add(fKey);
              }
              currentParent = fKey;
            }
            map.get(currentParent)?.push(item as unknown as AssetSelectionMetadata);
          } else {
            map.get(rootKey)?.push(item as unknown as AssetSelectionMetadata);
          }
        } else {
          map.get(rootKey)?.push(item as unknown as AssetSelectionMetadata);
        }
      });
    }

    // Process local manifest assets
    assets.forEach((asset: OMEGA_Asset) => {
      const isSequenceAsset = asset.id.includes('sequences');
      if (restrictToSequences && !isSequenceAsset) return;
      if (!restrictToSequences && isSequenceAsset) return;

      const parts = asset.id.split('/');
      const folderName = parts.length > 1 ? parts[0] : 'root';
      if (!map.has(folderName)) map.set(folderName, []);
      const existing = map.get(folderName);
      if (existing) existing.push({
        id: asset.id,
        name: asset.id.split('/').pop() || 'Untitled',
        path: resolveAsset(asset.id),
      } as unknown as AssetSelectionMetadata);
    });

    // Merge subfolders into the map as "Folder Objects" for the UI to render
    subfolders.forEach((children, parentKey) => {
      const folderItems = map.get(parentKey) || [];
      children.forEach(childKey => {
        folderItems.unshift({
          id: childKey,
          name: childKey.split('/').pop()?.toUpperCase(),
          isFolder: true,
          path: childKey
        });
      });
      map.set(parentKey, folderItems);
    });

    return map;
  }, [assets, library, restrictToSequences, resolveAsset]);
}
