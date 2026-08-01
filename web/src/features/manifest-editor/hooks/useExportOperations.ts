'use client';

/**
 * @purpose Gestiona el empaque del rack de módulo OMEGA y exporta archivos de contrato (.ts / .cpp).
 * @purpose_en Manages the packaging of OMEGA Module Rack and exports contract files (.ts / .cpp).
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:3,imports:6,sig:1wci4wg
 * @lastUpdated 2026-06-20T12:52:51.139Z
 */

import { useCallback } from 'react';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { toast } from '@/features/manifest-editor/utils/toast';
import { distillForJUCE as defaultDistillForJUCE } from '@/omega-ui-core/utils/distillForJUCE';
import { ContractService as defaultContractService } from '@/services/contractService';
import defaultJSZip from 'jszip';

/** Minimal editor interface required by useExportOperations */
export interface ExportEditor {
  addLog: (message: string) => void;
  extraResources: Array<{ name: string; data: ArrayBuffer; type: string }>;
  wasmBuffer: ArrayBuffer | null | undefined;
}

/** Injectable dependencies for testing */
export interface ExportOperationsDeps {
  distillForJUCE?: typeof defaultDistillForJUCE;
  ContractService?: typeof defaultContractService;
  JSZip?: typeof defaultJSZip;
}

/**
 * Export operations — handles OMEGA Module Rack packaging (JSZip + distill + download)
 * and contract file export (.ts / .cpp).
 *
 * Accepts an optional `deps` parameter for dependency injection in tests.
 */
export function useExportOperations(
  manifest: OMEGA_Manifest,
  editor: ExportEditor,
  deps?: ExportOperationsDeps,
) {
  const {
    distillForJUCE = defaultDistillForJUCE,
    ContractService = defaultContractService,
    JSZip = defaultJSZip,
  } = deps ?? {};

  const handleExportOmegaRack = useCallback(async () => {
    try {
      editor.addLog('[SYSTEM] Preparing OMEGA Module Rack (.zip)...');

      // 1. Post-process the distilled manifest to JUCE 8 flat format
      const forJUCE = distillForJUCE(manifest);

      // 2. Build ZIP with distilled JSON + resources
      const zip = new JSZip();
      zip.file('manifest.json', JSON.stringify(forJUCE, null, 2));

      // 3. Include assets/resources
      if (editor.extraResources.length > 0) {
        const resFolder = zip.folder('resources');
        let count = 0;
        for (const res of editor.extraResources) {
          resFolder?.file(res.name, res.data);
          count++;
        }
        editor.addLog(`[OK] Packaged ${count} assets into resources/.`);
      }

      // 4. Include WASM if present
      if (editor.wasmBuffer) {
        zip.file(`${manifest.id}.wasm`, editor.wasmBuffer);
        editor.addLog('[SYSTEM] WASM Binary included in pack.');
      }

      // 5. Trigger download
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${manifest.id || 'module'}_rack.zip`;
      a.click();
      URL.revokeObjectURL(url);

      editor.addLog('[SUCCESS] OMEGA Module Rack exported.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      editor.addLog(`[ERROR] Failed to export OMEGA Module Rack: ${message}`);
    }
  }, [manifest, editor, distillForJUCE, JSZip]);

  const handleExportContract = useCallback(
    (format: 'ts' | 'cpp') => {
      ContractService.downloadContract(manifest, format);
      toast.success(`Contract exported (${format.toUpperCase()})`);
    },
    [manifest, ContractService],
  );

  return { handleExportOmegaRack, handleExportContract };
}
