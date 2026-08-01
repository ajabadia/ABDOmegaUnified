'use client';

/**
 * @purpose Gestiona acciones para manifestar historia en OMEGA, incluyendo empujar registros históricos, deshacer y rehacer cambios, actualizar documentos con historia, comparar manifests y manejar entradas de merge.
 * @purpose_en Manages actions for manifestation of history in OMEGA, including pushing history entries, undoing and redoing changes, updating documents with history, comparing manifests, and handling merge entries.
 * @refactorable false (contains only static declarations/types/constants)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:3ljcrd
 * @lastUpdated 2026-06-15T13:22:09.274Z
 */

import { useCallback, useRef } from 'react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { calculateManifestDiff, applyDiffEntry } from '../utils/manifestDiff';
import type { ManifestDiffResult, DiffEntry } from '../types/diff';
import type { DocumentOrchestrator } from '../types/document';
import type { WorkbenchTabType } from '../types/workbench';
import { compare, type Operation } from 'fast-json-patch';

interface HistoryDependencies {
  orchestrator: Pick<DocumentOrchestrator, 'pushHistory' | 'undo' | 'redo' | 'undoTo' | 'updateDocument' | 'documentsById'>;
  activeId: string;
  manifest: OMEGA_Manifest;
  simulationBridge: {
    scheduleStructuralSync: (label: string) => void;
  };
  addLog: (msg: string) => void;
  workbenchState: import('../types/workbench').WorkbenchState;
  workbenchActions: {
    setSelectedNode: (id: string | null) => void;
    setPinnedNode: (id: string | null) => void;
    setLayoutRatio: (ratio: number) => void;
    openTab: (input: import('../types/workbench').OpenTabInput) => void;
    setLayoutMode: (mode: import('../types/workbench').WorkbenchLayoutMode) => void;
    setMultiSelectedNodes: (nodeIds: string[]) => void;
  };
}

/**
 * OMEGA ERA 7.2.3 - HISTORY ACTIONS HOOK
 * Handles state persistence, timeline jumps, and manifest reconciliation.
 */
