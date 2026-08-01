'use client';

/**
 * @purpose Renderiza una modalidad que muestra documentación OMEGA con categorías de usuario y desarrollador, permitiendo a los usuarios expandir secciones para obtener información detallada.
 * @purpose_en Renders a modal displaying OMEGA documentation with user and developer categories, allowing users to expand sections for detailed information.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:cju4bc
 * @lastUpdated 2026-06-20T09:43:10.415Z
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ModalCloseButton from './ModalCloseButton';
import ModalActionButton from './ModalActionButton';
import { HELP_DATA } from './helpData';
import { useFocusTrap } from '@/features/manifest-editor/hooks/useFocusTrap';
import { HelpSectionItem } from '../help/HelpSectionItem';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSectionId?: string | undefined;
}

export default function HelpModal({ isOpen, onClose, initialSectionId }: HelpModalProps) {
  const focusTrapRef = useFocusTrap(isOpen);
  const [activeCategory, setActiveCategory] = useState<'user' | 'developer'>('user');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasInitialized = useRef(false);

  // ── Escape key closes the modal ─────────────────────────────────
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleEscape]);

  // ── Focus restoration on close ──────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => {
      // Restore focus when modal closes (cleanup runs when isOpen becomes false)
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      hasInitialized.current = false;
      return;
    }

    if (isOpen && !hasInitialized.current) {
      if (initialSectionId) {
        const section = HELP_DATA.find(s => 
          s.id === initialSectionId || s.subsections?.some(sub => sub.id === initialSectionId)
        );
        if (section) {
          setTimeout(() => {
            setActiveCategory(section.category);
            setExpandedSection(section.id);
            const element = document.getElementById(`help-anchor-${initialSectionId}`);
            element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 0);
        }
      } else {
        setTimeout(() => {
          setExpandedSection(activeCategory === 'user' ? 'introduccion' : 'sdk_core');
        }, 0);
      }
      hasInitialized.current = true;
    }
  }, [isOpen, initialSectionId, activeCategory]);

  if (!isOpen) return null;

  const filteredData = HELP_DATA.filter(s => s.category === activeCategory);

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-12"
        ref={focusTrapRef}
        role="dialog"
        aria-modal="true"
        aria-label="OMEGA Engineering Manual"
      >
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        />

        <motion.div 
          initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 10 }}
          className="relative w-full max-w-7xl h-full max-h-[850px] wb-surface border wb-outline rounded-xs shadow-2xl flex flex-col overflow-hidden"
        >
          {/* HEADER */}
          <div className="flex-none p-6 border-b wb-outline flex items-center justify-between wb-surface-subtle">
            <div className="flex flex-col">
              <h2 className="text-base font-black uppercase tracking-widest wb-text">Ingeniería OMEGA v7.2.3</h2>
              <p className="text-[8px] md:text-[9px] font-bold uppercase wb-text-muted tracking-widest mt-1 opacity-70">Unified Documentation System</p>
            </div>
            <ModalCloseButton onClick={onClose} title="Close help" />
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
            {filteredData.map((section) => (
              <HelpSectionItem 
                key={section.id}
                section={section}
                isExpanded={expandedSection === section.id}
                onToggle={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              />
            ))}
          </div>

          {/* FOOTER */}
          <div className="flex-none p-5 border-t wb-outline flex items-center justify-between wb-surface-subtle">
            <div className="flex bg-black/20 p-1 rounded-xs border wb-outline">
               <button 
                 onClick={() => { setActiveCategory('user'); setExpandedSection('introduccion'); }}
                 aria-label="Switch to user manual"
                 className={`px-6 py-1.5 rounded-xs text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === 'user' ? 'bg-primary/20 border border-primary/40 text-primary' : 'wb-text-muted hover:wb-text'}`}
               >
                 Manual Usuario
               </button>
               <button 
                 onClick={() => { setActiveCategory('developer'); setExpandedSection('sdk_core'); }}
                 aria-label="Switch to developer guide"
                 className={`px-6 py-1.5 rounded-xs text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === 'developer' ? 'bg-accent/20 border border-accent/40 text-accent' : 'wb-text-muted hover:wb-text'}`}
               >
                 Guía SDK (Dev)
               </button>
            </div>
            <ModalActionButton onClick={onClose}>
              Dismiss View
            </ModalActionButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
