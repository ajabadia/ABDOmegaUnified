'use client';

/**
 * @purpose Gestiona un enlace estilizado para editar un estilo en la biblioteca, maneja la navegación y muestra detalles del estilo.
 * @purpose_en Renders a styled link for editing a style in the library, handling navigation and displaying style details.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:1hp8e8z
 * @lastUpdated 2026-06-20T09:18:31.895Z
 */

import { ExternalLink, Palette } from 'lucide-react';

interface StyleLibraryLinkProps {
  type: string;
  styleId: string;
  styleLabel: string;
  setActiveSection?: ((sectionId: string) => void) | undefined;
}

export default function StyleLibraryLink({ type, styleId, styleLabel, setActiveSection }: StyleLibraryLinkProps) {
  const handleNavigate = () => {
    if (setActiveSection) {
      setActiveSection('custom-design');
      // Potential improvement: automatically filter the library by this type/style
    }
  };

  return (
    <div className="p-4 border wb-outline wb-surface-subtle rounded-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           <Palette className="w-3.5 h-3.5 text-primary" />
           <span className="text-[10px] font-black wb-text uppercase tracking-wider">Industrial Style Link</span>
        </div>
        <span className="text-[7px] font-mono opacity-20 uppercase">Governance Active</span>
      </div>

      <div className="flex items-center justify-between wb-surface-strong p-3 border wb-outline rounded-xs">
         <div className="flex flex-col gap-0.5">
            <span className="text-[6px] font-black uppercase wb-text-muted">Current Style</span>
            <span className="text-[10px] font-bold text-primary uppercase">{styleLabel}</span>
            <span className="text-[5px] font-mono opacity-30">{styleId}</span>
         </div>
         
         <button 
            onClick={handleNavigate}
            aria-label="Edit in library"
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xs text-[7px] font-black uppercase text-primary hover:bg-primary/20 transition-all group"
         >
            <ExternalLink className="w-3 h-3 group-hover:scale-110 transition-transform" />
            Edit in Library
         </button>
      </div>

      <p className="text-[6px] wb-text-muted font-bold leading-tight uppercase tracking-tighter italic">
        Warning: Modifying this style in the library will affect all {type} instances using it.
      </p>
    </div>
  );
}
