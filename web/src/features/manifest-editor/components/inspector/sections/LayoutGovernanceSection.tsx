'use client';

/**
 * @purpose Gestiona un sección colapsable en el editor de manifesto OMEGA para ajustar las configuraciones de gobernanza del layout, incluyendo la selección del modo y las propiedades de alineación.
 * @purpose_en Manages a collapsible section in the OMEGA manifest editor for adjusting layout governance settings, including mode selection and alignment properties.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:4,sig:kzgy3r
 * @lastUpdated 2026-06-20T09:16:57.994Z
 */

import React from 'react';
import { Layout, ArrowDown, ArrowRight, MousePointer2 } from 'lucide-react';
import type { OmegaNode, LayoutMode } from '@/types/manifest';
import InspectorCollapsible from '../shared/InspectorCollapsible';

interface LayoutGovernanceSectionProps {
  node: OmegaNode;
  onUpdate: (updates: Partial<OmegaNode>) => void;
}

export default function LayoutGovernanceSection({ node, onUpdate }: LayoutGovernanceSectionProps) {
  if (node.kind !== 'container' && node.kind !== 'rack' && node.kind !== 'face') return null;

  const mode = node.layout?.mode || 'absolute';
  const gap = node.layout?.gap || 0;
  const padding = node.layout?.padding || 0;

  const modes: { id: LayoutMode; label: string; icon: React.ElementType }[] = [
    { id: 'absolute', label: 'Free / Absolute', icon: MousePointer2 },
    { id: 'stack-v', label: 'Vertical Stack', icon: ArrowDown },
    { id: 'stack-h', label: 'Horizontal Stack', icon: ArrowRight },
  ];

  return (
    <InspectorCollapsible 
      title="Layout Governance (Era 7.2.3)" 
      icon={Layout}
    >
      <div className="space-y-4 pt-2">
        <div className="grid grid-cols-3 gap-1 bg-black/20 p-1 rounded-xs border border-outline">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => onUpdate({ layout: { ...node.layout, pos: node.layout?.pos || { x: 0, y: 0 }, mode: m.id } })}
              aria-label={`Layout mode: ${m.label}`}
              className={`flex flex-col items-center gap-1 py-2 rounded-xs transition-all ${
                mode === m.id 
                  ? 'bg-primary/20 border border-primary/40 text-primary' 
                  : 'text-foreground/40 hover:bg-white/5 border border-transparent'
              }`}
            >
              <m.icon className="w-3 h-3" />
              <span className="text-[6px] font-black uppercase tracking-tighter">{m.label}</span>
            </button>
          ))}
        </div>

        {mode !== 'absolute' && (
          <>
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
              <div className="space-y-1.5">
                <label className="text-[8px] uppercase font-bold text-foreground/60 tracking-tighter ml-1">Inner Gap (px)</label>
                <input 
                  type="number" 
                  value={gap}
                  onChange={(e) => onUpdate({ layout: { ...node.layout, pos: node.layout?.pos || { x: 0, y: 0 }, gap: parseInt(e.target.value) || 0 } })}
                  className="w-full bg-black/40 border border-outline rounded-sm p-2 text-[10px] font-mono text-foreground outline-none focus:border-primary/40 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[8px] uppercase font-bold text-foreground/60 tracking-tighter ml-1">Padding (px)</label>
                <input 
                  type="number" 
                  value={padding}
                  onChange={(e) => onUpdate({ layout: { ...node.layout, pos: node.layout?.pos || { x: 0, y: 0 }, padding: parseInt(e.target.value) || 0 } })}
                  className="w-full bg-black/40 border border-outline rounded-sm p-2 text-[10px] font-mono text-foreground outline-none focus:border-primary/40 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/5">
               <div className="space-y-1.5">
                  <label className="text-[8px] uppercase font-bold text-foreground/60 tracking-tighter ml-1">Justify (Main Axis)</label>
                  <div className="grid grid-cols-4 gap-1 bg-black/20 p-1 rounded-xs border border-outline">
                    {(['start', 'center', 'end', 'space-between'] as const).map(j => (
                      <button
                        key={j}
                        onClick={() => onUpdate({ layout: { ...node.layout, pos: node.layout?.pos || { x: 0, y: 0 }, justify: j } })}
                        className={`py-1.5 text-[6px] font-black uppercase tracking-tighter rounded-xs transition-all ${
                          (node.layout?.justify || 'start') === j 
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' 
                            : 'text-foreground/30 hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {j.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
               </div>

               <div className="space-y-1.5">
                  <label className="text-[8px] uppercase font-bold text-foreground/60 tracking-tighter ml-1">Align (Cross Axis)</label>
                  <div className="grid grid-cols-4 gap-1 bg-black/20 p-1 rounded-xs border border-outline">
                    {(['start', 'center', 'end', 'stretch'] as const).map(a => (
                      <button
                        key={a}
                        onClick={() => onUpdate({ layout: { ...node.layout, pos: node.layout?.pos || { x: 0, y: 0 }, align: a } })}
                        className={`py-1.5 text-[6px] font-black uppercase tracking-tighter rounded-xs transition-all ${
                          (node.layout?.align || 'start') === a 
                            ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400' 
                            : 'text-foreground/30 hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
               </div>
            </div>
          </>
        )}
      </div>
    </InspectorCollapsible>
  );
}
