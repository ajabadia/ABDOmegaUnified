'use client';

/**
 * @purpose Renderiza un componente para ajustar los desplazamientos verticales y horizontales de las conexiones en el editor de manifesto OMEGA.
 * @purpose_en Renders a component for adjusting vertical and horizontal offsets of attachments in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:1a2r7zg
 * @lastUpdated 2026-06-17T22:32:22.042Z
 */

import { Move } from 'lucide-react';

import type { Attachment } from '@/types/manifest';

interface AttachmentPrecisionOffsetsProps {
  offsetX: number | undefined;
  offsetY: number | undefined;
  onUpdate: (updates: Partial<Attachment>) => void;
}

export default function AttachmentPrecisionOffsets({ offsetX, offsetY, onUpdate }: AttachmentPrecisionOffsetsProps) {
  return (
    <div className="p-2 wb-surface-inset border wb-outline rounded-xs space-y-3 transition-colors duration-500 shadow-sm">
      <label className="text-[7px] wb-text-muted uppercase font-bold flex items-center gap-1 transition-colors duration-500">
        <Move className="w-2 h-2" />
        <span>Industrial Precision Offset</span>
      </label>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex justify-between items-center px-1">
            <span className="text-[6px] wb-text-muted uppercase font-black tracking-widest transition-colors duration-500">Vertical (Y)</span>
            <span className="text-[8px] wb-text font-mono font-bold transition-colors duration-500">{offsetY || 0}px</span>
          </div>
          <input 
            type="range" min="-64" max="64" 
            value={offsetY || 0} 
            onChange={(e) => onUpdate({ offsetY: parseInt(e.target.value) })}
            className="w-full accent-primary h-1 wb-surface-inset rounded-full appearance-none cursor-pointer transition-colors"
            aria-label="Vertical offset in pixels (Y)"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center px-1">
            <span className="text-[6px] wb-text-muted uppercase font-black tracking-widest transition-colors duration-500">Horizontal (X)</span>
            <span className="text-[8px] wb-text font-mono font-bold transition-colors duration-500">{offsetX || 0}px</span>
          </div>
          <input 
            type="range" min="-64" max="64" 
            value={offsetX || 0} 
            onChange={(e) => onUpdate({ offsetX: parseInt(e.target.value) })}
            className="w-full accent-primary h-1 wb-surface-inset rounded-full appearance-none cursor-pointer transition-colors"
            aria-label="Horizontal offset in pixels (X)"
          />
        </div>
      </div>
    </div>
  );
}
