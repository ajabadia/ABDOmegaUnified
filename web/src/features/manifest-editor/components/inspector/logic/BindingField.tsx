'use client';

/**
 * @purpose Gestiona un campo colapsible para seleccionar y vincular valores en un editor de manifesto OMEGA, proporcionando opciones desde los binds disponibles e indicando las enlaces seleccionadas.
 * @purpose_en Manages a collapsible field for selecting and binding values in an OMEGA manifest editor, providing options from available binds and indicating selected links.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:15re68i
 * @lastUpdated 2026-06-15T11:31:18.092Z
 */

import { Settings2 } from 'lucide-react';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';

import InspectorCollapsible from '../shared/InspectorCollapsible';

interface BindingFieldProps {
  item: OmegaNode;
  availableBinds: string[];
  isHighlighted: (key: string) => boolean;
  onUpdate: (updates: Partial<OmegaNode>) => void;
  onHelp?: ((id: string) => void) | undefined;
}

export function BindingField({ item, availableBinds, isHighlighted, onUpdate, onHelp }: BindingFieldProps) {
  return (
    <InspectorCollapsible 
      title="Canonical Binding" 
      icon={Settings2}
      onHelp={() => onHelp?.('binding')}
    >
      <div className="space-y-1.5 pt-2">
        <div className="relative group">
          <select 
            value={item.bind || ''} 
            onChange={(e) => onUpdate({ bind: e.target.value })}
            className={`w-full wb-surface-subtle border ${isHighlighted('bind') ? 'border-amber-500 ring-1 ring-amber-500 animate-pulse' : (availableBinds.length === 0 ? 'border-amber-500/20' : 'wb-outline')} rounded-xs px-3 py-2.5 text-[10px] font-mono text-primary outline-none focus:border-primary/60 transition-all appearance-none cursor-pointer pr-10 transition-colors duration-500`}
          >
            <option value="">-- UNBOUND (Static) --</option>
            {availableBinds.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
             <span className="text-[8px] text-primary">▼</span>
          </div>
        </div>
        {availableBinds.length === 0 && (
          <p className="text-[7px] text-amber-500/60 font-bold uppercase tracking-tighter ml-1 animate-pulse">
            ⚠ No technical contract loaded. Upload .wasm or .json to sync logic.
          </p>
        )}
      </div>
    </InspectorCollapsible>
  );
}
