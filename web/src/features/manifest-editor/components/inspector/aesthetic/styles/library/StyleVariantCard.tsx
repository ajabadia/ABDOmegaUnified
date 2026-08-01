'use client';

/**
 * @purpose Gestiona un componente de tarjeta para mostrar y gestionar variantes de estilo en el editor de manifesto OMEGA, incluyendo opciones para editar, copiar, eliminar, descargar y aplicar estilos.
 * @purpose_en Manages a card component for displaying and managing style variants in the OMEGA manifest editor, including options to edit, copy, delete, download, and apply styles.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:1,sig:1qrp77j
 * @lastUpdated 2026-06-17T22:31:36.649Z
 */

import { Copy, Trash2, CheckCircle2, Layout, Download } from 'lucide-react';

interface StyleVariantCardProps {
  style: {
    id: string;
    label: string;
    aesthetics: Record<string, unknown>;
  };
  type: string;
  onEdit: () => void;
  onRemove: () => void;
  onCopy: () => void;
  onLabelChange: (newLabel: string) => void;
  onApply?: () => void;
  isApplied?: boolean;
}

export default function StyleVariantCard({ 
  style, 
  type,
  onEdit, 
  onRemove, 
  onCopy, 
  onLabelChange,
  onApply,
  isApplied
}: StyleVariantCardProps) {
  const isRack = type === 'rack';

  const downloadVariant = () => {
    const data = JSON.stringify(style, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omega_style_${type}_${style.label.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`group relative p-3 border rounded-xs transition-all duration-300 ${isApplied ? 'bg-primary/10 border-primary/40 shadow-[0_0_15px_rgba(0,242,255,0.05)]' : 'bg-primary/5 wb-outline hover:border-primary/40'}`}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
             <span className="text-[5px] font-black uppercase text-primary/40 tracking-widest">Sequence</span>
             {isApplied && (
               <div className="flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                  <span className="text-[5px] font-black uppercase text-primary tracking-tighter">Active in Plane</span>
               </div>
             )}
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); downloadVariant(); }} 
              title="Export as JSON"
              aria-label="Export style as JSON"
              className="hover:scale-110 transition-transform"
            >
              <Download className="w-2 h-2 wb-text-muted hover:text-primary" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onCopy(); }} 
              title="Copy to Clipboard"
              aria-label="Copy style to clipboard"
              className="hover:scale-110 transition-transform"
            >
              <Copy className="w-2 h-2 wb-text-muted hover:text-primary" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(); }} 
              title="Delete"
              aria-label="Delete style variant"
              className="hover:scale-110 transition-transform"
            >
              <Trash2 className="w-2 h-2 text-red-500/40 hover:text-red-500" />
            </button>
          </div>
        </div>
        
        <input 
          type="text" 
          value={style.label}
          onChange={(e) => onLabelChange(e.target.value)}
          aria-label={`Style variant label: ${style.label}`}
          className={`bg-transparent border-none outline-none text-[8px] font-black uppercase transition-colors w-full overflow-hidden text-ellipsis ${isApplied ? 'text-primary' : 'wb-text'}`}
        />
        
        <div className="flex items-center justify-between mt-1 pt-1 border-t border-primary/5">
          <span className="text-[6px] font-mono text-white/20">{style.id.slice(-6)}</span>
          <div className="flex items-center gap-1">
             {isRack && onApply && !isApplied && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onApply(); }}
                  aria-label="Apply style to plane"
                  className="px-1.5 py-0.5 bg-accent/10 border border-accent/20 rounded-[2px] text-[5px] font-black uppercase text-accent hover:bg-accent/20 flex items-center gap-1"
                >
                  <Layout className="w-1.5 h-1.5" />
                  Apply to Plane
                </button>
             )}
             {isApplied && isRack && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-primary/20 rounded-[2px] text-[5px] font-black uppercase text-primary">
                   <CheckCircle2 className="w-1.5 h-1.5" />
                   Applied
                </div>
             )}
             <button 
               onClick={onEdit}
               aria-label="Edit style variant"
               className="px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded-[2px] text-[5px] font-black uppercase text-primary hover:bg-primary/20"
             >
               Edit
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
