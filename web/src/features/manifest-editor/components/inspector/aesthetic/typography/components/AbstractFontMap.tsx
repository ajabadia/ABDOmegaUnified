'use client';

/**
 * @purpose Gestiona un componente para mapear fuentes abstractas en el editor de manifesto OMEGA, permitiendo a los usuarios definir y actualizar etiquetas de fuentes y familias para puntos específicos.
 * @purpose_en Manages a component for abstract font mapping in the OMEGA manifest editor, allowing users to define and update font labels and families for specific pointers.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:1,sig:1p1czm0
 * @lastUpdated 2026-06-15T11:04:44.095Z
 */

import { Layout } from 'lucide-react';

interface AbstractFontMapProps {
  definitions: { id: string; label: string; family: string }[];
  availableFonts: string[];
  onUpdate: (id: string, updates: { label?: string; family?: string }) => void;
}

export default function AbstractFontMap({ definitions, availableFonts, onUpdate }: AbstractFontMapProps) {
  const POINTERS = ['font_a', 'font_b', 'font_c', 'font_d'];

  return (
    <div className="p-4 border wb-outline wb-surface-subtle rounded-xs space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Layout className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] font-black wb-text uppercase tracking-wider">Abstract Font Library</span>
      </div>
      
      <p className="text-[7px] wb-text-muted font-bold leading-tight uppercase tracking-tighter italic">
        Define abstract font pointers (Font A, B...) to be used by the Style Library. 
        Changing the family here will update all elements using that pointer.
      </p>

      <div className="grid grid-cols-1 gap-3 pt-1">
        {POINTERS.map((id, idx) => {
          const def = definitions?.find(d => d.id === id) || { 
            id, 
            label: `Font ${String.fromCharCode(65 + idx)}`, 
            family: '' 
          };
          
          return (
            <div key={id} className="grid grid-cols-12 gap-2 items-end bg-black/20 p-2 rounded-xs border wb-outline">
              <div className="col-span-4 space-y-1">
                <label className="text-[6px] font-black uppercase wb-text-muted ml-0.5">Abstract Pointer</label>
                <input 
                  type="text"
                  value={def.label}
                  onChange={(e) => onUpdate(id, { label: e.target.value })}
                  className="w-full wb-surface-strong border wb-outline rounded-xs px-2 py-1 text-[9px] font-black text-primary uppercase outline-none focus:border-primary/40"
                />
              </div>
              <div className="col-span-8 space-y-1">
                <label className="text-[6px] font-black uppercase wb-text-muted ml-0.5">Actual Faceplate Family</label>
                <select 
                  value={def.family}
                  onChange={(e) => onUpdate(id, { family: e.target.value })}
                  className="w-full wb-surface-strong border wb-outline rounded-xs px-2 py-1.5 text-[9px] font-bold wb-text outline-none focus:border-primary/40 transition-all appearance-none"
                >
                  <option value="">-- SELECT SYSTEM OR CUSTOM FONT --</option>
                  {availableFonts.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
