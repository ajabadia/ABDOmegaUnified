'use client';

/**
 * @purpose Renderiza un modal para el conjunto de herramientas OMEGA Engineering, mostrando versión de editor, detalles del entorno y matriz de preparación del sistema.
 * @purpose_en Renders a modal for the OMEGA Engineering Suite, displaying editor version, environment details, and system preparation matrix.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:7,sig:1520j79
 * @lastUpdated 2026-06-15T20:48:39.467Z
 */

import { motion } from 'framer-motion';
import ModalCloseButton from './ModalCloseButton';
import ModalActionButton from './ModalActionButton';
import { Shield, Info, Globe, Zap } from 'lucide-react';
import { useFocusTrap } from '@/features/manifest-editor/hooks/useFocusTrap';
import IndustrialStatusSection from '../hub/IndustrialStatusSection';
import type { OMEGA_Metric } from '@/types/manifest';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  metrics: OMEGA_Metric[];
  sysReady: boolean;
  onDeploy: () => void;
}

export default function AboutModal({ isOpen, onClose, metrics, sysReady, onDeploy }: AboutModalProps) {
  const focusTrapRef = useFocusTrap(isOpen);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      ref={focusTrapRef}
      role="dialog"
      aria-modal="true"
      aria-label="About OMEGA Engineering Suite"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-7xl h-full max-h-[850px] wb-surface border wb-outline shadow-2xl rounded-xs overflow-hidden flex flex-col"
      >
        {/* HEADER */}
        <div className="p-6 border-b wb-outline flex justify-between items-center wb-surface-subtle shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary/10 border border-primary/20 rounded-xs flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
             </div>
             <div>
                <h2 className="text-base font-black uppercase tracking-widest wb-text">OMEGA Engineering Suite</h2>
                <p className="text-[8px] md:text-[9px] font-bold uppercase wb-text-muted tracking-widest mt-1 opacity-70">Industrial Governance ERA 7.2.3</p>
             </div>
          </div>
          <ModalCloseButton onClick={onClose} title="Close about" />
        </div>
 
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* EDITOR DATA */}
          <div className="grid grid-cols-2 gap-4">
             <div className="p-3 wb-surface-subtle border wb-outline rounded-xs space-y-2">
                <div className="flex items-center gap-2">
                   <Info className="w-3 h-3 text-primary/60" />
                   <span className="text-[7px] font-black uppercase wb-text-muted">Editor Version</span>
                </div>
                <p className="text-[10px] font-mono font-black wb-text">v8.1.0-STABLE</p>
             </div>
             <div className="p-3 wb-surface-subtle border wb-outline rounded-xs space-y-2">
                <div className="flex items-center gap-2">
                   <Globe className="w-3 h-3 text-primary/60" />
                   <span className="text-[7px] font-black uppercase wb-text-muted">Environment</span>
                </div>
                <p className="text-[10px] font-mono font-black wb-text text-primary">PRODUCTION_TIER_1</p>
             </div>
          </div>
 
          {/* THE "GRÁFICO" (INDUSTRIAL STATUS) */}
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-accent" />
                <span className="text-[7px] font-black uppercase wb-text-muted">System Preparation Matrix</span>
             </div>
             <IndustrialStatusSection 
               metrics={metrics}
               sysReady={sysReady}
               onDeploy={onDeploy}
             />
          </div>
 
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t wb-outline flex justify-end wb-surface-subtle shrink-0">
          <ModalActionButton onClick={onClose}>
            Dismiss View
          </ModalActionButton>
        </div>
      </motion.div>
    </div>
  );
}
