/**
 * @purpose Renderiza un componente para editar propiedades de LED en el editor de manifesto OMEGA, permitiendo a los usuarios superponer parámetros físicos y seleccionar estilos.
 * @purpose_en Renders a component for editing LED properties in the OMEGA manifest editor, allowing users to override physical parameters and select styles.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:17j3pmm
 * @lastUpdated 2026-06-15T11:31:48.241Z
 */

import { Maximize, Circle } from 'lucide-react';
import type { ManifestEntity, OMEGA_Manifest, Presentation } from '@/omega-ui-core/types/manifest';
import StyleLibraryLink from '../shared/StyleLibraryLink';

interface LedPropertiesProps {
  item: ManifestEntity;
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<ManifestEntity>) => void;
  setActiveSection?: ((sectionId: string) => void) | undefined;
}

export default function LedProperties({ item, manifest, onUpdate, setActiveSection }: LedPropertiesProps) {
  const pres = (item.presentation || {}) as Presentation;
  const currentVariant = pres.variant || 'A_cyan';
  const ledStyles = manifest.ui?.styles?.['led'] || [];
  const currentStyle = ledStyles.find(s => s.id === currentVariant) || { id: currentVariant as string, label: 'Standard LED' };

  // Helper to manage complex variants (e.g. "B_red_3mm")
  const getExtraParam = (paramName: string) => {
    return currentVariant.includes(paramName) ? paramName : 'default';
  };

  const addExtraParam = (newParam: string, group: string[]) => {
    let base = currentVariant;
    // Remove existing params from the same group
    group.forEach(p => {
      base = base.replace(`_${p}`, '');
    });
    // Add the new one if it's not default
    const finalVariant = newParam === 'default' ? base : `${base}_${newParam}`;
    onUpdate({ presentation: { ...pres, variant: finalVariant } });
  };

  const sizes = ['3mm', '5mm', '8mm'];
  const shapes = ['square', 'rect'];

  return (
    <div className="grid grid-cols-1 gap-6 pt-2">
      {/* 1. PHYSICAL PARAMETERS */}
      <div className="grid grid-cols-2 gap-4">
        {/* LED SIZE OVERRIDE */}
        <div className="space-y-1.5">
          <label className="text-[8px] text-foreground/60 uppercase font-bold tracking-tighter flex items-center gap-1">
            <Maximize className="w-2.5 h-2.5 text-accent" />
            <span>Diameter</span>
          </label>
          <div className="flex gap-1.5">
            {['default', ...sizes].map(s => (
              <button
                key={s}
                onClick={() => addExtraParam(s, sizes)}
                className={`flex-1 py-1 rounded-xs border text-[7px] font-black uppercase transition-all ${getExtraParam(s) === s || (s === 'default' && !sizes.some(x => currentVariant.includes(x))) ? 'border-primary bg-primary/20 text-primary' : 'wb-surface-subtle wb-outline text-foreground/40'}`}
              >
                {s === 'default' ? 'Auto' : s}
              </button>
            ))}
          </div>
        </div>

        {/* LED SHAPE OVERRIDE */}
        <div className="space-y-1.5">
          <label className="text-[8px] text-foreground/60 uppercase font-bold tracking-tighter flex items-center gap-1">
            <Circle className="w-2.5 h-2.5 text-accent" />
            <span>Lens</span>
          </label>
          <div className="flex gap-1.5">
            {['default', ...shapes].map(s => (
              <button
                key={s}
                onClick={() => addExtraParam(s, shapes)}
                className={`flex-1 py-1 rounded-xs border text-[7px] font-black uppercase transition-all ${getExtraParam(s) === s || (s === 'default' && !shapes.some(x => currentVariant.includes(x))) ? 'border-primary bg-primary/20 text-primary' : 'wb-surface-subtle wb-outline text-foreground/40'}`}
              >
                {s === 'default' ? 'Round' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[7px] text-foreground/40 italic">
        Specific LED physical overrides appended to variant: <span className="text-primary font-mono">{currentVariant}</span>
      </p>

      <div className="h-px bg-white/5 my-1" />

      {/* 2. STYLE GOVERNANCE LINK */}
      <StyleLibraryLink 
        type="led"
        styleId={currentVariant}
        styleLabel={currentStyle.label}
        setActiveSection={setActiveSection}
      />
    </div>
  );
}
