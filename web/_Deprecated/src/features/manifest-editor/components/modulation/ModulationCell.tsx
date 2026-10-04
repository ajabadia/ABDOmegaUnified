'use client';

/**
 * @purpose Renderiza una celda para ajustar los parámetros de modulación en el editor de manifesto OMEGA, permitiendo a los usuarios interactuar y actualizar las cantidades de modulación.
 * @purpose_en Renders a cell for adjusting modulation parameters in the OMEGA manifest editor, allowing users to interactively toggle and update modulation amounts.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:esr9v9
 * @lastUpdated 2026-06-15T12:50:26.336Z
 */

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { OMEGA_Modulation } from '@/types/manifest';

interface ModulationCellProps {
  srcId: string;
  tgtId: string;
  mod?: OMEGA_Modulation | undefined;
  isSelf: boolean;
  onToggle: (srcId: string, tgtId: string) => void;
  onUpdate: (id: string, updates: Partial<OMEGA_Modulation>) => void;
}

export function ModulationCell({ srcId, tgtId, mod, isSelf, onToggle, onUpdate }: ModulationCellProps) {
  return (
    <td 
      onClick={() => !isSelf && onToggle(srcId, tgtId)}
      onWheel={(e) => {
        if (mod && !isSelf) {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.05 : -0.05;
          onUpdate(mod.id, { amount: Math.max(0, Math.min(1, (mod.amount || 0) + delta)) });
        }
      }}
      className={`p-0 border border-white/5 text-center transition-all relative ${isSelf ? 'bg-white/[0.01] cursor-not-allowed opacity-10' : 'cursor-pointer hover:bg-primary/5'}`}
    >
      <div className="w-full h-14 flex items-center justify-center relative">
        {mod && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="relative flex flex-col items-center gap-1"
          >
            <div 
              className="w-5 h-5 bg-primary rounded-xs flex items-center justify-center shadow-[0_0_20px_rgba(0,255,157,0.3)] transition-all"
              style={{ opacity: 0.4 + (mod.amount || 0) * 0.6 }}
            >
              <Check className="w-3 h-3 text-black" />
            </div>
            <span className="text-[7px] font-mono font-bold text-primary animate-pulse">{(mod.amount || 0).toFixed(2)}</span>
          </motion.div>
        )}
        {!mod && !isSelf && (
          <div className="w-1.5 h-1.5 rounded-full bg-white/5 group-hover:bg-white/20 transition-all" />
        )}
      </div>
    </td>
  );
}
