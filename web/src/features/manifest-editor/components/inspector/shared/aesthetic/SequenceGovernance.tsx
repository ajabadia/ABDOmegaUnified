'use client';

/**
 * @purpose Gestiona la configuración de gobierno y anatomía técnica para los objetos OmegaStyleNode en el editor de manifesto OMEGA.
 * @purpose_en Manages governance and technical anatomy configurations for OmegaStyleNode objects in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:1er0viw
 * @lastUpdated 2026-06-20T09:17:47.268Z
 */

import React from 'react';
import { Layers, RefreshCw, Lock, Unlock, ChevronDown, ChevronRight } from 'lucide-react';
import type { OmegaStyleNode } from '@/types/manifest';

interface SequenceGovernanceProps {
  values: Partial<OmegaStyleNode>;
  onChange: (updates: Partial<OmegaStyleNode>) => void;
}

export default function SequenceGovernance({ values, onChange }: SequenceGovernanceProps) {
  const isOfficial = values.asset?.startsWith('/assets/') || values.asset?.includes('sequences/');
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(!isOfficial);

  const canEditAnatomy = !isOfficial || isUnlocked;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4">
      {/* HEADER & PROTECTION */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-accent" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Sequence Governance</h3>
        </div>
        {isOfficial && (
          <button 
            onClick={() => setIsUnlocked(!isUnlocked)}
            aria-label={isUnlocked ? 'Lock registry protection' : 'Unlock registry protection'}
            className={`px-2 py-0.5 rounded flex items-center gap-1.5 transition-all ${isUnlocked ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-accent/10 text-accent/60 border border-accent/20'}`}
          >
            {isUnlocked ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
            <span className="text-[6px] font-black uppercase tracking-tighter">{isUnlocked ? 'Override Registry' : 'Registry Locked'}</span>
          </button>
        )}
      </div>

      {/* ANATOMY SECTION (COLLAPSIBLE) */}
      <div className="border border-white/5 rounded bg-black/20 overflow-hidden">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? 'Collapse technical anatomy' : 'Expand technical anatomy'}
          className="w-full px-3 py-2 bg-white/5 flex items-center justify-between hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black uppercase text-white/40 tracking-widest">Technical Anatomy</span>
            {!canEditAnatomy && <Lock className="w-2 h-2 text-accent/20" />}
          </div>
          {isExpanded ? <ChevronDown className="w-3 h-3 text-white/20" /> : <ChevronRight className="w-3 h-3 text-white/20" />}
        </button>

        {isExpanded && (
          <div className="p-4 grid grid-cols-2 gap-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
            {/* TOTAL FRAMES */}
            <div className={`space-y-2 ${!canEditAnatomy ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <div className="flex justify-between items-center">
                <label className="text-[8px] font-black uppercase text-white/40">Total Frames</label>
                <span className="text-[10px] font-mono text-accent">{values.frames || 1}</span>
              </div>
              <input 
                type="range" min="1" max="256" step="1"
                value={values.frames || 1}
                disabled={!canEditAnatomy}
                onChange={(e) => onChange({ frames: parseInt(e.target.value) })}
                className="w-full accent-accent bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
                aria-label="Total frames"
              />
            </div>

            {/* ORIENTATION */}
            <div className={`space-y-2 ${!canEditAnatomy ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <label className="text-[8px] font-black uppercase text-white/40 block">Orientation</label>
              <div className="flex gap-1 bg-black/40 p-1 rounded border border-white/5">
                <button 
                  onClick={() => onChange({ orientation: 'v' })}
                  disabled={!canEditAnatomy}
                  className={`flex-1 py-1 rounded text-[7px] font-black uppercase transition-all ${values.orientation === 'v' || !values.orientation ? 'bg-accent text-black' : 'text-white/40 hover:text-white/60'}`}
                >
                  Vertical
                </button>
                <button 
                  onClick={() => onChange({ orientation: 'h' })}
                  disabled={!canEditAnatomy}
                  className={`flex-1 py-1 rounded text-[7px] font-black uppercase transition-all ${values.orientation === 'h' ? 'bg-accent text-black' : 'text-white/40 hover:text-white/60'}`}
                >
                  Horizontal
                </button>
              </div>
            </div>

            {/* FRAME WIDTH */}
            <div className={`space-y-2 ${!canEditAnatomy ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <div className="flex justify-between items-center">
                <label className="text-[8px] font-black uppercase text-white/40 flex items-center gap-1">
                  Native Width
                </label>
                <span className="text-[10px] font-mono text-accent">{values.frameWidth || 48}px</span>
              </div>
              <input 
                type="range" min="8" max="256" step="1"
                value={values.frameWidth || 48}
                disabled={!canEditAnatomy}
                onChange={(e) => onChange({ frameWidth: parseInt(e.target.value) })}
                className="w-full accent-accent bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
                aria-label="Native frame width in pixels"
              />
            </div>

            {/* FRAME HEIGHT */}
            <div className={`space-y-2 ${!canEditAnatomy ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <div className="flex justify-between items-center">
                <label className="text-[8px] font-black uppercase text-white/40 flex items-center gap-1">
                  Native Height
                </label>
                <span className="text-[10px] font-mono text-accent">{values.frameHeight || 48}px</span>
              </div>
              <input 
                type="range" min="8" max="256" step="1"
                value={values.frameHeight || 48}
                disabled={!canEditAnatomy}
                onChange={(e) => onChange({ frameHeight: parseInt(e.target.value) })}
                className="w-full accent-accent bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
                aria-label="Native frame height in pixels"
              />
            </div>

            {/* CATEGORY (TAXONOMY) */}
            <div className={`space-y-2 ${!canEditAnatomy ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <label className="text-[8px] font-black uppercase text-white/40 block">Control Category</label>
              <select 
                disabled={!canEditAnatomy}
                value={values.category || 'knob'}
                onChange={(e) => onChange({ category: e.target.value })}
                className="w-full bg-black/40 border border-white/5 rounded px-2 py-1 text-[8px] font-black uppercase text-accent outline-none appearance-none cursor-pointer"
              >
                {['knob', 'slider', 'button', 'led', 'switch', 'vumeter'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* MOUSE RESPONSE */}
            <div className={`space-y-2 ${!canEditAnatomy ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <label className="text-[8px] font-black uppercase text-white/40 block">Mouse Interaction</label>
              <div className="flex gap-1 bg-black/40 p-1 rounded border border-white/5">
                <button 
                  onClick={() => onChange({ mouseResponse: 'rotary' })}
                  disabled={!canEditAnatomy}
                  className={`flex-1 py-1 rounded text-[7px] font-black uppercase transition-all ${values.mouseResponse === 'rotary' || !values.mouseResponse ? 'bg-accent text-black' : 'text-white/40 hover:text-white/60'}`}
                >
                  Rotary
                </button>
                <button 
                  onClick={() => onChange({ mouseResponse: 'linear' })}
                  disabled={!canEditAnatomy}
                  className={`flex-1 py-1 rounded text-[7px] font-black uppercase transition-all ${values.mouseResponse === 'linear' ? 'bg-accent text-black' : 'text-white/40 hover:text-white/60'}`}
                >
                  Linear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* POLARITY & PADDING (CREATIVE CONTROLS) */}
      <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-lg border border-white/5">
        <div className="space-y-2">
          <label className="text-[8px] font-black uppercase text-white/40 block">Polarity (Direction)</label>
          <div className="flex gap-1 bg-black/40 p-1 rounded border border-white/5">
            <button 
              onClick={() => onChange({ polarity: 'normal' })}
              className={`flex-1 py-1 rounded text-[7px] font-black uppercase transition-all ${values.polarity === 'normal' || !values.polarity ? 'bg-accent text-black' : 'text-white/40 hover:text-white/60'}`}
            >
              Normal
            </button>
            <button 
              onClick={() => onChange({ polarity: 'inverted' })}
              className={`flex-1 py-1 rounded text-[7px] font-black uppercase transition-all ${values.polarity === 'inverted' ? 'bg-accent text-black' : 'text-white/40 hover:text-white/60'}`}
            >
              Inverted
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[8px] font-black uppercase text-white/40 flex items-center gap-1">
              Internal Padding
            </label>
            <span className="text-[10px] font-mono text-accent">{values.padding || 0}px</span>
          </div>
          <input 
            type="range" min="0" max="64" step="1"
            value={values.padding || 0}
            onChange={(e) => onChange({ padding: parseInt(e.target.value) })}
            className="w-full accent-accent bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
            aria-label="Internal padding in pixels"
          />
        </div>
      </div>

      {/* VISUAL SCALING (UNIFIED) */}
      <div className="bg-accent/5 p-4 rounded border border-accent/20 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-[8px] font-black uppercase text-accent flex items-center gap-1">
              Visual Scale (Zoom)
            </label>
            <span className="text-[10px] font-mono text-accent">
              {Math.round(((values.width || values.frameWidth || 48) / (values.frameWidth || 48)) * 100)}%
            </span>
          </div>
          <input 
            type="range" min="25" max="400" step="5"
            value={Math.round(((values.width || values.frameWidth || 48) / (values.frameWidth || 48)) * 100)}
            onChange={(e) => {
              const scale = parseInt(e.target.value) / 100;
              const fw = values.frameWidth || 48;
              const fh = values.frameHeight || 48;
              onChange({ 
                width: Math.round(fw * scale),
                height: Math.round(fh * scale)
              });
            }}
            className="w-full accent-accent bg-white/10 h-1.5 rounded-full appearance-none cursor-pointer"
            aria-label="Visual scale as percentage"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[8px] font-black uppercase text-white/40">Render Width</label>
              <span className="text-[10px] font-mono text-accent">{values.width || values.frameWidth || 48}px</span>
            </div>
            <input 
              type="range" min="8" max="512" step="1"
              value={values.width || values.frameWidth || 48}
              onChange={(e) => onChange({ width: parseInt(e.target.value) })}
              className="w-full accent-accent bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
              aria-label="Render width in pixels"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[8px] font-black uppercase text-white/40">Render Height</label>
              <span className="text-[10px] font-mono text-accent">{values.height || values.frameHeight || 48}px</span>
            </div>
            <input 
              type="range" min="8" max="512" step="1"
              value={values.height || values.frameHeight || 48}
              onChange={(e) => onChange({ height: parseInt(e.target.value) })}
              className="w-full accent-accent bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
              aria-label="Render height in pixels"
            />
          </div>
        </div>
      </div>

      {/* VALIDATION BLOCK */}
      <div className="bg-black/40 p-3 rounded space-y-3 border border-white/5">
        <div className="flex items-start gap-3">
          <RefreshCw className="w-4 h-4 text-accent mt-0.5 animate-spin-slow" />
          <p className="text-[7px] font-bold uppercase text-accent/60 leading-relaxed italic">
            Sequence Verification Active. Scrub to verify frame alignment.
          </p>
        </div>

        <div className="pt-2 border-t border-white/5 space-y-2">
            <div className="flex justify-between items-center">
               <label className="text-[8px] font-black uppercase text-accent">Validation Scrub</label>
               <span className="text-[10px] font-mono text-accent">{Math.round((values.testValue ?? 0.75) * 100)}%</span>
            </div>
            <input 
               type="range" min="0" max="100" step="1"
               value={(values.testValue ?? 0.75) * 100}
               onChange={(e) => onChange({ testValue: parseInt(e.target.value) / 100 })}
               className="w-full accent-accent bg-white/10 h-1.5 rounded-full appearance-none cursor-pointer"
               aria-label="Validation scrub percentage"
            />
        </div>
      </div>
    </div>
  );
}
