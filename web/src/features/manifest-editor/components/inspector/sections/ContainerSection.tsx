'use client';

/**
 * @purpose Gestiona una sección para el diseño de contenedores en un editor de manifesto OMEGA, incluyendo agregar, actualizar y eliminar contenedores con tarjetas colapsibles.
 * @purpose_en Manages a section for container layout in an OMEGA manifest editor, including adding, updating, and deleting containers with collapsible cards.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:yrvtnq
 * @lastUpdated 2026-06-15T11:38:20.968Z
 */

import { Plus, Layout } from 'lucide-react';
import type { LayoutContainer, OMEGA_Manifest } from '@/types/manifest';
import { useContainerState } from '@/features/manifest-editor/hooks/useContainerState';
import ContainerCard from '../container/ContainerCard';

import InspectorCollapsible from '../shared/InspectorCollapsible';

import IndustrialButton from '../shared/IndustrialButton';
import EmptyState from '../shared/EmptyState';

interface ContainerSectionProps {
  containers: LayoutContainer[];
  manifest: OMEGA_Manifest;
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<LayoutContainer>) => void;
  onRemove: (id: string) => void;
  highlightPath?: string | null | undefined;
  setActiveSection?: ((s: string) => void) | undefined;
}

export default function ContainerSection({
  containers, manifest, onAdd, onUpdate, onRemove, setActiveSection
}: ContainerSectionProps) {
  const { isExpanded, toggleExpand } = useContainerState();

  return (
    <div className="space-y-6 pb-10">
      <InspectorCollapsible 
        title="Layout Architecture" 
        icon={Layout}
      >
        <div className="space-y-4 pt-2">
          <div className="flex justify-end mb-4">
            <IndustrialButton 
              label="Build Container"
              icon={Plus}
              onClick={onAdd}
              size="sm"
            />
          </div>

          <div className="space-y-4">
            {containers.map((container) => (
              <ContainerCard 
                key={container.id}
                container={container}
                isExpanded={isExpanded(container.id)}
                onToggleExpand={() => toggleExpand(container.id)}
                onUpdate={onUpdate}
                onRemove={onRemove}
                manifest={manifest}
                setActiveSection={setActiveSection}
              />
            ))}

            {containers.length === 0 && (
              <EmptyState 
                message="No Infrastructure"
                subMessage="Build containers to frame your components"
                icon={Layout}
              />
            )}
          </div>
        </div>
      </InspectorCollapsible>
    </div>
  );
}
