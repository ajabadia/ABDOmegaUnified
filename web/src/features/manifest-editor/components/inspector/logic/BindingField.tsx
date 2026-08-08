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

import { Settings2, SlidersHorizontal } from 'lucide-react';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';
import type { OmegaParamSpec } from '@/omega-ui-core/types/contract';

import InspectorCollapsible from '../shared/InspectorCollapsible';

interface BindingFieldProps {
  item: OmegaNode;
  availableBinds: string[];
  isHighlighted: (key: string) => boolean;
  onUpdate: (updates: Partial<OmegaNode>) => void;
  onHelp?: ((id: string) => void) | undefined;
  /** Spec declarativa de parámetros del módulo (bloque `params:` del .acemm). */
  paramSpecs?: Record<string, OmegaParamSpec> | undefined;
  onUpdateParams?: ((id: string, updates: Partial<OmegaParamSpec>) => void) | undefined;
}

export function BindingField({ item, availableBinds, isHighlighted, onUpdate, onHelp, paramSpecs, onUpdateParams }: BindingFieldProps) {
  const boundSpec = item.bind ? paramSpecs?.[item.bind] : undefined;
  const canEditSpec = !!boundSpec && !!onUpdateParams;

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
        {boundSpec && (
          <div className="mt-2 border border-cyan-400/20 rounded-xs bg-cyan-400/[0.03] overflow-hidden">
            <div className="px-2 py-1.5 flex items-center gap-1.5 bg-cyan-400/[0.06]">
              <SlidersHorizontal className="w-2.5 h-2.5 text-cyan-400/70" />
              <span className="text-[7px] font-black uppercase tracking-widest text-cyan-400/80">
                Param Spec · {item.bind}
              </span>
              {boundSpec.label && (
                <span className="text-[7px] font-mono wb-text-muted opacity-60 truncate flex-1">
                  {boundSpec.label}
                </span>
              )}
            </div>
            <div className="p-2 space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                <SpecField label="Min" value={boundSpec.min} disabled={!canEditSpec} onChange={(v) => onUpdateParams?.(item.bind!, { min: v })} />
                <SpecField label="Max" value={boundSpec.max} disabled={!canEditSpec} onChange={(v) => onUpdateParams?.(item.bind!, { max: v })} />
                <SpecField label="Default" value={boundSpec.default} disabled={!canEditSpec} onChange={(v) => onUpdateParams?.(item.bind!, { default: v })} />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <SpecField label="Exponent" value={boundSpec.exponent ?? 1} disabled={!canEditSpec} onChange={(v) => onUpdateParams?.(item.bind!, { exponent: v })} />
                <label className="flex flex-col gap-0.5">
                  <span className="text-[6px] font-bold uppercase tracking-widest wb-text-muted opacity-50">Units</span>
                  <input
                    value={boundSpec.units || ''}
                    disabled={!canEditSpec}
                    onChange={(e) => onUpdateParams?.(item.bind!, { units: e.target.value })}
                    placeholder="—"
                    className="w-full wb-surface-subtle border wb-outline rounded-xs px-1.5 py-1 text-[9px] font-mono wb-text outline-none focus:border-primary/60 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </label>
              </div>
              {boundSpec.choices && boundSpec.choices.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {boundSpec.choices.map((c) => (
                    <span key={c.value} className="px-1.5 py-0.5 rounded-xs bg-white/5 border border-white/10 text-[6px] font-mono wb-text-muted">
                      {c.label} = {c.value}
                    </span>
                  ))}
                </div>
              )}
              {!canEditSpec && (
                <p className="text-[6px] wb-text-muted opacity-40 font-bold uppercase tracking-wider pt-0.5">
                  Spec read-only (carga de .acemm con bloque params:)
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </InspectorCollapsible>
  );
}

function SpecField({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[6px] font-bold uppercase tracking-widest wb-text-muted opacity-50">{label}</span>
      <input
        type="number"
        step="any"
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full wb-surface-subtle border wb-outline rounded-xs px-1.5 py-1 text-[9px] font-mono wb-text outline-none focus:border-primary/60 disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </label>
  );
}
