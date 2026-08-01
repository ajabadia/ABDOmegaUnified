'use client';

/**
 * @purpose Gestiona la subida y exportación de manifestos en el editor de manifesto OMEGA.
 * @purpose_en Manages manifest upload and export functionalities in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:tqkm7f
 * @lastUpdated 2026-06-15T13:10:55.153Z
 */

import { useCallback } from 'react';
import yaml from 'js-yaml';
import type { OMEGA_Manifest, ManifestEntity, ComponentType, AttachmentType, Attachment, Dimensions, Position } from '@/omega-ui-core/types/manifest';
import type { ValidationIssue } from '@/types/validation';
import { ContractService } from '@/services/contractService';
import { CADExportService } from '@/services/cadExportService';
import { distillManifest, getUnusedStylesAndAssets } from '@/omega-ui-core/utils/StyleResolver';

export const useManifestTransfer = (
  manifest: OMEGA_Manifest,
  setManifest: (updater: OMEGA_Manifest | ((prev: OMEGA_Manifest) => OMEGA_Manifest), label?: string) => void,
  addLog: (msg: string) => void,
  issues: ValidationIssue[],
  captureStableSnapshot: () => void,
  directoryHandle?: FileSystemDirectoryHandle | null
) => {

  const handleManifestUpload = useCallback(async (file: File) => {
    addLog(`Ingesting Manifest: ${file.name}...`);
    try {
      const content = await file.text();
      const parsed = yaml.load(content) as Partial<OMEGA_Manifest> & { name?: string };
      
      if (!parsed || typeof parsed !== 'object') throw new Error("Invalid manifest format.");

      if (!parsed.ui) parsed.ui = { dimensions: { width: 120, height: 420 }, controls: [], jacks: [] };
      if (!parsed.metadata) ((parsed as unknown) as OMEGA_Manifest).metadata = { name: ((parsed as unknown) as { name?: string }).name || "Unnamed Module", version: "0.1.0", family: "utility" };
      if (parsed.metadata && !parsed.metadata.version) parsed.metadata.version = "0.1.0";
      
      const getNum = (v: unknown) => {
        const n = parseFloat(String(v));
        return isNaN(n) ? 0 : n;
      };

      const normalize = (list: unknown[], defaultTab: string): ManifestEntity[] => (list || []).map((cRaw: unknown, idx) => {
        const c = cRaw as { 
          id?: string; 
          type?: string; 
          role?: string; 
          bind?: string; 
          label?: string; 
          pos?: { x?: number; y?: number };
          presentation?: {
            tab?: string;
            variant?: string;
            component?: string;
            offsetX?: number;
            offsetY?: number;
            container?: string;
            group?: string;
            attachments?: unknown[];
            precision?: number;
            ui_precision?: number;
          };
        };
        const defaultRole = defaultTab === 'PATCHING' ? 'stream' : 'control';

        return {
          id: String(c.id || `entity_${defaultTab}_${idx}`),
          type: String(c.type || (defaultTab === 'PATCHING' ? 'port' : 'knob')).toLowerCase(),
          role: String(c.role || defaultRole),
          bind: String(c.bind || ''),
          label: String(c.label || ''),
          pos: { x: ((cRaw as unknown) as { pos?: Position }).pos?.x || 0, y: ((cRaw as unknown) as { pos?: Position }).pos?.y || 0 },
          size: ((cRaw as unknown) as { size?: Dimensions }).size || { width: 48, height: 48 },
          presentation: {
            tab: String(c.presentation?.tab || (defaultTab === 'PATCHING' ? 'MAIN' : defaultTab)),
            variant: String(c.presentation?.variant || 'B_cyan'),
            component: String(c.presentation?.component || c.type || (defaultTab === 'PATCHING' ? 'port' : 'knob')).toLowerCase() as ComponentType,
            offsetX: getNum(c.presentation?.offsetX),
            offsetY: getNum(c.presentation?.offsetY),
            container: c.presentation?.container || c.presentation?.group,
            group: c.presentation?.group,
            attachments: (c.presentation?.attachments || []).map((attRaw: unknown) => {
              const att = attRaw as { 
                type?: string; 
                position?: string; 
                offsetX?: unknown; 
                offsetY?: unknown; 
                variant?: string; 
                text?: string; 
              };
              return {
                id: `att_${idx}_${Math.random().toString(36).substr(2, 4)}`,
                type: String(att.type || 'label') as AttachmentType,
                label: String(att.text || att.type || 'attachment'),
                pos: { x: 0, y: 0 },
                position: String(att.position || 'bottom') as Attachment['position'],
                offsetX: getNum(att.offsetX),
                offsetY: getNum(att.offsetY),
                variant: String(att.variant || 'B_cyan'),
                text: att.text
              };
            }),
            precision: getNum(c.presentation?.precision) || 6,
            ui_precision: getNum(c.presentation?.ui_precision) || 2,
          }
        };
      });

      const finalManifest: OMEGA_Manifest = {
        schemaVersion: String(parsed.schemaVersion || '7.1'),
        id: String(parsed.id || 'unknown_module'),
        metadata: {
          name: String(parsed.metadata?.name || parsed.name),
          family: String(parsed.metadata?.family || 'utility').toLowerCase(),
          version: String(parsed.metadata?.version || '0.1.0'),
          author: parsed.metadata?.author,
          tags: parsed.metadata?.tags || [],
          rack: parsed.metadata?.rack
        },
        ui: {
          dimensions: { 
            width: getNum(parsed.ui.dimensions?.width) || 120, 
            height: getNum(parsed.ui.dimensions?.height) || 420 
          },
          controls: normalize(parsed.ui.controls || [], 'MAIN'),
          jacks: normalize(parsed.ui.jacks || [], 'MAIN'),
          skin: parsed.ui.skin || 'industrial',
          layout: {
            width: 800,
            height: 600,
            containers: ((parsed.ui as unknown) as OMEGA_Manifest['ui'])?.layout?.containers || [],
            ...((parsed.ui as unknown) as OMEGA_Manifest['ui'])?.layout
          } as OMEGA_Manifest['ui']['layout'],
          // UCA Persistence (Phase 10.2)
          tree: parsed.ui.tree,
          useUCA: parsed.ui.useUCA ?? true 
        },
        resources: {
          ...parsed.resources,
          wasm: (parsed.resources as Record<string, unknown> | undefined)?.wasm || (parsed.resources as Record<string, unknown> | undefined)?.contract
        } as OMEGA_Manifest['resources'],
        entities: normalize(parsed.ui?.controls || parsed.controls || [], 'MAIN'),
        links: parsed.links || [],
        modulations: parsed.modulations || []
      };

      setManifest(finalManifest, `Import Manifest: ${file.name}`);
      addLog(`Success: UI state reconstructed for '${finalManifest.metadata.name}'.`);
      captureStableSnapshot();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`[CRITICAL] Ingestion Failure: ${message}`);
    }
  }, [addLog, setManifest, captureStableSnapshot]);
  
  const exportManifest = useCallback(async (mode: 'work' | 'distilled' = 'work') => {
    if (issues.length > 0) {
      if (!confirm(`Manifest has ${issues.length} issues. Export anyway?`)) return;
    }

    let finalManifest = manifest;
    if (mode === 'distilled') {
      const { unusedStyles, unusedAssets } = getUnusedStylesAndAssets(manifest);
      if (unusedStyles.length > 0 || unusedAssets.length > 0) {
        let msg = "Confirm Export Definitive Mode (Distilled)\n\n";
        msg += "The following unused resources will be permanently removed from the exported manifest:\n";
        
        if (unusedStyles.length > 0) {
          msg += `\nUnused Style Variants (${unusedStyles.length}):\n`;
          unusedStyles.slice(0, 15).forEach(s => {
            msg += `  - ${s.type} [variant: ${s.variantId}]\n`;
          });
          if (unusedStyles.length > 15) msg += `  - ... and ${unusedStyles.length - 15} more\n`;
        }
        
        if (unusedAssets.length > 0) {
          msg += `\nUnused Assets (${unusedAssets.length}):\n`;
          unusedAssets.slice(0, 15).forEach(id => {
            msg += `  - ${id}\n`;
          });
          if (unusedAssets.length > 15) msg += `  - ... and ${unusedAssets.length - 15} more\n`;
        }

        msg += "\nDo you want to proceed with distillation?";
        if (!confirm(msg)) {
          addLog("[INFO] Export cancelled by user.");
          return;
        }
      }
      finalManifest = distillManifest(manifest);
      addLog("[OK] Distillation completed. All unused styles and assets pruned.");
    }

    const yamlContent = yaml.dump(finalManifest, { 
      indent: 2, 
      lineWidth: -1,
      schema: yaml.JSON_SCHEMA 
    });

    const cppContent = ContractService.generateCppContract(finalManifest);
    const tsContent = ContractService.generateTypeScriptContract(finalManifest);

    let saved = false;

    // 1. Try browser-native File System Access API (Linked Directory)
    if (directoryHandle) {
      try {
        const perm = await (directoryHandle as unknown as { queryPermission: (opt: { mode: string }) => Promise<PermissionState> }).queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          const req = await (directoryHandle as unknown as { requestPermission: (opt: { mode: string }) => Promise<PermissionState> }).requestPermission({ mode: 'readwrite' });
          if (req !== 'granted') throw new Error('File system write permission denied.');
        }

        let targetDir = directoryHandle;
        try {
          if (manifest.id) {
            targetDir = await directoryHandle.getDirectoryHandle(manifest.id, { create: false });
          }
        } catch {
          // Fallback to saving in the root directory selected by the user
        }

        // Save .acemm
        const fileHandle = await targetDir.getFileHandle(`${manifest.id}.acemm`, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(yamlContent);
        await writable.close();

        // Save C++ contract
        const cppFileHandle = await targetDir.getFileHandle(`${manifest.id}_contract.h`, { create: true });
        const cppWritable = await cppFileHandle.createWritable();
        await cppWritable.write(cppContent);
        await cppWritable.close();

        // Save TS contract
        const tsFileHandle = await targetDir.getFileHandle(`${manifest.id}_contract.ts`, { create: true });
        const tsWritable = await tsFileHandle.createWritable();
        await tsWritable.write(tsContent);
        await tsWritable.close();
        
        saved = true;
        addLog(`[OK] Manifest and contracts saved directly to linked workspace: ${manifest.id}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        addLog(`[WARNING] FS API Save failed: ${message}. Falling back to watchdog/download.`);
      }
    }

    // 2. Try Local Watchdog Server
    if (!saved) {
      try {
        const saveFile = async (name: string, data: string) => {
          const res = await fetch('http://127.0.0.1:3001/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: name, content: data }),
            signal: AbortSignal.timeout(1500)
          });
          return res.ok;
        };

        const manifestSaved = await saveFile(`${manifest.id}.acemm`, yamlContent);
        if (manifestSaved) {
          await saveFile(`${manifest.id}_contract.h`, cppContent);
          await saveFile(`${manifest.id}_contract.ts`, tsContent);
          saved = true;
          addLog(`[OK] Manifest and contracts saved directly to watchdog workspace: ${manifest.id}`);
        }
      } catch {
        // Watchdog offline/unresponsive
      }
    }

    // 3. Fallback: Browser Download
    if (!saved) {
      const downloadFile = (name: string, content: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      };

      downloadFile(`${manifest.id}.acemm`, yamlContent, 'text/yaml');
      downloadFile(`${manifest.id}_contract.h`, cppContent, 'text/plain');
      downloadFile(`${manifest.id}_contract.ts`, tsContent, 'text/plain');
      addLog(`[OK] Exported manifest and contracts: ${manifest.id} (Browser downloads)`);
    }
    captureStableSnapshot();
  }, [manifest, issues, addLog, captureStableSnapshot, directoryHandle]);

  const exportCADBlueprint = useCallback(async () => {
    const svg = CADExportService.generateSVGBlueprint(manifest, {
      skin: manifest.ui?.skin || 'industrial',
      drillLayer: false,
      silkscreenLayer: true,
      dimensions: true
    });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CAD_BLUEPRINT_${manifest.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    addLog(`[OK] Exported Industrial CAD Blueprint: ${manifest.id}.svg`);
  }, [manifest, addLog]);

  return {
    handleManifestUpload,
    exportManifest,
    exportCADBlueprint
  };
};
