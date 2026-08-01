'use client';

/**
 * @purpose Gestiona y renderiza configuraciones de tipografía como fuente, tamaño, alineación y espaciado según datos del manifesto y capacidades del usuario.
 * @purpose_en Manages and renders typography settings such as font, size, alignment, and spacing based on manifest data and user capabilities.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:ank284
 * @lastUpdated 2026-06-20T09:18:01.735Z
 */

import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import type { OMEGA_Manifest, OmegaStyleNode } from '@/types/manifest';

interface TypographyGovernanceProps {
  values: Partial<OmegaStyleNode>;
  capabilities: string[];
  manifest: OMEGA_Manifest;
  onChange: (updates: Partial<OmegaStyleNode>) => void;
  type?: string;
}

export default function TypographyGovernance({ values, capabilities, manifest, onChange, type }: TypographyGovernanceProps) {
  const TYPO_CAPS = ['font', 'fontSize', 'alignment', 'spacing'];
  const activeCaps = TYPO_CAPS.filter(cap => capabilities.includes(cap));

  if (activeCaps.length === 0) return null;

  const isContainer = type === 'container';

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {capabilities.includes('font') && (
            <div className="space-y-1">
              <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest ml-1">{isContainer ? 'Label Font' : 'Font Pointer'}</label>
              <select 
                value={values.font || ''}
                onChange={(e) => onChange({ font: e.target.value })}
                className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-bold wb-text outline-none focus:border-accent/40"
              >
                <option value="">-- DEFAULT --</option>
                {(manifest.ui.typography?.definitions || []).map(d => (
                  <option key={d.id} value={d.family}>{d.label} ({d.family})</option>
                ))}
              </select>
            </div>
          )}
          {capabilities.includes('fontSize') && (
            <div className="space-y-1">
              <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest ml-1">{isContainer ? 'Label Size' : 'Font Size (PX)'}</label>
              <input 
                type="number" min="4" max="120"
                value={values.fontSize !== undefined ? values.fontSize : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({ fontSize: val === '' ? undefined : parseInt(val) });
                }}
                className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-mono wb-text outline-none focus:border-accent/40 text-center"
                placeholder="Inherit"
                aria-label="Font size in pixels"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {capabilities.includes('alignment') && (
            <div className="space-y-1">
              <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest ml-1 text-center block">{isContainer ? 'Label Alignment' : 'Alignment'}</label>
              <div className="flex wb-surface-inset border wb-outline rounded-xs overflow-hidden">
                {[
                  { id: 'left', icon: AlignLeft },
                  { id: 'center', icon: AlignCenter },
                  { id: 'right', icon: AlignRight }
                ].map(align => (
                  <button 
                    key={align.id}
                    onClick={() => onChange({ alignment: align.id as NonNullable<OmegaStyleNode['alignment']> })}
                    aria-label={`Align ${align.id}`}
                    className={`flex-1 py-1.5 flex items-center justify-center transition-all ${values.alignment === align.id ? 'bg-primary text-black' : 'wb-text-muted hover:bg-white/5'}`}
                  >
                    <align.icon className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {capabilities.includes('spacing') && (
            <div className="space-y-1">
              <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest ml-1 text-center block">Character Spacing</label>
              <input 
                type="number" step="0.1"
                value={values.spacing !== undefined ? values.spacing : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({ spacing: val === '' ? undefined : parseFloat(val) });
                }}
                className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-mono wb-text outline-none focus:border-accent/40 text-center"
                placeholder="0.0"
                aria-label="Character spacing"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
