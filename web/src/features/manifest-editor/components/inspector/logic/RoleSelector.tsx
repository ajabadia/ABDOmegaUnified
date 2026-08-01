'use client';

/**
 * @purpose Renderiza un componente de dropdown para seleccionar y actualizar roles en el editor de manifesto OmegaNode.
 * @purpose_en Renders a dropdown component for selecting and updating roles in an OmegaNode manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:k7kduq
 * @lastUpdated 2026-06-15T11:31:24.702Z
 */

import { Layers } from 'lucide-react';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';

import InspectorCollapsible from '../shared/InspectorCollapsible';

interface RoleSelectorProps {
  item: OmegaNode;
  roles: string[];
  isHighlighted: (key: string) => boolean;
  onUpdate: (updates: Partial<OmegaNode>) => void;
  onHelp?: ((id: string) => void) | undefined;
}

export function RoleSelector({ item, roles, isHighlighted, onUpdate, onHelp }: RoleSelectorProps) {
  return (
    <InspectorCollapsible 
      title="Industrial Role (Registry)" 
      icon={Layers}
      onHelp={() => onHelp?.('logic')}
    >
      <div className="flex flex-wrap gap-1.5 pt-2">
        {roles.map(role => (
          <button
            key={role}
            onClick={() => onUpdate({ role: role })}
            className={`px-2 py-1 text-[7px] font-black uppercase tracking-tighter border rounded-full transition-all ${
              isHighlighted('role') ? 'border-amber-500 ring-1 ring-amber-500 animate-pulse' : ''
            } ${
              (item.role || 'control') === role 
                ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(0,240,255,0.1)]' 
                : 'bg-black/5 wb-outline wb-text-muted hover:wb-text'
            }`}
          >
            {role}
          </button>
        ))}
      </div>
    </InspectorCollapsible>
  );
}
