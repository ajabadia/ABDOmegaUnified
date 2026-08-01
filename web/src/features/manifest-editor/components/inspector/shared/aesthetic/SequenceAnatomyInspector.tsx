'use client';

/**
 * @purpose Renderiza un componente para inspeccionar y editar propiedades estéticas de la anatomía de secuencia en un editor de manifesto OMEGA.
 * @purpose_en Renders a component for inspecting and editing aesthetic properties of sequence anatomy in an OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:8v8osv
 * @lastUpdated 2026-06-20T09:17:43.417Z
 */

import React from 'react';
import { Lock, Unlock, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

import type { OmegaStyleNode } from '@/types/manifest';

interface SequenceAnatomyInspectorProps {
  values: Partial<OmegaStyleNode>;
  onChange: (updates: Partial<OmegaStyleNode>) => void;
}

export default function SequenceAnatomyInspector({ values, onChange }: SequenceAnatomyInspectorProps) {
  const isOfficial = values.asset?.startsWith('/assets/') || values.asset?.includes('sequences/');
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(!isOfficial);

  const canEditAnatomy = !isOfficial || isUnlocked;

  return (
    <div className="space-y-4">
      {/* PROTECTION TOGGLE (Only for official) */}
      {isOfficial && (
        <div className="flex justify-end">
          <button 
            onClick={() => setIsUnlocked(!isUnlocked)}
            aria-label={isUnlocked ? 'Lock registry protection' : 'Unlock registry protection'}
            className={`px-2 py-0.5 rounded flex items-center gap-1.5 transition-all ${isUnlocked ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-accent/10 text-accent/60 border border-accent/20'}`}
          >
            {isUnlocked ? <Unlock className="w-2 h-2" /> : <Lock className="w-2 h-2" />}
            <span className="text-[6px] font-black uppercase tracking-tighter">{isUnlocked ? 'Override Active' : 'Registry Locked'}</span>
          </button>
        </div>
      )}

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
                aria-label="Total frames"
                value={values.frames || 1}
                disabled={!canEditAnatomy}
                onChange={(e) => onChange({ frames: parseInt(e.target.value) })}
                className="w-full accent-accent bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
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
                  V
                </button>
                <button 
                  onClick={() => onChange({ orientation: 'h' })}
                  disabled={!canEditAnatomy}
                  className={`flex-1 py-1 rounded text-[7px] font-black uppercase transition-all ${values.orientation === 'h' ? 'bg-accent text-black' : 'text-white/40 hover:text-white/60'}`}
                >
                  H
                </button>
              </div>
            </div>

            {/* NATIVE DIMENSIONS */}
            <div className={`space-y-2 ${!canEditAnatomy ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <label className="text-[8px] font-black uppercase text-white/40 block">Native W</label>
              <input 
                type="number" 
                aria-label="Native width"
                value={values.frameWidth || 48}
                disabled={!canEditAnatomy}
                onChange={(e) => onChange({ frameWidth: parseInt(e.target.value) })}
                className="w-full bg-black/40 border border-white/5 rounded px-2 py-1 text-[10px] font-mono text-accent outline-none"
              />
            </div>
            <div className={`space-y-2 ${!canEditAnatomy ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <label className="text-[8px] font-black uppercase text-white/40 block">Native H</label>
              <input 
                type="number" 
                aria-label="Native height"
                value={values.frameHeight || 48}
                disabled={!canEditAnatomy}
                onChange={(e) => onChange({ frameHeight: parseInt(e.target.value) })}
                className="w-full bg-black/40 border border-white/5 rounded px-2 py-1 text-[10px] font-mono text-accent outline-none"
              />
            </div>

            {/* MOUSE RESPONSE */}
            <div className={`space-y-2 ${!canEditAnatomy ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <label className="text-[8px] font-black uppercase text-white/40 block">Mouse Response</label>
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

            {/* CATEGORY & POLARITY */}
            <div className={`space-y-2 ${!canEditAnatomy ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <label className="text-[8px] font-black uppercase text-white/40 block">Category</label>
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
            <div className={`space-y-2 ${!canEditAnatomy ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              <label className="text-[8px] font-black uppercase text-white/40 block">Polarity</label>
              <div className="flex gap-1 bg-black/40 p-1 rounded border border-white/5">
                <button 
                  onClick={() => onChange({ polarity: 'normal' })}
                  disabled={!canEditAnatomy}
                  className={`flex-1 py-1 rounded text-[7px] font-black uppercase transition-all ${values.polarity === 'normal' || !values.polarity ? 'bg-accent text-black' : 'text-white/40 hover:text-white/60'}`}
                >
                  Nrm
                </button>
                <button 
                  onClick={() => onChange({ polarity: 'inverted' })}
                  disabled={!canEditAnatomy}
                  className={`flex-1 py-1 rounded text-[7px] font-black uppercase transition-all ${values.polarity === 'inverted' ? 'bg-accent text-black' : 'text-white/40 hover:text-white/60'}`}
                >
                  Inv
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VALIDATION BLOCK */}
      <div className="bg-black/40 p-3 rounded space-y-2 border border-white/5">
           <div className="flex justify-between items-center">
              <label className="text-[8px] font-black uppercase text-accent flex items-center gap-2">
                <RefreshCw className="w-3 h-3 animate-spin-slow" />
                Validation Scrub
              </label>
              <span className="text-[10px] font-mono text-accent">{Math.round((values.testValue ?? 0.75) * 100)}%</span>
           </div>
           <input 
              type="range" min="0" max="100" step="1"
              aria-label="Validation scrub"
              value={(values.testValue ?? 0.75) * 100}
              onChange={(e) => onChange({ testValue: parseInt(e.target.value) / 100 })}
              className="w-full accent-accent bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
           />
      </div>
    </div>
  );
}
