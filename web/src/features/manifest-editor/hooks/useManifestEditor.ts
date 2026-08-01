/**
 * @purpose Gestiona y coordina las operaciones para el editor de manifesto OMEGA, incluyendo gestión de estado, entrada/salida, entidades, auditoría y acciones.
 * @purpose_en Manages and coordinates operations for the OMEGA manifest editor, including state management, input/output, entities, auditing, and actions.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:14,sig:13j2a70
 * @lastUpdated 2026-06-15T13:22:26.866Z
 */

import { useState, useCallback, useMemo } from 'react';
import { useDocumentOrchestrator } from './useDocumentOrchestrator';
import { useAuditEngine } from './useAuditEngine';
import { useEntityManager } from './useEntityManager';
import { useFileOps } from './useFileOps';
import type { OMEGA_Manifest, OMEGA_Contract, OmegaNode, ManifestEntity } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/omega-ui-core/types/contract';
import { useAssetManager } from './useAssetManager';
import { useSimulationBridge } from './useSimulationBridge';
import { useBlueprintInjection } from './useBlueprintInjection';
import { useDeployment } from './useDeployment';
import { useHistoryActions } from './useHistoryActions';
import { useClipboardActions } from './useClipboardActions';
import { useToast } from '@/features/manifest-editor/components/ToastContainer';

/**
 * OMEGA ERA 7.2.3 - MANIFEST EDITOR HOOK (ORCHESTRATOR)
 * This hook composes specialized sub-hooks for state, I/O, entities, and auditing.
 * Following Aseptic Engineering Standards.
 */
