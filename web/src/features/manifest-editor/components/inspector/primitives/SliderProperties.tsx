/**
 * @purpose Gestiona y renderiza un componente para seleccionar y actualizar propiedades de un slider en el editor de manifesto OMEGA, incluyendo opciones para la longitud del fader y variantes de estilo/color.
 * @purpose_en Manages and renders a component for selecting and updating properties of a slider in the OMEGA manifest editor, including options for fader length and style/color variants.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:msugnt
 * @lastUpdated 2026-06-20T09:16:15.834Z
 */

import { Box, Palette } from 'lucide-react';
import type { ManifestEntity, OMEGA_Manifest, Presentation } from '@/omega-ui-core/types/manifest';
import StyleLibraryLink from '../shared/StyleLibraryLink';

interface SliderPropertiesProps {
  item: ManifestEntity;
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<ManifestEntity>) => void;
  setActiveSection?: ((sectionId: string) => void) | undefined;
}

export default function SliderProperties({ item, manifest, onUpdate, setActiveSection }: SliderPropertiesProps) {
  const pres = (item.presentation || {}) as Presentation;
  const currentVariant = pres.variant || 'A_silver';
  const sliderStyles = manifest.ui?.styles?.[pres.component || 'slider-v'] || [];
  const currentStyle = sliderStyles.find(s => s.id === currentVariant) || { id: currentVariant as string, label: 'Standard Fader' };

  const parseVariant = (v: string) => {
    const parts = v.split('_');
    return {
      size: parts[0] || 'A',
      cap: parts[1] || 'silver'
    };
  };

  const { size, cap } = parseVariant(currentVariant);

  const updateVariant = (newSize: string, newCap: string) => {
    onUpdate({ presentation: { ...pres, variant: `${newSize}_${newCap}` } });
  };



  const sizes = [
    { id: 'A', label: 'Long Throw', desc: 'Precision 100mm fader' },
    { id: 'B', label: 'Short Throw', desc: 'Compact 30mm fader' },
  ];

  const caps = [
    { id: 'silver', hex: '#cccccc', label: 'Silver' },
    { id: 'black', hex: '#222222', label: 'Black' },
    { id: 'red', hex: '#ff4444', label: 'Alert' },
    { id: 'blue', hex: '#00f0ff', label: 'Signal' },
  ];

  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-3">
        <label className="text-[8px] text-foreground/60 uppercase font-black tracking-widest flex items-center gap-2">
          <Box className="w-3 h-3 text-primary" />
          <span>Fader Travel Length</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {sizes.map((s) => (
            <button
              key={s.id}
              onClick={() => updateVariant(s.id, cap)}
              aria-label={`Select ${s.label} fader`}
              className={`p-3 border rounded-xs transition-all flex flex-col items-center gap-1 ${
                size === s.id 
                  ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,240,255,0.1)]' 
                  : 'bg-black/40 border-outline/10 hover:border-outline/30'
              }`}
            >
              <span className={`text-[10px] font-black uppercase ${size === s.id ? 'text-primary' : 'text-foreground/40'}`}>
                {s.label}
              </span>
              <span className="text-[6px] text-foreground/30 font-bold uppercase">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[8px] text-foreground/60 uppercase font-black tracking-widest flex items-center gap-2">
          <Palette className="w-3 h-3 text-primary" />
          <span>Cap Style & Color</span>
        </label>
        <div className="grid grid-cols-4 gap-2">
          {caps.map((c) => (
            <button
              key={c.id}
              onClick={() => updateVariant(size, c.id)}
              aria-label={`Select ${c.label} cap`}
              className={`p-2 border rounded-xs transition-all flex flex-col items-center gap-2 ${
                cap === c.id 
                  ? 'border-primary/60 bg-primary/10 text-primary' 
                  : 'border-outline/10 bg-black/40 text-foreground/40 hover:border-outline/30'
              }`}
            >
              <div className="w-full h-3 rounded-xs" style={{ backgroundColor: c.hex }} />
              <span className="text-[6px] font-black uppercase tracking-tighter">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ADVANCED GOVERNANCE */}
      <div className="mt-2 pt-4 border-t wb-outline">
         <StyleLibraryLink 
           type={pres.component || 'slider'}
           styleId={currentVariant}
           styleLabel={currentStyle.label}
           setActiveSection={setActiveSection}
         />
      </div>
    </div>
  );
}
