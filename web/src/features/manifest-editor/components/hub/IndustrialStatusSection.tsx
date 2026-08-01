'use client';

/**
 * @purpose Renderiza una sección que muestra métricas industriales y estado del sistema con opciones de despliegue.
 * @purpose_en Renders a section displaying industrial metrics and system status with deployment options.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:18vl7q1
 * @lastUpdated 2026-06-17T22:30:23.768Z
 */

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

import type { OMEGA_Metric } from '@/omega-ui-core/types/manifest';

interface IndustrialStatusSectionProps {
  metrics: OMEGA_Metric[];
  sysReady: boolean;
  onDeploy: () => void;
}

export default function IndustrialStatusSection({ metrics, sysReady, onDeploy }: IndustrialStatusSectionProps) {
  return (
    <>
      <div className="mt-auto p-4 wb-surface border wb-outline rounded-sm space-y-4 shadow-sm">
         <div className="flex items-center justify-between">
            <p className="text-[8px] font-black wb-text-muted uppercase tracking-widest">Industrial Status</p>
            <div className={`px-1.5 py-0.5 rounded-[2px] text-[6px] font-black uppercase ${sysReady ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
               {sysReady ? 'Stable' : 'Incomplete'}
            </div>
         </div>

         <div className="flex justify-between items-end h-12 gap-2 px-1">
            {metrics.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full bg-black/5 rounded-t-[1px] relative overflow-hidden h-10">
                   <div 
                      className={`absolute bottom-0 left-0 w-full transition-all duration-700 ease-out ${m.color}`} 
                      style={{ height: `${m.value}%` }} 
                   />
                </div>
                <span className="text-[6px] font-bold wb-text-muted">{m.label}</span>
              </div>
            ))}
         </div>

         <div className="grid grid-cols-2 gap-2 pt-2 border-t border-outline/5">
            <div className="flex flex-col">
               <span className="text-[6px] wb-text-muted uppercase font-black">Ready Score</span>
               <span className={`text-[10px] font-black font-mono ${sysReady ? 'text-green-400' : 'text-amber-400'}`}>
                  {metrics.length > 4 ? Math.round(Number(metrics[4].value)) : 0}%
               </span>
            </div>
            <div className="flex flex-col text-right">
               <span className="text-[6px] wb-text-muted uppercase font-black">Audit Mode</span>
               <span className="text-[10px] font-black font-mono text-primary">ERA 7.1</span>
            </div>
         </div>
      </div>

      <div className="space-y-2">
         <button 
           onClick={onDeploy}
           aria-label="Deploy to engine"
           className={`w-full flex items-center justify-center gap-3 p-4 rounded-sm transition-all shadow-xl group relative overflow-hidden ${sysReady ? 'bg-accent text-white hover:scale-[1.02]' : 'bg-black/5 wb-text-muted border wb-outline hover:bg-black/10'}`}
         >
            <Zap className={`w-4 h-4 ${sysReady ? 'fill-white' : ''} group-hover:scale-125 transition-transform`} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Deploy to Engine</span>
            {sysReady && (
              <motion.div 
                animate={{ x: ['-100%', '100%'] }} 
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" 
              />
            )}
         </button>
         
         <p className="text-[6px] text-center wb-text-muted font-bold uppercase tracking-widest italic">
           * Direct hot-swap injection into OMEGA runtime
         </p>
      </div>
    </>
  );
}
