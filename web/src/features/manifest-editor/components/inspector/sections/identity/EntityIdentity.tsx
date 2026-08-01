'use client';

/**
 * @purpose Renderiza un componente para editar propiedades de identidad como tipo, ID canonical, autoridad y etiqueta de visualización de entidades manifestadas en el editor de manifesto OMEGA.
 * @purpose_en Renders a component for editing identity properties such as type, canonical ID, authority, and display label of manifest entities in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:1b0z7hv
 * @lastUpdated 2026-06-20T09:16:40.360Z
 */

import React from 'react';
import type { ManifestEntity, OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import { getInspectorModel, buildInspectorPatch } from '@/features/manifest-editor/hooks/entities/ucaInspectorModel';
import { AlertTriangle, Download } from 'lucide-react';
import { ContractService } from '@/services/contractService';
 
interface EntityIdentityProps {
  entity: ManifestEntity | OmegaNode;
  rootManifest?: OMEGA_Manifest | undefined;
  rootTree?: OmegaNode | undefined;
  onUpdate: (updates: Partial<ManifestEntity> | Partial<OmegaNode>) => void;
  onHelp?: ((id: string) => void) | undefined;
  exportSelectedAsBlueprint?: ((id: string) => void) | undefined;
}
 
import PropertyField from '../../PropertyField';
import { IndustrialInput } from '@/features/manifest-editor/components/primitives/IndustrialInput';
 
export default function EntityIdentity({ entity, rootManifest, rootTree, onUpdate, exportSelectedAsBlueprint }: EntityIdentityProps) {
  const model = getInspectorModel(entity, rootTree, rootManifest?.moduleTemplates);
 
  const getAuthority = () => {
    if (!rootManifest) return null;
    const useUCA = rootManifest.ui?.useUCA ?? !!rootManifest.nodes?.[0];
    if (useUCA) {
      const { parameters, ports } = ContractService.collectUcaEntities(rootManifest);
      const pIdx = parameters.findIndex(p => p.id === model.id);
      if (pIdx !== -1) return { type: 'ParamId', value: pIdx };
      const ptIdx = ports.findIndex(pt => pt.id === model.id);
      if (ptIdx !== -1) return { type: 'PortId', value: ptIdx };
    } else {
      const cIdx = (rootManifest.ui?.controls || []).findIndex(c => c.id === model.id);
      if (cIdx !== -1) return { type: 'ParamId', value: cIdx };
      const jIdx = (rootManifest.ui?.jacks || []).findIndex(j => j.id === model.id);
      if (jIdx !== -1) return { type: 'PortId', value: jIdx };
    }
    return null;
  };
  const auth = getAuthority();

  const isDuplicateId = React.useMemo(() => {
    if (!rootManifest || !model.id) return false;

    const isCurrentEntity = (id: string) => {
      const entityId = 'id' in entity ? entity.id : undefined;
      return !!entityId && id === entityId;
    };

    const useUCA = rootManifest.ui?.useUCA ?? !!rootManifest.nodes?.[0];
    if (useUCA) {
      const { parameters, ports } = ContractService.collectUcaEntities(rootManifest);
      const containers: string[] = [];
      const collectContainers = (node: OmegaNode) => {
        if (node.kind === 'container' || node.role === 'container') {
          containers.push(node.id);
        }
        if (node.children) {
          node.children.forEach(collectContainers);
        }
      };
      const rootNode = rootManifest.nodes?.[0] || rootManifest.ui?.tree;
      if (rootNode) collectContainers(rootNode);

      const duplicateInParams = parameters.some(p => p.id === model.id && !isCurrentEntity(p.id));
      const duplicateInPorts = ports.some(pt => pt.id === model.id && !isCurrentEntity(pt.id));
      const duplicateInContainers = containers.some(c => c === model.id && !isCurrentEntity(c));

      return duplicateInParams || duplicateInPorts || duplicateInContainers;
    } else {
      const controls = rootManifest.ui?.controls || [];
      const jacks = rootManifest.ui?.jacks || [];

      const isCurrentEntityLegacy = (item: ManifestEntity) => {
        if (item === entity) return true;
        const entityId = 'id' in entity ? entity.id : undefined;
        if (entityId && item.id === entityId) return true;
        return false;
      };

      const duplicateInControls = controls.some(c => c.id === model.id && !isCurrentEntityLegacy(c));
      const duplicateInJacks = jacks.some(j => j.id === model.id && !isCurrentEntityLegacy(j));

      return duplicateInControls || duplicateInJacks;
    }
  }, [rootManifest, model.id, entity]);
 
  return (
    <div className="space-y-3">
      {/* Row 1: Type | Canonical ID | Authority */}
      <div className="grid grid-cols-8 gap-2">
        <div className="col-span-1">
          <PropertyField label="Type">
            <IndustrialInput 
              value={('kind' in entity ? entity.kind : (entity as ManifestEntity).type) || ''}
              onChange={() => {}}
              readOnly
              mono
              align="center"
            />
          </PropertyField>
        </div>

        <div className={auth ? "col-span-6" : "col-span-7"}>
          <PropertyField label="Canonical ID (Unique)" {...(isDuplicateId ? { status: 'error' as const } : {})}>
            <div className="relative flex items-center">
              <IndustrialInput 
                value={model.id} 
                onChange={(v) => onUpdate(buildInspectorPatch(entity, { id: v }))}
                disabled={model.governance?.['id'] === 'locked'}
                mono
                className={`${isDuplicateId ? 'border-red-500 ring-1 ring-red-500 pr-7' : ''}`}
              />
              {isDuplicateId && (
                <div className="absolute right-2 text-red-500 flex items-center pointer-events-none">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            {isDuplicateId && (
              <div className="text-[7px] text-red-500 font-bold mt-1 flex items-center gap-1 animate-pulse uppercase">
                <span>Conflicto de ID: Este identificador ya está en uso en el módulo</span>
              </div>
            )}
          </PropertyField>
        </div>

        {auth && (
          <div className="col-span-1">
            <PropertyField label="Authority">
              <div className="flex items-center gap-1 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full w-fit">
                <span className="text-[6px] text-primary font-black uppercase">{auth.type}:</span>
                <span className="text-[6px] text-primary font-mono font-bold">#{auth.value}</span>
              </div>
            </PropertyField>
          </div>
        )}
      </div>

      {/* Row 2: Display Label */}
      <div className="grid grid-cols-5 gap-2">
        <div className="col-span-5">
          <PropertyField label="Display Label">
            <IndustrialInput 
              value={('label' in entity ? entity.label : (entity as OmegaNode).meta?.label as string) || ''} 
              onChange={(v) => onUpdate('label' in entity ? { label: v } : { meta: { ...((entity as OmegaNode).meta || {}), label: v } })}
              disabled={model.governance?.['label'] === 'locked'}
              className="font-bold"
            />
          </PropertyField>
        </div>
      </div>

      {exportSelectedAsBlueprint && 'kind' in entity && (
        <button
          onClick={() => exportSelectedAsBlueprint(entity.id)}
          aria-label="Export as blueprint"
          className="mt-3 w-full flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 rounded-xs py-2 px-3 text-[8px] font-black uppercase tracking-wider transition-all duration-300"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar como Blueprint</span>
        </button>
      )}
    </div>
  );
}
