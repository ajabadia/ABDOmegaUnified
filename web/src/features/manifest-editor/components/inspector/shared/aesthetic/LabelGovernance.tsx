'use client';

/**
 * @purpose Gestiona y renderiza componentes UI para estilizar propiedades de etiquetas como posición, tamaño, color de fondo y alineación en el editor de manifesto OMEGA.
 * @purpose_en Manages and renders UI components for styling label properties such as position, size, background color, and padding in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:yb4p1u
 * @lastUpdated 2026-06-20T09:17:31.084Z
 */

import { Move, Maximize, Box } from 'lucide-react';
import type { OMEGA_Manifest, OmegaStyleNode } from '@/omega-ui-core/types/manifest';
import SmartColorPicker from '../SmartColorPicker';

interface LabelGovernanceProps {
  values: Partial<OmegaStyleNode>;
  capabilities: string[];
  manifest: OMEGA_Manifest;
  onChange: (updates: Partial<OmegaStyleNode>) => void;
}

export default function LabelGovernance({ values, capabilities, manifest, onChange }: LabelGovernanceProps) {
  const LABEL_CAPS = ['labelX', 'labelY', 'labelW', 'labelH', 'labelBg', 'labelRounding', 'labelPadding'];
  const activeCaps = LABEL_CAPS.filter(cap => capabilities.includes(cap));

  if (activeCaps.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {/* SPATIALITY (X / Y) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest ml-1 flex items-center gap-1">
               <Move className="w-2 h-2" /> Label X Offset
            </label>
            <input 
              type="number"
              value={values.labelX || 0}
              onChange={(e) => onChange({ labelX: parseInt(e.target.value) })}
              className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-mono wb-text outline-none focus:border-accent/40 text-center"
              aria-label="Label X offset"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest ml-1 flex items-center gap-1">
               <Move className="w-2 h-2" /> Label Y Offset
            </label>
            <input 
              type="number"
              value={values.labelY || 0}
              onChange={(e) => onChange({ labelY: parseInt(e.target.value) })}
              className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-mono wb-text outline-none focus:border-accent/40 text-center"
              aria-label="Label Y offset"
            />
          </div>
        </div>

        {/* DIMENSIONS (W / H) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest ml-1 flex items-center gap-1">
               <Maximize className="w-2 h-2" /> Explicit Width
            </label>
            <input 
              type="number"
              value={values.labelWidth || 0}
              onChange={(e) => onChange({ labelWidth: parseInt(e.target.value) })}
              className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-mono wb-text outline-none focus:border-accent/40 text-center"
              placeholder="Auto"
              aria-label="Label explicit width"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest ml-1 flex items-center gap-1">
               <Maximize className="w-2 h-2" /> Explicit Height
            </label>
            <input 
              type="number"
              value={values.labelHeight || 0}
              onChange={(e) => onChange({ labelHeight: parseInt(e.target.value) })}
              className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-mono wb-text outline-none focus:border-accent/40 text-center"
              placeholder="Auto"
              aria-label="Label explicit height"
            />
          </div>
        </div>

        {/* SURFACE COLOR (BACKGROUND) */}
        {capabilities.includes('labelBg') && (
          <div className="pt-2 border-t wb-outline">
            <SmartColorPicker 
              label="Label Background / Plate Tint"
              value={values.labelBg || ''}
              onChange={(val) => onChange({ labelBg: val })}
              manifest={manifest}
            />
          </div>
        )}

        {/* MECHANICALS (ROUNDING & PADDING) */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t wb-outline">
          <div className="space-y-1">
            <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest ml-1 flex items-center gap-1">
               <Box className="w-2 h-2" /> Rounding
            </label>
            <input 
              type="number" min="0" max="40"
              value={values.labelRounding || 0}
              onChange={(e) => onChange({ labelRounding: parseInt(e.target.value) })}
              className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-mono wb-text outline-none focus:border-accent/40 text-center"
              aria-label="Label rounding in pixels"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest ml-1 flex items-center gap-1">
               <Box className="w-2 h-2" /> Padding
            </label>
            <input 
              type="number" min="0" max="40"
              value={values.labelPadding || 4}
              onChange={(e) => onChange({ labelPadding: parseInt(e.target.value) })}
              className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-mono wb-text outline-none focus:border-accent/40 text-center"
              aria-label="Label padding in pixels"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
