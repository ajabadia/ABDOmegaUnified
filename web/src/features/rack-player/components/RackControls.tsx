'use client';

import { useState } from 'react';

/**
 * RackControls — paneles de control (sliders → omega_on_param) del rack WASM.
 *
 * Los contratos y defaults provienen del worklet (contrato embebido de cada
 * binario vía omega_get_contract), de modo que los sliders reflejan los MISMOS
 * valores que el motor usa realmente:
 *   - contracts[id] = parámetros del contrato embebido del módulo
 *   - defaults[id][param] = valor aplicado en el arranque (bypass probado)
 *     cuando existe; si no, el slider arranca en el default del contrato.
 *
 * Cada cambio emite onParam(module, param, value) → el contenedor lo reenvía
 * al worklet como { type: 'setParam' }.
 */

export interface RackParamDef {
  id: string;
  label?: string;
  min?: number;
  max?: number;
  default?: number;
  unit?: string;
}

interface RackControlsProps {
  contracts: Record<string, RackParamDef[]>;
  defaults?: Record<string, Record<string, number>>;
  disabled?: boolean;
  onParam: (module: string, param: string, value: number) => void;
}

// Módulos de la cadena de voz (los que tienen parámetros audibles).
const MODULES = ['midi_2_cv', 'lfo', 'vco', 'vcf', 'adsr', 'vca'];

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

export default function RackControls({
  contracts,
  defaults = {},
  disabled = false,
  onParam,
}: RackControlsProps) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const [mod, params] of Object.entries(contracts)) {
      for (const p of params) {
        const key = `${mod}.${p.id}`;
        init[key] = defaults[mod]?.[p.id] ?? p.default ?? p.min ?? 0;
      }
    }
    return init;
  });

  const set = (mod: string, p: RackParamDef, value: number) => {
    const key = `${mod}.${p.id}`;
    setValues((prev) => ({ ...prev, [key]: value }));
    onParam(mod, p.id, value);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {MODULES.map((mod) => {
        const params = contracts[mod] ?? [];
        if (params.length === 0) return null;
        return (
          <div
            key={mod}
            className="bg-[#131b2e] border border-[#202b46] rounded-lg p-3 flex flex-col gap-2"
          >
            <span className="font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-wide">
              {mod}
            </span>
            {params.map((p) => {
              const key = `${mod}.${p.id}`;
              const val = values[key] ?? p.default ?? p.min ?? 0;
              const min = p.min ?? 0;
              const max = p.max ?? 1;
              const step =
                Number.isInteger(min) && Number.isInteger(max) && max - min <= 100
                  ? 1
                  : (max - min) / 100;
              return (
                <label key={p.id} className="flex flex-col gap-0.5">
                  <span className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span className="truncate">{p.label ?? p.id}</span>
                    <span className="text-cyan-400 shrink-0">
                      {fmt(val)}
                      {p.unit ? ` ${p.unit}` : ''}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={val}
                    disabled={disabled}
                    onChange={(e) => set(mod, p, Number(e.target.value))}
                    className="w-full h-1.5 accent-cyan-500 cursor-pointer disabled:cursor-not-allowed"
                    title={`${mod}.${p.id}`}
                  />
                </label>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
