'use client';

/**
 * @purpose Gestiona URLs de blob locales para recursos en el espacio de trabajo, detectando automáticamente imágenes/SVG y creando URLs accesibles.
 * @purpose_en Manages local blob URLs for resources in the workspace, automatically detecting images/SVGs and creating accessible URLs.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:xr3h0p
 * @lastUpdated 2026-06-15T13:11:35.063Z
 */

import { useEffect, useMemo } from 'react';

interface AssetResource {
  name: string;
  data: ArrayBuffer;
  type: string;
}

/**
 * useAssetManager (Fase 13)
 * Manages local blob URLs for resources in the workspace.
 * Automatically detects images/SVGs and creates accessible URLs.
 */
export function useAssetManager(extraResources: AssetResource[]) {
  const assetUrls = useMemo(() => {
    const urls: Record<string, string> = {};
    
    (extraResources || []).forEach(res => {
      if (res.type.startsWith('image/') || res.name.endsWith('.svg') || res.name.endsWith('.png') || res.name.endsWith('.jpg')) {
        const blob = new Blob([res.data], { type: res.type || 'image/png' });
        // Standard OMEGA Prefix
        urls[`resources/${res.name}`] = URL.createObjectURL(blob);
      }
    });
    
    return urls;
  }, [extraResources]);

  useEffect(() => {
    return () => {
      Object.values(assetUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [assetUrls]);

  /**
   * Resolves an asset ID or URL to a real browser URL.
   * Supports:
   * - asset://filename.png -> mapped blob URL
   * - filename.png -> mapped blob URL (fallback)
   * - data:... -> self
   * - http... -> self
   */
  const resolveAsset = (assetRef: string | undefined): string | undefined => {
    if (!assetRef) return undefined;

    if (assetRef.startsWith('data:') || assetRef.startsWith('http')) {
      return assetRef;
    }

    const cleanId = assetRef.replace('asset://', '');
    return assetUrls[cleanId] || assetUrls[assetRef];
  };

  return {
    assetUrls,
    resolveAsset
  };
}
