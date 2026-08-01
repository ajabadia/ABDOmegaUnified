'use client';

/**
 * @purpose Gestiona un componente para seleccionar y actualizar estilos de puertos en el editor de manifesto OMEGA.
 * @purpose_en Manages a component for selecting and updating port styles in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:1ij5bvz
 * @lastUpdated 2026-06-17T22:34:42.628Z
 */

import { Palette } from 'lucide-react';
import type { ManifestEntity, OMEGA_Manifest, Presentation, OmegaStyleNode } from '@/omega-ui-core/types/manifest';
import StyleLibraryLink from '../shared/StyleLibraryLink';
 
interface PortPropertiesProps {
  item: ManifestEntity;
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<ManifestEntity>) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
  setActiveSection?: ((sectionId: string) => void) | undefined;
}
 
export default function PortProperties({ item, manifest, onUpdate, setActiveSection }: PortPropertiesProps) {
  const pres = (item.presentation || {}) as Presentation;
  const portStyles = manifest.ui?.styles?.['port'] || [];
  const currentStyleId = pres.variant || 'default';
  const currentStyle = portStyles.find(s => s.id === currentStyleId) || { id: 'default', label: 'Default Port Style' };
 
  const updateStyle = (styleId: string, aesthetics: Partial<OmegaStyleNode> = {}) => {
    onUpdate({ 
      presentation: { 
        ...pres, 
        style: {
          ...pres.style,
          ...aesthetics
        } as OmegaStyleNode,
        variant: styleId 
      } 
    });
  };
 
  return (
    <div className="grid grid-cols-1 gap-6 pt-2">
      {/* 1. STYLE LIBRARY SELECTOR */}
      <div className="space-y-3">
        <label className="text-[8px] text-primary font-black flex items-center gap-1.5 uppercase tracking-wider">
          <Palette className="w-3 h-3" />
          <span>Style Library (Ports)</span>
        </label>
        
        {portStyles.length > 0 ? (
          <div className="grid grid-cols-1 gap-1.5">
            {portStyles.map(s => (
              <button
                key={s.id}
                onClick={() => updateStyle(s.id, s.aesthetics)}
                aria-label={`Select style: ${s.label}`}
                className={`group py-2.5 px-4 rounded-xs border text-[10px] font-black uppercase transition-all text-left flex items-center justify-between ${currentStyleId === s.id ? 'border-primary bg-primary/20 text-primary shadow-[0_0_20px_rgba(0,240,255,0.1)]' : 'wb-surface-subtle wb-outline wb-text-muted hover:wb-text hover:border-primary/30'}`}
              >
                <div className="flex items-center gap-3">
                   <div className={`w-1.5 h-1.5 rounded-full ${currentStyleId === s.id ? 'bg-primary animate-pulse' : 'bg-outline/40'}`} />
                   <span>{s.label}</span>
                </div>
                <span className="text-[7px] font-mono opacity-40 group-hover:opacity-100 transition-opacity">#{s.id}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-black/20 border border-dashed border-outline/20 rounded-xs text-center">
            <p className="text-[7px] wb-text-muted font-bold uppercase italic">
              No styles defined in library.
            </p>
          </div>
        )}
      </div>
 
      <div className="h-px bg-white/5 my-1" />
 
      {/* 2. STYLE GOVERNANCE LINK */}
      <StyleLibraryLink 
        type="port"
        styleId={currentStyleId}
        styleLabel={currentStyle.label}
        setActiveSection={setActiveSection}
      />
 
      <div className="p-2 bg-black/40 border wb-outline rounded-xs flex items-center justify-between">
         <span className="text-[7px] wb-text-muted font-black uppercase">Active Style ID:</span>
         <span className="text-[8px] text-primary font-mono font-black">{currentStyleId}</span>
      </div>
    </div>
  );
}
