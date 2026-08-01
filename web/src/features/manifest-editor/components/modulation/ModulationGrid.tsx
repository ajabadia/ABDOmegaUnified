'use client';

/**
 * @purpose Gestiona un grid para configurar conexiones de señal en una matriz editora industrial, permitiendo a los usuarios agregar, eliminar y actualizar modulaciones entre fuentes y objetivos.
 * @purpose_en Manages a grid for configuring signal connections in an industrial matrix editor, allowing users to add, remove, and update modulations between sources and targets.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1d2h9di
 * @lastUpdated 2026-06-15T12:50:32.719Z
 */

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { OMEGA_Manifest, OMEGA_Modulation } from '@/types/manifest';

import { ModulationCell } from './ModulationCell';
 
interface ModulationGridProps {
  manifest: OMEGA_Manifest;
  onAdd: (mod: OMEGA_Modulation) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<OMEGA_Modulation>) => void;
  onClose: () => void;
}
 
/**
 * ModulationGrid
 * Industrial Matrix Editor for internal signal routing.
 * Sources (Y) x Targets (X)
 */
export default function ModulationGrid({ manifest, onAdd, onRemove, onUpdate, onClose }: ModulationGridProps) {
  const allEntities = [
    ...(manifest.ui?.controls || []),
    ...(manifest.ui?.jacks || [])
  ];
 
  // In Industrial mode, we show everything. The engineer decides the routing.
  const sources = allEntities;
  const targets = allEntities;
 
  const getMod = (srcId: string, tgtId: string) => {
    return (manifest.modulations || []).find(m => m.source === srcId && m.target === tgtId);
  };
 
  const toggleMod = (srcId: string, tgtId: string) => {
    const existing = getMod(srcId, tgtId);
    if (existing) {
      onRemove(existing.id);
    } else {
      onAdd({
        id: `mod_${srcId}_${tgtId}`,
        source: srcId,
        target: tgtId,
        amount: 1.0,
        type: 'unipolar'
      });
    }
  };
 
  return (
    <motion.div 
      initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
      className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-12"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-6xl max-h-full bg-[#050505] border border-white/10 rounded-sm shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col overflow-hidden"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex flex-col gap-1">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-primary">Engineering Modulation Matrix</h2>
            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Signal Cross-Routing Engine — Era 7.1</span>
          </div>
          <button onClick={onClose} title="Close modulation matrix" className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
 
        {/* MATRIX TABLE */}
        <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-white/[0.01]">
          <table className="border-collapse w-full min-w-max">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-[60] bg-[#080808] p-6 text-left border-b border-r border-white/10 min-w-[150px]">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-primary italic">ORBITAL MATRIX</span>
                    <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.2em]">Source ↓ / Target →</span>
                  </div>
                </th>
                {targets.map(t => (
                  <th key={t.id} className="sticky top-0 z-50 bg-[#080808] p-0 border-b border-white/10 min-w-[60px]">
                    <div className="h-40 flex items-end justify-center pb-4">
                      <div className="rotate-[-90deg] origin-center whitespace-nowrap text-[9px] font-black uppercase tracking-widest text-white/40 w-full text-left pl-4">
                        {t.label || t.id}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sources.map(s => (
                <tr key={s.id} className="group hover:bg-white/[0.03]">
                  <td className="sticky left-0 z-40 bg-[#080808] px-6 py-4 text-[9px] font-black uppercase tracking-widest text-white/60 border-r border-white/10 group-hover:text-primary transition-colors">
                    {s.label || s.id}
                  </td>
                  {targets.map(t => (
                    <ModulationCell 
                      key={t.id}
                      srcId={s.id}
                      tgtId={t.id}
                      mod={getMod(s.id, t.id)}
                      isSelf={s.id === t.id}
                      onToggle={toggleMod}
                      onUpdate={onUpdate}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER STATS */}
        <div className="p-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[8px] font-mono text-white/20 uppercase tracking-widest">
           <div className="flex gap-6">
             <div className="flex gap-2">
               <span className="text-primary font-black">Active Nodes:</span>
               <span>{(manifest.modulations || []).length}</span>
             </div>
             <div className="flex gap-2">
               <span className="text-white/40 font-black">Scroll over cell to adjust intensity</span>
             </div>
           </div>
           <div>Contract Parity: Validated ERA 7.1</div>
        </div>
      </motion.div>
    </motion.div>
  );
}
