/**
 * @purpose Renderiza una vista de simulación para un editor de manifesto OMEGA, mostrando una captura de rack estilizada y animada con efectos de iluminación del estudio y rendimiento native UCA.
 * @purpose_en Renders a simulated viewport for an OMEGA manifest editor, displaying a stylized and animated rack snapshot with studio lighting effects and native UCA rendering.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:hcai7u
 * @lastUpdated 2026-06-15T12:49:06.132Z
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { UniversalRenderer } from '@/omega-ui-core/renderers/UniversalRenderer';


interface MockupViewportProps {
  manifest: OMEGA_Manifest;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
  width: number;
  height: number;
  skin: string;
  viewportRef: React.RefObject<HTMLDivElement | null>;
}

export const MockupViewport = ({ 
  manifest, resolveAsset, width, height, skin, viewportRef 
}: MockupViewportProps) => {
  const getSkinConfig = () => {
    switch (skin) {
      case 'industrial': return 'bg-[#121212] border-y-[#222] border-x-[#333] shadow-[0_40px_100px_rgba(0,0,0,0.8)]';
      case 'carbon': return 'bg-[#0a0a0a] border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.9)]';
      default: return 'bg-[#1a1a1a] border-white/10';
    }
  };



  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative flex items-center justify-center p-20"
    >
      {/* STUDIO LIGHTING BLOOM */}
      <div className="absolute -inset-40 bg-primary/10 blur-[180px] rounded-full pointer-events-none mix-blend-screen animate-pulse" />
      <div className="absolute top-0 -left-20 w-80 h-full bg-white/5 blur-[100px] -rotate-12 pointer-events-none" />

      {/* THE ACTUAL RACK SNAPSHOT (TARGET NODE) */}
      <div 
        ref={viewportRef}
        data-ui-theme="dark"
        className={`relative border-x-[6px] border-y-[2px] rounded-sm overflow-hidden ${getSkinConfig()} ring-1 ring-white/10`}
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 40%, rgba(255,255,255,0.02) 60%, rgba(0,0,0,0.1) 100%)`,
          boxShadow: '0 50px 100px -20px rgba(0,0,0,0.9), 0 30px 60px -30px rgba(0,0,0,0.5)'
        }}
      >


        {/* UCA NATIVE ENGINE (Static Viewport) */}
        <div className="absolute inset-0 uca-native-layer">
          <UniversalRenderer 
            node={manifest.ui.tree!} 
            manifest={manifest} 
            catalog={manifest.moduleTemplates || {}}
            resolveAsset={resolveAsset}
          />
        </div>

        {/* STUDIO OVERLAY SHINE (Glass Effect) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.01] pointer-events-none z-[100]" />
        <div className="absolute inset-0 opacity-10 pointer-events-none z-[101]" style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0px, transparent 1px)', backgroundSize: '2px 100%' }} />
      </div>

      {/* SHADOW BASE */}
      <div className="absolute -bottom-10 left-0 right-0 h-20 bg-black/60 blur-3xl -z-10" />
    </motion.div>
  );
};

