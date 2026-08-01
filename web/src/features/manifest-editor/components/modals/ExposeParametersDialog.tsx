'use client';

/**
 * @purpose Gestiona el renderizado y la lógica para un diálogo modal en el editor de manifesto OMEGA que permite a los usuarios seleccionar y configurar parámetros como placeholders.
 * @purpose_en Manages the rendering and logic for a modal dialog in the OMEGA manifest editor that allows users to select and configure parameters to expose as placeholders.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:2,imports:6,sig:qzhibx
 * @lastUpdated 2026-06-20T09:43:05.708Z
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { useFocusTrap } from '@/features/manifest-editor/hooks/useFocusTrap';
import type { GroupNode } from '@/omega-ui-core/types/rack';
import type { BlueprintPlaceholder } from '@/omega-ui-core/types/manifest';

// ── Types ──────────────────────────────────────────────────────────────

export interface ExposedParam {
  childId: string;
  childLabel: string;
  childType: string;
  attribute: 'label' | 'bind' | 'variant' | 'min' | 'max' | 'color';
  placeholderLabel: string;
  placeholderType: BlueprintPlaceholder['type'];
  defaultValue: string | number | boolean;
  required: boolean;
}

interface ExposeParametersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  groupNode: GroupNode;
  onConfirm: (params: ExposedParam[]) => void;
}

// ── Attribute options per child type ───────────────────────────────────

interface AttributeOption {
  key: ExposedParam['attribute'];
  label: string;
  type: BlueprintPlaceholder['type'];
  /** Function to extract current value from the child */
  getValue: (child: GroupNode['children'][number]) => string | number | boolean;
}

const ATTRIBUTE_OPTIONS: AttributeOption[] = [
  { key: 'label', label: 'Label', type: 'string', getValue: (c) => c.label || c.id },
  { key: 'bind', label: 'Bind', type: 'string', getValue: (c) => c.bind?.target || '' },
  { key: 'variant', label: 'Variant', type: 'string', getValue: (c) => c.style?.variant || '' },
  { key: 'min', label: 'Min', type: 'number', getValue: (c) => c.bind?.min ?? 0 },
  { key: 'max', label: 'Max', type: 'number', getValue: (c) => c.bind?.max ?? 1 },
  { key: 'color', label: 'Color', type: 'string', getValue: (c) => c.style?.color || '' },
];

// ── Component ──────────────────────────────────────────────────────────

