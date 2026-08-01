'use client';

/**
 * @purpose Gestiona y renderiza propiedades para entidades de ilustración en el editor de manifesto OMEGA, incluyendo dimensiones y opciones de modo de rendimiento.
 * @purpose_en Manages and renders properties for illustration entities in the OMEGA manifest editor, including dimensions and render mode options.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:1r8jqwq
 * @lastUpdated 2026-06-17T22:34:28.245Z
 */

import { Maximize2, Layers } from 'lucide-react';
import type { ManifestEntity, OMEGA_Manifest, Presentation } from '@/omega-ui-core/types/manifest';
import StyleLibraryLink from '../shared/StyleLibraryLink';

interface IllustrationPropertiesProps {
  item: ManifestEntity;
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<ManifestEntity>) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
  setActiveSection?: ((sectionId: string) => void) | undefined;
}

export default function IllustrationProperties({ item, manifest, onUpdate, setActiveSection }: IllustrationPropertiesProps) {
  const pres = (item.presentation || {}) as Presentation;
  const size = pres.size || { width: 40, height: 40 };
  const currentVariant = pres.variant || 'contain';
  const illustrationStyles = manifest.ui?.styles?.['illustration'] || [];
  const currentStyle = illustrationStyles.find((s: { id: string; label: string }) => s.id === currentVariant) || { id: currentVariant as string, label: 'Standard Image' };

  return (
    <div className="grid grid-cols-1 gap-6 pt-2">

      {/* DIMENSIONS */}
      <div className="space-y-3">
        <label className="text-[8px] wb-text-muted font-black uppercase tracking-widest flex items-center gap-2">
            <Maximize2 className="w-2.5 h-2.5" />
            <span>Industrial Scale (HP)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1">
                <span className="text-[7px] font-bold opacity-50 uppercase">Width (HP)</span>
                <input 
                    type="number" value={size.width} 
                    onChange={(e) => onUpdate({ presentation: { ...pres, size: { ...size, width: Number(e.target.value) } } } as Partial<ManifestEntity>)}
                    aria-label="Illustration width in HP"
                    className="w-full bg-black/20 border border-outline rounded-xs px-2 py-1.5 text-[10px] font-mono text-primary"
                />
            </div>
            <div className="space-y-1">
                <span className="text-[7px] font-bold opacity-50 uppercase">Height (px)</span>
                <input 
                    type="number" value={size.height} 
                    onChange={(e) => onUpdate({ presentation: { ...pres, size: { ...size, height: Number(e.target.value) } } } as Partial<ManifestEntity>)}
                    aria-label="Illustration height in pixels"
                    className="w-full bg-black/20 border border-outline rounded-xs px-2 py-1.5 text-[10px] font-mono text-primary"
                />
            </div>
        </div>
      </div>

      {/* RENDER MODE */}
      <div className="space-y-3">
        <label className="text-[8px] wb-text-muted font-black uppercase tracking-widest flex items-center gap-2">
            <Layers className="w-2.5 h-2.5" />
            <span>Render mode</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
            {['contain', 'cover', 'stretch'].map(v => (
                <button
                    key={v}
                    onClick={() => onUpdate({ presentation: { ...pres, variant: v } } as Partial<ManifestEntity>)}
                    className={`py-1.5 rounded-xs border text-[8px] font-black uppercase transition-all ${pres.variant === v ? 'border-primary bg-primary/20 text-primary' : 'border-outline text-foreground/40'}`}
                >
                    {v}
                </button>
            ))}
        </div>
      </div>

      <div className="pt-2 border-t wb-outline">
        <StyleLibraryLink 
          type="illustration"
          styleId={currentVariant}
          styleLabel={currentStyle.label}
          setActiveSection={setActiveSection}
        />
      </div>
    </div>
  );
}
