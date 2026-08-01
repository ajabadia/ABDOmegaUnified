'use client';

/**
 * @purpose Gestiona navegación y resaltado dentro del editor de manifesto OMEGA según las interacciones del usuario con los problemas.
 * @purpose_en Manages navigation and highlighting within an OMEGA manifest editor based on user interactions with issues.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:7ynx9j
 * @lastUpdated 2026-06-15T13:12:01.594Z
 */

import { useCallback, useState } from 'react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

export const useAuditNavigator = (
  manifest: OMEGA_Manifest,
  setSelectedItemId: (id: string | null) => void,
  setActiveTab: (tab: string) => void
) => {
  const [highlightPath, setHighlightPath] = useState<string | null>(null);

  const handleNavigateToIssue = useCallback((path: string) => {
    console.log(`%c[AUDIT_GPS] Target Path: ${path}`, "color: #00f0ff; font-weight: bold; font-size: 12px;");
    
    setHighlightPath(null);

    // 1. Root / Metadata / Global errors
    if (!path || path === '/' || path === '' || path.startsWith('/id') || path.startsWith('/metadata') || path.startsWith('/schemaVersion')) {
      setSelectedItemId(null);
      setHighlightPath(path || '/');
      return;
    }

    // 2. Control errors: /ui/controls/N/property
    const ctrlMatch = path.match(/\/ui\/controls\/(\d+)(.*)/);
    if (ctrlMatch) {
      const idx = parseInt(ctrlMatch[1]);
      const property = ctrlMatch[2];
      const ctrl = manifest.ui?.controls?.[idx];
      if (ctrl) {
        setSelectedItemId(ctrl.id);
        setHighlightPath(property);
        if (ctrl.presentation?.tab) setActiveTab(ctrl.presentation.tab);
        return;
      }
    }

    // 3. Jack errors: /ui/jacks/N/property
    const jackMatch = path.match(/\/ui\/jacks\/(\d+)(.*)/);
    if (jackMatch) {
      const idx = parseInt(jackMatch[1]);
      const property = jackMatch[2];
      const jack = manifest.ui?.jacks?.[idx];
      if (jack) {
        setSelectedItemId(jack.id);
        setHighlightPath(property);
        if (jack.presentation?.tab) setActiveTab(jack.presentation.tab);
        return;
      }
    }
  }, [manifest.ui, setSelectedItemId, setActiveTab]);

  return {
    highlightPath,
    setHighlightPath,
    handleNavigateToIssue
  };
};
