/**
 * @purpose Renderiza una notificacion emergente con un cargador giratorio y chispas que pulsan, junto con texto descriptivo, para indicar captura de alta fidelidad y escaneo de integridad de layout.
 * @purpose_en Renders a loading indicator with a spinning loader and pulsating sparks, along with descriptive text, to indicate high-fidelity capturing and layout integrity scanning.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:9nnjet
 * @lastUpdated 2026-06-15T12:48:58.902Z
 */

import { Loader2, Sparkles } from 'lucide-react';

export const MockupLoading = () => (
  <div className="flex flex-col items-center gap-4">
    <div className="relative">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-accent animate-pulse" />
    </div>
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary">High-Fidelity Capturing</span>
      <span className="text-[6px] font-mono text-white/20 uppercase tracking-widest animate-pulse">Scanning Layout Integrity...</span>
    </div>
  </div>
);
