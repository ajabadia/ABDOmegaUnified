'use client';

/**
 * @purpose Renderiza una galería modal para seleccionar plantillas de módulos con opciones de búsqueda y filtrado.
 * @purpose_en Renders a modal gallery for selecting module templates with search and filter options.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:1snr7f6
 * @lastUpdated 2026-06-17T22:30:00.017Z
 */


import { motion, AnimatePresence } from 'framer-motion';
import ModalCloseButton from '../modals/ModalCloseButton';
import ModalActionButton from '../modals/ModalActionButton';
import { Search, Grid, Layout, Cpu, Box, ChevronRight, Sparkles } from 'lucide-react';
import { useFocusTrap } from '@/features/manifest-editor/hooks/useFocusTrap';
import { useTemplateGallery } from '@/features/manifest-editor/hooks/useTemplateGallery';
import type { ModuleTemplate } from '@/omega-ui-core/types/manifest';

interface TemplateGalleryProps {
  onSelect: (template: ModuleTemplate) => void;
  onClose: () => void;
}

export default function TemplateGallery({ onSelect, onClose }: TemplateGalleryProps) {
  const focusTrapRef = useFocusTrap(true);
  const { 
    templates, 
    categories, 
    activeCategory, 
    setActiveCategory, 
    searchQuery, 
    setSearchQuery,
    handleSelect 
  } = useTemplateGallery(onSelect);

  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-center justify-center p-8 bg-black/80 backdrop-blur-md"
      ref={focusTrapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Blueprint Gallery"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="w-full max-w-7xl h-full max-h-[850px] wb-surface border wb-outline rounded-xs shadow-2xl overflow-hidden flex flex-col"
      >
        {/* HEADER */}
        <div className="p-6 border-b wb-outline flex items-center justify-between wb-surface-subtle">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xs bg-primary/10 flex items-center justify-center border border-primary/20">
              <Layout className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-widest wb-text">Blueprint Gallery</h2>
              <p className="text-[8px] md:text-[9px] font-bold uppercase wb-text-muted tracking-widest mt-1 opacity-70 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-primary/60" />
                Select a modular starting point for your Era 7.2.3 module
              </p>
            </div>
          </div>
          <ModalCloseButton onClick={onClose} title="Close gallery" />
        </div>

        {/* SEARCH & FILTERS */}
        <div className="px-6 py-4 border-b wb-outline wb-surface-subtle flex items-center gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="Search templates (e.g. Filter, Oscillator, I/O)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border wb-outline focus:border-primary/40 focus:bg-black/60 rounded-xs py-3 pl-12 pr-4 text-[11px] font-bold tracking-wider wb-text placeholder:text-white/10 outline-none transition-all"
              aria-label="Search templates"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2.5 rounded-xs text-[9px] font-black uppercase tracking-widest transition-all border ${
                !activeCategory 
                  ? 'bg-primary/20 border-primary/40 text-primary' 
                  : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat || null)}
                className={`px-4 py-2.5 rounded-xs text-[9px] font-black uppercase tracking-widest transition-all border ${
                  activeCategory === cat 
                    ? 'bg-primary/20 border-primary/40 text-primary' 
                    : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* TEMPLATE GRID */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {templates.map((template, idx) => (
                <motion.button
                  key={template.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleSelect(template)}
                  className="group relative flex flex-col text-left wb-surface border wb-outline rounded-xs p-5 hover:border-primary/40 transition-all hover:shadow-[0_0_30px_rgba(0,242,255,0.05)] overflow-hidden"
                >
                   <div className="absolute top-4 right-4 flex gap-2">
                    {!!template.compatibility?.minFaceplateVersion && (
                       <div className="px-2 py-1 bg-accent/10 rounded-xs border border-accent/20">
                          <span className="text-[7px] font-black uppercase text-accent">
                           FP v{String(template.compatibility.minFaceplateVersion)}
                         </span>
                       </div>
                     )}
                     {!!template.assetBehavior && (
                       <div className="px-2 py-1 bg-amber-500/10 rounded-xs border border-amber-500/20 flex items-center gap-1">
                          <Cpu className="w-2.5 h-2.5 text-amber-500" />
                          <span className="text-[7px] font-black uppercase text-amber-500">
                            LAB
                          </span>
                       </div>
                     )}
                     <div className="px-2 py-1 bg-white/5 rounded-xs border border-white/5">
                       <span className="text-[7px] font-black uppercase text-white/40 group-hover:text-primary transition-colors">
                        {template.family}
                      </span>
                    </div>
                  </div>

                   <div className="mb-6 w-12 h-12 rounded-xs bg-black/40 border border-white/5 flex items-center justify-center group-hover:border-primary/40 group-hover:bg-primary/5 transition-all shadow-inner">
                    {(template.family || '') === 'Filter' && <Cpu className="w-6 h-6 text-white/20 group-hover:text-primary transition-colors" />}
                    {(template.family || '') === 'I/O' && <Box className="w-6 h-6 text-white/20 group-hover:text-primary transition-colors" />}
                    {(template.family || '') === 'Oscillator' && <Sparkles className="w-6 h-6 text-white/20 group-hover:text-primary transition-colors" />}
                    {(template.family || '') === 'Control' && <Grid className="w-6 h-6 text-white/20 group-hover:text-primary transition-colors" />}
                    {!['Filter', 'I/O', 'Oscillator', 'Control'].includes(template.family || '') && <Grid className="w-6 h-6 text-white/20 group-hover:text-primary transition-colors" />}
                  </div>

                  <h3 className="text-[13px] font-black uppercase tracking-[0.15em] wb-text group-hover:text-primary transition-colors">
                    {template.label}
                  </h3>
                  <p className="mt-2 text-[9px] wb-text-muted leading-relaxed font-medium uppercase tracking-tighter line-clamp-2">
                    {template.description || `Industrial blueprint v${template.version} for ABDOmega Era 7 compliant modules.`}
                  </p>

                  {/* QUICK PREVIEW HINT (Phase 11) */}
                  <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <div className="flex -space-x-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-3 h-3 rounded-full border border-black bg-white/10" />
                      ))}
                    </div>
                    <span className="text-[6px] font-black uppercase text-primary/60 tracking-widest">Blueprint structure ready</span>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors shadow-[0_0_8px_var(--wb-bloom)]" />
                      <span className="text-[8px] font-bold text-white/20 group-hover:text-white/60 transition-colors uppercase">
                        {(template.slots || []).length} Logical Slots
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* DECORATIVE BACKGROUND */}
                  <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
          
          {templates.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center py-20 text-center opacity-40">
              <Layout className="w-16 h-16 mb-4 text-white/10" />
              <p className="text-sm font-black uppercase tracking-widest text-white/20">No matching blueprints found</p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t wb-outline flex justify-end wb-surface-subtle">
          <ModalActionButton onClick={onClose}>
            Cancel Selection
          </ModalActionButton>
        </div>
      </motion.div>
    </div>
  );
}
