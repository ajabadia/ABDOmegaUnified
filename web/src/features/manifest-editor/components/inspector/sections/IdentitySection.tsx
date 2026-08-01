'use client';

/**
 * @purpose Renderiza secciones para gestionar identidad y propiedades de entidades en el editor de manifesto OMEGA.
 * @purpose_en Renders sections for managing identity and properties of entities in the OMEGA manifest editor.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:6,sig:1kajr4o
 * @lastUpdated 2026-06-20T09:16:52.342Z
 */

import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
 
// Modular Sub-components
import EntityIdentity from '@/features/manifest-editor/components/inspector/sections/identity/EntityIdentity';
import ModuleIdentitySection from '@/features/manifest-editor/components/inspector/sections/module/ModuleIdentitySection';
import ModuleChassisSection from '@/features/manifest-editor/components/inspector/sections/module/ModuleChassisSection';
import ModuleSkinSelector from '@/features/manifest-editor/components/inspector/sections/identity/ModuleSkinSelector';
import ModulePlaneSelector from '@/features/manifest-editor/components/inspector/sections/identity/ModulePlaneSelector';
 
interface IdentitySectionProps {
  item: OMEGA_Manifest | OmegaNode;
  onUpdate: (updates: Partial<OMEGA_Manifest> | Partial<OmegaNode>) => void;
  onHelp?: ((sectionId: string) => void) | undefined;
  rootManifest?: OMEGA_Manifest | undefined;
  rootTree?: OmegaNode | undefined;
  highlightPath?: (string | null) | undefined;
  resolveAsset: (id: string | undefined) => string | undefined;
  exportSelectedAsBlueprint?: ((id: string) => void) | undefined;
  onSaveGroupAsBlueprint?: ((groupNode: import('@/omega-ui-core/types/rack').GroupNode) => void) | undefined;
}
 
export default function IdentitySection({  item,
  onUpdate,
  rootManifest,
  rootTree,
  resolveAsset,
  exportSelectedAsBlueprint,
}: IdentitySectionProps) {
  const isModule = 'metadata' in item;
 
  if (!isModule) {
    return (
      <EntityIdentity 
        entity={item as OmegaNode} 
        rootManifest={rootManifest} 
        rootTree={rootTree}
        onUpdate={(u) => onUpdate(u)} 
        exportSelectedAsBlueprint={exportSelectedAsBlueprint}
      />
    );
  }
 
  const manifest = item as OMEGA_Manifest;  return (
    <div className="space-y-2">
      <ModuleIdentitySection 
        manifest={manifest} 
        onUpdate={(u: Partial<OMEGA_Manifest>) => onUpdate(u)} 
        resolveAsset={resolveAsset}
      />

      <div className="grid grid-cols-2 gap-2">
        <ModuleSkinSelector 
          manifest={manifest} 
          onUpdate={(u: Partial<OMEGA_Manifest>) => onUpdate(u)} 
        />
        <ModulePlaneSelector 
          manifest={manifest}
          onUpdate={(u: Partial<OMEGA_Manifest>) => onUpdate(u)}
        />
      </div>

      <ModuleChassisSection 
        manifest={manifest} 
        onUpdate={(u: Partial<OMEGA_Manifest>) => onUpdate(u)} 
      />
    </div>
  );
}
