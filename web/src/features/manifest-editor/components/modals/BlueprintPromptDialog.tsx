'use client';

/**
 * @purpose Renderiza una dialogo modal para que los usuarios ingresen valores para construir un modulo basado en definiciones de plantilla.
 * @purpose_en Renders a modal dialog for users to input values for assembling a module based on blueprint definitions.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:8,sig:11nnvqm
 * @lastUpdated 2026-06-20T09:43:00.270Z
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ModalCloseButton from './ModalCloseButton';
import ModalActionButton from './ModalActionButton';
import { Grid3X3 } from 'lucide-react';
import { useFocusTrap } from '@/features/manifest-editor/hooks/useFocusTrap';
import type { BlueprintDefinition, BlueprintPlaceholderDefinition, BlueprintPlaceholderValues } from '@/omega-ui-core/types/manifest';
import BlueprintPreview from '../preview/BlueprintPreview';

interface BlueprintPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  blueprint: BlueprintDefinition | null;
  onConfirm: (values: BlueprintPlaceholderValues) => void;
  onUpdatePlaceholder?: ((id: string, value: string | number | boolean) => void) | undefined;
}

/**
 * OMEGA Phase 9.4A - Industrial Blueprint Prompt Dialog
 * Form generator for formal BlueprintPlaceholderDefinition (§A.2).
 */
