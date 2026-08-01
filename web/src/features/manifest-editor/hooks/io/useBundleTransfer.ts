/**
 * @purpose Gestiona subcargas y actualizaciones de recursos y manifestos para el editor de manifestos OMEGA.
 * @purpose_en Manages subuploads and updates of resources and manifests for the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:14,sig:dyzh20
 * @lastUpdated 2026-06-15T13:10:50.983Z
 */

import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import yaml from 'js-yaml';
import JSZip from 'jszip';
import type { OMEGA_Manifest, OmegaNode, CellTemplate, BlueprintDefinition } from '@/omega-ui-core/types/manifest';
import type { ValidationIssue } from '@/types/validation';
import { purgeUnusedStyles, getUsedResources } from '@/features/manifest-editor/utils/governanceUtils';
import { congealSnapshot } from '@/omega-ui-core/utils/ucaBridge';
import { extractSubtreeResources } from '@/omega-ui-core/utils/StyleResolver';
import { validateManifestSchema } from '@/omega-ui-core/utils/manifestValidator';
import { findNodeInTree } from '@/omega-ui-core/utils/treeUtils';
import { generateBlueprintThumbnail } from '@/omega-ui-core/utils/BlueprintThumbnailGenerator';
import { getService } from '@/services/globalEventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';

