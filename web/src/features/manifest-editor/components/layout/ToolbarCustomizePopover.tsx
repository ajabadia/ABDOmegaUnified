'use client';

/**
 * @purpose Renderiza un popover para personalizar el panel de herramientas del editor de manifesto OMEGA, permitiendo arrastrar y soltar, mostrar/hacer invisible y resetear opciones.
 * @purpose_en Renders a popover for customizing the toolbar in the OMEGA manifest editor, allowing drag-to-reorder, visibility toggle, and reset options.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:1kbk6i4
 * @lastUpdated 2026-06-20T09:40:41.723Z
 */

import { useState, useRef, useEffect } from 'react';
import { GripVertical, Eye, EyeOff, RotateCcw } from 'lucide-react';
import {
  TOOLBAR_BUTTONS,
  type ToolbarConfig,
} from '@/features/manifest-editor/constants/toolbarDefinitions';

interface ToolbarCustomizePopoverProps {
  config: ToolbarConfig;
  moveButton: (fromIndex: number, toIndex: number) => void;
  toggleVisibility: (id: string) => void;
  resetToDefault: () => void;
  onClose: () => void;
}

export default function ToolbarCustomizePopover({
  config,
  moveButton,
  toggleVisibility,
  resetToDefault,
  onClose,
}: ToolbarCustomizePopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Close on click outside / Escape
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', clickHandler);
      document.addEventListener('keydown', escapeHandler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', clickHandler);
      document.removeEventListener('keydown', escapeHandler);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed left-16 top-20 z-[100] w-[260px] wb-surface border wb-outline rounded-xs shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b wb-outline">
        <span className="text-[8px] font-black uppercase tracking-[0.15em] wb-text">
          Customize Toolbar
        </span>
        <button
          onClick={resetToDefault}
          className="flex items-center gap-1 text-[7px] font-bold uppercase tracking-wider wb-text-muted hover:text-primary transition-colors"
          title="Reset to default"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          Reset
        </button>
      </div>

      {/* List */}
      <div className="max-h-[300px] overflow-y-auto py-1">
        {config.order.map((id, idx) => {
          const def = TOOLBAR_BUTTONS.find(b => b.id === id);
          if (!def || def.conditional) return null;
          const hidden = config.hidden.includes(id);
          const Icon = def.icon;

          return (
            <div
              key={id}
              draggable
              onDragStart={() => setDragIndex(idx)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(idx);
              }}
              onDragEnd={() => {
                if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
                  moveButton(dragIndex, dragOverIndex);
                }
                setDragIndex(null);
                setDragOverIndex(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 transition-all ${
                dragOverIndex === idx && dragIndex !== idx
                  ? 'border-t border-primary/40'
                  : ''
              } ${hidden ? 'opacity-40' : ''}`}
            >
              {/* Drag handle */}
              <GripVertical className="w-2.5 h-2.5 shrink-0 wb-text-muted cursor-grab active:cursor-grabbing" />

              {/* Icon */}
              <span className="shrink-0 wb-text-muted">
                <Icon className="w-3 h-3" />
              </span>

              {/* Label */}
              <span className="flex-1 text-[8px] font-bold uppercase tracking-wider wb-text truncate">
                {def.label}
              </span>

              {/* Visibility toggle */}
              <button
                onClick={() => toggleVisibility(id)}
                className="p-0.5 rounded-xs hover:bg-white/10 transition-colors"
                title={hidden ? 'Show button' : 'Hide button'}
                aria-label={hidden ? 'Show button' : 'Hide button'}
              >
                {hidden ? (
                  <EyeOff className="w-2.5 h-2.5 wb-text-muted" />
                ) : (
                  <Eye className="w-2.5 h-2.5 text-primary/60" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t wb-outline flex items-center justify-between">
        <span className="text-[6px] font-mono wb-text-muted uppercase tracking-wider">
          Drag to reorder
        </span>
        <span className="text-[6px] font-mono wb-text-muted">
          {config.order.length - config.hidden.length} / {config.order.length} visible
        </span>
      </div>
    </div>
  );
}