export const useManifestEditor = (
  workbenchState: import('../types/workbench').WorkbenchState,
  workbenchActions: ReturnType<typeof import('./useWorkbenchState').useWorkbenchState>['actions']
) => {
  // Directory Handle State (File System Access API)
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);

  // 1. Core State
  const orchestrator = useDocumentOrchestrator();
  const activeDoc = orchestrator.activeDocument;
  const activeId = orchestrator.activeDocumentId;

  const { 
    manifest, 
    contract, 
    wasmBuffer,
    extraResources,
    isDirty,
  } = activeDoc;

  // 1.5. Simulation Bridge (Phase 9.1 - Live Loop)
  const simulationBridge = useSimulationBridge(
    activeId,
    manifest,
    contract,
    !!wasmBuffer,
    orchestrator.flushPendingHash,
    orchestrator.captureStableSnapshot
  );

  // 2. Audit & Validation Engine
  const { logs, addLog: auditAddLog, issues } = useAuditEngine(manifest, contract);
  const { showToast } = useToast();

  // Bridge addLog → toast notifications for important levels
  const addLog = useCallback((msg: string) => {
    auditAddLog(msg);
    const level = msg.match(/^\[([A-Z_]+)\]/)?.[1];
    if (level === 'SUCCESS' || level === 'OK') {
      showToast(msg.replace(/^\[[A-Z_]+\]\s*/, ''), 'success');
    } else if (level === 'ERROR' || level === 'CRITICAL') {
      showToast(msg.replace(/^\[[A-Z_]+\]\s*/, ''), 'error');
    } else if (level === 'WARNING' || level === 'WARN') {
      showToast(msg.replace(/^\[[A-Z_]+\]\s*/, ''), 'warning');
    }
  }, [auditAddLog, showToast]);

  // 3. Specialized Action Hooks (Offloaded Logic)
  
  // 3.1. History Actions
  const history = useHistoryActions({
    orchestrator,
    activeId,
    manifest,
    simulationBridge,
    addLog,
    workbenchState,
    workbenchActions
  });

  // 3.2. Entity & Modulation Management
  const entities = useEntityManager(manifest, (u) => orchestrator.updateDocument(activeId, { manifest: typeof u === 'function' ? u(manifest) : u }), (u, l, f) => history.updateManifestWithHistory(u, l || 'Edit Properties', f), addLog);

  // 3.3. Clipboard Actions
  const clipboard = useClipboardActions({
    findItem: entities.findItem as (id: string) => (OmegaNode | ManifestEntity | undefined),
    pasteEntities: entities.pasteEntities,
    removeItems: entities.removeItems,
    addLog
  });

  // 3.4. Deployment & HIL Bridge
  const deployment = useDeployment({
    manifest,
    contract: contract as (OmegaContract | OMEGA_Contract | null),
    issues,
    addLog,
    captureStableSnapshot: () => orchestrator.captureStableSnapshot(activeId),
    activeId,
    orchestrator
  });

  // 3.5. Blueprint Injection (Phase 9.4A)
  const blueprintInjection = useBlueprintInjection(manifest, history.updateManifestWithHistory, addLog);

  const linkDirectory = useCallback(async () => {
    try {
      // @ts-expect-error: showDirectoryPicker is experimental and not in standard DOM types
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      setDirectoryHandle(handle);
      addLog(`[OK] Workspace directory linked: ${handle.name}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.name !== 'AbortError') {
        addLog(`[ERROR] Failed to link directory: ${message}`);
      }
    }
  }, [addLog]);

  // 4. File I/O Operations
  const fileOps = useFileOps(
    manifest, 
    (u) => orchestrator.updateDocument(activeId, { manifest: typeof u === 'function' ? u(manifest) : u }),
    (u: (OmegaContract | OMEGA_Contract) | null | ((prev: (OmegaContract | OMEGA_Contract) | null) => (OmegaContract | OMEGA_Contract) | null)) => 
      orchestrator.updateDocument(activeId, { contract: typeof u === 'function' ? u(contract as (OmegaContract | OMEGA_Contract | null)) : u }),
    (u) => orchestrator.updateDocument(activeId, { wasmBuffer: typeof u === 'function' ? u(wasmBuffer) : u }),
    wasmBuffer, 
    (u) => orchestrator.updateDocument(activeId, { extraResources: typeof u === 'function' ? u(extraResources) : u }),
    extraResources, 
    addLog, 
    issues, 
    () => orchestrator.captureStableSnapshot(activeId),
    directoryHandle,
    history.updateDocumentWithHistory
  );

  // 5. Asset Management (Fase 13)
  const assets = useAssetManager(extraResources);

  // 6. Local Utility Wrappers
  const reset = useCallback(() => {
    const message = isDirty 
      ? "WORKSPACE DIRTY: You have unsaved changes. Resetting will PERMANENTLY lose all modifications. Proceed?"
      : "Reset workspace to initial state?";
      
    if (window.confirm(message)) {
      orchestrator.resetDocument(activeId);
      simulationBridge.scheduleStructuralSync('Reset Document');
      addLog(`[SYSTEM] Document ${activeId} reset to factory defaults.`);
    }
  }, [isDirty, orchestrator, activeId, simulationBridge, addLog]);

  const captureSnapshotCb = useCallback(
    () => orchestrator.captureStableSnapshot(activeId),
    [orchestrator, activeId]
  );

  const startTx = useCallback(
    (label: string) => orchestrator.startTransaction(activeId, label),
    [orchestrator, activeId]
  );

  const commitTx = useCallback(() => {
    orchestrator.commitTransaction(activeId);
    simulationBridge.scheduleStructuralSync('Commit Transaction');
  }, [orchestrator, activeId, simulationBridge]);

  const abortTx = useCallback(
    () => orchestrator.abortTransaction(activeId),
    [orchestrator, activeId]
  );

  const updateManifestCb = useCallback(
    (updates: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>), label?: string, forceHistory?: boolean) =>
      history.updateManifestWithHistory(updates, label || 'Edit Properties', forceHistory),
    [history.updateManifestWithHistory]
  );

  return useMemo(() => ({
    // State
    manifest,
    contract,
    wasmBuffer,
    extraResources,
    issues,
    logs,
    isDirty,
    activeId,
    isDirectoryLinked: !!directoryHandle,
    
    // Core Actions
    updateManifest: updateManifestCb,
    updateManifestWithHistory: history.updateManifestWithHistory,
    pushHistoryEntry: history.pushHistoryEntry,
    pushHistory: orchestrator.pushHistory,
    undo: history.undo,
    redo: history.redo,
    undoTo: history.undoTo,
    compareWithHistory: history.compareWithHistory,
    handleMergeEntries: history.handleMergeEntries,
    reset,
    captureStableSnapshot: captureSnapshotCb,
    startTransaction: startTx,
    commitTransaction: commitTx,
    abortTransaction: abortTx,
    linkDirectory,
    
    // Entity Actions
    ...entities,
    
    // Clipboard Actions
    copyToClipboard: clipboard.copyToClipboard,
    cutToClipboard: clipboard.cutToClipboard,
    pasteFromClipboard: clipboard.pasteFromClipboard,
    hasClipboardContent: clipboard.hasClipboardContent,
    
    // File Actions
    ...fileOps,
    
    // Asset Actions
    ...assets,
    
    // Deployment Actions
    handleDeploy: deployment.handleDeploy,
    
    // UI/Orchestration
    blueprintInjection,
    applyTemplate: blueprintInjection.startInjection,
    simulationBridge,
    orchestrator,
    addLog
  }), [
    manifest, contract, wasmBuffer, extraResources,
    issues, logs, isDirty, activeId, directoryHandle,
    history, entities, clipboard, deployment,
    blueprintInjection, fileOps, assets,
    orchestrator, simulationBridge,
    addLog, linkDirectory, reset,
    captureSnapshotCb, startTx, commitTx, abortTx, updateManifestCb
  ]);
};
