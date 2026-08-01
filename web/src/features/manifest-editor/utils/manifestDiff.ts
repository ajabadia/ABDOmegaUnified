/**
 * @purpose Gestiona y devuelve las diferencias entre dos manifestos OMEGA, incluyendo cambios estructurales y de nivel de propiedad.
 * @purpose_en Calculates and returns differences between two OMEGA manifests, including structural and property-level changes.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:2,imports:3,sig:1h0r2mq
 * @lastUpdated 2026-06-15T15:17:27.023Z
 */

import type { OMEGA_Manifest, ManifestEntity, LayoutContainer, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { DiffEntry, ManifestDiffResult, DiffEntityKind } from '../types/diff';
import { regenerateEntityId, cloneAndRegenerateNodeIds } from './idManagement';

/**
 * OMEGA Manifest Diff Engine (Phase 9.2 MVP)
 * Computes structural and property-level differences between two manifests.
 */

export const calculateManifestDiff = (
  base: OMEGA_Manifest, 
  target: OMEGA_Manifest,
  baseHash: string = '',
  targetHash: string = ''
): ManifestDiffResult => {
  const entries: DiffEntry[] = [];

  // 1. Comparison of Controls (Legacy & Hybrid)
  compareEntities(
    base.ui?.controls || [], 
    target.ui?.controls || [], 
    'control', 
    entries
  );

  // 2. Comparison of Jacks
  compareEntities(
    base.ui?.jacks || [], 
    target.ui?.jacks || [], 
    'jack', 
    entries
  );

  // 3. Comparison of Containers (Workstream 9.2 MVP adjustment)
  compareContainers(
    base.ui?.layout?.containers || [],
    target.ui?.layout?.containers || [],
    entries
  );

  // 4. Summary calculation
  const summary = {
    added: entries.filter(e => e.changeType === 'added').length,
    removed: entries.filter(e => e.changeType === 'removed').length,
    modified: entries.filter(e => e.changeType === 'modified').length,
  };

  return {
    entries,
    summary,
    timestamp: Date.now(),
    baseHash,
    targetHash
  };
};

/**
 * Generic ID-based entity comparison.
 */
function compareEntities(
  baseList: ManifestEntity[], 
  targetList: ManifestEntity[], 
  kind: DiffEntityKind, 
  results: DiffEntry[]
) {
  const baseMap = new Map(baseList.map(e => [e.id, e]));
  const targetMap = new Map(targetList.map(e => [e.id, e]));

  // Find added
  targetList.forEach(item => {
    if (!baseMap.has(item.id)) {
      results.push({
        entityId: item.id,
        entityKind: kind,
        changeType: 'added',
        description: `Added new ${kind}: ${item.label || item.id}`,
        after: item
      });
    }
  });

  // Find removed
  baseList.forEach(item => {
    if (!targetMap.has(item.id)) {
      results.push({
        entityId: item.id,
        entityKind: kind,
        changeType: 'removed',
        description: `Removed ${kind}: ${item.label || item.id}`,
        before: item
      });
    }
  });

  // Find modified
  targetList.forEach(targetItem => {
    const baseItem = baseMap.get(targetItem.id);
    if (baseItem) {
      // Deep compare relevant properties
      const fieldsToTrack = ['label', 'type', 'bind', 'pos.x', 'pos.y', 'presentation.variant'];
      
      fieldsToTrack.forEach(path => {
        const baseVal = getDeepValue(baseItem, path);
        const targetVal = getDeepValue(targetItem, path);
        
        if (baseVal !== targetVal) {
          results.push({
            entityId: targetItem.id,
            entityKind: kind,
            changeType: 'modified',
            fieldPath: path,
            before: baseVal,
            after: targetVal,
            description: `Property '${path}' changed: ${baseVal} -> ${targetVal}`,
            parentContainerId: targetItem.presentation?.container || ''
          });
        }
      });
    }
  });
}

function compareContainers(
  baseList: LayoutContainer[],
  targetList: LayoutContainer[],
  results: DiffEntry[]
) {
  const baseMap = new Map(baseList.map(c => [c.id, c]));
  const targetMap = new Map(targetList.map(c => [c.id, c]));

  targetList.forEach(c => {
    if (!baseMap.has(c.id)) {
      results.push({
        entityId: c.id,
        entityKind: 'container',
        changeType: 'added',
        description: `Added container: ${c.label || c.id}`,
        after: c
      });
    }
  });

  baseList.forEach(c => {
    if (!targetMap.has(c.id)) {
      results.push({
        entityId: c.id,
        entityKind: 'container',
        changeType: 'removed',
        description: `Removed container: ${c.label || c.id}`,
        before: c
      });
    }
  });

  targetList.forEach(targetC => {
    const baseC = baseMap.get(targetC.id);
    if (baseC) {
      const fields = ['label', 'variant', 'tab', 'pos.x', 'pos.y', 'size.width', 'size.height'];
      fields.forEach(path => {
        const v1 = getDeepValue(baseC, path);
        const v2 = getDeepValue(targetC, path);
        if (v1 !== v2) {
          results.push({
            entityId: targetC.id,
            entityKind: 'container',
            changeType: 'modified',
            fieldPath: path,
            before: v1,
            after: v2,
            description: `Changed container ${path} from '${v1}' to '${v2}'`
          });
        }
      });
    }
  });
}

function getDeepValue(obj: Record<string, unknown> | ManifestEntity | LayoutContainer, path: string): unknown {
  return path.split('.').reduce((o: unknown, key) => {
    const record = o as Record<string, unknown>;
    return (record && record[key] !== undefined) ? record[key] : undefined;
  }, obj as unknown as Record<string, unknown>);
}

/**
 * PHASE 9.3 - Selective Merge Engine
 * Applies a specific DiffEntry to a manifest.
 * Returns a new cloned manifest with the change applied.
 */
export const applyDiffEntry = (
  manifest: OMEGA_Manifest,
  entry: DiffEntry
): OMEGA_Manifest => {
  // Deep clone to ensure immutability
  const next = structuredClone(manifest);
  
  if (!next.ui) next.ui = { dimensions: { width: 800, height: 600 }, controls: [], jacks: [], layout: { width: 800, height: 600, containers: [], planes: [] } };

  switch (entry.changeType) {
    case 'added': {
      if (!entry.after) return next;
      
      if (entry.entityKind === 'container') {
        const container = entry.after as LayoutContainer;
        if (!next.ui.layout) next.ui.layout = { width: 800, height: 600, containers: [], planes: [] };
        if (!next.ui.layout.containers) next.ui.layout.containers = [];
        
        // Prevent duplication if ID exists
        if (!next.ui.layout.containers.find(c => c.id === container.id)) {
          next.ui.layout.containers.push(container);
        }
      } else {
        const entity = entry.after as ManifestEntity;
        const list = entry.entityKind === 'control' ? (next.ui.controls || []) : (next.ui.jacks || []);
        
        if (entry.entityKind === 'control') next.ui.controls = list;
        else next.ui.jacks = list;
        
        // Guard: Check parent container dependency
        if (entity.presentation?.container) {
          const containerExists = next.ui.layout?.containers?.some(c => c.id === entity.presentation?.container);
          if (!containerExists) {
            console.warn(`[MERGE] Blocked: Container ${entity.presentation?.container} missing for entity ${entity.id}`);
            return next; // Fail-safe: don't add if parent is missing
          }
        }

        // Prevent duplication
        const existing = list.find(e => e.id === entity.id);
        if (!existing) {
          list.push(entity);
        } else {
          // Industrial ID Regeneration (ADR-010 Guard)
          // Check if it's a UCA Node (recursive) or flat Entity
          if ('kind' in entity) {
            const { node: saferNode } = cloneAndRegenerateNodeIds(entity as unknown as OmegaNode);
            list.push(saferNode as unknown as ManifestEntity);
            console.log(`[MERGE] UCA Node Collision: ${entity.id} -> ${saferNode.id}`);
          } else {
            const saferEntity = regenerateEntityId(entity);
            list.push(saferEntity);
            console.log(`[MERGE] Entity Collision: ${entity.id} -> ${saferEntity.id}`);
          }
        }
      }
      break;
    }

    case 'removed': {
      if (entry.entityKind === 'container') {
        if (next.ui.layout?.containers) {
          next.ui.layout.containers = next.ui.layout.containers.filter(c => c.id !== entry.entityId);
        }
      } else {
        if (entry.entityKind === 'control') {
          next.ui.controls = (next.ui.controls || []).filter(e => e.id !== entry.entityId);
        } else {
          next.ui.jacks = (next.ui.jacks || []).filter(e => e.id !== entry.entityId);
        }
      }
      break;
    }

    case 'modified': {
      if (!entry.fieldPath) return next;
      
      if (entry.entityKind === 'container') {
        const container = next.ui.layout?.containers?.find(c => c.id === entry.entityId);
        if (container) {
          setDeepValue(container as unknown as Record<string, unknown>, entry.fieldPath, entry.after);
        }
      } else {
        const list = entry.entityKind === 'control' ? (next.ui.controls || []) : (next.ui.jacks || []);
        const entity = list.find(e => e.id === entry.entityId);
        if (entity) {
          setDeepValue(entity as unknown as Record<string, unknown>, entry.fieldPath, entry.after);
        }
      }
      break;
    }
  }

  return next;
};

function setDeepValue(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((o: Record<string, unknown>, key) => {
    if (!o[key]) o[key] = {};
    return o[key] as Record<string, unknown>;
  }, obj);
  target[lastKey] = value;
}
