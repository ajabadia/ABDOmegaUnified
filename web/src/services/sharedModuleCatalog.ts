/**
 * ABDOmegaUnified - Shared Module Catalog Service
 * Servicio centralizado que expone los manifiestos .acemm y contratos WASM
 * de los módulos de la estantería compartida (/modules).
 *
 * FUENTE ÚNICA: el catálogo se deriva en runtime de `modules/<id>/<id>.acemm`
 * vía `GET /api/modules` (escaneo en vivo). `acemmCatalog.generated.ts` queda
 * como fallback offline/build-time si el endpoint no responde. Añadir un módulo
 * nuevo en modules/ basta para que aparezca aquí, en el menú Open Shelf y en el
 * Rack Player — sin regenerar catálogos ni rebuildar.
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

/** Deriva la lista de SharedModuleEntry desde un catálogo bruto (generado o del endpoint). */
function deriveCatalog(rawCatalog: Record<string, unknown>): SharedModuleEntry[] {
  return Object.entries(rawCatalog)
    .map(([id, raw]) => deriveEntry(id, raw as RawAcemmEntry))
    .filter((entry): entry is SharedModuleEntry => entry !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export class SharedModuleCatalogService {
  /** Caché de la última lista en vivo cargada desde /api/modules (si existe). */
  private static liveCatalog: SharedModuleEntry[] | null = null;

  /**
   * Obtiene todos los módulos registrados en el catálogo. Prioridad: catálogo
   * en vivo (de /api/modules si ya se cargó) → catálogo generado (build-time).
   */
  static getCatalog(): SharedModuleEntry[] {
    return this.liveCatalog ?? SHARED_MODULES_CATALOG;
  }

  /**
   * Carga el catálogo en vivo desde `GET /api/modules` (escaneo de modules/ en
   * runtime). Si el endpoint no responde o devuelve vacío, mantiene el catálogo
   * generado como fallback. Cachea el resultado para llamadas posteriores.
   */
  static async loadCatalog(): Promise<SharedModuleEntry[]> {
    try {
      const res = await fetch('/api/modules', { cache: 'no-store' });
      if (!res.ok) {
        console.warn(`[SharedModuleCatalogService] /api/modules -> HTTP ${res.status}; usando catálogo generado.`);
        return SHARED_MODULES_CATALOG;
      }
      const raw = (await res.json()) as Record<string, unknown>;
      const derived = deriveCatalog(raw);
      if (derived.length === 0) return SHARED_MODULES_CATALOG;
      this.liveCatalog = derived;
      return derived;
    } catch (e) {
      console.warn('[SharedModuleCatalogService] fallback a catálogo generado:', e);
      return SHARED_MODULES_CATALOG;
    }
  }

  /**
   * Busca un módulo por su ID (coincidencia exacta o parcial por compatibilidad).
   * Respeta el catálogo en vivo (si ya se cargó), si no el generado.
   */
  static getModuleById(id: string): SharedModuleEntry | undefined {
    return this.getCatalog().find(m => m.id === id || m.id.includes(id));
  }

  /**
   * Carga y parsea el manifiesto .acemm de un módulo desde la estantería /modules
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async fetchManifest(moduleId: string): Promise<any> {
    const entry = this.getModuleById(moduleId);
    const url = entry ? entry.manifestUrl : `/modules/${moduleId}/${moduleId}.acemm`;
    const res = await fetch(url);

    // POR QUÉ ESTA COMPROBACIÓN, Y POR QUÉ AQUÍ
    // -----------------------------------------
    // Antes se leía el cuerpo y se probaba con JSON y luego con YAML. Ante un
    // 404, `yaml.load` NO LANZA: devuelve el cuerpo como STRING ("Not Found"),
    // o incluso como objeto si el cuerpo es HTML con dos puntos (YAML lo lee
    // como mapa). El llamante hacía `if (manifest)`, un string es truthy, y
    // acababa asignando `manifest.ui = {}` sobre él.
    //
    // El usuario veía: "TypeError: Cannot create property 'ui' on string",
    // que dice "el módulo tiene un formato raro". La causa real —el fichero no
    // existe— no aparecía por ninguna parte.
    //
    // El mensaje nombra el MÓDULO y la URL a propósito: si algo falla, tiene
    // que ser posible encontrar el fichero que falta sin depurar a ciegas.
    if (!res.ok) {
      throw new Error(
        `No se encontró el manifiesto de "${moduleId}": ${res.status} en ${url}. ` +
          `El fichero no está disponible; esto no es un problema de formato.`
      );
    }

    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      try {
        parsed = yaml.load(text);
      } catch (e) {
        throw new Error(
          `El manifiesto de "${moduleId}" (${url}) no es ni JSON ni YAML válido: ` +
            `${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    // Segunda barrera: aunque el cuerpo sea un 200 con contenido raro, un
    // string o un número NO son un manifiesto. Preferimos fallar aquí, con el
    // nombre del módulo delante, que devolver basura que revienta más lejos.
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(
        `El manifiesto de "${moduleId}" (${url}) no es un objeto: ` +
          `se obtuvo ${Array.isArray(parsed) ? 'una lista' : `un ${typeof parsed}`}.`
      );
    }

    return parsed;
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