export default function BlueprintPromptDialog({
  isOpen,
  onClose,
  blueprint,
  onConfirm,
  onUpdatePlaceholder
}: BlueprintPromptDialogProps) {
  const [values, setValues] = useState<BlueprintPlaceholderValues>(() => {
    if (!blueprint) return {};
    const initial: BlueprintPlaceholderValues = {};
    (blueprint.placeholders || []).forEach(p => {
      if (p.defaultValue !== undefined) {
        initial[p.id] = p.defaultValue;
      }
    });
    return initial;
  });

  const focusTrapRef = useFocusTrap(isOpen);

  if (!blueprint || !blueprint.placeholders) return null;

  const handleConfirm = () => {
    // Validate required fields
    const missing = (blueprint.placeholders || []).filter(p => p.required && (values[p.id] === undefined || values[p.id] === ''));
    if (missing.length > 0) {
      alert(`Missing required parameters: ${missing.map(p => p.label).join(', ')}`);
      return;
    }
    onConfirm(values);
  };

  const updateValue = (id: string, value: string | number | boolean) => {
    setValues(prev => ({ ...prev, [id]: value }));
    onUpdatePlaceholder?.(id, value);
  };

  const renderInput = (p: BlueprintPlaceholderDefinition) => {
    const value = values[p.id] ?? '';

    switch (p.valueType) {
      case 'enumValue':
        return (
          <select
            className="w-full px-4 py-2.5 bg-black/40 border wb-outline rounded-xs text-[11px] font-bold text-white focus:outline-none focus:border-primary/40"
            value={String(value)}
            onChange={(e) => updateValue(p.id, e.target.value)}
            aria-label={p.label}
          >
            {(p.allowedValues || []).map((opt: { label: string; value: string | number | boolean } | string | number | boolean) => (
              <option key={String(typeof opt === 'object' ? opt.value : opt)} value={String(typeof opt === 'object' ? opt.value : opt)} className="bg-neutral-900">{String(typeof opt === 'object' ? opt.label : opt)}</option>
            ))}
          </select>
        );
      
      case 'color':
        return (
          <input
            type="color"
            className="w-full h-10 bg-black/40 border wb-outline rounded-xs cursor-pointer"
            value={String(value || '#00f2ff')}
            onChange={(e) => updateValue(p.id, e.target.value)}
            aria-label={p.label}
          />
        );
      
      case 'boolean':
        return (
          <div className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              id={`p-${p.id}`}
              aria-label={p.label}
              className="w-4 h-4 accent-primary rounded-xs cursor-pointer"
              checked={!!value}
              onChange={(e) => updateValue(p.id, e.target.checked)}
            />
            <label htmlFor={`p-${p.id}`} className="text-[10px] font-bold uppercase wb-text-muted">Enable {p.label}</label>
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            className="w-full px-4 py-2.5 bg-black/40 border wb-outline rounded-xs text-[11px] font-bold text-white focus:outline-none focus:border-primary/40"
            value={Number(value)}
            onChange={(e) => updateValue(p.id, Number(e.target.value))}
            aria-label={p.label}
          />
        );

      default:
        return (
          <input
            type="text"
            className="w-full px-4 py-2.5 bg-black/40 border wb-outline rounded-xs text-[11px] font-bold text-white focus:outline-none focus:border-primary/40 transition-colors"
            placeholder={p.hint || `Enter ${p.label}...`}
            value={String(value)}
            onChange={(e) => updateValue(p.id, e.target.value)}
            aria-label={p.label}
          />
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-label={blueprint ? `Blueprint: ${blueprint.name}` : 'Blueprint Prompt'}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-7xl h-full max-h-[850px] wb-surface border wb-outline shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b wb-outline wb-surface-subtle flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xs bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs">⚡</div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-widest wb-text">
                    {blueprint.name}
                  </h3>
                  <p className="text-[8px] md:text-[9px] font-bold uppercase wb-text-muted tracking-widest mt-1 opacity-70 flex items-center gap-2">
                    <span>Blueprint Injection • v{blueprint.version}</span>
                    <span className="opacity-30">|</span>
                    <span className="text-primary">{blueprint.origin.toUpperCase()}</span>
                  </p>
                </div>
              </div>
              <ModalCloseButton onClick={onClose} title="Close blueprint dialog" />
            </div>

            {/* Content — two-column: preview + placeholders */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Visual Preview */}
              <div className="w-[320px] shrink-0 border-r wb-outline bg-black/10 p-4 overflow-hidden flex flex-col">
                <div className="flex items-center gap-1.5 mb-3">
                  <Grid3X3 className="w-3 h-3 text-primary/60" />
                  <span className="text-[7px] font-black uppercase tracking-widest wb-text-muted opacity-60">
                    Rack Preview
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center min-h-0">
                  <BlueprintPreview width={280}>{blueprint.rootNode.children}</BlueprintPreview>
                </div>
                {/* Legend */}
                <div className="mt-3 pt-3 border-t wb-outline flex flex-wrap gap-x-3 gap-y-1">
                  {[['circle','Knob'],['dot','Port'],['bar-v','Slider'],['rect','Display'],['round-rect','Button'],['dash','Container']].map(([icon, label]) => (
                    <div key={label} className="flex items-center gap-1">
                      <svg width="8" height="8" viewBox="0 0 8 8" className="shrink-0">
                        {icon === 'circle' && <circle cx="4" cy="4" r="2.5" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />}
                        {icon === 'dot' && <circle cx="4" cy="4" r="1.5" fill="currentColor" opacity="0.4" />}
                        {icon === 'bar-v' && <rect x="3" y="1" width="2" height="6" rx="0.5" fill="currentColor" opacity="0.4" />}
                        {icon === 'rect' && <rect x="1" y="1.5" width="6" height="5" rx="0.5" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />}
                        {icon === 'round-rect' && <rect x="1.5" y="2" width="5" height="4" rx="1" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />}
                        {icon === 'dash' && <rect x="0.5" y="1" width="7" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1.5,1" opacity="0.35" />}
                      </svg>
                      <span className="text-[5px] font-mono uppercase tracking-wider wb-text-muted opacity-40">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Placeholder form fields */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                {blueprint.description && (
                  <p className="text-[11px] font-bold uppercase wb-text-muted leading-relaxed border-l-2 border-primary/30 pl-4 py-1">
                    {blueprint.description}
                  </p>
                )}

                <div className="space-y-6 pt-2">
                  {(blueprint.placeholders || []).map((p) => (
                    <div key={p.id} className="space-y-2">
                      <div className="flex justify-between items-baseline">
                        <label className="text-[9px] font-black uppercase tracking-widest wb-text">
                          {p.label}
                          {p.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <span className="text-[8px] wb-text-muted font-mono bg-black/20 border wb-outline px-1.5 py-0.5 rounded-xs">
                          {p.valueType}
                        </span>
                      </div>
                      
                      {renderInput(p)}
                      
                      {p.description && (
                        <p className="text-[8px] font-bold uppercase wb-text-muted opacity-60 leading-tight">
                          {p.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 wb-surface-subtle border-t wb-outline flex justify-end items-center gap-4">
              <ModalActionButton onClick={onClose}>
                Cancel
              </ModalActionButton>
              <button
                onClick={handleConfirm}
                className="px-6 py-2.5 rounded-xs bg-primary/20 border border-primary/40 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary/30 active:scale-[0.98] transition-all flex items-center gap-2 shadow-[0_0_20px_var(--wb-bloom)]"
              >
                Assemble Module
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
