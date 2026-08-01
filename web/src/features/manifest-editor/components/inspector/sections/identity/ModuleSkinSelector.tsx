'use client';

/**
 * @purpose Renderiza una sección colapsable para seleccionar y aplicar diferentes skins a un módulo en el editor de manifesto OMEGA.
 * @purpose_en Renders a collapsible section for selecting and applying different skins to a module in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:16q5dtx
 * @lastUpdated 2026-06-20T09:16:49.030Z
 */

import { Palette } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { OMEGA_THEMES } from '@/constants/manifest-editor/themes';
import InspectorCollapsible from '@/features/manifest-editor/components/inspector/shared/InspectorCollapsible';

interface ModuleSkinSelectorProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  standalone?: boolean;
}

export default function ModuleSkinSelector({ manifest, onUpdate, standalone }: ModuleSkinSelectorProps) {
  // Safe fallbacks for potentially undefined manifest.ui and manifest.metadata
  const ui = manifest.ui || {};
  const metadata = manifest.metadata || {};

  const content = (
    <div className="space-y-3 pt-2">
      <p className="text-[8px] wb-text-muted font-bold uppercase tracking-wider italic">
        Choose the canonical rendering skin for the module.
      </p>
      <div className="grid grid-cols-4 wb-surface-strong border wb-outline rounded-xs overflow-hidden">
        {OMEGA_THEMES.map(theme => (
          <button
            key={theme.id}
            onClick={() => {
              onUpdate({ 
                ui: { 
                  ...ui, 
                  skin: theme.ui.skin,
                  skinMode: 'standard',
                  colors: { ...theme.ui.colors },
                  palette: { 
                    primary: theme.ui.colors.accent, 
                    secondary: '#ff8c00', 
                    utility: '#a0a0a0', 
                    feedback: '#32cd32' 
                  },
                  lighting: { ...theme.ui.lighting },
                  typography: { 
                    ...ui.typography,
                    ...theme.ui.typography 
                  },
                  layout: {
                    width: ui.layout?.width ?? 800,
                    height: ui.layout?.height ?? 600,
                    ...ui.layout,
                    containers: ui.layout?.containers || []
                  }
                },
                metadata: {
                  ...metadata,
                  rack: {
                    width: metadata.rack?.width ?? 0,
                    height: metadata.rack?.height ?? 0,
                    ...metadata.rack
                  }
                }
              });
            }}
            aria-label={`Select skin: ${theme.label}`}
            className={`flex flex-col items-center justify-center py-2 px-1 text-center transition-all border-b-2 ${
              ui.skin === theme.ui.skin && ui.skinMode !== 'custom'
                ? 'bg-primary/15 text-primary border-primary font-black' 
                : 'wb-text-muted border-transparent hover:bg-primary/5 hover:wb-text'
            }`}
            title={theme.description}
          >
            <span className="text-[8px] font-black uppercase tracking-widest leading-none">{theme.label}</span>
            <span className="text-[6px] opacity-60 normal-case mt-0.5 leading-none hidden sm:block">{theme.ui.skin}</span>
          </button>
        ))}
        
        <button
          onClick={() => {
            onUpdate({ 
              ui: { 
                ...ui, 
                skinMode: 'custom'
              }
            });
          }}
          aria-label="Select custom skin"
          className={`flex flex-col items-center justify-center py-2 px-1 text-center transition-all border-b-2 ${
            ui.skinMode === 'custom'
              ? 'bg-accent/15 text-accent border-accent font-black' 
              : 'wb-text-muted border-transparent hover:bg-accent/5 hover:wb-text'
          }`}
          title="Full Aesthetic Governance Overrides."
        >
          <span className="text-[8px] font-black uppercase tracking-widest leading-none">Custom</span>
          <span className="text-[6px] opacity-60 normal-case mt-0.5 leading-none hidden sm:block">expert</span>
        </button>
      </div>
    </div>
  );

  if (standalone) return content;

  return (
    <InspectorCollapsible title="Global UI Skin" icon={Palette}>
      {content}
    </InspectorCollapsible>
  );
}
