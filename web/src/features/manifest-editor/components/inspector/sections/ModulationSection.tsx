'use client';

/**
 * @purpose Gestiona una sección para gestionar las modificaciones de rutas internas en un editor de manifesto OMEGA, incluyendo agregar y actualizar modificaciones.
 * @purpose_en Manages a section for managing internal routing modulations in an OMEGA manifest editor, including adding and updating modulations.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:rwzbtz
 * @lastUpdated 2026-06-15T11:39:35.328Z
 */

import React from 'react';
import { Plus, Activity, LayoutGrid } from 'lucide-react';
import type { OMEGA_Manifest, OMEGA_Modulation, ManifestEntity } from '@/omega-ui-core/types/manifest';
import { ModulationItem } from '../ModulationItem';
import InspectorCollapsible from '../shared/InspectorCollapsible';
 
interface ModulationSectionProps {
  manifest: OMEGA_Manifest;
  onAdd: (mod: OMEGA_Modulation) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<OMEGA_Modulation>) => void;
  onOpenModGrid?: (() => void) | undefined;
  onHelp?: ((sectionId?: string) => void) | undefined;
}
 
import IndustrialButton from '../shared/IndustrialButton';
import EmptyState from '../shared/EmptyState';

export default function ModulationSection({ manifest, onAdd, onRemove, onUpdate, onOpenModGrid, onHelp }: ModulationSectionProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  
  const allEntities: ManifestEntity[] = [
    ...(manifest.ui?.controls || []),
    ...(manifest.ui?.jacks || [])
  ];

  const handleAdd = () => {
    const id = `mod_${Date.now()}`;
    onAdd({
      id,
      source: allEntities[0]?.id || '',
      target: allEntities[1]?.id || '',
      amount: 1.0,
      type: 'unipolar'
    });
    setExpandedId(id);
  };

  return (
    <div className="space-y-4 pt-2">
      <InspectorCollapsible 
        title="Internal Routings" 
        icon={Activity}
        onHelp={() => onHelp?.('modulaciones')}
      >
        <div className="space-y-4 pt-2">
          <div className="flex justify-end gap-2 mb-2">
            <IndustrialButton 
              label="Open Matrix"
              icon={LayoutGrid}
              onClick={onOpenModGrid!}
              size="sm"
            />
            <IndustrialButton 
              label=""
              icon={Plus}
              onClick={handleAdd}
              size="sm"
              variant="primary"
            />
          </div>

          <div className="space-y-1.5">
            {(manifest.modulations || []).map((mod) => (
              <ModulationItem 
                key={mod.id}
                mod={mod}
                isExpanded={expandedId === mod.id}
                onToggle={() => setExpandedId(expandedId === mod.id ? null : mod.id)}
                onUpdate={onUpdate}
                onRemove={onRemove}
                allEntities={allEntities}
              />
            ))}

            {(!manifest.modulations || manifest.modulations.length === 0) && (
              <EmptyState 
                message="No Internal Routings"
                subMessage="Define modulation paths between controls and jacks"
                icon={Activity}
              />
            )}
          </div>
        </div>
      </InspectorCollapsible>
    </div>
  );
}
