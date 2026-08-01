'use client';

/**
 * @purpose Renderiza un componente para seleccionar propiedades mecánicas y de coloración en el editor de manifesto OMEGA.
 * @purpose_en Renders a component for selecting mechanical and coloration properties in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:asa5w5
 * @lastUpdated 2026-06-20T09:16:19.290Z
 */

import { ToggleLeft, Palette } from 'lucide-react';

import type { ManifestEntity, OMEGA_Manifest, Presentation } from '@/omega-ui-core/types/manifest';
import StyleLibraryLink from '../shared/StyleLibraryLink';

interface SwitchPropertiesProps {
  item: ManifestEntity;
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<ManifestEntity>) => void;
  setActiveSection?: ((sectionId: string) => void) | undefined;
}

export default function SwitchProperties({ item, manifest, onUpdate, setActiveSection }: SwitchPropertiesProps) {
  const pres = (item.presentation || {}) as Presentation;
  const currentVariant = pres.variant || 'toggle_grey';
  const switchStyles = manifest.ui?.styles?.[pres.component || 'switch'] || [];
  const currentStyle = switchStyles.find(s => s.id === currentVariant) || { id: currentVariant as string, label: 'Standard Switch' };

  const parseVariant = (v: string) => {
    const parts = v.split('_');
    return {
      style: parts[0] || 'toggle',
      color: parts[1] || 'grey'
    };
  };

  const { style, color } = parseVariant(currentVariant);

  const updateVariant = (newStyle: string, newColor: string) => {
    onUpdate({ presentation: { ...pres, variant: `${newStyle}_${newColor}` } });
  };

  const styles = [
    { id: 'toggle', label: 'Classic Toggle', desc: 'Mechanical lever' },
    { id: 'button', label: 'Tactile Push', desc: 'Square utility button' },
    { id: 'rocker', label: 'Rocker Switch', desc: 'Two-state rocker' },
  ];

  const colors = [
    { id: 'grey', label: 'Industrial Grey' },
    { id: 'red', label: 'Emergency Red' },
    { id: 'orange', label: 'Action Orange' },
    { id: 'cyan', label: 'Signal Cyan' },
  ];

  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-3">
        <label className="text-[8px] text-foreground/60 uppercase font-black tracking-widest flex items-center gap-2">
          <ToggleLeft className="w-3 h-3 text-primary" />
          <span>Switch Mechanics</span>
        </label>
        <div className="space-y-2">
          {styles.map((s) => (
            <button
              key={s.id}
              onClick={() => updateVariant(s.id, color)}
              aria-label={`Select switch style: ${s.label}`}
              className={`w-full p-3 border rounded-xs transition-all flex flex-col items-start gap-1 group relative overflow-hidden ${
                style === s.id 
                  ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,240,255,0.1)]' 
                  : 'bg-black/40 border-outline/10 hover:border-outline/30'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-[9px] font-black uppercase tracking-widest ${style === s.id ? 'text-primary' : 'text-foreground/60'}`}>
                  {s.label}
                </span>
                <span className="text-[8px] font-mono opacity-20 group-hover:opacity-100 transition-opacity">.{s.id}</span>
              </div>
              <p className="text-[7px] text-foreground/30 italic uppercase">{s.desc}</p>
              {style === s.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[8px] text-foreground/60 uppercase font-black tracking-widest flex items-center gap-2">
          <Palette className="w-3 h-3 text-primary" />
          <span>Capsule Coloration</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {colors.map((c) => (
            <button
              key={c.id}
              onClick={() => updateVariant(style, c.id)}
              aria-label={`Select switch color: ${c.label}`}
              className={`p-2 border rounded-xs transition-all flex items-center gap-2 ${
                color === c.id 
                  ? 'border-primary/60 bg-primary/10 text-primary' 
                  : 'border-outline/10 bg-black/40 text-foreground/40 hover:border-outline/30'
              }`}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.id === 'grey' ? '#444' : c.id === 'cyan' ? '#00f0ff' : c.id === 'red' ? '#ff4444' : '#ff8800' }} />
              <span className="text-[7px] font-black uppercase tracking-tighter">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t wb-outline">
        <StyleLibraryLink 
          type={pres.component || 'switch'}
          styleId={currentVariant}
          styleLabel={currentStyle.label}
          setActiveSection={setActiveSection}
        />
      </div>
    </div>
  );
}
