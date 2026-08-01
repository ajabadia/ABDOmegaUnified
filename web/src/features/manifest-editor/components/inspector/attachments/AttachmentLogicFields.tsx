'use client';

/**
 * @purpose Renderiza campos para editar propiedades de adjuntos en el editor de manifesto OMEGA, incluyendo opciones de vinculación dinámica y superposiciones de texto/literal según tipo de adjunto.
 * @purpose_en Renders fields for editing attachment properties in the OMEGA manifest editor, including dynamic binding options and text/literal overrides based on attachment type.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1rhwu5d
 * @lastUpdated 2026-06-17T22:32:13.839Z
 */

import { Link2, Type } from 'lucide-react';

import type { Attachment } from '@/types/manifest';

interface AttachmentLogicFieldsProps {
  att: Attachment;
  availableBinds: string[];
  onUpdate: (updates: Partial<Attachment>) => void;
}

export default function AttachmentLogicFields({ att, availableBinds, onUpdate }: AttachmentLogicFieldsProps) {
  const isLabel = att.type === 'label';
  const isDisplay = att.type === 'display';
  const isLed = att.type === 'led';
  const isStepper = att.type === 'stepper';
  const isCore = att.isCore === true;

  return (
    <div className="space-y-4">
      {/* DYNAMIC BINDING */}
      {(isDisplay || isLed || isStepper || isCore) && (
        <div className="space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
          <label className="text-[7px] wb-text-muted uppercase font-bold flex items-center gap-1 transition-colors duration-500">
            <Link2 className="w-2 h-2 text-accent" />
            <span>Telemetry Source (Signal Bind)</span>
          </label>
          <select 
            value={att.bind || ''} 
            onChange={(e) => onUpdate({ bind: e.target.value })}
            className="w-full wb-surface-inset border border-accent/20 rounded-xs p-1.5 text-[9px] wb-accent outline-none font-mono transition-colors duration-500"
          >
            <option value="">-- AUTO (Binds to Parent) --</option>
            {availableBinds.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      )}

      {/* TEXT/LITERAL OVERRIDE */}
      {(isLabel || isStepper) && (
        <div className="space-y-1 animate-in fade-in slide-in-from-left-1 duration-200">
          <label className="text-[7px] wb-text-muted uppercase font-bold flex items-center gap-1 transition-colors duration-500">
            <Type className="w-2 h-2" />
            <span>{isStepper ? 'Button Literal' : 'Static Content'}</span>
          </label>
          <input 
            type="text" 
            aria-label={isStepper ? 'Button literal text' : 'Static content text'}
            value={att.text || ''} 
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder={isStepper ? 'e.g. +, -, <, >' : 'Label text...'}
            className="w-full wb-surface-inset border wb-outline rounded-xs p-1.5 text-[9px] wb-text outline-none focus:border-primary/40 transition-all transition-colors duration-500 font-bold"
          />
        </div>
      )}
    </div>
  );
}
