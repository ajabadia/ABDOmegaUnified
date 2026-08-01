'use client';

/**
 * @purpose Gestiona la precisión numérica y el estado lógico en el editor de manifesto OMEGA.
 * @purpose_en Manages numerical precision and logical state in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:wicnq4
 * @lastUpdated 2026-06-20T09:17:39.464Z
 */

import type { OmegaStyleNode } from '@/types/manifest';

interface PrecisionGovernanceProps {
  values: Partial<OmegaStyleNode>;
  capabilities: string[];
  onChange: (updates: Partial<OmegaStyleNode>) => void;
}

export default function PrecisionGovernance({ values, capabilities, onChange }: PrecisionGovernanceProps) {
  // Domain Ownership: Numerical Logic & Precision (Non-Physical)
  const LOGIC_CAPS = ['precision', 'active', 'tab'];
  const activeCaps = LOGIC_CAPS.filter(cap => capabilities.includes(cap));

  if (activeCaps.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
        {capabilities.includes('precision') && (
          <div className="space-y-1">
            <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest ml-1">Decimal Precision</label>
            <input 
              type="number" min="0" max="6"
              value={values.precision !== undefined ? values.precision : ''}
              onChange={(e) => {
                const val = e.target.value;
                onChange({ precision: val === '' ? undefined : parseInt(val) });
              }}
              className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-mono wb-text outline-none focus:border-accent/40 text-center"
              aria-label="Decimal precision"
            />
          </div>
        )}

        {capabilities.includes('active') && (
          <div className="space-y-1">
            <label className="text-[6px] font-black uppercase wb-text-muted tracking-widest ml-1">Logic State</label>
            <select 
              value={values.active !== false ? 'true' : 'false'}
              onChange={(e) => onChange({ active: e.target.value === 'true' })}
              className="w-full wb-surface-inset border wb-outline rounded-xs px-2 py-1.5 text-[8px] font-bold wb-text outline-none"
            >
              <option value="true">ACTIVE</option>
              <option value="false">DISABLED</option>
            </select>
          </div>
        )}
      </div>
  );
}
