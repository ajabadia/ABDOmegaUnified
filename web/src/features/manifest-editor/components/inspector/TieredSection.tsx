'use client';

/**
 * @purpose Renderiza una sección colapsable con título personalizable, nivel, icono y badge para su uso en el editor de manifestos OMEGA.
 * @purpose_en Renders a collapsible section with customizable title, level, icon, and badge for use in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1o1cs85
 * @lastUpdated 2026-06-15T11:50:35.446Z
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TieredSectionProps {
  title: string;
  level: 'essential' | 'advanced' | 'diagnostics';
  icon?: LucideIcon;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function TieredSection({
  title,
  level,
  icon: Icon,
  badge,
  defaultOpen = false,
  children
}: TieredSectionProps) {
  const [isOpen, setIsOpen] = useState(level === 'essential' ? true : defaultOpen);

  // Theme-safe level styles — no hardcoded black/white
  const levelStyles = {
    essential: 'border-l-2 border-primary bg-primary/5 hover:bg-primary/8',
    advanced:  'border-l-2 border-wb-outline wb-surface-subtle hover:wb-surface-hover',
    diagnostics: 'border-l-2 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/8'
  };

  const iconStyles = {
    essential:   isOpen ? 'text-primary' : 'wb-text-muted',
    advanced:    isOpen ? 'wb-text-muted' : 'opacity-40',
    diagnostics: isOpen ? 'text-amber-500/80' : 'text-amber-500/40'
  };

  const titleStyles = {
    essential:   isOpen ? 'wb-text' : 'wb-text-muted',
    advanced:    isOpen ? 'wb-text' : 'wb-text-muted',
    diagnostics: isOpen ? 'text-amber-600 dark:text-amber-400' : 'wb-text-muted'
  };

  return (
    <div className={`mb-1 transition-all duration-300 ${isOpen ? 'pb-3' : 'pb-0'}`}>
      {/* HEADER */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between px-2.5 py-2 cursor-pointer group select-none transition-colors duration-150 rounded-t-xs ${levelStyles[level]}`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
            <ChevronDown className="w-3 h-3 wb-text-muted opacity-60" />
          </div>
          {Icon && <Icon className={`w-3.5 h-3.5 transition-colors ${iconStyles[level]}`} />}
          <div className="flex flex-col">
            <span className={`text-[8px] font-black uppercase tracking-widest transition-colors ${titleStyles[level]}`}>
              {title}
            </span>
            {level !== 'essential' && !isOpen && (
              <span className="text-[6px] wb-text-muted opacity-60 lowercase tracking-normal">
                Click to expand {level} settings
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-[6px] font-black px-1.5 py-0.5 rounded-full wb-surface-strong wb-outline border wb-text-muted uppercase">
              {badge}
            </span>
          )}
          {level === 'diagnostics' && (
             <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-pulse" />
          )}
        </div>
      </div>

      {/* CONTENT */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {/* Theme-safe content area — uses semantic surface tokens */}
            <div className="p-3 space-y-3 wb-surface-subtle border-x border-b wb-outline rounded-b-xs">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
