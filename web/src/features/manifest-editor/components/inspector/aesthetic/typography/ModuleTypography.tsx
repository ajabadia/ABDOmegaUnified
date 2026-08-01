'use client';

/**
 * @purpose Gestiona y renderiza ajustes a las configuraciones tipográficas para los manifestos OMEGA, incluyendo activos de fuente, caídas globales y mapas abstractos.
 * @purpose_en Manages and renders adjustments to typographic settings for OMEGA manifests, including font assets, global fallbacks, and abstract maps.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:8,sig:1t31plv
 * @lastUpdated 2026-06-15T11:05:00.440Z
 */

import { Type, ShieldAlert } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import InspectorCollapsible from '../../shared/InspectorCollapsible';
import InfoBlock from '../../shared/InfoBlock';
import { 
  OMEGA_OFFICIAL_FONTS, 
} from '@/omega-ui-core/typography/registry';

// Sub-components
import FontAssetManager from './components/FontAssetManager';
import AbstractFontMap from './components/AbstractFontMap';
import GlobalFallbackSelector from './components/GlobalFallbackSelector';
 
interface ModuleTypographyProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  onHelp?: (id: string) => void;
}
 
const SYSTEM_FONTS = OMEGA_OFFICIAL_FONTS;
 
export default function ModuleTypography({ manifest, onUpdate, onHelp }: ModuleTypographyProps) {
  const typography = manifest.ui?.typography || {};
  const fonts = (manifest.resources?.fonts || []) as { name: string; file: string }[];
  const allAvailableFonts = [...SYSTEM_FONTS.map((f: { name: string }) => f.name), ...fonts.map((f: { name: string }) => f.name)];
 
  const handleAddFont = (name: string, file: string) => {
    const updatedFonts = [...fonts, { name, file }];
    onUpdate({
      resources: { ...(manifest.resources || {}), fonts: updatedFonts }
    });
  };
 
  const handleRemoveFont = (index: number) => {
    const updatedFonts = fonts.filter((_: unknown, i: number) => i !== index);
    onUpdate({
      resources: { ...(manifest.resources || {}), fonts: updatedFonts }
    });
  };

  const handleUpdatePointer = (id: string, updates: { label?: string; family?: string }) => {
    const others = (typography.definitions || []).filter((d: { id: string }) => d.id !== id);
    const def = (typography.definitions || []).find((d: { id: string }) => d.id === id) || { 
      id, 
      label: id.replace('font_', 'Font ').toUpperCase(), 
      family: '' 
    };
    
    onUpdate({
      ui: {
        ...manifest.ui,
        typography: {
          ...typography,
          definitions: [...others, { ...def, ...updates }]
        }
      }
    });
  };
 
  return (
    <InspectorCollapsible 
      title="Industrial Typography" 
      icon={Type}
      onHelp={() => onHelp?.('typography')}
    >
      <div className="space-y-6 pt-2">
        {/* 1. FONT ASSETS */}
        <FontAssetManager 
          fonts={fonts}
          onAdd={handleAddFont}
          onRemove={handleRemoveFont}
        />

        {/* 2. ABSTRACT MAP & FALLBACK */}
        <div className="space-y-4">
           <GlobalFallbackSelector 
              defaultFont={typography.defaultFont || ''}
              availableFonts={allAvailableFonts}
              onChange={(font) => onUpdate({ ui: { ...manifest.ui, typography: { ...typography, defaultFont: font } } })}
           />

           <AbstractFontMap 
              definitions={typography.definitions || []}
              availableFonts={allAvailableFonts}
              onUpdate={handleUpdatePointer}
           />
        </div>

        <InfoBlock 
          title="Industrial Protection"
          icon={ShieldAlert}
          message="Era 7.2.3 enforces global typographic consistency. Individual components will inherit these category defaults unless explicitly overridden in advanced properties."
          variant="muted"
        />
      </div>
    </InspectorCollapsible>
  );
}
