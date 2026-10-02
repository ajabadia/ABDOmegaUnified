/**
 * @purpose Migraciones de una sola pasada sobre la sesión persistida: detecta el payload roto que dejó la build anterior (documentsById vacío) y lo reescribe a uno válido.
 * @purpose_en One-shot migrations over the persisted session: detects the broken payload left by the previous build (empty documentsById) and rewrites it to a valid one.
 * @refactorable false
 * @classification Utility
 * @complexity Medium
 * @exports SESSION_MIGRATION_IDS, SessionMigrationId, SessionStorageLike, SessionMigrationReport, hasEmptyDocumentsSession, buildRepairedSessionPayload, runSessionMigrations
 * @lastUpdated 2026-10-01T00:00:00.000Z
 */

import { STORAGE_KEYS } from '@/omega-ui-core/constants/storage';
import { initialOrchestratorState } from '../hooks/orchestrator/orchestratorReducer';

/**
 * POR QUE HACE FALTA UNA MIGRACION
 *
 * `CLOSE_DOCUMENT` antes de cerrarse podia dejar `documentsById: {}` con
 * `activeDocumentId: 'primary'`: un id que no nombra nada. Esa sesion se
 * escribia tal cual en `localStorage`. El reducer ya no puede producir ese
 * estado, pero los payloads YA ESCRITOS siguen ahi, en los navegadores que
 * cargaron la build anterior.
 *
 * QUE SE PUEDE Y QUE NO SE PUEDE RECUPERAR
 *
 * No se puede recuperar el contenido, y conviene decirlo claro porque es lo
 * unico honesto que se puede ofrecer. La boveda guarda `history`,
 * `extraResources` y un `manifestHash`, pero NO el manifiesto: sin el, los
 * documentos perdidos no existen en ningun sitio. Un historial sin manifiesto
 * al que pertenece no se puede pegar a nada, y pegarlo a otro documento seria
 * inventarse un Ctrl+Z que lleva a un estado que el usuario nunca vio.
 *
 * Si lo unico que queda es reescribir un payload para que no se lea solo y
 * decir "no hemos podido recuperar tu sesion", eso es exactamente lo que hace
 * este modulo. Sin la migracion, el `localStorage` se sobrescribe igual al
 * montar (el efecto de guardado corre antes que la hidratacion termine), asi
 * que el efecto de la reescritura sea ninguno: lo que la migracion cambia
 * de verdad es que el usuario SE ENTERA.
 */

/** Identificadores de las migraciones, en orden de aplicación. */
export const SESSION_MIGRATION_IDS = {
  /** Payload con `documentsById` vacío. */
  EMPTY_DOCUMENTS: 'empty-documents-2026-10'
} as const;

export type SessionMigrationId = (typeof SESSION_MIGRATION_IDS)[keyof typeof SESSION_MIGRATION_IDS];

/** Inyectable para pruebas: por defecto el `localStorage` del navegador. */
export interface SessionStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface SessionMigrationReport {
  /** Si la migración llegó a tocar algo en disco. */
  repaired: boolean;
  /** Si el payload de la sesión estaba roto de la forma que migra esto. */
  detectedEmptyDocuments: boolean;
  /** Migraciones aplicadas en esta pasada. */
  applied: SessionMigrationId[];
  /** Migraciones que ya se habían aplicado antes (y por eso se saltan). */
  skipped: SessionMigrationId[];
  /**
   * Lo que se ha perdido, si es que se puede saber.
   *
   * Es `null` cuando no se sabe, y NO un 0 inventado: el payload roto no
   * guarda ni un rastro de los documentos que tenía, así que cualquier cifra
   * sería inventada. Un aviso que dice "0 documentos" cuando el usuario tenía
   * tres es peor que uno que no da cifras.
   */
  lostDocumentCount: number | null;
}

const EMPTY_REPORT: SessionMigrationReport = {
  repaired: false,
  detectedEmptyDocuments: false,
  applied: [],
  skipped: [],
  lostDocumentCount: null
};

