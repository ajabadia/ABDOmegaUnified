/**
 * @purpose Renderiza un componente para inspeccionar y editar las mapas de comportamiento en el editor de manifesto OMEGA, incluyendo fuente de entrada, modo de mapeo, rango de cuadros y validación.
 * @purpose_en Renders a component for inspecting and editing behavior mappings in the OMEGA manifest editor, including input source, mapping mode, frame range, and validation.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:17dtf6u
 * @lastUpdated 2026-06-20T09:18:41.312Z
 */

import type { BehaviorMapping, BehaviorMappingMode } from '@/omega-ui-core/types/assetBehavior';
import { Zap, Target, ArrowRightLeft, Layers } from 'lucide-react';
 
interface BehaviorMappingInspectorProps {
  mapping: BehaviorMapping;
  onChange: (updates: Partial<BehaviorMapping>) => void;
  resolvedFrame?: number | undefined;
}
 
export default function BehaviorMappingInspector({ mapping, onChange, resolvedFrame }: BehaviorMappingInspectorProps) {
  return (
    <div className="space-y-6 bg-[#111112] border border-[#222] rounded-lg p-4">
      <div className="flex items-center gap-2 border-b border-[#222] pb-2 mb-4">
        <Target className="w-3.5 h-3.5 text-accent" />
        <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Semantic Mapping</h3>
      </div>
 
      <div className="grid grid-cols-2 gap-6">
        {/* INPUT SOURCE */}
        <div className="space-y-2">
          <label className="text-[7px] font-black uppercase tracking-widest opacity-40 flex items-center gap-1">
            <Zap className="w-3 h-3" /> Input Source
          </label>
          <select
            value={mapping.input}
            onChange={(e) => onChange({ input: e.target.value as BehaviorMapping['input'] })}
            className="w-full bg-[#1a1a1b] border border-[#333] rounded p-2 text-[8px] font-black uppercase text-accent outline-none"
          >
            <option value="value">Standard Value (0-1)</option>
            <option value="state">Enumerated State</option>
            <option value="active">Active Flag (Boolean)</option>
            <option value="signal">Modulation Signal</option>
            <option value="telemetry">Telemetry Stream</option>
            <option value="manual">Manual Scrubbing</option>
          </select>
        </div>
 
        {/* MAPPING MODE */}
        <div className="space-y-2">
          <label className="text-[7px] font-black uppercase tracking-widest opacity-40 flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3" /> Mapping Mode
          </label>
          <select
            value={mapping.mode}
            onChange={(e) => onChange({ mode: e.target.value as BehaviorMappingMode })}
            className="w-full bg-[#1a1a1b] border border-[#333] rounded p-2 text-[8px] font-black uppercase text-accent outline-none"
          >
            <option value="continuous">Continuous Interpolation</option>
            <option value="stepped">Discrete Stepping</option>
            <option value="state-map">Explicit State Mapping</option>
            <option value="bipolar">Bipolar (-1 to 1)</option>
            <option value="unipolar">Unipolar (0 to 1)</option>
          </select>
        </div>
      </div>
 
      {/* FRAME RANGE */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <label className="text-[7px] font-black uppercase tracking-widest opacity-40 flex items-center gap-1">
          <Layers className="w-3 h-3" /> Visual Lifecycle (Frames)
        </label>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1 relative group">
            <span className="text-[6px] font-black uppercase opacity-30">Start Frame</span>
            <input 
              type="number"
              value={mapping.frameRange?.start ?? 0}
              onChange={(e) => onChange({ frameRange: { start: parseInt(e.target.value), end: mapping.frameRange?.end ?? 0 } })}
              className="w-full bg-[#0a0a0b] border border-[#222] rounded p-1.5 text-[8px] font-mono text-white outline-none focus:border-accent/40"
              aria-label="Start frame"
            />
            {(resolvedFrame ?? 0) === (mapping.frameRange?.start ?? 0) && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_5px_rgba(0,242,255,0.5)]" />
            )}
          </div>
          <div className="space-y-1 relative group">
            <span className="text-[6px] font-black uppercase opacity-30">End Frame</span>
            <input 
              type="number"
              value={mapping.frameRange?.end ?? 1}
              onChange={(e) => onChange({ frameRange: { start: mapping.frameRange?.start ?? 0, end: parseInt(e.target.value) } })}
              className="w-full bg-[#0a0a0b] border border-[#222] rounded p-1.5 text-[8px] font-mono text-white outline-none focus:border-accent/40"
              aria-label="End frame"
            />
            {(resolvedFrame ?? 0) === (mapping.frameRange?.end ?? 1) && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_5px_rgba(0,242,255,0.5)]" />
            )}
          </div>
          <div className="space-y-1">
             <span className="text-[6px] font-black uppercase opacity-30">Polarity</span>
             <select
               value={mapping.polarity ?? 'normal'}
               onChange={(e) => onChange({ polarity: e.target.value as 'normal' | 'inverted' })}
               className="w-full bg-[#0a0a0b] border border-[#222] rounded p-1.5 text-[8px] font-black uppercase text-white/60 outline-none"
             >
                <option value="normal">Normal</option>
                <option value="inverted">Inverted</option>
             </select>
          </div>
        </div>
 
        {/* VISUAL FRAME TRACKER */}
        <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
           <div 
             className="absolute h-full bg-accent/40 transition-all duration-200"
             style={{
                left: `${((resolvedFrame ?? 0) / Math.max(1, (mapping.frameRange?.end || 1))) * 100}%`,
                width: '4px',
                transform: 'translateX(-50%)'
             }}
           />
           <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-10">
              {Array.from({ length: 5 }).map((_, i) => (
                 <div key={i} className="w-px h-full bg-white" />
              ))}
           </div>
        </div>
      </div>
 
      <div className="p-3 bg-accent/5 rounded border border-accent/10">
          <p className="text-[8px] font-bold uppercase opacity-40 leading-relaxed">
            Mapping determines how the source signal is quantized into visual frames. For filmstrips, ensure the frame range matches the asset sequence.
          </p>
       </div>
       
       {((mapping.frameRange?.start ?? 0) > (mapping.frameRange?.end ?? 0)) && (
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2 animate-bounce">
             <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
             <span className="text-[7px] font-black uppercase text-red-400">Invalid Frame Range: Start exceeds End</span>
          </div>
       )}
    </div>
  );
}
