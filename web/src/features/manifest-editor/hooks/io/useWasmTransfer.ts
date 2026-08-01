'use client';

/**
 * @purpose Gestiona subidas y descargas de WASM y contratos, exporta contratos y actualiza el manifesto.
 * @purpose_en Manages WASM and contract uploads, exports contracts, and updates the manifest accordingly.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:6,sig:rlze2s
 * @lastUpdated 2026-06-15T13:10:59.741Z
 */

import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { OMEGA_Manifest, OMEGA_Contract } from '@/omega-ui-core/types/manifest';
import { WasmLoaderService } from '@/services/wasmLoader';
import type { OmegaContract } from '@/omega-ui-core/types/contract';
import { ContractService } from '@/services/contractService';
import { getService } from '@/services/globalEventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';

export const useWasmTransfer = (
  manifest: OMEGA_Manifest,
  setManifest: Dispatch<SetStateAction<OMEGA_Manifest>>,
  setContract: Dispatch<SetStateAction<(OmegaContract | OMEGA_Contract) | null>>,
  setWasmBuffer: Dispatch<SetStateAction<ArrayBuffer | null>>,
  addLog: (msg: string) => void
) => {
  const wasmRuntime = getService(SERVICE_TOKENS.WASM_RUNTIME);

  const exportContract = useCallback((format: 'ts' | 'cpp') => {
    addLog(`[SYSTEM] Exporting Technical Contract (${format.toUpperCase()})...`);
    const content = format === 'ts' 
      ? ContractService.generateTypeScriptContract(manifest)
      : ContractService.generateCppContract(manifest);
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'ts' ? 'schema_ids.ts' : 'OmegaRegistry.h';
    a.click();
    URL.revokeObjectURL(url);
    addLog(`[OK] Contract exported as ${a.download}`);
  }, [manifest, addLog]);

  const syncManifestWithContract = useCallback((newContract: OmegaContract, filename: string) => {
    setManifest((prev: OMEGA_Manifest) => ({
      ...prev,
      id: newContract.id || prev.id,
      metadata: {
        ...(prev.metadata || {}),
        name: (prev.metadata?.name === 'New Module' || !prev.metadata?.name) ? (newContract.name || newContract.id) : prev.metadata.name,
        family: newContract.family || prev.metadata?.family || 'oscillator',
        version: prev.metadata?.version || '0.1.0'
      },
      resources: {
        ...(prev.resources || {}),
        wasm: filename,
        contract: {
          id: newContract.id,
          label: newContract.name || newContract.id,
          role: newContract.family || 'oscillator',
          ports: newContract.ports.map(p => ({
            id: p.id,
            direction: p.direction === 'output' ? 'out' as const : 'in' as const,
            signalType: (p.type === 'audio' || p.type === 'cv' || p.type === 'midi' || p.type === 'gate') ? p.type : 'audio'
          }))
        }
      }
    }));
  }, [setManifest]);

  const handleWasmUpload = useCallback(async (file: File) => {
    addLog(`Loading WASM Binary: ${file.name}...`);
    try {
      const buffer = await file.arrayBuffer();
      setWasmBuffer(buffer);
      const extractedContract = await WasmLoaderService.extractContract(file);
      
      // Industrial Fingerprinting: Generate hash from the contract to bind it with the manifest
      const { IntegrityService } = await import('@/services/integrityService');
      extractedContract.firmwareHash = await IntegrityService.generateHash(extractedContract as unknown as Record<string, unknown>);
      
      setContract(extractedContract);
      addLog(`[OK] Contract extracted and fingerprinted: ${extractedContract.firmwareHash.slice(0, 8)}`);

      const success = await wasmRuntime.loadWasm(buffer);
      if (success) {
        addLog(`[OK] Simulation engine synchronized with binary logic.`);
      }

      syncManifestWithContract(extractedContract, file.name);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`[CRITICAL] WASM Load Failed: ${message}`);
    }
  }, [addLog, setContract, setWasmBuffer, syncManifestWithContract, wasmRuntime]);

  const handleContractUpload = useCallback(async (file: File) => {
    addLog(`Ingesting Technical Contract: ${file.name}...`);
    try {
      const content = await file.text();
      const rawData = JSON.parse(content);
      const data = rawData.contract || rawData;
      
      if (!data.id || !data.ports) {
        throw new Error("Missing mandatory 'id' or 'ports' fields in contract.");
      }

      const loadedContract: OmegaContract = {
        omega_version: data.omega_version || data.version || "7.0",
        id: String(data.id),
        name: data.name || data.id,
        family: (data.family || "utility").toLowerCase(),
        parameters: data.parameters || [],
        ports: data.ports || []
      };
      
      interface RawParam { id?: string; name?: string; min?: number; max?: number; default?: number; }
      interface RawPort { id?: string; name?: string; type?: string; direction?: string; }

      loadedContract.parameters = (loadedContract.parameters || []).map((p: RawParam) => ({ 
        min: 0, max: 1, default: 0, 
        ...p, 
        id: String(p.id || p.name).toLowerCase(),
        name: String(p.name || p.id)
      } as OmegaContract['parameters'][0]));

      loadedContract.ports = (loadedContract.ports || []).map((p: RawPort) => ({ 
        type: 'audio', direction: 'input', 
        ...p, 
        id: String(p.id || p.name).toLowerCase() 
      } as OmegaContract['ports'][0]));
      
      const { IntegrityService } = await import('@/services/integrityService');
      loadedContract.firmwareHash = await IntegrityService.generateHash(loadedContract as unknown as Record<string, unknown>);
      
      setContract(loadedContract);
      addLog(`[AUDIT] Contract '${loadedContract.id}' validated and fingerprinted.`);
      syncManifestWithContract(loadedContract, 'module.wasm');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`[CRITICAL] Contract Load Failed: ${message}`);
    }
  }, [addLog, setContract, syncManifestWithContract]);

  return {
    handleWasmUpload,
    handleContractUpload,
    exportContract
  };
};
