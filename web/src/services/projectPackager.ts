/**
 * @purpose Gestiona operaciones para empaquetar y desempaquetar archivos del proyecto OMEGA utilizando JSZip.
 * @purpose_en Manages operations for packing and unpacking OMEGA project files using JSZip.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:6,imports:2,sig:had81c
 * @lastUpdated 2026-06-15T17:02:54.130Z
 */

/**
 * OMEGA projectPackager.ts — Servicio de empaquetado .omega
 *
 * Servicio stateless que empaqueta y desempaqueta el formato de proyecto .omega (ZIP).
 * Es un envoltorio reusable sobre JSZip que puede usarse tanto desde hooks React
 * como desde contextos no-React (watchdog, Node.js).
 *
 * Estructura del .omega:
 *   project.json       → Metadatos del proyecto + estado del editor
 *   manifest.json      → OMEGA_Manifest completo (formato JSON, no YAML)
 *   manifest.acemm     → OMEGA_Manifest en formato YAML (compatibilidad legacy)
 *   history.json       → Historial de undo/redo (past/future arrays)
 *   resources/         → Assets binarios (PNG, SVG, filmstrips)
 *   {id}.wasm          → WASM binary opcional
 */

import JSZip from 'jszip';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

// ─── Types ─────────────────────────────────────────────────────────

export interface ProjectMetadata {
  name: string;
  id: string;
  schemaVersion: string;
  version: string;
  author?: string;
  family?: string;
  exportedAt: string;
  editorState?: Record<string, unknown>;
}

export interface HistoryBundle {
  past: unknown[];
  future: unknown[];
}

export interface OmegaPackage {
  /** Parsed project.json metadata */
  project: ProjectMetadata;
  /** Parsed manifest.json */
  manifest: OMEGA_Manifest;
  /** Parsed history.json (empty if not present) */
  history: HistoryBundle;
  /** Map of filename to ArrayBuffer from resources/ folder */
  assets: Map<string, ArrayBuffer>;
  /** WASM buffer if present */
  wasmBuffer: ArrayBuffer | null;
}

export interface PackageParams {
  manifest: OMEGA_Manifest;
  history?: HistoryBundle;
  assets?: Array<{ name: string; data: ArrayBuffer }> | Map<string, ArrayBuffer>;
  wasmBuffer?: ArrayBuffer | null;
  editorState?: Record<string, unknown>;
}

// ─── packageProject ────────────────────────────────────────────────

/**
 * Empaqueta un proyecto OMEGA en un blob .omega (ZIP).
 *
 * @example
 *   const blob = await packageProject({
 *     manifest,
 *     history: historyService.getHistory(),
 *     assets: extraResources.map(r => ({ name: r.name, data: r.data })),
 *     wasmBuffer,
 *     editorState: { rackWidth: 800, rackHeight: 600 },
 *   });
 *   // Descargar:
 *   const url = URL.createObjectURL(blob);
 *   const a = document.createElement('a');
 *   a.href = url;
 *   a.download = `${manifest.metadata?.name || 'project'}.omega`;
 *   a.click();
 *   URL.revokeObjectURL(url);
 */
export async function packageProject(params: PackageParams): Promise<Blob> {
  const { manifest, history, assets, wasmBuffer, editorState } = params;
  const zip = new JSZip();
  const moduleId = manifest.id || 'module';
  const moduleName = manifest.metadata?.name || 'Untitled';

  // ── project.json ──────────────────────────────────────────────
  const projectMeta: ProjectMetadata = {
    name: moduleName,
    id: moduleId,
    schemaVersion: '10.0.0-omega',
    version: manifest.metadata?.version || '1.0.0',
    author: manifest.metadata?.author || '',
    family: manifest.metadata?.family || 'utility',
    exportedAt: new Date().toISOString(),
    editorState: editorState || {
      rackWidth: manifest.ui?.dimensions?.width || manifest.ui?.layout?.width || 800,
      rackHeight: manifest.ui?.dimensions?.height || manifest.ui?.layout?.height || 600,
      grid: manifest.ui?.layout?.grid || null,
      skin: manifest.ui?.skin || null,
    },
  };
  zip.file('project.json', JSON.stringify(projectMeta, null, 2));

  // ── manifest.json (JSON canonico) ─────────────────────────────
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // ── manifest.acemm (YAML - compatibilidad legacy) ──────────────
  try {
    const yaml = await import('js-yaml');
    const yamlContent = yaml.dump(manifest, { indent: 2, lineWidth: -1, schema: yaml.JSON_SCHEMA });
    zip.file(`${moduleId}.acemm`, yamlContent);
  } catch {
    // js-yaml not available; skip YAML export
  }

  // ── history.json ──────────────────────────────────────────────
  if (history && (history.past.length > 0 || history.future.length > 0)) {
    zip.file('history.json', JSON.stringify(history, null, 2));
  }

  // ── resources/ ────────────────────────────────────────────────
  if (assets) {
    const assetsList = assets instanceof Map
      ? Array.from(assets.entries()).map(([name, data]) => ({ name, data }))
      : assets;

    if (assetsList.length > 0) {
      const resFolder = zip.folder('resources');
      for (const asset of assetsList) {
        if (asset.name && asset.data) {
          resFolder?.file(asset.name, asset.data);
        }
      }
    }
  }

  // ── WASM ──────────────────────────────────────────────────────
  if (wasmBuffer) {
    zip.file(`${moduleId}.wasm`, wasmBuffer);
  }

  // ── Generar blob ──────────────────────────────────────────────
  return await zip.generateAsync({ type: 'blob' });
}

