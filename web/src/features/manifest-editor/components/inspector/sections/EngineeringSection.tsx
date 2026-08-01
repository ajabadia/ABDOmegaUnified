/**
 * @purpose Renderiza una sección colapsable para seleccionar y actualizar roles de ingenieria en un editor de manifesto OMEGA.
 * @purpose_en Renders a collapsible section for selecting and updating engineering roles in an OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:l0mo29
 * @lastUpdated 2026-06-15T11:38:31.547Z
 */

import { Layers } from 'lucide-react';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';

import InspectorCollapsible from '../shared/InspectorCollapsible';

interface EngineeringSectionProps {
  item: OmegaNode;
  onUpdate: (updates: Partial<OmegaNode>) => void;
  onHelp?: ((sectionId: string) => void) | undefined;
  highlightPath?: (string | null) | undefined;
  standalone?: boolean;
}

export default function EngineeringSection({ item, onUpdate, onHelp, highlightPath, standalone }: EngineeringSectionProps) {
  const isHighlighted = (key: string) => !!highlightPath?.includes(key);

  const content = (
    <div className="space-y-4 pt-2">
      <p className="text-[8px] wb-text-muted leading-relaxed uppercase font-bold tracking-wider italic">
        * Roles define the governance behavior of this entity within the OMEGA C++ Registry.
      </p>
      <div className="grid grid-cols-4 wb-surface-strong border wb-outline rounded-xs overflow-hidden">
        {['control', 'input', 'output', 'telemetry', 'expert', 'stream', 'mod_source', 'mod_target'].map(role => {
          const isActive = (item.role || 'control') === role;
          return (
            <button
              key={role}
              onClick={() => onUpdate({ role })}
              className={`flex flex-col items-center justify-center py-2 px-1 text-center transition-all border-b-2 ${
                isHighlighted('role') ? 'border-amber-500 ring-1 ring-amber-500 animate-pulse' : ''
              } ${
                isActive
                  ? 'bg-primary/15 text-primary border-primary font-black'
                  : 'wb-text-muted border-transparent hover:bg-primary/5 hover:wb-text'
              }`}
            >
              <span className="text-[8px] font-black uppercase tracking-widest leading-none">{role.replace('_', ' ')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (standalone) return content;

  return (
    <InspectorCollapsible 
      title="Low-Level Registry Role" 
      icon={Layers}
      onHelp={() => onHelp?.('logic')}
    >
      {content}
    </InspectorCollapsible>
  );
}
