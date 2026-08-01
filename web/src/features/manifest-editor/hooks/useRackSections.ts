'use client';

/**
 * @purpose Gestiona el estado para paneles colapsables en el inspector del editor de manifesto OMEGA.
 * @purpose_en Manages the state for collapsible panels in the OMEGA manifest editor's inspector.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:ddhoyf
 * @lastUpdated 2026-06-15T13:22:38.974Z
 */

import { useCallback, useState, useMemo } from 'react';

/**
 * Rack sections collapsible state — local UI preferences for the inspector panels.
 * Pure state, zero external dependencies.
 */
export interface RackSections {
  identity: boolean;
  essentialIdentity: boolean;
  identityBranding: boolean;
  globalUiSkin: boolean;
  activeConstructionPlane: boolean;
  moduleTaxonomy: boolean;
  physicalEmulationProfile: boolean;
  aestheticsGlobals: boolean;
  aestheticsElements: boolean;
  architecture: boolean;
}

export function useRackSections() {
  const [rackSections, setRackSections] = useState<RackSections>({
    identity: false,
    essentialIdentity: true,
    identityBranding: false,
    globalUiSkin: false,
    activeConstructionPlane: false,
    moduleTaxonomy: false,
    physicalEmulationProfile: false,
    aestheticsGlobals: false,
    aestheticsElements: false,
    architecture: false,
  });

  const handleToggleRackSection = useCallback((section: string) => {
    setRackSections(prev => {
      if (!(section in prev)) return prev;
      const key = section as keyof RackSections;
      const isCurrentlyActive = prev[key] === true;

      const next: RackSections = {
        identity: false,
        essentialIdentity: false,
        identityBranding: false,
        globalUiSkin: false,
        activeConstructionPlane: false,
        moduleTaxonomy: false,
        physicalEmulationProfile: false,
        aestheticsGlobals: false,
        aestheticsElements: false,
        architecture: false,
      };

      if (!isCurrentlyActive) {
        next[key] = true;
      }
      return next;
    });
  }, []);

  return useMemo(() => ({ rackSections, handleToggleRackSection }), [rackSections, handleToggleRackSection]);
}
