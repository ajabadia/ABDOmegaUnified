'use client';

/**
 * @purpose Renderiza un componente selector de tablas para seleccionar tablas en el editor de manifesto OMEGA, permitiendo múltiples selecciones si se especifica.
 * @purpose_en Renders a tab selector component for choosing tabs in the OMEGA manifest editor, allowing multiple selections if specified.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1qgjuri
 * @lastUpdated 2026-06-15T11:50:23.056Z
 */

import type { TabName } from '@/types/manifest';

interface TabSelectorProps {
  value: TabName | TabName[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (value: any) => void;
  multiple?: boolean;
  availableTabs?: TabName[];
}

const ALL_POSSIBLE_TABS: TabName[] = ['MAIN', 'FX', 'EDIT', 'MIDI', 'MOD', 'PATCHING'];

export default function TabSelector({ 
  value, 
  onChange, 
  multiple = false,
  availableTabs = ALL_POSSIBLE_TABS 
}: TabSelectorProps) {
  
  const isSelected = (t: TabName) => {
    if (multiple && Array.isArray(value)) return value.includes(t);
    return value === t;
  };

  const handleToggle = (t: TabName) => {
    if (multiple && Array.isArray(value)) {
      if (value.includes(t)) {
        onChange(value.filter(v => v !== t));
      } else {
        onChange([...value, t]);
      }
    } else {
      onChange(t);
    }
  };

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 w-full">
      {availableTabs.map(t => (
        <button
          key={t}
          type="button"
          onClick={() => handleToggle(t)}
          className={`py-2 text-[7px] font-black uppercase rounded-xs border transition-all text-center ${
            isSelected(t)
              ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(0,240,255,0.1)]' 
              : 'bg-black/5 wb-outline wb-text-muted hover:wb-text'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
