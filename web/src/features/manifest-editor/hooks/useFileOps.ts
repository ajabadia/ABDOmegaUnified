'use client';

/**
 * @purpose Gestiona operaciones de archivo para manifestos, WASM y bundles en el editor de manifesto OMEGA.
 * @purpose_en Orchestrates file operations for manifests, WASM, and bundles in the OMEGA manifest editor.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:12ihd5
 * @lastUpdated 2026-06-15T13:21:50.719Z
 */

import { useManifestTransfer } from './io/useManifestTransfer';
import { useWasmTransfer } from './io/useWasmTransfer';
import { useBundleTransfer } from './io/useBundleTransfer';
import type { OMEGA_Manifest, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '@/omega-ui-core/types/contract';
import type { ValidationIssue } from '@/types/validation';

/**
 * OMEGA File Operations (v7.2.3)
 * Orchestrator hook that composes manifest, WASM, and bundle I/O operations.
 */
export const useFileOps = (
  manifest: OMEGA_Manifest,
  setManifest: (u: OMEGA_Manifest | ((prev: OMEGA_Manifest) => OMEGA_Manifest)) => void,
  setContract: (u: (OmegaContract | OMEGA_Contract) | null | ((prev: (OmegaContract | OMEGA_Contract) | null) => (OmegaContract | OMEGA_Contract) | null)) => void,
  setWasmBuffer: (u: ArrayBuffer | null | ((prev: ArrayBuffer | null) => ArrayBuffer | null)) => void,
  wasmBuffer: ArrayBuffer | null,
  setExtraResources: (u: { name: string, data: ArrayBuffer, type: string }[] | ((prev: { name: string, data: ArrayBuffer, type: string }[]) => { name: string, data: ArrayBuffer, type: string }[])) => void,
  extraResources: { name: string, data: ArrayBuffer, type: string }[],
  addLog: (msg: string) => void,
  issues: ValidationIssue[],
  captureStableSnapshot: () => void,
  directoryHandle?: FileSystemDirectoryHandle | null,
  updateDocumentWithHistory?: (updates: { manifest?: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>); extraResources?: { name: string, data: ArrayBuffer, type: string }[] | ((prev: { name: string, data: ArrayBuffer, type: string }[]) => { name: string, data: ArrayBuffer, type: string }[]) }, label: string) => void
) => {

  // 1. Manifest Operations (Import/Export/CAD)
  const manifestIO = useManifestTransfer(manifest, setManifest, addLog, issues, captureStableSnapshot, directoryHandle);

  // 2. WASM Operations (Binary/Contract)
  const wasmIO = useWasmTransfer(manifest, setManifest, setContract, setWasmBuffer, addLog);

  // 3. Bundle Operations (OmegaPack/Bulk/Resources)
  const bundleIO = useBundleTransfer(
    manifest, 
    setManifest,
    wasmBuffer, 
    extraResources, 
    setExtraResources, 
    addLog, 
    issues,
    wasmIO.handleWasmUpload,
    wasmIO.handleContractUpload,
    manifestIO.handleManifestUpload,
    captureStableSnapshot,
    updateDocumentWithHistory
  );

  return {
    ...manifestIO,
    ...wasmIO,
    ...bundleIO,
    exportContract: wasmIO.exportContract,
    exportCellAsBlueprint: bundleIO.exportCellAsBlueprint
  };
};
