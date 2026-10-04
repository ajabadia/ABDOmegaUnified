'use client';

/**
 * @purpose Renderiza el logo y título "OMEGA Manifest Editor" para el centro del Header.
 * @purpose_en Renders the OMEGA Manifest Editor logo and title for the Header center section.
 * @classification UI Component
 * @complexity Low
 */

import { Shield } from 'lucide-react';

export default function OmegaBranding() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 bg-primary/20 border border-primary/40 rounded-xs flex items-center justify-center">
        <Shield className="w-3 h-3 text-primary" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] wb-text whitespace-nowrap">
        OMEGA <span className="text-primary/60">Manifest Editor</span>
      </span>
    </div>
  );
}
