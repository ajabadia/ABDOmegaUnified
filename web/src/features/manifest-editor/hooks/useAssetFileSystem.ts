/**
 * @purpose Gestiona el sistema de archivos virtuales para AssetSelector, creando un mapa de carpetas, maneja la navegación y determina el estado raíz.
 * @purpose_en Manages the virtual file system for AssetSelector by building a folder map, handling navigation, and determining the root state.
 * @refactorable true (contains complex state management and multiple UI-related functions)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:2,imports:3,sig:1ks7qqr
 * @lastUpdated 2026-06-20T18:37:19.080Z
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { OMEGA_Manifest, LibraryAsset, OMEGA_Asset, OmegaStyleNode } from '@/omega-ui-core/types/manifest';
import { useAssetRegistry } from '@/features/manifest-editor/hooks/useAssetRegistry';

// Shared type used by both hook and component
export interface AssetSelectionMetadata extends Partial<OmegaStyleNode> {
  id?: string | undefined;
  name?: string | undefined;
  path?: string | undefined;
  isFolder?: boolean | undefined;
  frames?: number | undefined;
  defaultFrame?: number | undefined;
  orientation?: 'h' | 'v' | undefined;
}

interface UseAssetFileSystemOptions {
  manifest: OMEGA_Manifest;
  resolveAsset: (id: string | undefined) => string | undefined;
  restrictToSequences?: boolean | undefined;
  initialPath?: string | undefined;
  onSelect: (assetId: string | undefined, metadata?: AssetSelectionMetadata | undefined) => void;
}

interface UseAssetFileSystemReturn {
  /** Map of folder paths to their items */
  folders: Map<string, AssetSelectionMetadata[]>;
  /** Current navigation path */
  currentPath: string | null;
  /** Whether we're at root level */
  isAtRoot: boolean;
  /** Navigate to a specific path */
  navigateTo: (path: string | null) => void;
  /** Navigate up one level */
  navigateBack: () => void;
  /** Library items for the current path */
  library: LibraryAsset[];
  /** File input ref for upload bridge */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  /** Pending sequence files for ingestion */
  pendingSequenceFiles: File[] | null;
  /** Set pending sequence files */
  setPendingSequenceFiles: React.Dispatch<React.SetStateAction<File[] | null>>;
  /** Handle selection from library */
  handleLibrarySelect: (item: AssetSelectionMetadata) => Promise<void>;
}

/**
 * Hook that manages a virtual file system built from library assets and manifest assets.
 * Provides folder navigation, library item selection, and asset ingestion bridge.
 */
export function useAssetFileSystem({
  manifest,
  resolveAsset,
  restrictToSequences,
  initialPath,
  onSelect,
}: UseAssetFileSystemOptions): UseAssetFileSystemReturn {
  const { library, assets } = useAssetRegistry(manifest, restrictToSequences ? 'sequences' : 'statics');
  const [currentPath, setCurrentPath] = useState<string | null>(initialPath || null);
  const [pendingSequenceFiles, setPendingSequenceFiles] = useState<File[] | null>(null);
  const fileInputRef = useState<React.RefObject<HTMLInputElement | null>>(() => ({ current: null }))[0];

  // ── Virtual file system: build folder map from library + assets ────
  const folders = useMemo(() => {
    const map = new Map<string, AssetSelectionMetadata[]>();
    const subfolders = new Map<string, Set<string>>();

    // Process library assets
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
            let currentParent = rootKey;
            for (let i = 0; i < folderParts.length - 1; i++) {
              const fName = folderParts[i];
              const fKey = `${currentParent}/${fName}`;
              if (!map.has(fKey)) map.set(fKey, []);
              if (!subfolders.has(fKey)) subfolders.set(fKey, new Set());
              if (i > 0) subfolders.get(currentParent)?.add(fKey);
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
      if (existing) {
        existing.push({
          id: asset.id,
          name: asset.id.split('/').pop() || 'Untitled',
          path: resolveAsset(asset.id),
        } as unknown as AssetSelectionMetadata);
      }
    });

    // Merge subfolders as virtual folder items
    subfolders.forEach((children, parentKey) => {
      const folderItems = map.get(parentKey) || [];
      children.forEach(childKey => {
        folderItems.unshift({
          id: childKey,
          name: childKey.split('/').pop()?.toUpperCase(),
          isFolder: true,
          path: childKey,
        });
      });
      map.set(parentKey, folderItems);
    });

    return map;
  }, [assets, library, restrictToSequences, resolveAsset]);

  // ── Force navigation in restricted mode ──────────────────────────
  useEffect(() => {
    const isInsideRestrictedTree = currentPath?.startsWith(initialPath || '');
    if (restrictToSequences && initialPath && (!currentPath || currentPath === 'lib:sequences' || !isInsideRestrictedTree)) {
      requestAnimationFrame(() => setCurrentPath(initialPath));
    }
  }, [restrictToSequences, initialPath, currentPath]);

  // ── Derived state ────────────────────────────────────────────────
  const isAtRoot = !currentPath || (restrictToSequences && currentPath === initialPath) || currentPath === 'lib:sequences';

  // ── Navigation ───────────────────────────────────────────────────
  const navigateTo = useCallback((path: string | null) => {
    setCurrentPath(path);
  }, []);

  const navigateBack = useCallback(() => {
    setCurrentPath(prev => {
      const parts = prev?.split('/') || [];
      parts.pop();
      return parts.length > 0 ? parts.join('/') : null;
    });
  }, []);

  // ── Library selection (ingestion bridge) ─────────────────────────
  const handleLibrarySelect = useCallback(async (item: AssetSelectionMetadata) => {
    try {
      const path = item.path as string;
      const response = await fetch(path);
      const blob = await response.blob();
      const file = new File([blob], path.split('/').pop() || 'asset', { type: blob.type });

      const uploadBridge = (window as unknown as Record<string, unknown>).triggerAssetUpload as
        | ((f: File[], cb: (id: string) => void) => void)
        | undefined;
      if (uploadBridge) {
        uploadBridge([file], (assetId: string) => onSelect(assetId, item));
      }
    } catch (err) {
      console.error('Failed to ingest library asset:', err);
    }
  }, [onSelect]);

  return {
    folders,
    currentPath,
    isAtRoot,
    navigateTo,
    navigateBack,
    library,
    fileInputRef,
    pendingSequenceFiles,
    setPendingSequenceFiles,
    handleLibrarySelect,
  };
}
