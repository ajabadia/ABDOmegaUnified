/**
 * @purpose Gestiona la inyección de señal virtual con opciones para seleccionar tipos de ondas, ajustar parámetros, visualizar señales y manejar cruz-modulación.
 * @purpose_en Manages virtual signal injection with options for selecting types of waveforms, adjusting parameters, visualizing signals, and handling cross-modulation.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:5,sig:169kxc4
 * @lastUpdated 2026-06-20T09:43:56.215Z
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, X, Activity } from 'lucide-react';
import type { SignalType, VirtualSignal } from '@/services/inputSignalService';
import { getService } from '@/services/globalEventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';
import { SimulationScope } from './SimulationScope';

interface SignalInjectorProps {
  portId: string;
  onClose: () => void;
}

const WAVE_BUTTONS: { type: SignalType; label: string }[] = [
  { type: 'sine', label: 'Sine' },
  { type: 'square', label: 'Sqr' },
  { type: 'saw', label: 'Saw' },
  { type: 'triangle', label: 'Tri' },
  { type: 'pulse', label: 'Pulse' },
  { type: 'pwm', label: 'PWM' },
  { type: 'adsr', label: 'ADSR' },
  { type: 'sample_hold', label: 'S&H' },
  { type: 'sequencer', label: 'Seq' },
  { type: 'random_correlated', label: 'RCorr' },
  { type: 'noise', label: 'Noise' },
  { type: 'lfo_slow', label: 'LFO' },
  { type: 'static', label: 'DC' },
];

/**
 * SignalInjector (vR2)
 * Floating industrial UI to configure virtual signal injection.
 * Supports 13 wave types with per-type parameter controls + scope visualization.
 */
