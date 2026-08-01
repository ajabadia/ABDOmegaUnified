'use client';

/**
 * @purpose Gestiona mapeo arquitectónico entre entidades y contenedores de diseño en el editor de manifesto OMEGA.
 * @purpose_en Manages architectural mapping between entities and layout containers in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1ca0gac
 * @lastUpdated 2026-06-15T11:06:17.977Z
 */

import { Layout, Box } from 'lucide-react';
import type { ManifestEntity, LayoutContainer, OmegaNode } from '@/omega-ui-core/types/manifest';
import { getInspectorModel, buildInspectorPatch } from '@/features/manifest-editor/hooks/entities/ucaInspectorModel';
import InspectorCollapsible from '@/features/manifest-editor/components/inspector/shared/InspectorCollapsible';
 
interface ContainerSelectorProps {
  item: ManifestEntity | OmegaNode;
  onUpdate: (updates: Partial<ManifestEntity> | Partial<OmegaNode>) => void;
  containers: LayoutContainer[];
  onHelp?: (id: string) => void;
  highlightPath?: string | null;
  rootTree?: OmegaNode;
}
 
/**
 * ContainerSelector (Era 7.2.3)
 * Handles architectural mapping between entities and layout containers.
 */
export default function ContainerSelector({ item, onUpdate, containers, onHelp, highlightPath, rootTree }: ContainerSelectorProps) {
  const model = getInspectorModel(item as OmegaNode, rootTree);
  
  return (
    <InspectorCollapsible 
      title="Layout Container (SOT)" 
      icon={Layout}
      onHelp={() => onHelp?.('layout')}
    >
      <div className="space-y-2 pt-2">
        <div className="relative group">
          <select 
            value={model.container || ''} 
            onChange={(e) => onUpdate(buildInspectorPatch(item as OmegaNode, { container: e.target.value || undefined }))}
            className={`w-full bg-black/20 border ${(!model.container || highlightPath?.includes('container')) ? 'border-amber-500 ring-1 ring-amber-500' : 'wb-outline'} rounded-xs px-3 py-3 text-[10px] font-black text-primary outline-none focus:border-primary/40 transition-all appearance-none cursor-pointer [color-scheme:dark]`}
          >
            <option value="" disabled>-- SELECT MANDATORY CONTAINER --</option>
            {containers.map(c => (
              <option key={c.id} value={c.id}>{c.label.toUpperCase()} [{c.tab || 'MAIN'}]</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none wb-text-muted opacity-60 group-hover:opacity-40 transition-opacity">
             <Box className="w-3 h-3" />
          </div>
        </div>
      </div>
    </InspectorCollapsible>
  );
}
