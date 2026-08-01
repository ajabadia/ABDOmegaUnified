'use client';

/**
 * @purpose Renderiza un menú desplegable para seleccionar el tipo y posición de la manifestación en el editor OMEGA.
 * @purpose_en Renders a dropdown menu for selecting attachment type and position in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:1008j1r
 * @lastUpdated 2026-06-15T11:05:34.975Z
 */

import { Activity } from 'lucide-react';

import type { Attachment, AttachmentType } from '@/types/manifest';
import { OMEGA_ELEMENT_CATALOG, getElementDefinition } from '@/omega-ui-core/governance/ElementCatalog';

interface AttachmentTypeAnchorProps {
  type: AttachmentType;
  hostType: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  isCore: boolean;
  onUpdate: (updates: Partial<Attachment>) => void;
}

export default function AttachmentTypeAnchor({ type, hostType, position, isCore, onUpdate }: AttachmentTypeAnchorProps) {
  const hostDef = getElementDefinition(hostType);
  const allowedIds = hostDef?.allowedFragments || [];

  // Filter elements that are either explicitly allowed or have a general fragment role
  const availableFragments = OMEGA_ELEMENT_CATALOG.filter(e => 
    allowedIds.includes(e.id) || 
    (e.attachmentRole === 'fragment' && e.id !== hostType) // General fragments, but not self
  );

  return (
    <div className="grid grid-cols-2 gap-3 pt-1">
      <div className="space-y-1">
        <label className="text-[7px] wb-text-muted uppercase font-black flex items-center gap-1 tracking-widest transition-colors duration-500">
          <Activity className="w-2 h-2" />
          <span>Fragment Type</span>
        </label>
        <select 
          value={type} 
          disabled={isCore}
          onChange={(e) => onUpdate({ type: e.target.value as AttachmentType })}
          className={`w-full wb-surface-inset border wb-outline rounded-xs p-1.5 text-[9px] outline-none font-bold transition-colors duration-500 shadow-sm ${isCore ? 'opacity-50 cursor-not-allowed' : 'text-primary hover:border-primary/40'} transition-all [color-scheme:dark]`}
        >
          {availableFragments.length > 0 ? (
            availableFragments.map(f => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))
          ) : (
            <option value={type}>{type}</option>
          )}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-[7px] wb-text-muted uppercase font-black flex items-center gap-1 tracking-widest transition-colors duration-500">
           <Activity className="w-2 h-2 opacity-40 rotate-90" />
           <span>Anchor Position</span>
        </label>
        <select 
          value={position || 'center'} 
          disabled={isCore}
          onChange={(e) => onUpdate({ position: e.target.value as 'top' | 'bottom' | 'left' | 'right' | 'center' })}
          className={`w-full wb-surface-inset border wb-outline rounded-xs p-1.5 text-[9px] outline-none font-bold transition-colors duration-500 shadow-sm ${isCore ? 'opacity-50 cursor-not-allowed' : 'text-foreground hover:border-accent/40'} transition-all [color-scheme:dark]`}
        >
          <option value="center">Center (Core)</option>
          <option value="top">Top (3U/1U)</option>
          <option value="bottom">Bottom</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>
    </div>
  );
}
