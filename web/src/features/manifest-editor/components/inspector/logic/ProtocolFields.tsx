'use client';

/**
 * @purpose Gestiona una sección colapsable para editar configuraciones del protocolo técnico en el editor de manifesto OMEGA.
 * @purpose_en Manages a collapsible section for editing technical protocol settings in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:i1sx5i
 * @lastUpdated 2026-06-15T11:31:21.741Z
 */

import { Box } from 'lucide-react';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';

import InspectorCollapsible from '../shared/InspectorCollapsible';

interface ProtocolFieldsProps {
  item: OmegaNode;
  isHighlighted: (key: string) => boolean;
  onUpdate: (updates: Partial<OmegaNode>) => void;
}

export function ProtocolFields({ item, isHighlighted, onUpdate }: ProtocolFieldsProps) {
  return (
    <InspectorCollapsible 
      title="Technical Protocol" 
      icon={Box}
    >
      <div className="space-y-3 pt-2">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[8px] font-bold wb-text-muted uppercase ml-1">Normalizer Type</label>
            <select 
              value={item.role || 'control'} 
              onChange={(e) => onUpdate({ role: e.target.value })}
              className={`w-full wb-surface-subtle border ${isHighlighted('role') ? 'border-amber-500 ring-1 ring-amber-500 animate-pulse' : 'wb-outline'} rounded-xs px-3 py-2 text-[10px] font-bold wb-text outline-none appearance-none transition-colors duration-500 [color-scheme:dark]`}
            >
              <option value="control">Control (Float)</option>
              <option value="telemetry">Telemetry (Float)</option>
              <option value="expert">Expert (Internal)</option>
              <option value="stream">Stream (Buffer)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[8px] font-bold wb-text-muted uppercase ml-1">Step (Resolution)</label>
            <input 
              type="number" 
              step="0.001"
              value={((item.style as Record<string, unknown>)?.step as number) || 0.01} 
              onChange={(e) => onUpdate({ style: { ...(item.style || {}), step: parseFloat(e.target.value) } })}
              className="w-full wb-surface-subtle border wb-outline rounded-xs px-3 py-2 text-[10px] font-mono text-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[8px] font-bold wb-text-muted uppercase ml-1">Unit Suffix</label>
            <input 
              type="text" 
              placeholder="Hz, dB, %"
              value={((item.style as Record<string, unknown>)?.unit as string) || ''} 
              onChange={(e) => onUpdate({ style: { ...(item.style || {}), unit: e.target.value } })}
              className="w-full wb-surface-subtle border wb-outline rounded-xs px-3 py-2 text-[10px] font-mono text-primary outline-none transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[8px] font-bold wb-text-muted uppercase ml-1">Display Decimals</label>
            <input 
              type="number" 
              min="0" 
              max="4"
              value={((item.style as Record<string, unknown>)?.precision as number) ?? 2} 
              onChange={(e) => onUpdate({ style: { ...(item.style || {}), precision: parseInt(e.target.value) } })}
              className="w-full wb-surface-subtle border wb-outline rounded-xs px-3 py-2 text-[10px] font-mono text-primary outline-none transition-all"
            />
          </div>
        </div>
      </div>
    </InspectorCollapsible>
  );
}