/** Lee el marcador de migraciones ya aplicadas. */
function readAppliedMigrations(storage: SessionStorageLike): Set<SessionMigrationId> {
  try {
    const raw = storage.getItem(STORAGE_KEYS.SESSION_MIGRATIONS);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    const known = new Set<string>(Object.values(SESSION_MIGRATION_IDS));
    return new Set(parsed.filter((id): id is SessionMigrationId => typeof id === 'string' && known.has(id)));
  } catch {
    // Un marcador corrupto se trata como "no aplicado": las migraciones
    // tienen que ser idempotentes justamente para poder repetirse.
    return new Set();
  }
}

function writeAppliedMigrations(storage: SessionStorageLike, applied: Set<SessionMigrationId>): void {
  storage.setItem(STORAGE_KEYS.SESSION_MIGRATIONS, JSON.stringify([...applied]));
}

/**
 * Un payload está "vacío" si tiene `documentsById` pero sin ninguna clave.
 *
 * Distingue dos casos que NO son el mismo:
 *   - No hay nada en `localStorage` (usuario nuevo): no es un bug, no se avisa.
 *   - Hay un payload y su `documentsById` no tiene claves: eso solo lo escribía
 *     el bug, y es lo que hay que reparar.
 */
export function hasEmptyDocumentsSession(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const docs = (raw as { documentsById?: unknown }).documentsById;
  if (!docs || typeof docs !== 'object' || Array.isArray(docs)) return false;
  return Object.keys(docs as Record<string, unknown>).length === 0;
}

/**
 * El payload de reemplazo.
 *
 * Se construye desde `initialOrchestratorState` en vez de escribir un
 * documento a mano para que no se pueda desincronizar del estado inicial real:
 * si mañana el documento inicial gana un campo, esta migración lo hereda.
 */
export function buildRepairedSessionPayload(): string {
  const { documentsById, activeDocumentId } = initialOrchestratorState;
  const historyDepthById: Record<string, number> = {};
  for (const id of Object.keys(documentsById)) {
    historyDepthById[id] = documentsById[id].history.past.length;
  }
  return JSON.stringify({ documentsById, activeDocumentId, historyDepthById });
}

/**
 * Aplica las migraciones pendientes. Idempotente: correrla dos veces no hace
 * daño, y por eso un marcador corrupto no deja la sesión en mal estado.
 */
export function runSessionMigrations(
  storage: SessionStorageLike = window.localStorage
): SessionMigrationReport {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEYS.SESSION_DOCS);
  } catch {
    return EMPTY_REPORT;
  }
  if (raw === null) return EMPTY_REPORT;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // JSON roto no es el caso que migra esto: lo IGNORA, porque su
    // reparación es otra (descartar la sesión), no inventar un documento.
    return EMPTY_REPORT;
  }

  const detectedEmptyDocuments = hasEmptyDocumentsSession(parsed);
  const applied = readAppliedMigrations(storage);

  const report: SessionMigrationReport = {
    repaired: false,
    detectedEmptyDocuments,
    applied: [],
    skipped: [],
    lostDocumentCount: null
  };
  if (!detectedEmptyDocuments) return report;

  if (applied.has(SESSION_MIGRATION_IDS.EMPTY_DOCUMENTS)) {
    report.skipped.push(SESSION_MIGRATION_IDS.EMPTY_DOCUMENTS);
    return report;
  }

  try {
    storage.setItem(STORAGE_KEYS.SESSION_DOCS, buildRepairedSessionPayload());
    applied.add(SESSION_MIGRATION_IDS.EMPTY_DOCUMENTS);
    writeAppliedMigrations(storage, applied);
    report.repaired = true;
    report.applied.push(SESSION_MIGRATION_IDS.EMPTY_DOCUMENTS);
  } catch {
    // Si no se puede escribir (cuota, modo privado), la reparación no ocurre
    // pero el editor sigue: el payload roto se sobrescribirá al montar.
  }
  return report;
}
