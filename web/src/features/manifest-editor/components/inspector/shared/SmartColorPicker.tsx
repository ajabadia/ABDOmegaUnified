'use client';

/**
 * @purpose Gestiona un componente de seleccionador de colores para seleccionar colores de una paleta y ajustar transparencia en el contexto de un editor de manifestos OMEGA.
 * @purpose_en Manages a color picker component for selecting colors from a palette and adjusting transparency in the context of an OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:1qj97jj
 * @lastUpdated 2026-06-20T09:18:22.766Z
 */

import React from 'react';
import { Palette, ChevronDown, ChevronUp } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { ColorResolver } from '@/omega-ui-core/utils/ColorResolver';
import { useRackTokens } from '@/features/manifest-editor/hooks/useRackTokens';

interface SmartColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  manifest: OMEGA_Manifest;
}

interface DNAToken {
  label: string;
  hex: string;
  class: string;
}

export default function SmartColorPicker({ 
  label, 
  value, 
  onChange, 
  manifest
}: SmartColorPickerProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { dna: DNA_MAP } = useRackTokens(manifest) as { dna: Record<string, DNAToken> };

  const SYSTEM_COLORS = [
    { id: '#ffffff', label: 'Pure White', hex: '#ffffff' },
    { id: '#000000', label: 'Pure Black', hex: '#000000' }
  ];

  const getAlpha = (val: string) => {
    if (!val) return 1;
    if (val.includes('/')) return parseFloat(val.split('/')[1]) || 1;
    const resolved = DNA_MAP[val]?.hex || val;
    if (resolved === 'transparent') return 0;
    if (resolved.startsWith('#') && resolved.length === 9) return parseInt(resolved.slice(7, 9), 16) / 255;
    if (resolved.startsWith('rgba')) {
      const match = resolved.match(/rgba?\(.*,\s*([\d.]+)\)/);
      return match ? parseFloat(match[1]) : 1;
    }
    return 1;
  };

  const applyAlpha = (base: string, alpha: number) => {
    const resolvedBase = DNA_MAP[base]?.hex || base;
    const defaultAlpha = getAlpha(resolvedBase);
    if (Math.abs(alpha - defaultAlpha) < 0.01) return base.split('/')[0];
    if (base === 'transparent') return `transparent/${alpha.toFixed(2)}`;
    return `${base.split('/')[0]}/${alpha.toFixed(2)}`;
  };

  const currentAlpha = getAlpha(value);
  const resolvedFullColor = ColorResolver.resolve(value, manifest);

  const resolvePreview = (val: string) => {
    const base = val.split('/')[0];
    const resolved = DNA_MAP[base]?.hex || (base === 'transparent' ? '#000000' : base);
    if (resolved.startsWith('rgba')) {
      const match = resolved.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        const hex = (c: number) => c.toString(16).padStart(2, '0');
        return `#${hex(parseInt(match[1]))}${hex(parseInt(match[2]))}${hex(parseInt(match[3]))}`;
      }
    }
    return resolved.slice(0, 7); 
  };

  const handleAlphaChange = (newAlpha: number) => {
    const base = value.split('/')[0];
    onChange(applyAlpha(base, newAlpha));
  };

  return (
    <div className="wb-surface-subtle border wb-outline rounded-xs overflow-hidden transition-all duration-300">
      {/* COLLAPSIBLE HEADER */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex justify-between items-center p-2.5 cursor-pointer hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-2">
           <Palette className={`w-3 h-3 ${isExpanded ? 'text-accent' : 'text-accent/40'} transition-colors`} />
           <label className="text-[7px] font-black uppercase wb-text-muted tracking-[0.2em] group-hover:text-white transition-colors cursor-pointer">{label}</label>
        </div>
        
        <div className="flex items-center gap-3">
           {/* PERSISTENT COLOR PREVIEW */}
           <div className="flex items-center gap-2 bg-[#0c0c0d] border border-outline/10 rounded-xs px-2 py-1">
              <div 
                className="w-3 h-3 rounded-full border border-white/10 shadow-sm" 
                style={{ backgroundColor: resolvedFullColor }} 
              />
              <span className="text-[6px] font-mono text-accent/60 uppercase tracking-tighter">
                {value.length > 15 ? value.slice(0, 12) + '...' : value}
              </span>
           </div>
           {isExpanded ? (
             <ChevronUp className="w-3 h-3 text-accent/60 animate-in fade-in duration-300" />
           ) : (
             <ChevronDown className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
           )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 pt-0 space-y-3 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 gap-2 border-t border-outline/5 pt-3">
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-1">
              {/* SYSTEM COLORS FIRST (WHITE/BLACK) */}
              {SYSTEM_COLORS.map(sys => (
                <button
                  key={sys.id}
                  onClick={() => onChange(sys.id)}
                  aria-label={`Color: ${sys.label}`}
                  className={`group relative p-1.5 border rounded-xs transition-all flex flex-col items-center gap-1 ${
                    value === sys.id ? 'bg-primary/20 border-primary' : 'wb-surface-inset border-outline/5 hover:border-outline/30'
                  }`}
                  title={sys.label}
                >
                  <div className="w-3 h-3 rounded-full border border-outline/20" style={{ backgroundColor: sys.hex }} />
                  <span className="text-[5px] font-black uppercase text-center opacity-40 leading-none truncate w-full">Sys</span>
                </button>
              ))}

              {/* DNA TOKENS */}
              {Object.entries(DNA_MAP).map(([token, info]: [string, DNAToken]) => (
                <button
                  key={token}
                  onClick={() => onChange(token)}
                  aria-label={`DNA color: ${info.label}`}
                  className={`group relative p-1.5 border rounded-xs transition-all flex flex-col items-center gap-1 ${
                    value === token ? 'bg-primary/20 border-primary' : 'wb-surface-inset border-outline/5 hover:border-outline/30'
                  }`}
                  title={`DNA: ${info.label}`}
                >
                  <div className="w-3 h-3 rounded-full border border-outline/20 shadow-sm" style={{ backgroundColor: info.hex }} />
                  <span className="text-[5px] font-black uppercase text-center opacity-40 leading-none truncate w-full">{token}</span>
                </button>
              ))}

              {/* TRANSPARENT BUTTON */}
              <button 
                onClick={() => onChange('transparent')}
                aria-label="Color: transparent"
                className={`group relative p-1.5 border rounded-xs transition-all flex flex-col items-center gap-1 ${
                  value === 'transparent' ? 'bg-red-500/20 border-red-500' : 'wb-surface-inset border-outline/5 hover:border-red-500/30'
                }`}
                title="None (Transparent)"
              >
                <div className="w-3 h-3 rounded-full border border-red-500/20 relative flex items-center justify-center">
                   <div className="w-[1px] h-2 bg-red-500 rotate-45" />
                </div>
                <span className="text-[5px] font-black uppercase text-center opacity-40 leading-none truncate w-full">None</span>
              </button>
            </div>

            {/* ALPHA CONTROL */}
            <div className="pt-1 flex items-center gap-3">
               <div className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between items-center px-0.5">
                     <span className="text-[5px] font-black uppercase wb-text-muted italic">Alpha Channel</span>
                     <span className="text-[6px] font-mono text-accent">{Math.round(currentAlpha * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.01" value={currentAlpha}
                    onChange={(e) => handleAlphaChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-accent/10 rounded-full appearance-none cursor-pointer accent-accent"
                    aria-label={`${label} alpha slider`}
                  />
               </div>
               <div className="w-12">
                  <input 
                    type="number" min="0" max="100" value={Math.round(currentAlpha * 100)}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleAlphaChange(val === '' ? 1 : parseInt(val) / 100);
                    }}
                    className="w-full wb-surface-inset border wb-outline rounded-xs px-1 py-1 text-[8px] font-mono wb-text text-center outline-none focus:border-accent/40"
                    aria-label={`${label} alpha percentage`}
                  />
               </div>
            </div>

            {/* CUSTOM OVERRIDE */}
            <div className="flex gap-2 items-center pt-1 border-t border-outline/5">
              <div className="relative group">
                <input 
                  type="color" value={resolvePreview(value)}
                  onChange={(e) => onChange(applyAlpha(e.target.value, currentAlpha))}
                  className="w-10 h-6 rounded-xs border wb-outline bg-transparent cursor-pointer p-0.5 group-hover:border-accent/40 transition-colors"
                  aria-label={`${label} custom color`}
                />
              </div>
              <div className="flex-1 relative">
                <input 
                  type="text" value={value || ''}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="Inherited / Hex / Token"
                  className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-mono wb-text outline-none focus:border-accent/40"
                  aria-label={`${label} custom value`}
                />
                {DNA_MAP[value] && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[6px] font-black uppercase text-primary/60">Linked</span>
                )}
              </div>
            </div>
          </div>
          
          <p className="text-[5px] wb-text-muted font-bold uppercase italic tracking-tighter text-right">
            Era 7.2.3 Chromatic DNA Governance
          </p>
        </div>
      )}
    </div>
  );
}

