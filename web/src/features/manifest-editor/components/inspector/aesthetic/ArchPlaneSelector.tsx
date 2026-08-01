'use client';

/**
 * @purpose Renderiza un componente colapsable para seleccionar y actualizar la pestaña en la presentación de una entidad ArchPlane.
 * @purpose_en Renders a collapsible component for selecting and updating the tab in an ArchPlane entity's presentation.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:3,sig:15l4gy6
 * @lastUpdated 2026-06-17T22:30:52.693Z
 */

import { Layers } from 'lucide-react';
import type { ManifestEntity, TabName, Presentation } from '@/omega-ui-core/types/manifest';
import InspectorCollapsible from '../shared/InspectorCollapsible';
 
interface ArchPlaneSelectorProps {
  item: ManifestEntity;
  onUpdate: (updates: Partial<ManifestEntity>) => void;
  onHelp?: ((id: string) => void) | undefined;
}
 
export default function ArchPlaneSelector({ item, onUpdate, onHelp }: ArchPlaneSelectorProps) {
  return (
    <InspectorCollapsible 
      title="Era 7 Plane (Tab)" 
      icon={Layers}
      onHelp={() => onHelp?.('tabs')}
    >
      <div className="grid grid-cols-5 gap-1.5 pt-2">
        {(['MAIN', 'FX', 'EDIT', 'MIDI', 'MOD'] as TabName[]).map(t => (
          <button
            key={t}
            onClick={() => {
              if (!item.presentation) return;
              onUpdate({ 
                presentation: { 
                  ...item.presentation, 
                  tab: t 
                } as Presentation 
              });
            }}
            aria-label={`Select tab ${t}`}
            className={`py-2 text-[7px] font-black uppercase rounded-xs border transition-all text-center ${
              (item.presentation?.tab || 'MAIN') === t 
                ? 'bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(0,240,255,0.1)]' 
                : 'bg-black/5 wb-outline wb-text-muted hover:wb-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </InspectorCollapsible>
  );
}
