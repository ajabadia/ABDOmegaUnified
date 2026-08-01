/**
 * @purpose Renderiza un menú desplegable para seleccionar presets de comportamiento de activos con iconos y descripciones.
 * @purpose_en Renders a dropdown menu for selecting asset behavior presets with icons and descriptions.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:1mw14j7
 * @lastUpdated 2026-06-20T09:18:35.348Z
 */

import React from 'react';
import type { AssetBehaviorPreset } from '@/omega-ui-core/types/assetBehavior';
import { Cpu, RotateCcw, Sliders, ToggleLeft, CircleDot, Activity, Zap, Monitor, Layout } from 'lucide-react';
 
interface AssetBehaviorPresetSelectorProps {
  value: AssetBehaviorPreset;
  onChange: (preset: AssetBehaviorPreset) => void;
}
 
const PRESETS: { id: AssetBehaviorPreset; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'rotary', label: 'Rotary Knob', icon: RotateCcw, description: 'Continuous 360 or limited rotation mapping.' },
  { id: 'slider', label: 'Linear Slider', icon: Sliders, description: 'Vertical or horizontal movement.' },
  { id: 'switch', label: 'Toggle Switch', icon: ToggleLeft, description: 'Binary or multi-state discrete mapping.' },
  { id: 'button', label: 'Momentary Button', icon: Zap, description: 'Active while pressed or latched logic.' },
  { id: 'meter', label: 'VU / Step Meter', icon: Activity, description: 'Signal-driven visual indicators.' },
  { id: 'led', label: 'Indicator / LED', icon: CircleDot, description: 'Binary or multi-color state indicator.' },
  { id: 'display', label: 'State Display', icon: Monitor, description: 'State-driven text or symbol readout.' },
  { id: 'plate', label: 'Rack Plate', icon: Layout, description: 'Decorative panel surface (no behavior).' },
  { id: 'static', label: 'Static Decor', icon: Cpu, description: 'Simple non-interactive graphic asset.' },
];
 
export default function AssetBehaviorPresetSelector({ value, onChange }: AssetBehaviorPresetSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[7px] font-black uppercase tracking-widest opacity-40">Choose Behavior Preset</span>
        <div className="h-px flex-1 bg-white/5" />
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onChange(preset.id)}
            aria-label={`Select preset: ${preset.label}`}
            className={`flex flex-col items-start p-3 rounded border transition-all text-left gap-2 ${
              value === preset.id 
                ? 'bg-accent/10 border-accent shadow-[0_0_15px_rgba(0,242,255,0.1)]' 
                : 'bg-[#1a1a1b] border-[#333] hover:border-[#444] grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
            }`}
          >
            <preset.icon className={`w-4 h-4 ${value === preset.id ? 'text-accent' : 'text-white/40'}`} />
            <div>
              <div className={`text-[9px] font-black uppercase ${value === preset.id ? 'text-white' : 'text-white/40'}`}>{preset.label}</div>
              <div className="text-[7px] font-bold opacity-30 leading-tight mt-0.5">{preset.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
