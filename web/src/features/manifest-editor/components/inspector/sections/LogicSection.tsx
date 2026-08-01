'use client';

/**
 * @purpose Renderiza una sección para editar propiedades lógicas de nodos manifesto en el editor de manifesto OMEGA, incluyendo campos de vinculación, seleccionadores de rol, ajustes de protocolo y botones para seleccionar componentes.
 * @purpose_en Renders a section for editing logic properties of manifest nodes in the OMEGA manifest editor, including binding fields, role selectors, protocol adjustments, and component picker buttons.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:1vznvmt
 * @lastUpdated 2026-06-15T11:39:29.779Z
 */

import { Box } from 'lucide-react';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';
import { BindingField } from '@/features/manifest-editor/components/inspector/logic/BindingField';
import { RoleSelector } from '@/features/manifest-editor/components/inspector/logic/RoleSelector';
import { ProtocolFields } from '@/features/manifest-editor/components/inspector/logic/ProtocolFields';
import InspectorCollapsible from '@/features/manifest-editor/components/inspector/shared/InspectorCollapsible';
 
import { OMEGA_ELEMENT_CATALOG } from '@/omega-ui-core/governance/ElementCatalog';
 
interface LogicSectionProps {
  item: OmegaNode;
  onUpdate: (updates: Partial<OmegaNode>) => void;
  availableBinds?: string[] | undefined;
  onHelp?: ((sectionId: string) => void) | undefined;
  highlightPath?: (string | null) | undefined;
}
 
const EXTENDED_ROLES = ['control', 'input', 'output', 'telemetry', 'expert', 'stream', 'mod_source', 'mod_target'];
 
export default function LogicSection({ item, onUpdate, availableBinds = [], onHelp, highlightPath }: LogicSectionProps) {
  const currentType = item.cellRef || item.kind || 'knob';
  const isHighlighted = (key: string) => !!highlightPath?.includes(key);
 
  const updateType = (type: string) => {
    onUpdate({ cellRef: type });
  };
 
  return (
    <div className="space-y-4 pt-2">
      <BindingField 
        item={item} 
        availableBinds={availableBinds} 
        isHighlighted={isHighlighted} 
        onUpdate={onUpdate} 
        onHelp={onHelp} 
      />
 
      <RoleSelector 
        item={item} 
        roles={EXTENDED_ROLES} 
        isHighlighted={isHighlighted} 
        onUpdate={onUpdate} 
        onHelp={onHelp} 
      />
 
      <ProtocolFields 
        item={item} 
        isHighlighted={isHighlighted} 
        onUpdate={onUpdate} 
      />
 
      <InspectorCollapsible title="Component Blueprint" icon={Box}>
        <div className="grid grid-cols-5 gap-1.5 pt-2">
          {OMEGA_ELEMENT_CATALOG.filter(e => e.category !== 'rack').map((type) => (
            <button
              key={type.id}
              onClick={() => updateType(type.id)}
              className={`flex flex-col items-center justify-center gap-1.5 py-2.5 border rounded-xs transition-all ${
                isHighlighted('component') ? 'border-amber-500 ring-1 ring-amber-500 animate-pulse' : ''
              } ${
                currentType === type.id 
                  ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(0,240,255,0.1)]' 
                  : 'wb-surface-subtle wb-outline wb-text-muted hover:wb-text transition-colors duration-500'
              }`}
            >
              <span className="text-[10px] grayscale brightness-150">{type.icon || '📦'}</span>
              <span className="text-[6px] font-black uppercase tracking-tighter text-center leading-none px-0.5">{type.label}</span>
            </button>
          ))}
        </div>
      </InspectorCollapsible>
    </div>
  );
}
