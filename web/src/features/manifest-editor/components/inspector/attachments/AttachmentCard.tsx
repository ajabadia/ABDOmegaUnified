'use client';

/**
 * @purpose Gestiona un componente de tarjeta para mostrar y gestionar anexos en el editor de manifesto OMEGA, incluyendo el despliegue, eliminación y actualización de propiedades de anexos.
 * @purpose_en Manages a card component for displaying and managing attachments in an OMEGA manifest editor, including toggling expansion, removing, and updating attachment properties.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:143svna
 * @lastUpdated 2026-06-17T22:32:03.934Z
 */

import { ShieldCheck, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AttachmentItem from '../AttachmentItem';

import type { Attachment, OMEGA_Manifest } from '@/types/manifest';

interface AttachmentCardProps {
  att: Attachment;
  manifest: OMEGA_Manifest;
  hostType: string;
  idx: number | string;
  isCore?: boolean | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: (idx: number) => void;
  onUpdate: (idx: number | string, updates: Partial<Attachment>) => void;
  availableBinds: string[];
  onOpenConfig?: (() => void) | undefined;
}

export default function AttachmentCard({
  att, manifest, hostType, idx, isCore = false, isExpanded, onToggle, onRemove, onUpdate, availableBinds, onOpenConfig
}: AttachmentCardProps) {
  return (
    <div className={`border wb-outline rounded-sm overflow-hidden transition-all duration-300 ${isExpanded ? 'wb-surface-inset shadow-xl' : 'wb-surface hover:wb-surface-hover'}`}>
      <div 
        onClick={onToggle}
        className="flex items-center justify-between p-3 cursor-pointer group select-none"
      >
        <div className="flex items-center gap-3">
          <div className={`w-1.5 h-1.5 rounded-full ${isCore ? 'bg-primary animate-pulse shadow-[0_0_8px_rgba(0,240,255,0.8)]' : att.type === 'led' ? 'bg-accent shadow-[0_0_5px_rgba(255,140,0,0.5)]' : att.type === 'display' ? 'bg-primary shadow-[0_0_5px_rgba(0,240,255,0.5)]' : 'wb-surface-inset'}`} />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-tighter transition-colors duration-500 ${isExpanded ? 'wb-text' : 'wb-text-muted'}`}>
                {att.type} • {att.position}
              </span>
              {isCore && (
                <span className="flex items-center gap-0.5 px-1 py-0.5 bg-primary/10 border border-primary/20 rounded-xs text-[6px] font-black text-primary">
                  <ShieldCheck className="w-2 h-2" />
                  <span>CORE</span>
                </span>
              )}
            </div>
            {(att.bind || att.variant) && (
              <div className="flex gap-2">
                 {att.variant && <span className="text-[7px] font-mono wb-text-muted italic opacity-60">{att.variant}</span>}
                 {att.bind && <span className="text-[7px] font-mono text-accent font-bold">{att.bind}</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isCore && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(idx as number); }} 
              aria-label={`Remove ${att.type} attachment`}
              className="p-1 wb-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
             <ChevronDown className="w-3 h-3 wb-text-muted" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-outline/10">
            <div className="p-4">
              <AttachmentItem 
                att={att}
                manifest={manifest}
                hostType={hostType}
                availableBinds={availableBinds}
                onUpdate={(updates) => onUpdate(idx, updates)}
                onOpenConfig={onOpenConfig}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
