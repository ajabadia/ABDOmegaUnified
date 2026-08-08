/**
 * ABDOmegaUnified - Shared Module Catalog Service
 * Servicio centralizado que expone los manifiestos .acemm y contratos WASM
 * de los módulos de la estantería compartida (/modules).
 *
 * FUENTE ÚNICA: el catálogo se deriva de `acemmCatalog.generated.ts`, generado
 * por `scripts/generate_acemm_catalog.mjs` a partir de `modules/<id>/<id>.acemm`.
 * No hay listas hardcodeadas: añadir un módulo nuevo en modules/ basta para que
 * aparezca aquí, en el menú Open Shelf y en el Rack Player.
 */

import { GENERATED_ACEMM_CATALOG } from './acemmCatalog.generated';
import yaml from 'js-yaml';

export type ModuleFamily = 'io' | 'utility' | 'synth' | 'fx' | 'control' | 'midi';
export type ModuleSkin = 'industrial' | 'default';

export interface SharedModuleEntry {
  id: string;
  name: string;
  family: ModuleFamily;
  version: string;
  hpWidth: number;
  manifestUrl: string;
  wasmUrl?: string;
  description: string;
  skin: ModuleSkin;
  portsCount: number;
  controlsCount: number;
  hasSource: boolean;
}

/** Normaliza los valores de familia que pueden emitir los .acemm. */
function normalizeFamily(family: unknown): ModuleFamily {
  if (typeof family !== 'string') return 'utility';
  const normalized = family.toLowerCase();
  switch (normalized) {
    case 'io':
    case 'utility':
    case 'synth':
    case 'fx':
    case 'control':
    case 'midi':
      return normalized;
    default:
      return 'utility';
  }
}

/** Normaliza el skin a la unión admitida por la UI. */
function normalizeSkin(skin: unknown): ModuleSkin {
  return skin === 'industrial' ? 'industrial' : 'default';
}

/** Subconjunto de una entrada del catálogo generado que consume el servicio. */
interface RawAcemmEntry {
  name?: string;
  description?: string;
  metadata?: { name?: string; family?: string; version?: string; description?: string };
  rack?: { hp?: number };
  assets?: { source?: boolean; wasm?: boolean };
  ui?: { skin?: string; controls?: Array<{ presentation?: { component?: string } }> };
}

/** Convierte una entrada del catálogo generado en un SharedModuleEntry. */
function deriveEntry(id: string, raw: RawAcemmEntry): SharedModuleEntry | null {
  if (!raw || typeof raw !== 'object') return null;

  const controls = raw.ui?.controls ?? [];
  const portsCount = controls.filter(
    (c) => c?.presentation?.component === 'port'
  ).length;
  const controlsCount = Math.max(controls.length - portsCount, 0);

  const wasmUrl = raw.assets?.wasm ? `/wasm/${id}.wasm` : undefined;

  return {
    id,
    name: raw.name || raw.metadata?.name || id.toUpperCase(),
    family: normalizeFamily(raw.metadata?.family),
    version: raw.metadata?.version || '1.0.0',
    hpWidth: raw.rack?.hp ?? 4,
    manifestUrl: `/modules/${id}/${id}.acemm`,
    ...(wasmUrl ? { wasmUrl } : {}),
    description: raw.description || raw.metadata?.description || '',
    skin: normalizeSkin(raw.ui?.skin),
    portsCount,
    controlsCount,
    hasSource: Boolean(raw.assets?.source),
  };
}

export const SHARED_MODULES_CATALOG: SharedModuleEntry[] = Object.entries(
  GENERATED_ACEMM_CATALOG
)
  .map(([id, raw]) => deriveEntry(id, raw as RawAcemmEntry))
  .filter((entry): entry is SharedModuleEntry => entry !== null)
  .sort((a, b) => a.id.localeCompare(b.id));

export class SharedModuleCatalogService {
  /**
   * Obtiene todos los módulos registrados en el catálogo (derivado de modules/).
   */
  static getCatalog(): SharedModuleEntry[] {
    return SHARED_MODULES_CATALOG;
  }

  /**
   * Busca un módulo por su ID (coincidencia exacta o parcial por compatibilidad).
   */
  static getModuleById(id: string): SharedModuleEntry | undefined {
    return SHARED_MODULES_CATALOG.find(m => m.id === id || m.id.includes(id));
  }

  /**
   * Carga y parsea el manifiesto .acemm de un módulo desde la estantería /modules
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async fetchManifest(moduleId: string): Promise<any> {
    const entry = this.getModuleById(moduleId);
    const url = entry ? entry.manifestUrl : `/modules/${moduleId}/${moduleId}.acemm`;
    const res = await fetch(url);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return yaml.load(text);
    }
  }

  /**
   * Indica si el módulo expone código fuente (.cpp) en la estantería.
   */
  static hasSource(moduleId: string): boolean {
    return this.getModuleById(moduleId)?.hasSource ?? false;
  }

  /**
   * Recupera el código fuente C++ de un módulo desde /modules/<id>/<id>.cpp.
   */
  static async fetchSource(moduleId: string): Promise<string> {
    const res = await fetch(`/modules/${moduleId}/${moduleId}.cpp`);
    if (!res.ok) {
      throw new Error(`No se pudo cargar la fuente de ${moduleId} (HTTP ${res.status})`);
    }
    return res.text();
  }
}
