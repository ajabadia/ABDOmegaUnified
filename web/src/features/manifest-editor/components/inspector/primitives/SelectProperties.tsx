'use client';

/**
 * @purpose Gestiona y renderiza propiedades para seleccionar opciones en una interfaz de editor de manifesto, incluyendo agregar, editar y aplicar plantillas.
 * @purpose_en Manages and renders properties for selecting options in a manifest editor interface, including adding, editing, and applying presets.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1n7t9zw
 * @lastUpdated 2026-06-17T22:34:51.861Z
 */

import { List, Plus, Trash2, Hash, Type, Zap } from 'lucide-react';
import { INDUSTRIAL_PRESETS } from './presets';

import type { ManifestEntity, SelectOption, OMEGA_Manifest, Presentation } from '@/omega-ui-core/types/manifest';
import StyleLibraryLink from '../shared/StyleLibraryLink';

interface SelectPropertiesProps {
  item: ManifestEntity;
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<ManifestEntity>) => void;
  setActiveSection?: ((sectionId: string) => void) | undefined;
}

export default function SelectProperties({ item, manifest, onUpdate, setActiveSection }: SelectPropertiesProps) {
  const pres = (item.presentation || {}) as Presentation;
  const options = pres.options || [];
  const currentVariant = pres.variant || 'default';
  const selectStyles = manifest.ui?.styles?.['select'] || [];
  const currentStyle = selectStyles.find(s => s.id === currentVariant) || { id: currentVariant as string, label: 'Standard Select' };



  const updateOptions = (newOptions: SelectOption[]) => {
    onUpdate({ presentation: { ...pres, options: newOptions } });
  };

  const addOption = () => {
    const nextValue = options.length > 0 ? Math.max(...options.map((o: SelectOption) => typeof o.value === 'number' ? o.value : 0)) + 1 : 0;
    updateOptions([...options, { label: `Option ${options.length + 1}`, value: nextValue }]);
  };

  const applyPreset = (presetId: string) => {
    if (options.length > 0 && !confirm("This will replace current options. Proceed?")) return;
    updateOptions(INDUSTRIAL_PRESETS[presetId].options);
  };

  return (
    <div className="space-y-8 pt-2">
      {/* INDUSTRIAL PRESETS */}
      <div className="space-y-3">
        <label className="text-[8px] text-foreground/60 uppercase font-black tracking-widest flex items-center gap-2">
           <Zap className="w-3 h-3 text-primary" />
           <span>Inject Industrial Presets</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(INDUSTRIAL_PRESETS).map(([id, p]) => (
            <button
              key={id}
              onClick={() => applyPreset(id)}
              aria-label={`Inject preset: ${p.label}`}
              className="flex items-center gap-3 p-2 bg-black/40 border border-outline/10 rounded-xs hover:border-primary/40 hover:bg-primary/5 transition-all group text-left"
            >
              <div className="w-6 h-6 shrink-0 rounded-xs bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                 <p.icon className="w-3 h-3 text-foreground/40 group-hover:text-primary" />
              </div>
              <span className="text-[8px] font-black uppercase tracking-tighter text-foreground/60 group-hover:text-foreground truncate">
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-outline/10 w-full" />



      {/* CUSTOM OPTIONS REGISTRY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[8px] text-foreground/60 uppercase font-black tracking-widest flex items-center gap-2">
            <List className="w-3 h-3 text-primary" />
            <span>Custom Option Registry</span>
          </label>
          <button 
            onClick={addOption}
            aria-label="Add option entry"
            className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/20 rounded-xs text-primary hover:bg-primary/20 transition-all"
          >
            <Plus className="w-2.5 h-2.5" />
            <span className="text-[8px] font-black uppercase">Add Entry</span>
          </button>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
          {options.map((opt: SelectOption, idx: number) => (
            <div key={idx} className="flex gap-2 items-center group">
              <div className="flex-1 flex gap-px bg-black/40 border border-outline/10 rounded-xs overflow-hidden focus-within:border-primary/40 transition-colors">
                <div className="flex items-center gap-1.5 px-2 bg-white/5 border-r border-outline/5 flex-1">
                   <Type className="w-2.5 h-2.5 text-foreground/20" />
                   <input 
                     type="text" 
                     aria-label={`Option ${idx + 1} label`}
                     value={opt.label}
                     onChange={(e) => {
                       const next = [...options];
                       next[idx] = { ...next[idx], label: e.target.value };
                       updateOptions(next);
                     }}
                     className="bg-transparent border-none outline-none text-[10px] font-bold text-foreground py-2 w-full"
                   />
                </div>
                <div className="flex items-center gap-1.5 px-2 w-24">
                   <Hash className="w-2.5 h-2.5 text-foreground/20" />
                   <input 
                     type="number" 
                     aria-label={`Option ${idx + 1} value`}
                     value={opt.value}
                     onChange={(e) => {
                       const next = [...options];
                       next[idx] = { ...next[idx], value: parseFloat(e.target.value) };
                       updateOptions(next);
                     }}
                     className="bg-transparent border-none outline-none text-[10px] font-mono text-primary py-2 w-full"
                   />
                </div>
              </div>
              <button 
                onClick={() => updateOptions(options.filter((_: SelectOption, i: number) => i !== idx))}
                aria-label={`Delete option ${opt.label}`}
                className="p-2 text-foreground/20 hover:text-red-400 hover:bg-red-500/5 rounded-xs transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t wb-outline">
        <StyleLibraryLink 
          type="select"
          styleId={currentVariant}
          styleLabel={currentStyle.label}
          setActiveSection={setActiveSection}
        />
      </div>
    </div>
  );
}
