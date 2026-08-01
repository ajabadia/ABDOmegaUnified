'use client';

/**
 * @purpose Renderiza una pestaña para inspeccionar y editar propiedades de entidades seleccionadas en el editor de manifesto OMEGA.
 * @purpose_en Renders a panel for inspecting and editing properties of selected entities in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:8t5jps
 * @lastUpdated 2026-06-20T12:52:14.480Z
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

import PropertyPanel from './PropertyPanel';
import type { OMEGA_Manifest, LayoutContainer, ManifestEntity, OMEGA_Modulation, ExtraResource, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { V2BlueprintData } from '@/omega-ui-core/types';
import type { AuditResult } from '@/omega-ui-core/types/audit';
import { findNodeInTree } from '@/features/manifest-editor/hooks/entities/ucaInspectorAdapter';

interface WorkbenchInspectorProps {
  // isVisible: boolean; (unused)
  isLiveMode: boolean;
  uiTheme: 'dark' | 'light' | 'amber' | 'cyberpunk' | 'high-contrast';
  manifest: OMEGA_Manifest;
  selectedItem: ManifestEntity | OmegaNode | OMEGA_Manifest | null;
  selectedItemId: string | null;
  highlightPath: string | null;
  availableBinds: string[];
  extraResources: ExtraResource[];
  audit: AuditResult;
  onUpdateItem: (id: string, updates: Partial<ManifestEntity> | Partial<OmegaNode>) => void;
  onUpdateManifest: (updates: Partial<OMEGA_Manifest>) => void;
  onSelectItem: (id: string | null) => void;
  onAddEntity: (type: 'control' | 'jack') => void;
  onDuplicateItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onAddModulation: (mod: OMEGA_Modulation) => void;
  onRemoveModulation: (id: string) => void;
  onUpdateModulation: (id: string, updates: Partial<OMEGA_Modulation>) => void;
  onOpenModGrid: () => void;
  addContainer: (c?: Partial<LayoutContainer>) => void;
  updateContainer: (id: string, updates: Partial<LayoutContainer>) => void;
  removeContainer: (id: string) => void;
  onHelp: (sectionId?: string | undefined) => void;
  onRemoveResource: (name: string) => void;
  resolveAsset: (id: string | undefined) => string | undefined;
  onTriggerUpload: (id: string) => void;
  onOpenConfig?: (() => void) | undefined;
  onOpenLibrary?: (() => void) | undefined;
  onSelectBlueprint?: ((blueprint: V2BlueprintData) => void) | undefined;
  exportSelectedAsBlueprint?: ((id: string) => void) | undefined;
  /** Called when user clicks "Save as Blueprint..." on a group */
  onSaveGroupAsBlueprint?: ((groupNode: import('@/omega-ui-core/types/rack').GroupNode) => void) | undefined;
  /** Called when user clicks "Ungroup" to dissolve the selected group */
  onUngroupNode?: ((groupId: string) => void) | undefined;
  
  // Pin & Route (Era 8)
  pinnedNodeId: string | null;
  onTogglePin: (id: string | null) => void;
  layout: import('../../types/workbench').WorkbenchLayout;
  onSetLayoutRatio: (ratio: number) => void;
  onSetLayoutRatioEnd?: (() => void) | undefined;
  multiSelectedIds: string[];
  onSelectMultiple: (ids: string[]) => void;
  visibleSections?: {
    identity?: boolean;
    essentialIdentity?: boolean;
    identityBranding?: boolean;
    globalUiSkin?: boolean;
    activeConstructionPlane?: boolean;
    moduleTaxonomy?: boolean;
    physicalEmulationProfile?: boolean;
    aestheticsGlobals?: boolean;
    aestheticsElements?: boolean;
    architecture?: boolean;
    diagnostics?: boolean;
  } | undefined;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
  activeSection?: string | undefined;
  onToggleRackSection?: ((section: string) => void) | undefined;
}

import { HorizontalSplitDivider } from './layout/HorizontalSplitDivider';

