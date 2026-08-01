'use client';

/**
 * @purpose Gestiona la creación y pegado de entidades dentro de un manifesto OMEGA, incluyendo la generación de IDs únicos, resolución de posiciones y actualización del estado del manifesto.
 * @purpose_en ** Manages the creation and pasting of entities within an OMEGA manifest, including generating unique IDs, resolving positions, and updating the manifest state.
 * @refactorable ** true (contains too many state variables and UI parts)
 * @classification ** Custom Hook
 * @complexity ** Medium
 * @fingerprint exports:1,imports:7,sig:1yo2rv5
 * @lastUpdated 2026-06-19T18:49:22.715Z
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest, ManifestEntity, OmegaNode, LayoutContainer, ComponentType, NodeRole } from '@/omega-ui-core/types/manifest';
import { insertNodeInTree, getAllIdsInTree } from './ucaInspectorAdapter';
import { treeToManifest } from '@/omega-ui-core/utils/ucaBridge';
import { regenerateEntityId, cloneAndRegenerateNodeIds } from '../../utils/idManagement';
import { getOccupiedBoxes, resolveFreePosition } from '@/omega-ui-core/utils/spatialUtils';
import { buildManifestFromTree } from './entityCRUDUtils';

export const useEntityFactory = (
  manifest: OMEGA_Manifest,
  updateManifest: (updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>), label?: string, forceHistory?: boolean) => void,
  addLog: (msg: string) => void,
) => {
  const addEntity = useCallback((
    type: 'control' | 'jack',
    template?: Partial<ManifestEntity>,
    node?: OmegaNode,
    container?: LayoutContainer,
  ) => {
    const hasWasm = !!(manifest.resources?.wasm || (manifest.resources as Record<string, unknown> | undefined)?.contract);

    let generatedId = `new_${type}_${Date.now().toString().slice(-4)}`;
    let generatedLabel = type === 'control' ? 'New Control' : 'New Jack';

    if (!hasWasm) {
      const moduleId = manifest.id || 'omega';
      const componentType = template?.type || (type === 'control' ? 'knob' : 'port');

      const existingEntities = [
        ...(manifest.ui?.controls || []),
        ...(manifest.ui?.jacks || []),
      ];

      let index = 1;
      let checkId = `${moduleId}_${componentType}_${String(index).padStart(3, '0')}`;
      while (existingEntities.some(e => e.id === checkId)) {
        index++;
        checkId = `${moduleId}_${componentType}_${String(index).padStart(3, '0')}`;
      }
      generatedId = checkId;
      const capitalizedType = componentType.charAt(0).toUpperCase() + componentType.slice(1);
      generatedLabel = `${capitalizedType} ${index}`;
    }

    const id = generatedId;

    const desiredPos = node
      ? (node.layout?.pos || { x: 0, y: 0 })
      : (type === 'control'
        ? (template?.pos || { x: 50, y: 50 })
        : (template?.pos || { x: 50, y: 350 }));

    const size = node
      ? (node.layout?.size || { width: 48, height: 48 })
      : (template?.size || { width: 48, height: 48 });

    const occupied = getOccupiedBoxes(manifest);
    const resolvedPos = resolveFreePosition(desiredPos, size, occupied, manifest);

    // Default base structure
    const baseEntity: ManifestEntity = node ? {
      id: node.id,
      type: node.cellRef || 'knob',
      role: node.role || 'control',
      bind: node.bind || 'none',
      label: node.id,
      pos: resolvedPos,
      size: node.layout?.size || { width: 48, height: 48 },
      presentation: {
        tab: 'MAIN',
        component: node.cellRef || 'knob',
        variant: 'default',
        offsetX: 0,
        offsetY: 0,
        attachments: [],
      },
    } : {
      id,
      type: type === 'control' ? (template?.type || 'knob') : (template?.type || 'port'),
      role: type === 'control' ? 'control' : 'stream',
      bind: '',
      label: generatedLabel,
      pos: resolvedPos,
      size: { width: 48, height: 48 },
      presentation: {
        tab: 'MAIN',
        component: type === 'control' ? (template?.type || 'knob') as ComponentType : (template?.type || 'port') as ComponentType,
        variant: 'B_cyan',
        offsetX: 0,
        offsetY: 0,
        attachments: [],
      },
    };

    // Merge template if provided (Aseptic Ingestion)
    const newEntity: ManifestEntity = template ? {
      ...baseEntity,
      ...template,
      id, // Preserve generated ID
      pos: baseEntity.pos, // Reset position for placement
      presentation: {
        ...baseEntity.presentation,
        ...(template.presentation || {}),
        tab: 'MAIN', // Force to current plane context
      },
    } as ManifestEntity : baseEntity;

    const isUCA = manifest.ui?.useUCA !== false;

    updateManifest((prev) => {
      // 1. Re-verify ID uniqueness against LATEST tree (prev.ui.tree) to avoid double-click and desync stale closure bugs
      let safeId = id;
      const allLatestIds = isUCA && prev.ui?.tree ? getAllIdsInTree(prev.ui.tree) : [...(prev.ui?.controls || []), ...(prev.ui?.jacks || [])].map(e => e.id);

      if (allLatestIds.includes(safeId)) {
        let idx = 1;
        const cType = template?.type || (type === 'control' ? 'knob' : 'port');
        const mId = prev.id || 'omega';
        let cId = `${mId}_${cType}_${String(idx).padStart(3, '0')}`;
        while (allLatestIds.includes(cId)) {
          idx++;
          cId = `${mId}_${cType}_${String(idx).padStart(3, '0')}`;
        }
        safeId = cId;
      }

      const safeEntity = { ...newEntity, id: safeId, label: newEntity.label === generatedLabel ? safeId : newEntity.label };

      if (isUCA && prev.ui?.tree) {
        let newNode: OmegaNode;
        if (container) {
          newNode = {
            id: container.id,
            kind: 'container',
            role: 'structure',
            layout: {
              pos: container.pos,
              size: {
                width: typeof container.size.width === 'number' ? container.size.width : 100,
                height: typeof container.size.height === 'number' ? container.size.height : 100,
              },
            },
            children: [],
          };
        } else {
          newNode = {
            id: safeId,
            kind: type === 'control' ? 'cell' : 'port',
            cellRef: safeEntity.type as ComponentType,
            role: safeEntity.role as NodeRole,
            bind: safeEntity.bind,
            layout: { pos: safeEntity.pos, size: safeEntity.size as { width: number; height: number } },
            style: { variant: safeEntity.presentation?.variant || 'default' },
          };
        }

        const nextTree = insertNodeInTree(prev.ui.tree, newNode);
        return buildManifestFromTree(prev, nextTree);
      } else {
        if (container) {
          const nextLayout = {
            ...prev.ui?.layout,
            width: prev.ui?.layout?.width || 800,
            height: prev.ui?.layout?.height || 600,
            containers: [...(prev.ui?.layout?.containers || []), container],
          };
          return { ui: { ...prev.ui, layout: nextLayout as OMEGA_Manifest['ui']['layout'] } };
        } else if (type === 'control') {
          const nextControls = [...(prev.ui?.controls || []), safeEntity];
          return { ui: { ...prev.ui, controls: nextControls } };
        } else {
          const nextJacks = [...(prev.ui?.jacks || []), safeEntity];
          return { ui: { ...prev.ui, jacks: nextJacks } };
        }
      }
    }, container ? `Add Container: ${id}` : `Add ${type}: ${id}`, true);

    addLog(`Added new ${type}: ${id}`);
    return id;
  }, [manifest, updateManifest, addLog]);

  const pasteEntity = useCallback((item: ManifestEntity | OmegaNode) => {
    // 1. Collision Detection & ID Regeneration (RISK-004 Fix)
    const isUCA = manifest.ui?.useUCA !== false;

    let newItem: ManifestEntity | OmegaNode;
    const occupied = getOccupiedBoxes(manifest);

    if ('kind' in item) {
      const cloned = cloneAndRegenerateNodeIds(item as OmegaNode).node;
      const desiredPos = cloned.layout?.pos || { x: 50, y: 50 };
      const size = cloned.layout?.size || { width: 48, height: 48 };
      const resolvedPos = resolveFreePosition(desiredPos, size, occupied, manifest);
      cloned.layout = { ...cloned.layout, pos: resolvedPos };
      newItem = cloned;
    } else {
      const cloned = regenerateEntityId(item as ManifestEntity);
      const desiredPos = cloned.pos || { x: 50, y: 50 };
      const size = cloned.size || { width: 48, height: 48 };
      const resolvedPos = resolveFreePosition(desiredPos, size, occupied, manifest);
      cloned.pos = resolvedPos;
      newItem = cloned;
    }

    const newId = newItem.id;

    // 2. Insertion Strategy
    if (isUCA && manifest.ui?.tree) {
      addLog(`[CLIPBOARD] Strategic Insertion: UCA Tree Mode.`);
      // UCA Strategy: Insert into tree and sync projections
      const nextTree = insertNodeInTree(manifest.ui.tree, newItem as OmegaNode);
      const projections = treeToManifest(nextTree);

      updateManifest({
        nodes: [nextTree],
        ui: {
          ...manifest.ui,
          tree: nextTree,
          controls: projections.ui?.controls ?? projections.controls ?? manifest.ui?.controls ?? [],
          jacks: projections.ui?.jacks ?? projections.jacks ?? manifest.ui?.jacks ?? [],
          layout: {
            ...manifest.ui?.layout,
            width: manifest.ui?.layout?.width || 800,
            height: manifest.ui?.layout?.height || 600,
            containers: projections.ui?.layout?.containers ?? projections.layout?.containers ?? manifest.ui?.layout?.containers ?? [],
          },
        },
      }, `Paste Entity (UCA): ${newId}`, true);
    } else {
      addLog(`[CLIPBOARD] Strategic Insertion: Legacy Array Mode.`);
      // Legacy Strategy: Add to correct array
      const entity = newItem as ManifestEntity;
      const isJack = entity.role === 'stream' || entity.role === 'port' || entity.type === 'port';

      if (isJack) {
        const nextJacks = [...(manifest.ui?.jacks || []), entity];
        updateManifest({ ui: { ...manifest.ui, jacks: nextJacks } }, `Paste Jack: ${newId}`, true);
      } else {
        const nextControls = [...(manifest.ui?.controls || []), entity];
        updateManifest({ ui: { ...manifest.ui, controls: nextControls } }, `Paste Control: ${newId}`, true);
      }
    }

    addLog(`Pasted entity: ${newId} (Industrial Sync Complete)`);
    return newId;
  }, [manifest, updateManifest, addLog]);

  const pasteEntities = useCallback((items: (ManifestEntity | OmegaNode)[], targetPos?: { x: number; y: number }) => {
    const newIds: string[] = [];
    const positions = items.map(item => {
      if ('kind' in item) return (item as OmegaNode).layout?.pos || { x: 0, y: 0 };
      return (item as ManifestEntity).pos || { x: 0, y: 0 };
    });
    const minX = Math.min(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));

    items.forEach((item, index) => {
      const baseX = targetPos
        ? targetPos.x + (positions[index].x - minX) + index * 30
        : positions[index].x + index * 30;
      const baseY = targetPos
        ? targetPos.y + (positions[index].y - minY) + index * 20
        : positions[index].y + index * 20;

      let offsetItem: ManifestEntity | OmegaNode;
      if ('kind' in item) {
        offsetItem = {
          ...item,
          layout: {
            ...(item as OmegaNode).layout,
            pos: { x: baseX, y: baseY },
          },
        };
      } else {
        offsetItem = {
          ...item,
          pos: { x: baseX, y: baseY },
        };
      }
      const newId = pasteEntity(offsetItem);
      newIds.push(newId);
    });
    return newIds;
  }, [pasteEntity]);

  return { addEntity, pasteEntity, pasteEntities };
};
