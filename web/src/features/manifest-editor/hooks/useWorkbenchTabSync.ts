'use client';

/**
 * @purpose Sincroniza la pestaña activa del workbench con el manifiesto.
 * @purpose_en Syncs the active workbench tab with the manifest.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:new
 * @lastUpdated 2026-06-22
 */

import { useCallback, useEffect, useRef } from 'react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import type { WorkbenchTabType } from './useWorkbenchState';

export interface WorkbenchTabSync {
  setActiveTab: (tabId: string) => void;
}

export function useWorkbenchTabSync(
  manifest: OMEGA_Manifest,
  updateManifest: (updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>)) => void,
  activeTabType: string | undefined,
  focusTab: (paneId: string, tabId: string) => void,
): WorkbenchTabSync {
  const setActiveTab = useCallback((tabId: string) => {
    if (['orbital', 'rack', 'source'].includes(tabId)) {
      focusTab('primary', `tab-${tabId}`);
    }
  }, [focusTab]);

  const lastSyncedTabRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const manifestTab = manifest.ui?.layout?.activeTab;
    const currentTabType = activeTabType || 'rack';
    if (lastSyncedTabRef.current === currentTabType) return;
    if (manifestTab !== currentTabType && ['rack', 'orbital'].includes(currentTabType)) {
      lastSyncedTabRef.current = currentTabType;
      updateManifest({
        ui: {
          ...manifest.ui,
          layout: {
            width: manifest.ui?.layout?.width || 800,
            height: manifest.ui?.layout?.height || 600,
            containers: manifest.ui?.layout?.containers || [],
            ...manifest.ui?.layout,
            activeTab: currentTabType as WorkbenchTabType,
          },
        },
      });
    }
  }, [activeTabType, manifest, updateManifest]);

  return { setActiveTab };
}
