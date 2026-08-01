'use client';

/**
 * @purpose Gestiona una sección colapsable para seleccionar y mostrar el plano activo de construcción en un editor de manifesto OMEGA.
 * @purpose_en Manages a collapsible section for selecting and displaying the active construction plane in an OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:mpdnyv
 * @lastUpdated 2026-06-20T09:16:44.658Z
 */

import { Layers } from 'lucide-react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import InspectorCollapsible from '@/features/manifest-editor/components/inspector/shared/InspectorCollapsible';

interface ModulePlaneSelectorProps {
  manifest: OMEGA_Manifest;
  onUpdate: (updates: Partial<OMEGA_Manifest>) => void;
  standalone?: boolean;
}

const PLANES = [
  { id: 'front',    label: 'Front',    desc: 'Panel visual' },
  { id: 'back',     label: 'Back',     desc: 'Rear connections' },
  { id: 'pcb',      label: 'PCB',      desc: 'Circuit board' },
  { id: 'internal', label: 'Internal', desc: 'Internal layout' },
] as const;

export default function ModulePlaneSelector({ manifest, onUpdate, standalone }: ModulePlaneSelectorProps) {
  const activeTab = manifest.ui?.layout?.activeTab || 'front';

  const content = (
    <div className="space-y-3 pt-2">
      <p className="text-[8px] wb-text-muted font-bold uppercase tracking-wider italic">
        Select the active construction plane for editing.
      </p>

      {/* Tab bar — theme-safe background */}
      <div className="grid grid-cols-4 wb-surface-strong border wb-outline rounded-xs overflow-hidden">
        {PLANES.map(plane => (
          <button
            key={plane.id}
            onClick={() => {
              onUpdate({
                ui: {
                  ...manifest.ui,
                  layout: {
                    width: manifest.ui?.layout?.width ?? 800,
                    height: manifest.ui?.layout?.height ?? 600,
                    ...manifest.ui?.layout,
                    containers: manifest.ui?.layout?.containers || [],
                    activeTab: plane.id
                  }
                }
              });
            }}
            aria-label={`Select plane: ${plane.label}`}
            className={`flex flex-col items-center justify-center py-2 px-1 text-center transition-all border-b-2 ${
              activeTab === plane.id
                ? 'bg-accent/15 text-accent border-accent font-black'
                : 'wb-text-muted border-transparent hover:bg-primary/5 hover:wb-text'
            }`}
            title={plane.desc}
          >
            <span className="text-[8px] font-black uppercase tracking-widest leading-none">{plane.label}</span>
            <span className="text-[6px] opacity-60 normal-case mt-0.5 leading-none hidden sm:block">{plane.desc}</span>
          </button>
        ))}
      </div>

      {/* Active plane info */}
      <div className="flex items-center gap-2 px-2 py-1.5 wb-surface-inset border wb-outline rounded-xs">
        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
        <span className="text-[8px] wb-text-muted uppercase font-bold tracking-wider">
          Editing: <span className="text-accent font-black text-[9px]">{PLANES.find(p => p.id === activeTab)?.label}</span>
          <span className="opacity-50 ml-1 lowercase text-[7px]">— {PLANES.find(p => p.id === activeTab)?.desc}</span>
        </span>
      </div>
    </div>
  );

  if (standalone) return content;

  return (
    <InspectorCollapsible title="Active Construction Plane" icon={Layers}>
      {content}
    </InspectorCollapsible>
  );
}
