'use client';

/**
 * @purpose Renderiza un componente para inspeccionar y editar configuraciones de modulación en un editor de manifesto OMEGA.
 * @purpose_en Renders a component for inspecting and editing modulation settings in an OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:1b7eqwg
 * @lastUpdated 2026-06-17T22:34:11.983Z
 */

import { Trash2, ArrowRight, Info } from 'lucide-react';
import type { ManifestEntity, OMEGA_Modulation } from '@/omega-ui-core/types/manifest';

interface ModulationItemProps {
  mod: OMEGA_Modulation;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, updates: Partial<OMEGA_Modulation>) => void;
  onRemove: (id: string) => void;
  allEntities: ManifestEntity[];
}

export function ModulationItem({ mod, isExpanded, onToggle, onUpdate, onRemove, allEntities }: ModulationItemProps) {
  return (
    <div 
      className={`bg-slate-100 dark:bg-black/40 border ${isExpanded ? 'border-cyan-500/40 shadow-[0_0_15px_rgba(0,240,255,0.05)]' : 'border-slate-200 dark:border-white/5'} rounded-xs overflow-hidden transition-all`}
    >
      {/* COMPACT ROW (PATCHING LINE) */}
      <div 
        className="p-2.5 flex items-center gap-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-white/[0.02]"
        onClick={onToggle}
      >
        <div className="shrink-0 w-1.5 h-6 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(0,240,255,0.3)]" style={{ opacity: 0.2 + (mod.amount || 0) * 0.8 }} />
        
        <div className="flex-1 flex items-center gap-3">
           {/* SOURCE */}
           <div className="flex-1 space-y-1">
              <span className="text-[6px] font-black wb-text-muted uppercase tracking-widest ml-1">Source (SRC)</span>
              <select 
                value={mod.source}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onUpdate(mod.id, { source: e.target.value })}
                className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xs text-[10px] font-bold text-cyan-600 dark:text-cyan-400/80 px-2 py-1 outline-none focus:border-cyan-500/40 transition-colors appearance-auto [color-scheme:dark]"
              >
                {allEntities.map((e: ManifestEntity) => <option key={e.id} value={e.id}>{e.label || e.id}</option>)}
              </select>
           </div>
 
           <ArrowRight className={`w-4 h-4 mt-4 ${(mod.amount ?? 0) > 0 ? 'text-cyan-400' : 'text-foreground/10'} shrink-0`} />
 
           {/* TARGET */}
           <div className="flex-1 space-y-1">
              <span className="text-[6px] font-black wb-text-muted uppercase tracking-widest ml-1">Target (DST)</span>
              <select 
                value={mod.target}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onUpdate(mod.id, { target: e.target.value })}
                className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xs text-[10px] font-bold text-slate-900 dark:text-foreground/80 px-2 py-1 outline-none focus:border-cyan-500/40 transition-colors appearance-auto [color-scheme:dark]"
              >
                {allEntities.map((e: ManifestEntity) => <option key={e.id} value={e.id}>{e.label || e.id}</option>)}
              </select>
           </div>
        </div>
 
        <div className="shrink-0 flex items-center gap-4 pl-4 border-l border-slate-200 dark:border-white/5 mt-3">
           <div className="flex-col flex items-end">
              <span className="text-[6px] font-black wb-text-muted uppercase">Amount</span>
              <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400">{(mod.amount || 0).toFixed(2)}</span>
           </div>
           <button 
             onClick={(e) => { e.stopPropagation(); onRemove(mod.id); }} 
             aria-label={`Remove modulation ${mod.id}`}
             className="text-slate-400 dark:text-foreground/10 hover:text-red-500 transition-colors p-1.5 bg-slate-200 dark:bg-white/5 rounded-xs"
           >
              <Trash2 className="w-3.5 h-3.5" />
           </button>
        </div>
      </div>
 
      {/* EXPANDED CONTROLS */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 space-y-3 animate-in slide-in-from-top-1 duration-200">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between items-center px-1">
                  <label className="text-[7px] font-black uppercase wb-text-muted">Modulation Depth</label>
                  <span className="text-[8px] font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 dark:bg-cyan-400/10 px-1 rounded-xs">{((mod.amount ?? 0) * 100).toFixed(0)}%</span>
              </div>
               <input 
                 type="range" min="0" max="1" step="0.01"
                 value={mod.amount ?? 1.0}
                 onClick={(e) => e.stopPropagation()}
                 onChange={(e) => onUpdate(mod.id, { amount: parseFloat(e.target.value) })}
                 aria-label="Modulation depth"
                 className="w-full accent-cyan-500 h-1.5 bg-slate-300 dark:bg-white/5 rounded-full appearance-none cursor-pointer"
               />
            </div>
 
            <div className="w-32 space-y-1.5 group/mode relative">
               <div className="flex items-center gap-1.5 ml-1">
                 <label className="text-[7px] font-black uppercase wb-text-muted">Engine Mode</label>
                 <Info className="w-2.5 h-2.5 text-primary/40" />
               </div>
 
               {/* TECHNICAL TOOLTIP */}
               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#0a0a0a] border border-primary/20 rounded-xs shadow-2xl opacity-0 pointer-events-none group-hover/mode:opacity-100 transition-opacity z-50">
                  <div className="space-y-2">
                     <div>
                        <span className="text-[7px] font-black text-primary block">UNIPOLAR (0..1)</span>
                        <span className="text-[6px] text-white/40 leading-tight block uppercase">Standard control routings.</span>
                     </div>
                     <div>
                        <span className="text-[7px] font-black text-primary block">BIPOLAR (-1..1)</span>
                        <span className="text-[6px] text-white/40 leading-tight block uppercase">Signals oscillating around zero (LFOs, Pitch).</span>
                     </div>
                     <div>
                        <span className="text-[7px] font-black text-primary block">ADDITIVE (+)</span>
                        <span className="text-[6px] text-white/40 leading-tight block uppercase">Direct signal summation.</span>
                     </div>
                     <div>
                        <span className="text-[7px] font-black text-primary block">MULT (*)</span>
                        <span className="text-[6px] text-white/40 leading-tight block uppercase">Ring mod or internal VCAs.</span>
                     </div>
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#0a0a0a]" />
               </div>
 
               <select 
                 value={mod.type || 'unipolar'}
                 onClick={(e) => e.stopPropagation()}
                 onChange={(e) => onUpdate(mod.id, { type: e.target.value as OMEGA_Modulation['type'] })}
                 className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xs text-[9px] font-bold text-slate-900 dark:text-primary/80 px-2 py-1.5 outline-none focus:border-primary/40 appearance-auto [color-scheme:dark]"
               >
                 <option value="unipolar">UNIPOLAR (0..1)</option>
                 <option value="bipolar">BIPOLAR (-1..1)</option>
                 <option value="additive">ADDITIVE (+)</option>
                 <option value="multiplicative">MULT (*)</option>
               </select>
            </div>
          </div>
 
          <div className="flex justify-between items-center">
             <span className="text-[6px] font-mono text-foreground/20 uppercase tracking-tighter">ID: {mod.id}</span>
             <div className="flex gap-2">
                <span className="text-[6px] font-black text-cyan-400/40 uppercase tracking-widest italic">{mod.type || 'unipolar'} engine active</span>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
