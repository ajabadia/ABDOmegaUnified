/**
 * @purpose Renderiza una capa para operaciones de arrastre y soltar en el editor de manifesto OMEGA, específicamente para proyectos .omega.
 * @purpose_en Renders an overlay for drag-and-drop operations in the OMEGA manifest editor, specifically for .omega projects.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:72lgvs
 * @lastUpdated 2026-06-19T18:48:50.285Z
 */

import { Package } from 'lucide-react';

interface WorkbenchDropOverlayProps {
  isDragOver: boolean;
}

export default function WorkbenchDropOverlay({ isDragOver }: WorkbenchDropOverlayProps) {
  if (!isDragOver) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm" />
      <div className="relative border-2 border-dashed border-primary/60 rounded-lg bg-[#0a0a0b]/90 px-16 py-12 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <Package className="w-14 h-14 mx-auto mb-4 text-primary/80" />
        <p className="text-sm font-black uppercase tracking-widest text-primary">Drop .omega Project</p>
        <p className="text-[10px] text-white/40 mt-2 font-mono tracking-normal normal-case">
          Release to restore manifest, assets &amp; history
        </p>
      </div>
    </div>
  );
}
