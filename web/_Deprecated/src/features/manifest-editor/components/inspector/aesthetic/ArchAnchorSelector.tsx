'use client';

/**
 * @purpose Gestiona un selector de dropdown para seleccionar un contenedor de anclaje arquitectónico en el editor de manifesto OMEGA.
 * @purpose_en Manages a dropdown selector for choosing an architectural anchor container in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:13prut
 * @lastUpdated 2026-06-15T11:03:45.248Z
 */

import { Layout, Info, Box } from 'lucide-react';
import type { ManifestEntity, LayoutContainer, Presentation } from '@/omega-ui-core/types/manifest';

interface ArchAnchorSelectorProps {
  item: ManifestEntity;
  onUpdate: (updates: Partial<ManifestEntity>) => void;
  containers: LayoutContainer[];
  onHelp?: ((id: string) => void) | undefined;
  highlightPath?: string | null;
}

export default function ArchAnchorSelector({ item, onUpdate, containers, onHelp, highlightPath }: ArchAnchorSelectorProps) {
  return (
    <div className="space-y-4 p-4 bg-accent/5 border border-accent/10 rounded-xs">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3 wb-text-muted opacity-80">
            <Layout className="w-3.5 h-3.5 text-accent" />
            <span className="text-[9px] font-black uppercase tracking-widest italic text-accent">Architectural Anchor</span>
         </div>
         {onHelp && (
           <button onClick={() => onHelp('layout')} title="Help: architectural anchor" className="p-1 text-white/20 hover:text-primary transition-colors">
             <Info className="w-3 h-3" />
           </button>
         )}
      </div>

      <div className="space-y-2">
        <div className="relative group">
          <select 
            value={item.presentation?.container || ''} 
            onChange={(e) => {
              if (!item.presentation) return;
              onUpdate({ 
                presentation: { 
                  ...item.presentation, 
                  container: e.target.value || undefined
                } as Presentation
              });
            }}
            className={`w-full bg-black/5 border ${highlightPath?.includes('container') ? 'border-amber-500 ring-1 ring-amber-500 animate-pulse' : 'wb-outline'} rounded-xs px-3 py-3 text-[10px] font-black text-primary outline-none focus:border-accent/40 transition-all appearance-none cursor-pointer [color-scheme:dark]`}
          >
            <option value="">NO CONTAINER (UNBOUND)</option>
            {containers.map(c => (
              <option key={c.id} value={c.id}>{c.label.toUpperCase()} ({c.id})</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none wb-text-muted opacity-60 group-hover:opacity-40 transition-opacity">
             <Box className="w-3 h-3" />
          </div>
        </div>

      </div>
    </div>
  );
}
