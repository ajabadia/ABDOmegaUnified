'use client';

/**
 * @purpose Gestiona una interfaz de usuario para seleccionar colores estéticos basados en capacidades y datos de un manifesto OMEGA.
 * @purpose_en Manages a user interface for selecting aesthetic colors based on capabilities and data from an OMEGA manifest.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:0tgkrp
 * @lastUpdated 2026-06-15T11:40:14.664Z
 */

import type { OMEGA_Manifest, OmegaStyleNode } from '@/omega-ui-core/types/manifest';
import SmartColorPicker from '../SmartColorPicker';

interface ColorGovernanceProps {
  values: Partial<OmegaStyleNode>;
  capabilities: string[];
  manifest: OMEGA_Manifest;
  onChange: (updates: Partial<OmegaStyleNode>) => void;
}

export default function ColorGovernance({ values, capabilities, manifest, onChange }: ColorGovernanceProps) {
  // Map of atmospheric color capabilities
  const COLOR_MAP: Record<string, string> = {
    color: 'Aesthetic Main Color',
    indicatorColor: 'Precision Indicator',
    glowColor: 'Emission / Filament Glow',
    glassColor: 'Glass / Overlay Tint'
  };

  // Get active chromatic channels for this element
  const activeChannels = Object.keys(COLOR_MAP).filter(cap => capabilities.includes(cap));

  if (activeChannels.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {activeChannels.map(cap => (
          <SmartColorPicker 
            key={cap}
            label={COLOR_MAP[cap]}
            value={(values as Record<string, unknown>)[cap] as string || ''}
            onChange={(val) => onChange({ [cap]: val })}
            manifest={manifest}
          />
        ))}
      </div>
    </div>
  );
}
