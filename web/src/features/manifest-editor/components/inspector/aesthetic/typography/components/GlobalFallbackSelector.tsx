'use client';

/**
 * @purpose Renderiza un selector de dropdown para seleccionar una fuente de fuentes globales con opciones de las fuentes disponibles.
 * @purpose_en Renders a dropdown selector for choosing a global default font with options from available fonts.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:ltii1w
 * @lastUpdated 2026-06-15T11:04:54.003Z
 */

import { Shield } from 'lucide-react';

interface GlobalFallbackSelectorProps {
  defaultFont: string;
  availableFonts: string[];
  onChange: (font: string) => void;
}

export default function GlobalFallbackSelector({ defaultFont, availableFonts, onChange }: GlobalFallbackSelectorProps) {
  return (
    <div className="p-3 bg-primary/10 border border-primary/20 rounded-xs space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[8px] font-black uppercase text-primary tracking-widest">Global Default Font</label>
        <Shield className="w-3 h-3 text-primary/40" />
      </div>
      <select 
        value={defaultFont || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full wb-surface-strong border wb-outline rounded-xs px-2 py-1.5 text-[9px] font-black text-primary uppercase outline-none focus:border-primary/40 transition-all appearance-none"
      >
        <option value="">-- SELECT GLOBAL FALLBACK --</option>
        {availableFonts.map(f => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
    </div>
  );
}
