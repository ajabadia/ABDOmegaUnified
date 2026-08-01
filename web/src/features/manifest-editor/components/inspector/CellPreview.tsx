'use client';

/**
 * @purpose Renderiza una previsualización de un item OmegaNode con contenido desplazable y efecto de línea de escaneo.
 * @purpose_en Renders a preview of an OmegaNode item with collapsible content and scanline effect.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:uv61as
 * @lastUpdated 2026-06-17T22:32:48.252Z
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { OmegaNode } from '@/types/manifest';

import { CellRenderer } from '@/omega-ui-core/renderers/CellRenderer';

interface CellPreviewProps {
  item: OmegaNode;
  skin?: string;
  resolveAsset?: (id: string | undefined) => string | undefined;
}

export default function CellPreview({ item, skin = 'industrial', resolveAsset }: CellPreviewProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="relative group">
      {/* COLLAPSE TOGGLE */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label={isCollapsed ? "Expand preview" : "Collapse preview"}
        className="absolute top-2 right-2 z-50 p-1.5 rounded-xs wb-surface-strong hover:bg-primary/10 border wb-outline wb-text-muted hover:wb-text transition-all opacity-0 group-hover:opacity-100"
        title={isCollapsed ? "Expand Preview" : "Collapse Preview"}
      >
        {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 100, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="w-full wb-surface-inset border-b wb-outline flex flex-col items-center justify-center relative overflow-hidden group/canvas"
          >
            {/* SCANLINE EFFECT */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)] z-10 bg-[length:100%_2px]" />
            
            {/* RENDERER BRIDGE — COMPACT SCALE */}
            <div className="relative scale-[1.2] flex items-center justify-center transition-transform duration-500 group-hover/canvas:scale-[1.3]">
               <div 
                  dangerouslySetInnerHTML={{ 
                    __html: CellRenderer.renderCellHTML(item, {
                      skin,
                      zoom: 0.8,
                      runtimeValue: 0.5,
                      steps: 100,
                      isSelected: false,
                      isLiveMode: false,
                      resolveAsset
                    }) 
                  }}
               />
            </div>

            {/* MINIMAL RULER */}
            <div className="absolute bottom-1 right-2 opacity-30">
               <span className="text-[5px] font-black uppercase tracking-[0.2em] text-primary/60">PRVW:LOD</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {isCollapsed && (
        <div 
          onClick={() => setIsCollapsed(false)}
          className="w-full h-4 wb-surface border-b wb-outline flex items-center justify-center cursor-pointer hover:wb-surface-strong transition-all"
        >
          <span className="text-[5px] font-black uppercase tracking-[0.2em] wb-text-muted opacity-40">Expand Preview</span>
        </div>
      )}
    </div>
  );
}

