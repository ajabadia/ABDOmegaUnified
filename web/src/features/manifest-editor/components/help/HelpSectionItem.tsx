'use client';

/**
 * @purpose Renderiza un elemento de ayuda collapsible para el editor de manifesto OMEGA, mostrando contenido y subtendencias con animaciones.
 * @purpose_en Renders a collapsible help section item for the OMEGA manifest editor, displaying content and subsections with animations.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1k40fuh
 * @lastUpdated 2026-06-17T22:30:17.846Z
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { HelpSection } from '../modals/helpData';
import { HelpCodeBlock } from './HelpCodeBlock';

interface HelpSectionItemProps {
  section: HelpSection;
  isExpanded: boolean;
  onToggle: () => void;
}

export function HelpSectionItem({ section, isExpanded, onToggle }: HelpSectionItemProps) {
  return (
    <div id={`help-anchor-${section.id}`} className="space-y-2">
      <button 
        onClick={onToggle}
        aria-label={`Expand ${section.title} section`}
        className={`w-full flex items-center justify-between p-5 rounded-xs border transition-all ${
          isExpanded ? 'bg-white/[0.03] border-white/20' : 'bg-white/[0.01] border-white/5 hover:border-white/10'
        }`}
      >
        <div className="flex items-center gap-5">
          <span className="text-2xl">{section.icon}</span>
          <span className={`text-[12px] font-black uppercase tracking-[0.2em] ${isExpanded ? 'text-white' : 'text-white/60'}`}>
            {section.title}
          </span>
        </div>
        <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90 text-primary' : 'text-white/10'}`} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            className="overflow-hidden"
          >
            <div className="p-8 pt-2 space-y-8 border-x border-b border-white/5 bg-black/40 rounded-b-xs">
              <p className="text-[11px] text-white/40 leading-relaxed font-medium italic">{section.content}</p>

              {section.subsections?.map((sub) => (
                <div key={sub.id} id={`help-anchor-${sub.id}`} className="space-y-4 pl-6 border-l-2 border-white/5 hover:border-primary/40 transition-colors">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80 flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
                    {sub.title}
                  </h4>
                  <p className="text-[11px] text-white/70 leading-relaxed max-w-2xl">{sub.content}</p>
                  
                  {sub.code && <HelpCodeBlock code={sub.code} />}
 
                  {sub.technical_params && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {sub.technical_params.map((p) => (
                        <code key={p} className="px-3 py-1 bg-black border border-white/10 rounded-full text-[9px] font-mono text-accent/80">{p}</code>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
