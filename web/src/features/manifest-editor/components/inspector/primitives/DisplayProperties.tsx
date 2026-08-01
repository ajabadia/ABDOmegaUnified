/**
 * @purpose Gestiona y renderiza propiedades de visualización como tecnología de panel y precisión UI en el editor de manifesto OMEGA.
 * @purpose_en Manages and renders display properties such as panel technology and UI precision in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:dtg9os
 * @lastUpdated 2026-06-17T22:34:19.936Z
 */

import { Monitor, Hash } from 'lucide-react';
import type { ManifestEntity, OMEGA_Manifest, Presentation } from '@/omega-ui-core/types/manifest';
import StyleLibraryLink from '../shared/StyleLibraryLink';

interface DisplayPropertiesProps {
  item: ManifestEntity;
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<ManifestEntity>) => void;
  setActiveSection?: ((sectionId: string) => void) | undefined;
}

export default function DisplayProperties({ item, manifest, onUpdate, setActiveSection }: DisplayPropertiesProps) {
  const pres = (item.presentation || {}) as Presentation;
  const currentVariant = pres.variant || 'A';
  const precision = pres.precision ?? 2;
  const displayStyles = manifest.ui?.styles?.['display'] || [];
  const currentStyle = displayStyles.find((s: { id: string; label: string }) => s.id === currentVariant) || { id: currentVariant as string, label: 'Standard Display' };

  const updateVariant = (v: string) => {
    onUpdate({ presentation: { ...pres, variant: v } });
  };

  const updatePrecision = (p: number) => {
    onUpdate({ presentation: { ...pres, precision: p } });
  };

  const tech = [
    { id: 'A', label: 'OLED Cyan', desc: 'Modern high-contrast' },
    { id: 'B', label: 'LCD Retro', desc: 'Liquid crystal aesthetic' },
    { id: 'C', label: '7-Segment', desc: 'Vintage red LED glow' },
  ];

  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-3">
        <label className="text-[8px] text-foreground/60 uppercase font-black tracking-widest flex items-center gap-2">
          <Monitor className="w-3 h-3 text-primary" />
          <span>Panel Technology</span>
        </label>
        <div className="space-y-2">
          {tech.map((t) => (
            <button
              key={t.id}
              onClick={() => updateVariant(t.id)}
              aria-label={`Select ${t.label} display`}
              className={`w-full p-3 border rounded-xs transition-all flex flex-col items-start gap-1 group relative overflow-hidden ${
                currentVariant === t.id 
                  ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,240,255,0.1)]' 
                  : 'bg-black/40 border-outline/10 hover:border-outline/30'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[9px] font-black uppercase tracking-widest ${currentVariant === t.id ? 'text-primary' : 'text-foreground/60'}`}>
                  {t.label}
                </span>
                <span className="text-[8px] font-mono opacity-20 group-hover:opacity-100 transition-opacity">.{t.id}</span>
              </div>
              <p className="text-[7px] text-foreground/30 italic uppercase">{t.desc}</p>
              {currentVariant === t.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[8px] text-foreground/60 uppercase font-black tracking-widest flex items-center gap-2">
          <Hash className="w-3 h-3 text-primary" />
          <span>Visual UI Precision</span>
        </label>
        <div className="flex items-center gap-4 bg-black/40 border border-outline/10 p-3 rounded-xs">
           <input 
             type="range" 
             aria-label="Visual UI precision"
             min="0" 
             max="6" 
             value={precision}
             onChange={(e) => updatePrecision(parseInt(e.target.value))}
             className="flex-1 accent-primary h-1 bg-white/10 rounded-full"
           />
           <span className="text-[12px] font-mono font-black text-primary min-w-[20px] text-center">
              {precision}
           </span>
           <span className="text-[7px] text-foreground/30 uppercase font-bold">Decimals</span>
        </div>
      </div>

      {/* ADVANCED CUSTOMIZATION */}
      <div className="mt-2 pt-4 border-t wb-outline">
         <StyleLibraryLink 
           type="display"
           styleId={currentVariant}
           styleLabel={currentStyle.label}
           setActiveSection={setActiveSection}
         />
      </div>
    </div>
  );
}