export default function ExposeParametersDialog({
  isOpen,
  onClose,
  groupNode,
  onConfirm,
}: ExposeParametersDialogProps) {
  // State: which (childId, attribute) pairs are selected
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // State: per-param required toggle
  const [required, setRequired] = useState<Set<string>>(new Set());

  const toggleParam = (childId: string, attrKey: string) => {
    const key = `${childId}::${attrKey}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleRequired = (key: string) => {
    setRequired((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleConfirm = () => {
    const params: ExposedParam[] = [];
    for (const child of groupNode.children) {
      for (const attr of ATTRIBUTE_OPTIONS) {
        const key = `${child.id}::${attr.key}`;
        if (selected.has(key)) {
          params.push({
            childId: child.id,
            childLabel: child.label || child.id,
            childType: child.type,
            attribute: attr.key,
            placeholderLabel: `${child.label || child.id} ${attr.label}`,
            placeholderType: attr.type,
            defaultValue: attr.getValue(child),
            required: required.has(key),
          });
        }
      }
    }
    onConfirm(params);
  };

  const hasSelection = selected.size > 0;

  const focusTrapRef = useFocusTrap(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Expose parameters as placeholders"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-lg wb-surface border wb-outline shadow-2xl rounded-xs overflow-hidden"
          >
            {/* Header */}
            <div className="p-3 border-b wb-outline wb-surface-subtle flex items-center justify-between">
              <div>
                <h3 className="text-[11px] font-black uppercase tracking-widest wb-text flex items-center gap-2">
                  <Plus className="w-3 h-3 text-primary" />
                  Expose Parameters
                </h3>
                <p className="text-[7px] font-mono wb-text-muted opacity-60 mt-0.5">
                  {groupNode.label} &middot; {groupNode.children.length} child
                  {groupNode.children.length !== 1 ? 'ren' : ''}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close parameters" title="Close parameters" className="p-1 rounded-xs wb-text-muted hover:wb-text hover:bg-white/5 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-3 max-h-72 overflow-y-auto space-y-2 custom-scrollbar">
              {groupNode.children.length === 0 ? (
                <p className="text-[9px] wb-text-muted opacity-40 text-center py-4 uppercase tracking-widest">
                  No children to expose
                </p>
              ) : (
                groupNode.children.map((child) => (
                  <div
                    key={child.id}
                    className="border border-white/5 rounded-xs bg-black/20 overflow-hidden"
                  >
                    {/* Child header */}
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-white/[0.02]">
                      <span className="text-[7px] font-mono text-cyan-400/60 uppercase w-14 shrink-0">
                        {child.type}
                      </span>
                      <span className="text-[8px] font-bold wb-text flex-1 truncate">
                        {child.label || child.id}
                      </span>
                      <span className="text-[6px] font-mono wb-text-muted opacity-30">
                        {child.id.slice(0, 12)}
                      </span>
                    </div>

                    {/* Attribute checkboxes */}
                    <div className="p-1.5 grid grid-cols-2 gap-1">
                      {ATTRIBUTE_OPTIONS.map((attr) => {
                        const key = `${child.id}::${attr.key}`;
                        const isSelected = selected.has(key);
                        const currentValue = attr.getValue(child);
                        const hasValue = currentValue !== '' && currentValue !== 0;

                        return (
                          <label
                            key={key}
                            className={`flex items-center gap-1.5 px-1.5 py-1 rounded-xs cursor-pointer transition-all text-[7px] font-bold uppercase tracking-wider ${
                              isSelected
                                ? 'bg-primary/10 border border-primary/30 text-primary'
                                : 'hover:bg-white/5 border border-transparent wb-text-muted'
                            } ${!hasValue && attr.key !== 'label' ? 'opacity-30 pointer-events-none' : ''}`}
                          >
                            <input
                              type="checkbox"
                              aria-label={attr.label}
                              checked={isSelected}
                              onChange={() => toggleParam(child.id, attr.key)}
                              className="w-2.5 h-2.5 accent-primary rounded-xs"
                              disabled={!hasValue && attr.key !== 'label'}
                            />
                            <span className="flex-1">{attr.label}</span>
                            {isSelected && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleRequired(key);
                                }}
                                aria-label={required.has(key) ? 'Mark as optional' : 'Mark as required'}
                                className={`text-[6px] font-black px-1 py-0.5 rounded-xs border transition-all ${
                                  required.has(key)
                                    ? 'border-red-400/40 text-red-400 bg-red-400/10'
                                    : 'border-white/10 text-white/30 hover:text-white/60'
                                }`}
                                title={required.has(key) ? 'Required' : 'Optional'}
                              >
                                {required.has(key) ? 'REQ' : 'OPT'}
                              </button>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t wb-outline wb-surface-subtle flex items-center justify-between">
              <span className="text-[7px] font-mono wb-text-muted opacity-50">
                {hasSelection
                  ? `${selected.size} parameter${selected.size !== 1 ? 's' : ''} exposed`
                  : 'Select which attributes to expose as placeholders'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  aria-label="Cancel parameter selection"
                  className="px-3 py-1.5 rounded-xs border wb-outline text-[7px] font-black uppercase tracking-widest wb-text-muted hover:wb-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!hasSelection}
                  aria-label={`Save ${selected.size} exposed parameter${selected.size !== 1 ? 's' : ''}`}
                  className={`px-3 py-1.5 rounded-xs text-[7px] font-black uppercase tracking-widest border transition-all flex items-center gap-1.5 ${
                    hasSelection
                      ? 'bg-primary/20 border-primary/40 text-primary hover:bg-primary/30'
                      : 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-2.5 h-2.5" />
                  Save {hasSelection ? `(${selected.size})` : ''}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
