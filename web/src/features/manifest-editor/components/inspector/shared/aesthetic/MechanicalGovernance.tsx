'use client';

/**
 * @purpose Gestiona propiedades mecánicas y superficiales en un editor de manifesto OMEGA utilizando un selector de colores inteligente y campos de entrada para texturas.
 * @purpose_en Manages mechanical and surface properties in an OMEGA manifest editor using a smart color picker and input fields for texture.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:2h1jwk
 * @lastUpdated 2026-06-20T09:17:35.844Z
 */

import { CircleDot, Sun, Layers, Shield, Square } from 'lucide-react';
import type { OMEGA_Manifest, OmegaStyleNode } from '@/omega-ui-core/types/manifest';
import SmartColorPicker from '../SmartColorPicker';

interface MechanicalGovernanceProps {
  type: string;
  values: Partial<OmegaStyleNode>;
  capabilities: string[];
  manifest: OMEGA_Manifest;
  onChange: (updates: Partial<OmegaStyleNode>) => void;
}

const MATERIALS = [
  { id: 'plastic', label: 'ABS Plastic' },
  { id: 'metal', label: 'Chrome Steel' },
  { id: 'gold', label: 'Gold Plated' },
  { id: 'wood', label: 'Industrial Wood' },
];

export default function MechanicalGovernance({ type, values, capabilities, manifest, onChange }: MechanicalGovernanceProps) {
  // Domain Ownership: Mechanical & Surface
  const MECH_CAPS = ['rounding', 'borderWidth', 'thickness', 'padding', 'height', 'opacity', 'blur', 'zIndex', 'tiling', 'material', 'texture', 'color', 'indicatorColor'];
  const activeCaps = MECH_CAPS.filter(cap => capabilities.includes(cap));

  if (activeCaps.length === 0) return null;

  const isContainer = type === 'container';

  return (
    <div className="space-y-4">
      {/* 1. SURFACE & BORDER COLORS (Contextual) */}
      {(capabilities.includes('color') || capabilities.includes('indicatorColor')) && (
        <div className="space-y-3 p-3 wb-surface-subtle border wb-outline rounded-xs">
           <div className="space-y-3">
              {capabilities.includes('color') && (
                <SmartColorPicker 
                  label={isContainer ? "Background Surface" : "Primary Body Tone"}
                  value={values.color || ''}
                  onChange={(val) => onChange({ color: val })}
                  manifest={manifest}
                />
              )}
              {capabilities.includes('indicatorColor') && (
                <SmartColorPicker 
                  label={isContainer ? "Border / Line Color" : "Indicator / Marker"}
                  value={values.indicatorColor || ''}
                  onChange={(val) => onChange({ indicatorColor: val })}
                  manifest={manifest}
                />
              )}
           </div>
        </div>
      )}

      {/* Material selection if supported */}
      {capabilities.includes('material') && (
        <div className="space-y-2 p-3 wb-surface-subtle border wb-outline rounded-xs">
          <label className="text-[7px] font-black uppercase wb-text-muted tracking-widest flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-accent" />
            Socket / Mechanical Material
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {MATERIALS.map(m => (
              <button
                key={m.id}
                onClick={() => onChange({ variant: m.id })}
                className={`py-1.5 border rounded-xs text-[7px] font-black uppercase transition-all ${values.variant === m.id ? 'border-primary bg-primary/20 text-primary' : 'wb-surface-inset border-outline/10 hover:border-outline/40 wb-text-muted'}`}
              >
                {m.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {capabilities.includes('rounding') && (
          <div className="col-span-2 space-y-3 p-3 wb-surface-subtle border wb-outline rounded-xs">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[7px] font-black uppercase wb-text-muted tracking-widest flex items-center gap-1.5">
                <Square className="w-3 h-3 text-accent" />
                Structural Rounding
              </label>
              <div className="flex items-center gap-2">
                 <span className="text-[7px] font-mono text-accent">{values.rounding || 0}px</span>
                 <button 
                   onClick={() => onChange({ useSpecificRounding: !values.useSpecificRounding })}
                   className={`px-1.5 py-0.5 rounded-[2px] border text-[5px] font-black uppercase transition-all ${values.useSpecificRounding ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-black/20 border-outline/10 text-foreground/40'}`}
                 >
                   {values.useSpecificRounding ? 'Individual Corners' : 'Uniform'}
                 </button>
              </div>
            </div>

            {!values.useSpecificRounding ? (
              <input 
                type="range" min="0" max="100" step="1"
                value={values.rounding ?? 0}
                onChange={(e) => onChange({ rounding: parseInt(e.target.value) })}
                className="w-full h-1 bg-accent/10 rounded-full appearance-none cursor-pointer accent-accent"
                aria-label={values.useSpecificRounding ? 'Uniform rounding' : 'Structural rounding'}
              />
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                 {[
                   { key: 'roundingTL' as keyof OmegaStyleNode, label: 'Top-Left' },
                   { key: 'roundingTR' as keyof OmegaStyleNode, label: 'Top-Right' },
                   { key: 'roundingBL' as keyof OmegaStyleNode, label: 'Bottom-Left' },
                   { key: 'roundingBR' as keyof OmegaStyleNode, label: 'Bottom-Right' }
                 ].map(corner => (
                   <div key={corner.key} className="space-y-1">
                      <div className="flex justify-between items-center px-0.5">
                         <span className="text-[5px] font-black uppercase wb-text-muted italic">{corner.label}</span>
                         <span className="text-[6px] font-mono text-primary">{(values[corner.key] as number) ?? values.rounding ?? 0}px</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" step="1"
                        value={(values[corner.key] as number) ?? values.rounding ?? 0}
                        onChange={(e) => onChange({ [corner.key]: parseInt(e.target.value) })}
                        className="w-full h-1 bg-primary/10 rounded-full appearance-none cursor-pointer accent-primary"
                        aria-label={`${corner.label} rounding`}
                      />
                   </div>
                 ))}
              </div>
            )}
          </div>
        )}

        {capabilities.includes('borderWidth') && (
          <div className="space-y-1.5 p-2.5 wb-surface-subtle border wb-outline rounded-xs">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-accent" />
                Border Width
              </label>
              <span className="text-[7px] font-mono text-accent">{values.borderWidth || 0}px</span>
            </div>
            <input 
              type="range" min="0" max="10" step="1"
              value={values.borderWidth ?? 0}
              onChange={(e) => onChange({ borderWidth: parseInt(e.target.value) })}
              className="w-full h-1 bg-accent/10 rounded-full appearance-none cursor-pointer accent-accent"
              aria-label="Border width in pixels"
            />
          </div>
        )}

        {capabilities.includes('thickness') && (
          <div className="space-y-1.5 p-2.5 wb-surface-subtle border wb-outline rounded-xs">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest flex items-center gap-1">
                <CircleDot className="w-2.5 h-2.5 text-accent" />
                Line Thickness
              </label>
              <span className="text-[7px] font-mono text-accent">{values.thickness || 1}px</span>
            </div>
            <input 
              type="range" min="1" max="20" step="1"
              value={values.thickness ?? 1}
              onChange={(e) => onChange({ thickness: parseInt(e.target.value) })}
              className="w-full h-1 bg-accent/10 rounded-full appearance-none cursor-pointer accent-accent"
              aria-label="Line thickness in pixels"
            />
          </div>
        )}

        {capabilities.includes('height') && (
          <div className="space-y-1.5 p-2.5 wb-surface-subtle border wb-outline rounded-xs">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest flex items-center gap-1">
                <Sun className="w-2.5 h-2.5 text-accent" />
                Height
              </label>
              <span className="text-[7px] font-mono text-accent">{(values.height || 1.0).toFixed(1)}x</span>
            </div>
            <input 
              type="range" min="0" max="2" step="0.1"
              value={values.height ?? 1.0}
              onChange={(e) => onChange({ height: parseFloat(e.target.value) })}
              className="w-full h-1 bg-accent/10 rounded-full appearance-none cursor-pointer accent-accent"
              aria-label="Height multiplier"
            />
          </div>
        )}



        {capabilities.includes('blur') && (
          <div className="space-y-1.5 p-2.5 wb-surface-subtle border wb-outline rounded-xs">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest flex items-center gap-1">
                <CircleDot className="w-2.5 h-2.5 text-accent animate-pulse" />
                Glass Blur
              </label>
              <span className="text-[7px] font-mono text-accent">{(values.blur || 0)}px</span>
            </div>
            <input 
              type="range" min="0" max="24" step="1"
              value={values.blur ?? 0}
              onChange={(e) => onChange({ blur: parseInt(e.target.value) })}
              className="w-full h-1 bg-accent/10 rounded-full appearance-none cursor-pointer accent-accent"
              aria-label="Glass blur in pixels"
            />
          </div>
        )}
        
        {capabilities.includes('zIndex') && (
          <div className="space-y-1.5 p-2.5 wb-surface-subtle border wb-outline rounded-xs">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest flex items-center gap-1">
                <Layers className="w-2.5 h-2.5 text-accent" />
                Layer Order
              </label>
              <span className="text-[7px] font-mono text-accent">L{(values.zIndex || 1)}</span>
            </div>
            <input 
              type="range" min="1" max="50" step="1"
              value={values.zIndex ?? 1}
              onChange={(e) => onChange({ zIndex: parseInt(e.target.value) })}
              className="w-full h-1 bg-accent/10 rounded-full appearance-none cursor-pointer accent-accent"
              aria-label="Layer order (z-index)"
            />
          </div>
        )}

        {capabilities.includes('padding') && (
          <div className="space-y-1.5 p-2.5 wb-surface-subtle border wb-outline rounded-xs">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest flex items-center gap-1">
                <CircleDot className="w-2.5 h-2.5 text-accent" />
                Padding
              </label>
              <span className="text-[7px] font-mono text-accent">{values.padding || 0}px</span>
            </div>
            <input 
              type="range" min="0" max="40" step="1"
              value={values.padding ?? 0}
              onChange={(e) => onChange({ padding: parseInt(e.target.value) })}
              className="w-full h-1 bg-accent/10 rounded-full appearance-none cursor-pointer accent-accent"
              aria-label="Padding in pixels"
            />
          </div>
        )}

        {capabilities.includes('tiling') && (
          <div className="space-y-1.5 p-2.5 wb-surface-subtle border wb-outline rounded-xs">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest flex items-center gap-1">
                <Square className="w-2.5 h-2.5 text-accent" />
                Asset Tiling
              </label>
              <span className="text-[7px] font-mono text-accent">{values.tiling || 1}x</span>
            </div>
            <input 
              type="range" min="1" max="10" step="1"
              value={values.tiling ?? 1}
              onChange={(e) => onChange({ tiling: parseInt(e.target.value) })}
              className="w-full h-1 bg-accent/10 rounded-full appearance-none cursor-pointer accent-accent"
              aria-label="Asset tiling multiplier"
            />
          </div>
        )}
      </div>

      {capabilities.includes('texture') && (
        <div className="space-y-1.5 p-2.5 wb-surface-subtle border wb-outline rounded-xs">
          <div className="flex justify-between items-center px-0.5">
            <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest flex items-center gap-1">
              <Layers className="w-2.5 h-2.5 text-accent" />
              Surface Texture
            </label>
          </div>
          <input 
            type="text"
            value={values.texture || ''}
            onChange={(e) => onChange({ texture: e.target.value })}
            className="w-full wb-surface-inset border border-outline/10 rounded-xs px-2 py-1 text-[8px] font-mono text-primary outline-none"
            placeholder="e.g. noise, carbon, grain"
            aria-label="Surface texture"
          />
        </div>
      )}
    </div>
  );
}