export const useHistoryActions = ({
  orchestrator,
  activeId,
  manifest,
  simulationBridge,
  addLog,
  workbenchState,
  workbenchActions
}: HistoryDependencies) => {
  const lastHistoryPushRef = useRef<{ timestamp: number; label: string } | null>(null);

  const prevManifestRef = useRef<OMEGA_Manifest | null>(null);

  const pushHistoryEntry = useCallback((label: string, force = false) => {
    const now = Date.now();
    const lastPush = lastHistoryPushRef.current;

    // Coalescing logic: If same label and within 1s window, skip unless forced
    if (!force && lastPush && lastPush.label === label && (now - lastPush.timestamp) < 1000) {
      return;
    }

    const currentDoc = orchestrator.documentsById[activeId];
    const latestManifest = currentDoc?.manifest || manifest;
    const latestResources = currentDoc?.extraResources || [];

    const manifestSnapshot = JSON.parse(JSON.stringify(latestManifest)) as OMEGA_Manifest;

    let patch: Operation[] | undefined;
    if (prevManifestRef.current) {
      patch = compare(prevManifestRef.current, latestManifest);
    }
    prevManifestRef.current = manifestSnapshot;

    const resourcesChanged = currentDoc?.extraResources !== undefined;
    const resourcesSnapshot = resourcesChanged
      ? latestResources.map(r => ({ ...r, data: r.data.slice(0) }))
      : latestResources;

    const entry: import('@/omega-ui-core/types/history').HistoryEntry = {
      id: `hist_${now}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'SNAPSHOT',
      manifest: manifestSnapshot,
      extraResources: resourcesSnapshot,
      timestamp: now,
      label,
      correlationId: `tx_${now}`,
      uiState: {
        selectedNodeId: workbenchState.selectedNodeId,
        multiSelectedNodeIds: workbenchState.multiSelectedNodeIds,
        pinnedNodeId: workbenchState.pinnedNodeId,
        layoutRatio: workbenchState.layout.ratio,
        viewMode: workbenchState.tabsById[workbenchState.panesById.primary.activeTabId!]?.type,
        isSplit: workbenchState.layout.mode !== 'single'
      }
    };
    if (patch !== undefined && patch.length > 0) {
      entry.metadata = { patch };
    }
    orchestrator.pushHistory(activeId, entry);

    lastHistoryPushRef.current = { timestamp: now, label };
  }, [orchestrator, activeId, manifest, workbenchState]);

  const undo = useCallback(() => {
    const doc = orchestrator.documentsById[activeId];
    if (!doc || doc.history.past.length === 0) return;
    
    const entryToRestore = doc.history.past[doc.history.past.length - 1];
    
    // 1. Restore UI State Context
    if (entryToRestore.uiState) {
      if (entryToRestore.uiState.selectedNodeId !== undefined) workbenchActions.setSelectedNode(entryToRestore.uiState.selectedNodeId);
      if (entryToRestore.uiState.multiSelectedNodeIds !== undefined) workbenchActions.setMultiSelectedNodes(entryToRestore.uiState.multiSelectedNodeIds);
      if (entryToRestore.uiState.pinnedNodeId !== undefined) workbenchActions.setPinnedNode(entryToRestore.uiState.pinnedNodeId);
      if (entryToRestore.uiState.layoutRatio !== undefined) workbenchActions.setLayoutRatio(entryToRestore.uiState.layoutRatio);
      if (entryToRestore.uiState.viewMode) {
        workbenchActions.openTab({ 
            id: `tab-${entryToRestore.uiState.viewMode}`, 
            type: entryToRestore.uiState.viewMode as WorkbenchTabType, 
            title: entryToRestore.uiState.viewMode.charAt(0).toUpperCase() + entryToRestore.uiState.viewMode.slice(1) 
        });
      }
      if (entryToRestore.uiState.isSplit !== undefined) {
          workbenchActions.setLayoutMode(entryToRestore.uiState.isSplit ? 'vertical' : 'single');
      }
    }

    orchestrator.undo(activeId);
    simulationBridge.scheduleStructuralSync('Undo Action');
    addLog(`[HISTORY] Undo: ${entryToRestore.label}`);
  }, [orchestrator, activeId, addLog, simulationBridge, workbenchActions]);

  const redo = useCallback(() => {
    const doc = orchestrator.documentsById[activeId];
    if (!doc || doc.history.future.length === 0) return;
    
    const entryToRestore = doc.history.future[0];

    // 1. Restore UI State Context
    if (entryToRestore.uiState) {
      if (entryToRestore.uiState.selectedNodeId !== undefined) workbenchActions.setSelectedNode(entryToRestore.uiState.selectedNodeId);
      if (entryToRestore.uiState.multiSelectedNodeIds !== undefined) workbenchActions.setMultiSelectedNodes(entryToRestore.uiState.multiSelectedNodeIds);
      if (entryToRestore.uiState.pinnedNodeId !== undefined) workbenchActions.setPinnedNode(entryToRestore.uiState.pinnedNodeId);
      if (entryToRestore.uiState.layoutRatio !== undefined) workbenchActions.setLayoutRatio(entryToRestore.uiState.layoutRatio);
      if (entryToRestore.uiState.viewMode) {
        workbenchActions.openTab({ 
            id: `tab-${entryToRestore.uiState.viewMode}`, 
            type: entryToRestore.uiState.viewMode as WorkbenchTabType, 
            title: entryToRestore.uiState.viewMode.charAt(0).toUpperCase() + entryToRestore.uiState.viewMode.slice(1) 
        });
      }
      if (entryToRestore.uiState.isSplit !== undefined) {
          workbenchActions.setLayoutMode(entryToRestore.uiState.isSplit ? 'vertical' : 'single');
      }
    }

    orchestrator.redo(activeId);
    simulationBridge.scheduleStructuralSync('Redo Action');
    addLog(`[HISTORY] Redo: ${entryToRestore.label}`);
  }, [orchestrator, activeId, addLog, simulationBridge, workbenchActions]);

  const undoTo = useCallback((index: number) => {
    orchestrator.undoTo(activeId, index);
    simulationBridge.scheduleStructuralSync('Timeline Jump');
    addLog(`[HISTORY] Jumped to historical snapshot ${index}.`);
  }, [orchestrator, activeId, addLog, simulationBridge]);

  const updateManifestWithHistory = useCallback((
    updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>), 
    label: string, 
    forceHistory = false
  ) => {
    // Get latest manifest from orchestrator if needed (Phase 10.1C Stale Closure Remediation)
    const currentDoc = orchestrator.documentsById[activeId];
    const baseManifest = currentDoc?.manifest || manifest;
    const finalUpdates = typeof updates === 'function' ? updates(baseManifest) : updates;

    pushHistoryEntry(label, forceHistory);
    orchestrator.updateDocument(activeId, { manifest: finalUpdates });
    
    // Only sync if NOT in a transaction (Atomic Commitment Rule)
    if (!currentDoc?.activeTransaction) {
      simulationBridge.scheduleStructuralSync(label);
    }
  }, [pushHistoryEntry, orchestrator, activeId, manifest, simulationBridge]);

  const updateDocumentWithHistory = useCallback((
    updates: { manifest?: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>); extraResources?: { name: string, data: ArrayBuffer, type: string }[] | ((prev: { name: string, data: ArrayBuffer, type: string }[]) => { name: string, data: ArrayBuffer, type: string }[]) },
    label: string,
    forceHistory = false
  ) => {
    const currentDoc = orchestrator.documentsById[activeId];
    const baseManifest = currentDoc?.manifest || manifest;
    const baseResources = currentDoc?.extraResources || [];

    const finalManifest = typeof updates.manifest === 'function' ? updates.manifest(baseManifest) : updates.manifest;
    const finalResources = typeof updates.extraResources === 'function' ? updates.extraResources(baseResources) : updates.extraResources;

    pushHistoryEntry(label, forceHistory);

    const docUpdates: { manifest?: Partial<OMEGA_Manifest>; extraResources?: { name: string, data: ArrayBuffer, type: string }[] } = {};
    if (finalManifest !== undefined) docUpdates.manifest = finalManifest;
    if (finalResources !== undefined) docUpdates.extraResources = finalResources;

    orchestrator.updateDocument(activeId, docUpdates);

    if (finalManifest && !currentDoc?.activeTransaction) {
      simulationBridge.scheduleStructuralSync(label);
    }
  }, [pushHistoryEntry, orchestrator, activeId, manifest, simulationBridge]);

  const compareWithHistory = useCallback((index: number): ManifestDiffResult | null => {
    const doc = orchestrator.documentsById[activeId];
    if (!doc || !doc.history.past[index]) return null;

    const entry = doc.history.past[index];
    const pastSnapshot = entry.manifest;

    const storedPatch = entry.metadata?.patch as Operation[] | undefined;
    if (storedPatch && storedPatch.length > 0) {
      return {
        entries: storedPatch.map((op) => ({
          entityId: op.path.split('/').pop() || 'unknown',
          entityKind: 'control' as const,
          changeType: op.op === 'add' ? 'added' as const : op.op === 'remove' ? 'removed' as const : 'modified' as const,
          fieldPath: op.path,
          description: `${op.op} ${op.path}`,
          before: 'from' in op ? undefined : undefined,
          after: 'value' in op ? op.value : undefined
        })),
        summary: {
          added: storedPatch.filter(o => o.op === 'add').length,
          removed: storedPatch.filter(o => o.op === 'remove').length,
          modified: storedPatch.filter(o => o.op === 'replace').length
        },
        timestamp: Date.now(),
        baseHash: '',
        targetHash: ''
      };
    }

    return calculateManifestDiff(pastSnapshot, manifest);
  }, [orchestrator.documentsById, activeId, manifest]);

  const handleMergeEntries = useCallback((entries: DiffEntry[]) => {
    if (entries.length === 0) return;
 
    let nextManifest = manifest;
    entries.forEach(entry => {
      nextManifest = applyDiffEntry(nextManifest, entry);
    });

    const label = entries.length === 1 
      ? `[MERGE] ${entries[0].description}`
      : `[MERGE] Selective reconciliation (${entries.length} changes)`;

    updateManifestWithHistory(nextManifest, label, true);
    addLog(`[SYSTEM] ${label} completed.`);
  }, [manifest, updateManifestWithHistory, addLog]);

  return {
    pushHistoryEntry,
    undo,
    redo,
    undoTo,
    updateManifestWithHistory,
    updateDocumentWithHistory,
    compareWithHistory,
    handleMergeEntries
  };
};