export function WorkbenchInspector({
  pinnedNodeId,
  onTogglePin,
  layout,
  onSetLayoutRatio,
  onSetLayoutRatioEnd,
  ...props
}: WorkbenchInspectorProps) {
  // ASEPTIC HANDLERS...
  const handleUpdate = (updates: Partial<OMEGA_Manifest> | Partial<ManifestEntity> | Partial<OmegaNode>) => {
    const isRackNode = props.selectedItemId && props.manifest?.ui?.tree?.id === props.selectedItemId;
    if (props.selectedItemId && !isRackNode) {
      props.onUpdateItem(props.selectedItemId, updates as unknown as Partial<OmegaNode>);
      if (updates.id && updates.id !== props.selectedItemId) {
        props.onSelectItem(updates.id);
      }
    } else {
      props.onUpdateManifest(updates as Partial<OMEGA_Manifest>);
    }
  };

  // Resolve Pinned Item (Era 8)
  const pinnedItem = React.useMemo(() => {
    if (!pinnedNodeId || !props.manifest) return null;
    const tree = props.manifest.ui?.tree;
    if (!tree) return null;
    
    // Industrial Resolution (UCA + Entities)
    const treeNode = findNodeInTree(tree, pinnedNodeId);
    if (treeNode) return treeNode;

    return (props.manifest.entities as unknown as OmegaNode[])?.find(e => e.id === pinnedNodeId);
  }, [pinnedNodeId, props.manifest]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0d0d]">
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {!props.isLiveMode && (
          <div className="flex-1 flex flex-col overflow-hidden divide-y divide-white/5">
            {/* PINNED PANEL (REFERENCE) */}
            {pinnedItem && (
               <div 
                 className="overflow-hidden flex flex-col bg-amber-500/[0.02]"
                 style={{ height: `${layout.ratio * 100}%` }}
               >
                  <PropertyPanel 
                    {...props}
                    item={pinnedItem}
                    mode="reference"
                    onClose={() => onTogglePin(null)}
                    onPin={() => onTogglePin(null)}
                    isPinned={true}
                    onUpdate={handleUpdate}
                  />
               </div>
            )}

            {/* RESIZABLE DIVIDER (Era 8) */}
            {pinnedItem && (
               <HorizontalSplitDivider 
                 onDrag={(delta) => onSetLayoutRatio(Math.min(0.8, Math.max(0.2, layout.ratio + delta)))} 
                 onDragEnd={onSetLayoutRatioEnd}
               />
            )}

            {/* ACTIVE PANEL (SELECTION) */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {(() => {
                const isGroup = props.selectedItem && 'kind' in props.selectedItem && (props.selectedItem.kind === 'group' || props.selectedItem.kind === 'container');
                const descendantCellIds = isGroup ? (() => {
                  const ids: string[] = [];
                  const walk = (n: any) => {
                    if (n.kind === 'cell' || n.kind === 'port') {
                      ids.push(n.id);
                    }
                    n.children?.forEach(walk);
                  };
                  walk(props.selectedItem);
                  return ids;
                })() : [];

                const activeMultiSelectedIds = props.multiSelectedIds.length > 1 
                  ? props.multiSelectedIds 
                  : (descendantCellIds.length > 0 ? descendantCellIds : props.multiSelectedIds);

                const activeMode = props.multiSelectedIds.length > 1 
                  ? "bulk" 
                  : (descendantCellIds.length > 0 ? "bulk" : "active");

                return (
                  <PropertyPanel 
                    {...props}
                    item={props.selectedItem!} 
                    multiSelectedIds={activeMultiSelectedIds}
                    mode={activeMode}
                    onClose={() => {
                      props.onSelectItem(null);
                      props.onSelectMultiple([]);
                    }}
                    onPin={() => onTogglePin(props.selectedItemId)}
                    isPinned={pinnedNodeId === props.selectedItemId}
                    onUpdate={handleUpdate}
                  />
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
