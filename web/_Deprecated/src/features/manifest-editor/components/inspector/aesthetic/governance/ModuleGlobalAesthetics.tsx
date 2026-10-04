'use client';

/**
 * @purpose Gestiona estéticas globales en un editor de manifesto OMEGA, incluyendo el paleta de temas, el texto físico del faceplate y las configuraciones de física atmosférica.
 * @purpose_en Manages global aesthetics in an OMEGA manifest editor, including theme palette, faceplate physical texture, and atmospheric physics settings.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:1x062wo
 * @lastUpdated 2026-06-15T11:04:01.565Z
 */

import { Layers } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import InspectorCollapsible from '../../shared/InspectorCollapsible';

// Specialized Governance Components
import ThemePaletteGovernance from './ThemePaletteGovernance';
import AtmosphericPhysicsGovernance from './AtmosphericPhysicsGovernance';
import AssetSelector from '../../shared/AssetSelector';

interface ModuleGlobalAestheticsProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
}

export default function ModuleGlobalAesthetics({ manifest, onUpdate, resolveAsset }: ModuleGlobalAestheticsProps) {
  const ui = manifest.ui || {};
  const faceplate = ui.faceplate;

  return (
    <div className="space-y-4">
      {/* 1. CHROMATIC DNA */}
      <ThemePaletteGovernance manifest={manifest} onUpdate={onUpdate} />

      {/* 2. PHYSICAL SURFACE */}
      <InspectorCollapsible title="Faceplate Physical Texture" icon={Layers}>
         <div className="space-y-3 pt-2">
            <p className="text-[7px] wb-text-muted font-bold uppercase tracking-tighter italic">
               Select a custom background asset for your faceplate (SVG or PNG). 
               This will be the base for all physics and shadows.
            </p>
            <AssetSelector 
               manifest={manifest}
               label="Faceplate Texture"
               selectedAssetId={typeof faceplate === 'string' ? faceplate : undefined}
               onSelect={(id) => onUpdate({ ui: { ...ui, faceplate: id } })}
               resolveAsset={resolveAsset || ((id) => id)}
            />
         </div>
      </InspectorCollapsible>

      {/* 3. ATMOSPHERIC ENVIRONMENT */}
      <AtmosphericPhysicsGovernance manifest={manifest} onUpdate={onUpdate} resolveAsset={resolveAsset} />
    </div>
  );
}