export const useBundleTransfer = (
  manifest: OMEGA_Manifest,
  setManifest: Dispatch<SetStateAction<OMEGA_Manifest>>,
  wasmBuffer: ArrayBuffer | null,
  extraResources: { name: string, data: ArrayBuffer, type: string }[],
  setExtraResources: Dispatch<SetStateAction<{ name: string, data: ArrayBuffer, type: string }[]>>,
  addLog: (msg: string) => void,
  issues: ValidationIssue[],
  handleWasmUpload: (file: File) => Promise<void>,
  handleContractUpload: (file: File) => Promise<void>,
  handleManifestUpload: (file: File) => Promise<void>,
  captureStableSnapshot: () => void,
  updateDocumentWithHistory?: (updates: { manifest?: Partial<OMEGA_Manifest> | ((prev: OMEGA_Manifest) => Partial<OMEGA_Manifest>); extraResources?: { name: string, data: ArrayBuffer, type: string }[] | ((prev: { name: string, data: ArrayBuffer, type: string }[]) => { name: string, data: ArrayBuffer, type: string }[]) }, label: string) => void
) => {
  const historyService = getService(SERVICE_TOKENS.HISTORY_SERVICE);
  const inputSignalService = getService(SERVICE_TOKENS.INPUT_SIGNAL_SERVICE);

  const sanitizeSVG = (content: string): string => {
    // Saneamiento básico industrial Era 7.2.3
    return content
      .replace(/<metadata>[\s\S]*?<\/metadata>/gi, '') // Eliminar metadatos de editores
      .replace(/<!--[\s\S]*?-->/g, '')               // Eliminar comentarios
      .replace(/sodipodi:[\w-]+="[^"]*"/g, '')        // Eliminar basura de Inkscape
      .replace(/inkscape:[\w-]+="[^"]*"/g, '');
  };

  /**
   * processSnapshots (Phase 5.1)
   * Recursively congeals snapshots for all nodes referencing templates.
   */
  const processSnapshots = useCallback((rootNode: OmegaNode, templates: Record<string, CellTemplate>) => {
    const internalProcess = (node: OmegaNode) => {
      if (node.cellRef && templates[node.cellRef]) {
        addLog(`[SYSTEM] Congealing snapshot for node: ${node.id} (Template: ${node.cellRef})`);
        node.snapshot = congealSnapshot(node, templates[node.cellRef] as CellTemplate);
      }
      
      if (node.children) {
        node.children.forEach(child => internalProcess(child));
      }
    };

    internalProcess(rootNode);
  }, [addLog]);

  const handleResourceUpload = useCallback(async (files: FileList | File[]) => {
    let lastAssetId = '';
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      try {
        let buffer: ArrayBuffer;
        
        // Industrial Renaming & Path Preservation (Era 7.2.3)
        const isLogo = file.name.toLowerCase().includes('logo') || file.name.toLowerCase().includes('icon');
        // Prefer webkitRelativePath for folder-drop support
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const relativePath = (file as any).webkitRelativePath || file.name;
        const finalName = isLogo && !relativePath.includes('/') ? 'module_logo.svg' : relativePath;

        if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
          const text = await file.text();
          const sanitized = sanitizeSVG(text);
          buffer = new TextEncoder().encode(sanitized).buffer;
        } else {
          buffer = await file.arrayBuffer();
        }

        // ─── SHA-256 asset dedup ─────────────────────────────────
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        const assetId = `sha256_${hashHex}`;
        lastAssetId = assetId;

        addLog(`[SYSTEM] Processing Resource: ${file.name} -> ${finalName} (hash: ${hashHex.slice(0, 12)}...)`);

        const nextResources = [
          ...extraResources.filter(r => r.name !== finalName),
          { name: finalName, data: buffer, type: file.type }
        ];

        const manifestUpdates = (prev: OMEGA_Manifest) => {
          // Dedup: skip if asset with same hash already exists
          const existingAssets = prev.resources?.assets || [];
          if (existingAssets.some((a: { id: string }) => a.id === assetId)) {
            addLog(`[OK] Asset '${finalName}' already registered (hash match). Skipping duplicate.`);
            return prev;
          }

          return {
            ...prev,
            size: { width: 48, height: 48 },
            presentation: {
              ...prev.resources,
              metadata: {
                name: prev.metadata?.name || 'Imported Module',
                version: prev.metadata?.version || '0.1.0',
                family: prev.metadata?.family || 'utility',
                author: prev.metadata?.author,
                tags: prev.metadata?.tags || [],
                rack: prev.metadata?.rack
              },
              assets: [
                ...existingAssets,
                { 
                  id: assetId, 
                  url: `resources/${finalName}`, 
                  type: (file.type.includes('svg') ? 'svg' : 'image') as 'svg' | 'image' 
                }
              ]
            }
          };
        };

        if (updateDocumentWithHistory) {
          updateDocumentWithHistory({
            extraResources: nextResources,
            manifest: manifestUpdates
          }, `Import Asset: ${finalName}`);
        } else {
          setExtraResources(nextResources);
          setManifest(manifestUpdates);
        }
        
        addLog(`[OK] Resource '${finalName}' stored and registered in manifest.`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        addLog(`[CRITICAL] Resource Ingestion Failed: ${message}`);
      }
    }
    return lastAssetId;
  }, [addLog, extraResources, setExtraResources, setManifest, updateDocumentWithHistory]);

  const exportOmegaPack = useCallback(async () => {
    try {
      addLog(`[SYSTEM] Preparing OmegaPack (.omega)...`);
      
      const zip = new JSZip();
      
      const asepticManifest = purgeUnusedStyles(manifest);
      
      // [Phase 5.1] Automated Portability Audit: Congeal Snapshots
      if (asepticManifest.ui?.tree) {
        processSnapshots(asepticManifest.ui.tree, (asepticManifest.moduleTemplates as Record<string, CellTemplate>) || {});
      }

      const yamlContent = yaml.dump(asepticManifest, { indent: 2, lineWidth: -1 });
      zip.file(`${manifest.id}.acemm`, yamlContent);
      
      if (issues.length === 0 || confirm("Audit report will be included. Proceed?")) {
        const contractContent = JSON.stringify(asepticManifest, null, 2);
        zip.file(`${manifest.id}.contract.json`, contractContent);
      }

      const auditReport = `# OMEGA Audit Report\n\nModule ID: ${manifest.id}\nStatus: ${issues.length === 0 ? 'CERTIFIED' : 'DEGRADED'}\nIssues: ${issues.length}\nTimestamp: ${new Date().toISOString()}\n`;
      zip.file(`AUDIT_REPORT.md`, auditReport);

      // ── .omega container: persist history for infinite undo/redo ──
      const history = historyService.getHistory();
      const hasHistory = history.past.length > 0 || history.future.length > 0;
      if (hasHistory) {
        zip.file('history.json', JSON.stringify(history, null, 2));
        addLog(`[SYSTEM] History persisted: ${history.past.length} past, ${history.future.length} future entries.`);
      }

      // ── .omega container: project metadata + editor state ─────────
      const projectMeta = {
        name: manifest.metadata?.name || 'Untitled',
        id: manifest.id,
        schemaVersion: '10.0.0-omega',
        version: manifest.metadata?.version || '1.0.0',
        author: manifest.metadata?.author || '',
        family: manifest.metadata?.family || 'utility',
        exportedAt: new Date().toISOString(),
        editorState: {
          rackWidth: manifest.ui?.dimensions?.width || manifest.ui?.layout?.width || 800,
          rackHeight: manifest.ui?.dimensions?.height || manifest.ui?.layout?.height || 600,
          grid: manifest.ui?.layout?.grid || null,
          skin: manifest.ui?.skin || null,
          simulationConfig: inputSignalService.serializeState(),
        },
      };
      zip.file('project.json', JSON.stringify(projectMeta, null, 2));
      addLog(`[SYSTEM] Project metadata saved: ${projectMeta.name} v${projectMeta.version}.`);

      const { usedAssets } = getUsedResources(asepticManifest);

      if (wasmBuffer) {
        zip.file(`${manifest.id}.wasm`, wasmBuffer);
        addLog(`[SYSTEM] WASM Binary included in pack.`);
      }

      if (extraResources.length > 0) {
        const resFolder = zip.folder("resources");
        let includedCount = 0;
        
        for (const res of extraResources) {
          const resPath = `resources/${res.name}`;
          
          // Only include if actually referenced in the manifest
          if (usedAssets.has(resPath) || res.name === 'module_logo.svg') {
            if (res.name === 'module_logo.svg') {
              zip.file(res.name, res.data); // Root for discovery
              addLog(`[SYSTEM] Identity Logo placed in package root.`);
            } else {
              resFolder?.file(res.name, res.data);
            }
            includedCount++;
          }
        }
        addLog(`[SYSTEM] Resources: Included ${includedCount} of ${extraResources.length} total assets.`);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${manifest.metadata?.name || manifest.id}.omega`;
      a.click();
      URL.revokeObjectURL(url);
      
      addLog(`[SUCCESS] OmegaPack exported: ${manifest.metadata?.name || manifest.id}.omega`);
      captureStableSnapshot();
    } catch (err) {
      addLog(`[ERROR] Failed to generate OmegaPack: ${err}`);
    }
  }, [manifest, issues, wasmBuffer, extraResources, addLog, processSnapshots, captureStableSnapshot, historyService, inputSignalService]);

  const handleBulkUpload = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;
    
    addLog(`[SYSTEM] Batch Ingestion: Processing ${fileList.length} entities...`);

    const manifests = fileList.filter(f => f.name.endsWith('.acemm'));
    const wasms = fileList.filter(f => f.name.endsWith('.wasm') || f.name.endsWith('.ace'));
    const contracts = fileList.filter(f => f.name.endsWith('.json') && !f.name.endsWith('.acemm'));
    const others = fileList.filter(f => !f.name.endsWith('.acemm') && !f.name.endsWith('.wasm') && !f.name.endsWith('.json'));

    try {
      if (contracts.length > 0) {
        addLog(`[TRACE] Ingesting contract: ${contracts[0].name}`);
        await handleContractUpload(contracts[0]);
      }
      if (wasms.length > 0) {
        addLog(`[TRACE] Ingesting binary: ${wasms[0].name}`);
        await handleWasmUpload(wasms[0]);
      }
      if (manifests.length > 0) {
        addLog(`[TRACE] Ingesting ${manifests.length} manifests...`);
        for (const m of manifests) {
          // Validate .acemm manifest schema before ingesting
          try {
            const yamlText = await m.text();
            const parsed = yaml.load(yamlText);
            const validation = validateManifestSchema(parsed);
            if (!validation.valid) {
              addLog(`[ERROR] Invalid manifest '${m.name}':`);
              for (const err of validation.errors) {
                addLog(`  • ${err}`);
              }
              addLog(`[SKIP] File '${m.name}' omitted from ingestion.`);
              continue;
            }
            addLog(`[OK] Manifest '${m.name}' schema validated.`);
          } catch (parseErr: unknown) {
            const parseMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
            addLog(`[ERROR] Failed to parse '${m.name}': ${parseMsg}`);
            addLog(`[SKIP] File '${m.name}' omitted from ingestion.`);
            continue;
          }
          await handleManifestUpload(m);
        }
      }

      for (const res of others) {
        addLog(`[TRACE] Ingesting resource: ${res.name}`);
        await handleResourceUpload([res]);
      }

      addLog(`[SUCCESS] Industrial Batch Ingestion finalized.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`[CRITICAL] Batch Ingestion Aborted: ${message}`);
    }
  }, [handleContractUpload, handleWasmUpload, handleManifestUpload, handleResourceUpload, addLog]);

  const handleRemoveResource = useCallback((name: string) => {
    const nextResources = extraResources.filter(r => r.name !== name);
    if (updateDocumentWithHistory) {
      updateDocumentWithHistory({ extraResources: nextResources }, `Remove Asset: ${name}`);
    } else {
      setExtraResources(nextResources);
    }
    addLog(`[SYSTEM] Resource removed: ${name}`);
  }, [extraResources, setExtraResources, updateDocumentWithHistory, addLog]);

  // ── S1: Export single cell/group as .acepack blueprint ────────────
  const exportCellAsBlueprint = useCallback(async (nodeId: string) => {
    try {
      addLog(`[SYSTEM] Packaging cell ${nodeId} as blueprint (.acepack)...`);

      // 1. Locate node in UCA tree
      const tree = (manifest as OMEGA_Manifest).ui?.tree;
      if (!tree) {
        addLog('[ERROR] No UCA tree found in manifest.');
        return;
      }
      const rootNode = findNodeInTree(tree, nodeId);
      if (!rootNode) {
        addLog(`[ERROR] Cell ${nodeId} not found in UCA tree.`);
        return;
      }

      // 2. Extract minimal styles and assets for this subtree
      const { styles, assets } = extractSubtreeResources(rootNode, manifest);

      // 3. Build canonical BlueprintDefinition
      const blueprintId = rootNode.id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const labelFromMeta = typeof rootNode.meta?.label === 'string'
        ? rootNode.meta.label
        : rootNode.id;

      // ── S6: Generate SVG thumbnail ─────────────────────────────────
      const thumbnailSvg = generateBlueprintThumbnail(rootNode);

      const blueprint = {
        blueprintId,
        version: '1.0.0',
        name: labelFromMeta,
        origin: 'user' as const,
        rootNode,
        description: `Exported subtree from ${manifest.id || 'workspace'}`,
        ui: { styles },
        metadata: { thumbnail: thumbnailSvg },
      } as BlueprintDefinition;

      // 4. Create zip with JSON + resources
      const zip = new JSZip();
      zip.file('blueprint.json', JSON.stringify(blueprint, null, 2));

      // Only include assets that are actually referenced by the subtree
      const usedResourceUrls = new Set(assets.map(a => a.url));
      const resFolder = zip.folder('resources');
      let includedCount = 0;

      for (const res of extraResources) {
        const fullPath = `resources/${res.name}`;
        if (usedResourceUrls.has(fullPath)) {
          resFolder?.file(res.name, res.data);
          includedCount++;
        }
      }

      addLog(`[SYSTEM] Packaged ${includedCount} resources for blueprint.`);

      // 5. Trigger download
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${blueprintId}.acepack`;
      a.click();
      URL.revokeObjectURL(url);

      addLog(`[SUCCESS] Blueprint exported: ${blueprintId}.acepack`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`[ERROR] Failed to export blueprint: ${message}`);
    }
  }, [manifest, extraResources, addLog]);

  // ── S5.2: Ingest .acepack blueprint from disk ─────────────────────
  const handleBlueprintUpload = useCallback(async (file: File): Promise<{ label: string; description: string | undefined; version: string | undefined; blueprint: BlueprintDefinition } | null> => {
    try {
      addLog(`[SYSTEM] Ingesting .acepack blueprint: ${file.name}`);

      const zip = await JSZip.loadAsync(file);

      // 1. Extract blueprint.json
      const bpJsonFile = zip.file('blueprint.json');
      if (!bpJsonFile) {
        addLog(`[ERROR] .acepack missing blueprint.json`);
        return null;
      }
      const bpContent = await bpJsonFile.async('string');
      const blueprint: BlueprintDefinition = JSON.parse(bpContent);

      // 2. Extract resources/ folder and ingest with SHA-256 dedup
      const resFolder = zip.folder('resources');
      if (resFolder) {
        const resourceNames: string[] = [];
        resFolder.forEach((relPath) => {
          if (!zip.folder(`resources/${relPath}`)) {
            resourceNames.push(relPath.split('/').pop() || relPath);
          }
        });

        for (const fileName of resourceNames) {
          const zipEntry = resFolder.file(fileName);
          if (zipEntry) {
            const buffer = await zipEntry.async('arraybuffer');
            
            // SHA-256 dedup
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            const assetId = `sha256_${hashHex}`;

            // Check if already exists
            const existingAssets = (manifest as OMEGA_Manifest).resources?.assets || [];
            if (!existingAssets.some((a: { id: string }) => a.id === assetId)) {
              const nextResources = [
                ...extraResources.filter(r => r.name !== fileName),
                { name: fileName, data: buffer, type: 'application/octet-stream' }
              ];
              if (updateDocumentWithHistory) {
                updateDocumentWithHistory({
                  extraResources: nextResources,
                  manifest: (prev: OMEGA_Manifest) => ({
                    ...prev,
                    resources: {
                      ...prev.resources,
                      assets: [
                        ...(prev.resources?.assets || []),
                        { id: assetId, url: `resources/${fileName}`, type: 'image' as const }
                      ]
                    }
                  })
                }, `Ingest .acepack resource: ${fileName}`);
              } else {
                setExtraResources(nextResources);
              }
              addLog(`[OK] Resource '${fileName}' ingested from .acepack (SHA-256: ${hashHex.slice(0, 12)}...)`);
            } else {
              addLog(`[OK] Resource '${fileName}' already exists. Skipping duplicate.`);
            }
          }
        }
      }

      addLog(`[SUCCESS] Blueprint ingested: ${blueprint.name || blueprint.blueprintId} (${blueprint.rootNode.children?.length || 0} children)`);
      
      return {
        label: blueprint.name || blueprint.blueprintId,
        description: blueprint.description || undefined,
        version: blueprint.version || undefined,
        blueprint,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`[ERROR] Failed to ingest .acepack: ${message}`);
      return null;
    }
  }, [manifest, extraResources, setExtraResources, addLog, updateDocumentWithHistory]);

  return {
    exportOmegaPack,
    handleBulkUpload,
    handleResourceUpload,
    handleRemoveResource,
    exportCellAsBlueprint,
    handleBlueprintUpload
  };
};