export const SignalInjector = ({ portId, onClose }: SignalInjectorProps) => {
  const inputSignalService = getService(SERVICE_TOKENS.INPUT_SIGNAL_SERVICE);
  const current = inputSignalService.getActiveSignal(portId);
  const [sig, setSig] = useState<VirtualSignal>(current || { type: 'sine', frequency: 440, amplitude: 0.5, offset: 0 });

  // Collect all active signal ports for cross-modulation source selection
  const allActiveSignals = inputSignalService.getAllActiveSignals();
  const otherActivePortIds = Object.keys(allActiveSignals).filter(id => id !== portId);

  const update = (updates: Partial<VirtualSignal>) => {
    const next = { ...sig, ...updates };
    setSig(next);
    inputSignalService.setSignal(portId, next);
  };

  const remove = () => {
    inputSignalService.setSignal(portId, null);
    onClose();
  };

  const isEnvelope = sig.type === 'adsr';
  const hasRate = ['sample_hold', 'sequencer', 'random_correlated'].includes(sig.type);
  const hasDuty = sig.type === 'pulse';
  const hasSteps = sig.type === 'sequencer';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-black/90 backdrop-blur-xl border border-primary/30 rounded-xs shadow-[0_0_50px_rgba(0,255,157,0.2)] z-[200] p-4 space-y-3"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-primary animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-primary">Signal Injector</span>
          <span className="text-[6px] font-mono text-white/20 ml-1">{portId.slice(0, 16)}</span>
        </div>
        <button onClick={onClose} title="Close signal injector" className="text-white/20 hover:text-white">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Waveform Scope Visualization */}
      <div className="h-16 bg-black/60 border border-white/5 rounded-xs overflow-hidden">
        <SimulationScope portId={portId} height={64} />
      </div>

      {/* Wave Type Grid */}
      <div className="grid grid-cols-4 gap-1">
        {WAVE_BUTTONS.map(({ type, label }) => (
          <button 
            key={type}
            onClick={() => update({ type })}
            className={`py-1 rounded-xs text-[6px] font-bold uppercase transition-all border ${sig.type === type ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Common Controls */}
      <div className="space-y-2 pt-1">
        {/* Frequency / Rate */}
        <div className="space-y-1">
          <div className="flex justify-between text-[7px] font-black uppercase opacity-40">
            <span>{hasRate ? 'Rate' : 'Frequency'}</span>
            <span>{sig.frequency} {hasRate ? 'Hz (step)' : 'Hz'}</span>
          </div>
          <input type="range" min={isEnvelope ? 0.1 : 1} max={isEnvelope ? 10 : 2000} step="0.1" value={sig.frequency} onChange={e => update({ frequency: parseFloat(e.target.value) })} className="w-full accent-primary h-1" aria-label={hasRate ? 'Rate in Hz' : 'Frequency in Hz'} />
        </div>

        {/* Amplitude */}
        <div className="space-y-1">
          <div className="flex justify-between text-[7px] font-black uppercase opacity-40">
            <span>Amplitude</span>
            <span>{(sig.amplitude * 100).toFixed(0)}%</span>
          </div>
          <input type="range" min="0" max="1" step="0.01" value={sig.amplitude} onChange={e => update({ amplitude: parseFloat(e.target.value) })} className="w-full accent-primary h-1" aria-label="Amplitude" />
        </div>

        {/* Duty Cycle (pulse only) */}
        {hasDuty && (
          <div className="space-y-1">
            <div className="flex justify-between text-[7px] font-black uppercase opacity-40">
              <span>Duty Cycle</span>
              <span>{(sig.dutyCycle! * 100).toFixed(0)}%</span>
            </div>
            <input type="range" min="0.05" max="0.95" step="0.01" value={sig.dutyCycle!} onChange={e => update({ dutyCycle: parseFloat(e.target.value) })} className="w-full accent-primary h-1" aria-label="Duty cycle" />
          </div>
        )}

        {/* ADSR Envelope Controls */}
        {isEnvelope && (
          <div className="space-y-2 pt-1 border-t border-white/5">
            <span className="text-[7px] font-black uppercase opacity-40">Envelope</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[6px] font-bold opacity-40">
                  <span>Attack</span>
                  <span>{(sig.attackTime! * 1000).toFixed(0)}ms</span>
                </div>
                <input type="range" min="1" max="2000" step="1" value={sig.attackTime! * 1000} onChange={e => update({ attackTime: parseInt(e.target.value) / 1000 })} className="w-full accent-primary h-1" aria-label="Attack time in milliseconds" />
              </div>
              <div>
                <div className="flex justify-between text-[6px] font-bold opacity-40">
                  <span>Decay</span>
                  <span>{(sig.decayTime! * 1000).toFixed(0)}ms</span>
                </div>
                <input type="range" min="10" max="5000" step="10" value={sig.decayTime! * 1000} onChange={e => update({ decayTime: parseInt(e.target.value) / 1000 })} className="w-full accent-primary h-1" aria-label="Decay time in milliseconds" />
              </div>
              <div>
                <div className="flex justify-between text-[6px] font-bold opacity-40">
                  <span>Sustain</span>
                  <span>{(sig.sustainLevel! * 100).toFixed(0)}%</span>
                </div>
                <input type="range" min="0" max="1" step="0.01" value={sig.sustainLevel!} onChange={e => update({ sustainLevel: parseFloat(e.target.value) })} className="w-full accent-primary h-1" aria-label="Sustain level" />
              </div>
              <div>
                <div className="flex justify-between text-[6px] font-bold opacity-40">
                  <span>Release</span>
                  <span>{(sig.releaseTime! * 1000).toFixed(0)}ms</span>
                </div>
                <input type="range" min="10" max="10000" step="10" value={sig.releaseTime! * 1000} onChange={e => update({ releaseTime: parseInt(e.target.value) / 1000 })} className="w-full accent-primary h-1" aria-label="Release time in milliseconds" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => inputSignalService.setGateState(portId, !sig.gateOn)}
                className={`px-2 py-1 rounded-xs text-[7px] font-black uppercase tracking-widest transition-all border ${sig.gateOn ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}
              >
                Gate: {sig.gateOn ? 'ON' : 'OFF'}
              </button>
              <span className="text-[6px] font-mono text-white/20">Triggers ADSR cycle</span>
            </div>
          </div>
        )}

        {/* Sequencer Steps */}
        {hasSteps && (
          <div className="space-y-1 pt-1 border-t border-white/5">
            <span className="text-[7px] font-black uppercase opacity-40">Steps (8)</span>
            <div className="flex gap-1">
              {(sig.steps ?? []).slice(0, 8).map((stepVal, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[6px] font-mono text-white/30">{i + 1}</span>
                  <input 
                    type="range" 
                    min="0" max="1" step="0.01" 
                    value={stepVal} 
                    onChange={e => {
                      const next = [...(sig.steps ?? [0,0.25,0.5,0.75,1,0.75,0.5,0.25])];
                      next[i] = parseFloat(e.target.value);
                      update({ steps: next });
                    }}
                    aria-label={`Step ${i + 1}`}
                    className="w-4 h-12 accent-accent [writing-mode:vertical-lr] appearance-none cursor-pointer"
                    style={{ accentColor: '#ff8c00' }}
                  />
                  <span className="text-[5px] font-mono text-white/40">{(stepVal * 100).toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Slew Rate / Portamento */}
        <div className="space-y-1">
          <div className="flex justify-between text-[7px] font-black uppercase opacity-40">
            <span>Slew Rate</span>
            <span>{sig.slewRate! > 0 ? `${sig.slewRate!.toFixed(1)}/s` : 'Off'}</span>
          </div>
          <input type="range" min="0" max="20" step="0.1" value={sig.slewRate!} onChange={e => update({ slewRate: parseFloat(e.target.value) })} className="w-full accent-purple-400 h-1" style={{ accentColor: '#a855f7' }} aria-label="Slew rate" />
          <div className="text-[5px] font-mono text-white/20">Limits rate of change (portamento)</div>
        </div>

        {/* Quantization */}
        <div className="space-y-1">
          <div className="flex justify-between text-[7px] font-black uppercase opacity-40">
            <span>Quantize</span>
            <span>{sig.quantize! > 0 ? `${sig.quantize} steps` : 'Off'}</span>
          </div>
          <input type="range" min="0" max="24" step="1" value={sig.quantize!} onChange={e => update({ quantize: parseInt(e.target.value) })} className="w-full accent-amber-400 h-1" style={{ accentColor: '#eab308' }} aria-label="Quantization steps" />
          <div className="text-[5px] font-mono text-white/20">Snaps to discrete steps (2 = on/off, 12 = semitones)</div>
        </div>

        {/* Offset */}
        <div className="space-y-1">
          <div className="flex justify-between text-[7px] font-black uppercase opacity-40">
            <span>Offset</span>
            <span>{sig.offset.toFixed(2)}</span>
          </div>
          <input type="range" min="-1" max="1" step="0.01" value={sig.offset} onChange={e => update({ offset: parseFloat(e.target.value) })} className="w-full accent-primary h-1" aria-label="Offset" />
        </div>
      </div>

      {/* Cross-Modulation Section */}
      {otherActivePortIds.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-white/5">
          <span className="text-[7px] font-black uppercase opacity-40">Cross-Modulation</span>
          <div className="flex items-center gap-2">
            <select
              value={sig.modSourceId ?? ''}
              onChange={e => {
                const val = e.target.value;
                if (val) {
                  update({ modSourceId: val, modAmount: sig.modAmount ?? 0.3 });
                } else {
                  // Remove modulation source cleanly (exactOptionalPropertyTypes: don't set undefined)
                  const cleaned = { ...sig };
                  delete (cleaned as Record<string, unknown>).modSourceId;
                  delete (cleaned as Record<string, unknown>).modAmount;
                  setSig(cleaned);
                  inputSignalService.setSignal(portId, cleaned);
                }
              }}
              className="flex-1 bg-black/60 border border-white/10 rounded-xs px-2 py-1 text-[7px] font-mono text-primary outline-none appearance-none cursor-pointer"
            >
              <option value="">— No modulation —</option>
              {otherActivePortIds.map(id => (
                <option key={id} value={id}>
                  ↻ {id.slice(0, 20)}{allActiveSignals[id]?.type ? ` (${allActiveSignals[id].type})` : ''}
                </option>
              ))}
            </select>
          </div>
          {sig.modSourceId && (
            <div className="space-y-1">
              <div className="flex justify-between text-[7px] font-black uppercase opacity-40">
                <span>Mod Amount</span>
                <span>{sig.modAmount?.toFixed(2) ?? '0.00'}</span>
              </div>
              <input type="range" min="-1" max="1" step="0.01" value={sig.modAmount ?? 0} onChange={e => update({ modAmount: parseFloat(e.target.value) })} className="w-full accent-orange-500 h-1" style={{ accentColor: '#ff8c00' }} aria-label="Modulation amount" />
            </div>
          )}
        </div>
      )}

      {/* Active Indicator */}
      <div className="flex items-center gap-1.5 border-t border-white/5 pt-2">
        <Activity className="w-2 h-2 text-green-400" />
        <span className="text-[6px] font-mono text-green-400/60 uppercase tracking-widest">
          Signal Active — {sig.type.replace('_', ' ')}
        </span>
      </div>

      <button onClick={remove} title="Remove signal" className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all rounded-xs">
        Kill Signal
      </button>
    </motion.div>
  );
};
