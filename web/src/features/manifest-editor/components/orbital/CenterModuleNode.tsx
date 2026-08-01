'use client';

/**
 * @purpose Renderiza un módulo node seleccionable y arrastrable en el editor de manifesto OMEGA, mostrando la versión del contrato disponible.
 * @purpose_en Renders a selectable and draggable module node in the OMEGA manifest editor, displaying the contract version if available.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:1dgvs9c
 * @lastUpdated 2026-06-15T12:59:08.662Z
 */

import { motion } from 'framer-motion';
import type { OMEGA_Manifest, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/omega-ui-core/types/contract';

interface CenterModuleNodeProps {
  manifest: OMEGA_Manifest;
  contract: (OmegaContract | OMEGA_Contract) | null;
  onSelectItem: (id: string | null) => void;
}

export function CenterModuleNode({ manifest, contract, onSelectItem }: CenterModuleNodeProps) {
  return (
    <motion.div 
      layoutId="center-node"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => onSelectItem(null)}
      className="relative z-20 w-32 h-32 rounded-full border-2 border-primary/40 flex flex-col items-center justify-center wb-surface shadow-[0_0_30px_var(--wb-bloom)] cursor-pointer hover:border-primary transition-colors group transition-colors duration-500"
    >
      <div className="text-[8px] font-bold text-primary/50 uppercase tracking-[0.2em] mb-1 group-hover:text-primary transition-colors">Module ID</div>
      <div className="text-sm font-headline font-bold text-primary italic uppercase tracking-tighter truncate max-w-[100px]">
        {manifest?.id || '???'}
      </div>
      
      {contract && (
         <motion.div 
           initial={{ opacity: 0, y: 5 }}
           animate={{ opacity: 1, y: 0 }}
           className="mt-2 text-[7px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 uppercase font-bold"
         >
           Contract v{contract && 'omega_version' in contract ? (contract.omega_version || '7.0') : '7.0'}
         </motion.div>
      )}
    </motion.div>
  );
}
