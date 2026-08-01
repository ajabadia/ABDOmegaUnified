'use client';

/**
 * @purpose Renderiza una sección colapsable con contenido expandible para uso en el editor de manifesto OMEGA.
 * @purpose_en Renders a collapsible section with expandable content for use in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:1ilpk9n
 * @lastUpdated 2026-06-20T09:18:22.762Z
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';

interface InspectorCollapsibleProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType | (() => React.ReactNode);
  children: React.ReactNode;
  onHelp?: ((id: string) => void) | undefined;
  defaultOpen?: boolean;
  defaultExpanded?: boolean; // Alias for defaultOpen to resolve TSC errors
  variant?: 'default' | 'minimal';
  actions?: React.ReactNode;
}

export default function InspectorCollapsible({ 
  title, 
  subtitle,
  icon: Icon, 
  children, 
  onHelp, 
  defaultOpen = true,
  defaultExpanded,
  variant = 'default',
  actions
}: InspectorCollapsibleProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? defaultOpen);

  const isMinimal = variant === 'minimal';

  return (
    <div className={isMinimal ? 'space-y-1' : 'space-y-4'}>
      {/* SECTION HEADER / TOGGLE */}
      <div 
        className={`${isMinimal ? 'text-[6px] py-1' : 'text-[7px]'} font-black uppercase wb-text-muted flex items-center justify-between tracking-[0.2em] group cursor-pointer select-none`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
         <div className="flex items-center gap-2 group-hover:text-primary transition-colors">
            {isExpanded ? <ChevronDown className="w-3 h-3 text-primary" /> : <ChevronRight className="w-3 h-3" />}
            {Icon && (
              <div className={`w-3 h-3 flex items-center justify-center ${isExpanded ? 'text-primary' : 'opacity-40'}`}>
                {React.isValidElement(Icon) ? (
                  Icon
                ) : typeof Icon === 'function' ? (
                  Icon.prototype?.render ? <Icon className="w-full h-full" /> : (Icon as () => React.ReactNode)()
                ) : (
                  <Icon className="w-full h-full" />
                )}
              </div>
            )}
            <div className="flex flex-col -gap-1">
              <span className={isExpanded ? 'text-white' : ''}>{title}</span>
              {subtitle && isExpanded && (
                <span className="text-[5px] font-mono lowercase opacity-30 normal-case tracking-normal">{subtitle}</span>
              )}
            </div>
         </div>
         
         <div className="flex items-center gap-1">
           {actions}
           {onHelp && (
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 onHelp(title);
               }} 
               aria-label={`Help: ${title}`}
               className="hover:text-primary transition-colors p-1"
             >
                <Info className="w-3 h-3" />
             </button>
           )}
         </div>
      </div>

      {/* COLLAPSIBLE CONTENT */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className={isMinimal ? 'pl-2 border-l wb-outline ml-1.5 mb-2' : 'pb-2'}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
