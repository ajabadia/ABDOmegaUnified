'use client';

/**
 * @purpose Renderiza un encabezado para el componente inspector en el editor de manifesto OMEGA, mostrando información de módulo o entidad y proporcionando opciones para pinchar o cerrar el inspector.
 * @purpose_en Renders a header for an inspector component in the OMEGA manifest editor, displaying module or entity information and providing options to pin or close the inspector.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:k1oybm
 * @lastUpdated 2026-06-17T22:33:59.520Z
 */

import { X, Package, Settings, Pin } from 'lucide-react';

interface InspectorHeaderProps {
  id?: string | undefined;
  isModule: boolean;
  isPinned?: boolean | undefined;
  onPin?: (() => void) | undefined;
  onClose: () => void;
}

export default function InspectorHeader({ id, isModule, isPinned, onPin, onClose }: InspectorHeaderProps) {
  return (
    <header className="p-4 border-b wb-outline wb-surface-subtle flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xs bg-primary/10 border border-primary/20 flex items-center justify-center">
           {isModule ? <Package className="w-4 h-4 text-primary" /> : <Settings className="w-4 h-4 text-primary" />}
        </div>
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-widest wb-text">
            {isModule ? 'Module Configuration' : 'Entity Inspector'}
          </h2>
          <p className="text-[8px] font-mono wb-text-muted truncate max-w-[160px]">{id}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {onPin && (
          <button 
            onClick={onPin}
            className={`p-1.5 rounded-xs transition-all ${isPinned ? 'text-primary bg-primary/20 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]' : 'wb-text-muted hover:wb-text hover:wb-surface-hover'}`}
            title={isPinned ? "Unpin Node" : "Pin Node to Reference View"}
            aria-label={isPinned ? "Unpin Node" : "Pin Node to Reference View"}
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
          </button>
        )}
        
        {!isModule && (
          <button 
            onClick={onClose}
            className="p-1.5 hover:wb-surface-hover rounded-xs wb-text-muted hover:wb-text transition-all"
            title="Close inspector"
            aria-label="Close inspector"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