// ─── unpackageProject ──────────────────────────────────────────────

/**
 * Desempaqueta un blob .omega (ZIP) y extrae todos sus componentes.
 *
 * @returns OmegaPackage con manifest, history, assets (Map<filename, ArrayBuffer>)
 * @throws Si el ZIP no contiene manifest.json o project.json
 */
export async function unpackageProject(blob: Blob): Promise<OmegaPackage> {
  const zip = await JSZip.loadAsync(blob);

  // ── project.json ──────────────────────────────────────────────
  const projectFile = zip.file('project.json');
  let project: ProjectMetadata;
  if (projectFile) {
    const content = await projectFile.async('string');
    project = JSON.parse(content) as ProjectMetadata;
  } else {
    // Fallback: construir metadata minima desde el manifest
    project = {
      name: 'Untitled',
      id: 'unknown',
      schemaVersion: '10.0.0-omega',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    };
  }

  // ── manifest.json (o .acemm fallback) ─────────────────────────
  let manifestFile = zip.file('manifest.json');
  if (!manifestFile) {
    // Fallback: buscar cualquier .acemm en la raiz
    const acemmFiles = Object.keys(zip.files).filter(
      (name) => name.endsWith('.acemm') && !name.includes('/')
    );
    if (acemmFiles.length > 0) {
      manifestFile = zip.file(acemmFiles[0])!;
    }
  }

  let manifest: OMEGA_Manifest;
  if (manifestFile) {
    const content = await manifestFile.async('string');
    // Intentar parsear como JSON primero, luego YAML
    try {
      manifest = JSON.parse(content) as OMEGA_Manifest;
    } catch {
      // Si falla JSON, asumir YAML e importar dinamicamente js-yaml
      const yaml = await import('js-yaml');
      manifest = yaml.load(content) as OMEGA_Manifest;
    }
  } else {
    throw new Error('Invalid .omega: no manifest.json or .acemm found');
  }

  // ── history.json ──────────────────────────────────────────────
  let history: HistoryBundle = { past: [], future: [] };
  const historyFile = zip.file('history.json');
  if (historyFile) {
    try {
      const content = await historyFile.async('string');
      history = JSON.parse(content) as HistoryBundle;
    } catch {
      // Ignorar history corrupto
    }
  }

  // ── resources/ ────────────────────────────────────────────────
  const assets = new Map<string, ArrayBuffer>();
  const resourcesFolder = zip.folder('resources');
  if (resourcesFolder) {
    // Recolectar nombres de archivo (no directorios)
    const resourceFiles: string[] = [];
    resourcesFolder.forEach((relPath) => {
      // Descartar entries que son subdirectorios
      const fullPath = `resources/${relPath}`;
      if (!zip.folder(fullPath)) {
        resourceFiles.push(relPath);
      }
    });

    for (const fileName of resourceFiles) {
      const entry = resourcesFolder.file(fileName);
      if (entry) {
        const buffer = await entry.async('arraybuffer');
        assets.set(fileName, buffer);
      }
    }
  }

  // ── WASM ──────────────────────────────────────────────────────
  let wasmBuffer: ArrayBuffer | null = null;
  const escapedId = (project.id || 'module').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wasmPattern = new RegExp('^' + escapedId + '\\.wasm$');
  for (const [fileName, fileEntry] of Object.entries(zip.files)) {
    if (wasmPattern.test(fileName) && !fileEntry.dir) {
      wasmBuffer = await fileEntry.async('arraybuffer');
      break;
    }
  }

  return { project, manifest, history, assets, wasmBuffer };
}
