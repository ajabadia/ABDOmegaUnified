'use client';

/**
 * @purpose Renderiza un componente inline o editor de grupo para el panel de propiedad en el editor de manifesto OMEGA.
 * @purpose_en Renders an inline component or group editor for the PropertyPanel in the OMEGA manifest editor.
 * @refactorable true (contains complex state and UI logic that could be split into smaller subcomponents)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:2,imports:4,sig:1ytdzlo
 * @lastUpdated 2026-06-20T20:07:17.322Z
 */

import React from 'react';
import type { OmegaNode, HybridEntityUpdate, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import type { ComponentNode, ComponentType, GroupNode, ComponentStyle, RackManifest } from '@/omega-ui-core/types/rack';
import { ComponentEditor } from '@/features/manifest-editor/components/inspector/editors';

import { CONTROL_DEFINITIONS } from '../../constants/entityDefinitions';

const KIND_TO_COMPONENT_TYPE: Record<string, ComponentType> = (() => {
  const map: Record<string, ComponentType> = {
    'port': 'port',
    'select': 'select',
    'illustration': 'illustration',
    'scope': 'scope',
    'terminal': 'terminal',
  };
  CONTROL_DEFINITIONS.forEach((def) => {
    let baseType = def.type;
    if (baseType.startsWith('slider')) {
      map[baseType] = 'slider';
    } else {
      map[baseType] = baseType as ComponentType;
    }
  });
  return map;
})();

export interface NodeComponentEditorProps {
  node: OmegaNode;
  manifest?: OMEGA_Manifest | undefined;
  onUpdate?: ((updates: Partial<OMEGA_Manifest> | HybridEntityUpdate) => void) | undefined;
  inspectorLevel?: 'simple' | 'medium' | 'advanced' | undefined;
  onSaveGroupAsBlueprint?: ((groupNode: GroupNode, exposedParams?: import('@/features/manifest-editor/components/modals/ExposeParametersDialog').ExposedParam[]) => void) | undefined;
  onUngroupNode?: ((groupId: string) => void) | undefined;
}

export default function NodeComponentEditor({
  node,
  manifest,
  onUpdate,
  inspectorLevel,
  onSaveGroupAsBlueprint,
  onUngroupNode,
}: NodeComponentEditorProps): React.ReactNode | null {
  if (node.kind === 'cell' || node.kind === 'port') {
    const compType = node.cellRef || node.kind || 'knob';
    const cnode: ComponentNode = {
      id: node.id,
      type: KIND_TO_COMPONENT_TYPE[compType] || 'knob',
      label: (node.meta?.label as string) || node.id || '',
      pos: { x: 0, y: 0 },
      size: { width: 48, height: 48 },
      style: (node.style || {}) as ComponentNode['style'],
      bind: node.bind ? { target: node.bind } : undefined,
    };
    return (
      <div className="border-t border-white/10 pt-3 mt-2">
        <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-2">Component Editor</div>
        <ComponentEditor
          selection={{ type: 'component', node: cnode }}
          onChange={(u) => onUpdate?.(u as Record<string, unknown>)}
          inspectorLevel={inspectorLevel}
        />
      </div>
    );
  }

  if (node.kind === 'rack') {
    const rackManifest: RackManifest = {
      id: node.id,
      name: (node.meta?.label as string) || node.id,
      author: manifest?.metadata?.author,
      version: manifest?.metadata?.version || '0.0.0',
      width: manifest?.ui?.layout?.width || 800,
      height: manifest?.ui?.layout?.height || 600,
      grid: manifest?.ui?.layout?.grid || { enabled: true, spacingX: 8, spacingY: 8, snapMode: 'center' },
      skin: manifest?.ui?.skin,
      children: [],
    };
    return (
      <div className="border-t border-white/10 pt-3 mt-2">
        <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-2">Rack Editor</div>
        <ComponentEditor
          selection={{ type: 'rack', manifest: rackManifest }}
          onChange={(u) => {
            const updates = u as Partial<RackManifest>;
            const manifestUpdates: Partial<OMEGA_Manifest> = {};
            if (updates.name !== undefined) {
              manifestUpdates.metadata = { ...(manifest?.metadata || {}), name: updates.name } as any;
            }
            if (updates.author !== undefined) {
              manifestUpdates.metadata = { ...(manifest?.metadata || {}), author: updates.author } as any;
            }
            if (updates.version !== undefined) {
              manifestUpdates.metadata = { ...(manifest?.metadata || {}), version: updates.version } as any;
            }
            if (updates.width !== undefined || updates.height !== undefined || updates.grid !== undefined) {
              manifestUpdates.ui = {
                ...(manifest?.ui || {}),
                layout: {
                  ...(manifest?.ui?.layout || {}),
                  ...(updates.width !== undefined ? { width: updates.width } : {}),
                  ...(updates.height !== undefined ? { height: updates.height } : {}),
                  ...(updates.grid !== undefined ? { grid: updates.grid } : {}),
                }
              } as any;
            }
            if (updates.skin !== undefined) {
              manifestUpdates.ui = {
                ...(manifest?.ui || {}),
                skin: updates.skin
              } as any;
            }
            onUpdate?.(manifestUpdates);
          }}
          inspectorLevel={inspectorLevel}
        />
      </div>
    );
  }

  if (node.kind === 'group') {
    const gnode: GroupNode = {
      id: node.id,
      label: (node.meta?.label as string) || node.id || '',
      pos: { x: node.layout?.pos?.x || 0, y: node.layout?.pos?.y || 0 },
      children: (node.children || []).map((child) => ({
        id: child.id,
        type: KIND_TO_COMPONENT_TYPE[child.cellRef || child.kind || 'knob'] || 'knob',
        label: (child.meta?.label as string) || child.id || '',
        pos: { x: child.layout?.pos?.x || 0, y: child.layout?.pos?.y || 0 },
        size: { width: child.layout?.size?.width || 48, height: child.layout?.size?.height || 48 },
        style: (child.style || {}) as ComponentStyle,
        bind: child.bind ? { target: child.bind } : undefined,
      })),
    };
    return (
      <div className="border-t border-white/10 pt-3 mt-2">
        <div className="text-[9px] font-black uppercase tracking-wider text-white/40 mb-2">Group Editor</div>
        <ComponentEditor
          selection={{ type: 'group', node: gnode }}
          onChange={(u) => onUpdate?.(u as Record<string, unknown>)}
          inspectorLevel={inspectorLevel}
          onSaveGroupAsBlueprint={onSaveGroupAsBlueprint}
          onUngroupNode={onUngroupNode}
        />
      </div>
    );
  }

  return null;
}
