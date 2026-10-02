/**
 * @purpose Define el formato del registro que la bóveda de sesión (IndexedDB) guarda por documento —pila de historial y `extraResources`— y cómo se reinyecta en el estado ya reparado de `localStorage`.
 * @purpose_en Defines the record shape the session vault (IndexedDB) stores per document —history stack and `extraResources`— and how it is merged back into the already-repaired localStorage state.
 * @refactorable false
 * @classification Utility
 * @complexity Medium
 * @exports SESSION_VAULT_VERSION, SessionVaultRecord, VaultRecovery, buildSessionVaultRecord, parseSessionVaultRecord, isSessionVaultRecord, applySessionVaultRecords, withoutHistory, recoverDocumentsFromVaultRecords
 * @lastUpdated 2026-10-01T00:00:00.000Z
 */

/**
 * POR QUÉ EXISTE ESTE MÓDULO
 *
 * La sesión se guardaba en `localStorage` con un replacer que descarta
 * `history`, `extraResources`, `wasmBuffer` y `contract`. El motivo era
 * legítimo: las entradas de historial llevan un manifiesto completo y los
 * recursos son `ArrayBuffer`, y `JSON.stringify` de eso no cabe (ni
 * sobrevive: un `ArrayBuffer` serializado a JSON sale como `{}`).
 *
 * El precio era que al recargar no había deshacer. IndexedDB no comparte ese
 * límite: usa ALGORITMO DE CLONADO ESTRUCTURAL, así que `ArrayBuffer`,
 * `Map`, `Set`, `Date`, `undefined` y los ciclos se copian tal cual, sin
 * serializar a texto. Por eso la pila completa cabe ahí y no en
 * `localStorage`.
 *
 * REPARTO DE RESPONSABILIDADES (importante para no romper nada al tocarlo)
 *
 *   - `localStorage` sigue siendo la autoridad de qué documentos existen.
 *   - IndexedDB es un COMPLEMENTO: historial, recursos, punto de guardado y,
 *     desde la v2, el manifiesto vivo.
 *
 * Los dos se combinan en `applySessionVaultRecords`, que es puro y por eso
 * se testea sin navegador.
 *
 * LA EXCEPCIÓN A ESA REGLA
 *
 * `recoverDocumentsFromVaultRecords` SÍ crea documentos desde la bóveda, y
 * solo lo hace cuando `localStorage` no sabe de ninguno. Es lo único que
 * justifies que el registro lleve el manifiesto entero, y está acotado a ese
 * caso: mientras la lista de documentos exista, la bóveda no crea nada.
 */

import type { DocumentState, OrchestratorState } from '../types/document';
import type { HistoryEntry, HistoryState } from '@/omega-ui-core/types/history';
import type { ExtraResource, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import { repairHistoryState } from './sessionRestore';

/**
 * Versión del esquema del registro.
 *
 * v1: `history` + `extraResources` + `manifestHash`.
 * v2: además el `manifest` VIVO. Sin él, una sesión que se pierde no se puede
 *     recuperar: la bóveda sabia que existía un documento y de qué versión
 *     estaba, pero no qué contenía. Ver `recoverDocumentsFromVaultRecords`.
 *
 * Se sigue comparando de forma ESTRICTA para todo lo que no sea v1 o v2: un
 * esquema desconocido se descarta entero en vez de intentar interpretarlo,
 * porque adivinar produce un deshacer que lleva a estados que nunca
 * existieron. v1 sí se acepta, y a propósito: subir el número sin leer los
 * registros viejos dejaría a todo el mundo sin deshacer el día que se publica
 * esto, que es la misma pérdida que Dignamos de quitar.
 */
export const SESSION_VAULT_VERSION = 2;

/** Versiones que esta build sabe leer. Cualquier otra se descarta. */
const READABLE_VAULT_VERSIONS: readonly number[] = [1, SESSION_VAULT_VERSION];

/**
 * Desde qué versión el registro trae el manifiesto.
 *
 * Un v1 NO tiene manifiesto, y esa ausencia es informative, no un dato
 * corrupto: se puede seguir usando su historial igual que hasta ahora. Lo
 * único que no se puede es reconstruir el documento.
 */
const VERSION_WITH_MANIFEST = 2;

/** Historial vacío. Se comparte por referencia porque nunca se muta. */
const EMPTY_HISTORY: HistoryState = { past: [], future: [], lastSavedIndex: -1 };

export interface SessionVaultRecord {
  version: number;
  documentId: string;
  savedAt: number;
  /**
   * Hash del MANIFIESTO vivo en el momento de escribir, calculado con
   * `IntegrityService.generateManifestHash`.
   *
   * Es la clave de unión entre los dos almacenes, y no un adorno: la pila de
   * historial solo tiene sentido pegada al manifiesto del que salió. Si el
   * manifiesto se recargó de una sesión más nueva (o la escritura de
   * `localStorage` tuvo éxito y la de IndexedDB no, o al revés) y se colgase
   * la pila_old, el primer Ctrl+Z llevaría al usuario a un estado que no
   * ve —y descartaría sin avisar el contenido que sí está en pantalla.
   * Ante hashes distintos, no se adjunta nada: se degrada al comportamiento
   * actual (sin deshacer), que es el fallo que ya conocíamos.
   */
  manifestHash: string;
  history: HistoryState;
  extraResources: ExtraResource[];
  /**
   * `lastStableHash` del documento al escribir. Se conserva para que
   * `isDirty` se pueda recalcular sin esperar al watcher, pero NO se usa como
   * criterio de adjunto (eso lo decide `manifestHash`).
   */
  lastStableHash: string | null;
  /**
   * El MANIFIESTO vivo del documento en el momento de escribir.
   *
   * Es lo que convierte la bóveda en algo de lo que se puede RESUCITAR una
   * sesión y no solo deshacer. Hasta la v1 la bóveda guardaba `manifestHash`,
   * que dice DE QUÉ VERSIÓN era el documento pero no QUÉ ERA: una sesión
   * perdida se llevaba por delante el contenido de todos sus documentos y no
   * había forma de recuperarlo, porque el historial sin manifiesto al que
   * pertenece no se puede pegar a nada.
   *
   * El coste de guardarlo es marginal y por eso no hay disyuntiva real: cada
   * entrada de `history.past` ya lleva un manifiesto completo (ver
   * `isHistoryEntry`), así que uno más es una entrada más de lo que ya se
   * estaba escribiendo. No lleva `ArrayBuffer`, que es lo que sí forzaba a
   * usar IndexedDB en lugar de `localStorage`.
   *
   * Opcional porque los registros v1 no lo traen, y un v1 sigue siendo
   * perfectamente utilizable para lo que se usaba hasta ahora.
   */
  manifest?: OMEGA_Manifest | undefined;
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isExtraResource(value: unknown): value is ExtraResource {
  if (!isRecordObject(value)) return false;
  if (typeof value.name !== 'string' || typeof value.type !== 'string') return false;
  return isBinaryData(value.data);
}

/**
 * ¿Es esto un binario? `ArrayBuffer`, `SharedArrayBuffer` o una vista.
 *
 * DELIBERADAMENTE no se usa `instanceof ArrayBuffer`: `instanceof` compara
 * prototipos, y un `ArrayBuffer` que viene de OTRO reino —un worker, un
 * iframe, un `vm`— es perfectamente válido y aun así da `false`. IndexedDB
 * clona a través de la frontera cuando el valor viene de un worker, así que
 * ese caso no es hipotético: el recurso se descartaría en silencio y el
 * documento se rehidrataría sin sus assets, sin ningún error visible.
 *
 * El tag interno (`[[Class]]`) sí sobrevive a los reinos, y
 * `ArrayBuffer.isView` mira slots internos, no prototipos, con lo que cubre
 * los TypedArrays sin el mismo problema.
 */
function isBinaryData(value: unknown): boolean {
  if (ArrayBuffer.isView(value)) return true;
  const tag = Object.prototype.toString.call(value);
  return tag === '[object ArrayBuffer]' || tag === '[object SharedArrayBuffer]';
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!isRecordObject(value)) return false;
  if (typeof value.id !== 'string' || typeof value.label !== 'string') return false;
  if (typeof value.timestamp !== 'number' || !Number.isFinite(value.timestamp)) return false;
  if (!isRecordObject(value.manifest)) return false;
  return true;
}

/**
 * Convierte una entrada leída de disco en una `HistoryEntry` utilizable, o
 * `null` si le falta lo mínimo para que el reducer no reviente.
 *
 * Filtra en vez de soltar la pila entera: una entrada corrupta entre 40
 * buenas no invalida el resto, y perder las 40 sí sería una pérdida real de
 * trabajo. `extraResources` ausentes se dejan ausentes a propósito: el
 * reducer ya cae al recurso vigente del documento (`entry.extraResources ||
 * d.extraResources`), y rellenar aquí duplicaría binarios en memoria.
 */
function toHistoryEntry(value: unknown): HistoryEntry | null {
  if (!isHistoryEntry(value)) return null;
  const entry = value as unknown as HistoryEntry;
  const resources = Array.isArray(entry.extraResources)
    ? entry.extraResources.filter(isExtraResource)
    : undefined;
  return {
    ...entry,
    extraResources: resources && resources.length > 0 ? resources : undefined
  };
}

/**
 * Lee un registro crudo de la bóveda y lo devuelve normalizado, o `null` si
 * no es utilizable.
 *
 * "Normalizado" y "válido" son cosas distintas: se rechazan los registros de
 * otra versión o sin identidad (eso no tiene arreglo), pero se reparan los
 * que solo vienen con datos de mas (listas que no son listas, recursos con el
 * `data` perdido, cursor fuera de rango) usando las mismas reglas que
 * `repairHistoryState`.
 */
export function parseSessionVaultRecord(raw: unknown): SessionVaultRecord | null {
  if (!isRecordObject(raw)) return null;
  if (typeof raw.version !== 'number' || !READABLE_VAULT_VERSIONS.includes(raw.version)) return null;
  if (typeof raw.documentId !== 'string' || raw.documentId.length === 0) return null;
  if (typeof raw.manifestHash !== 'string' || raw.manifestHash.length === 0) return null;

  const savedAt = typeof raw.savedAt === 'number' && Number.isFinite(raw.savedAt) ? raw.savedAt : 0;

  const history = repairHistoryState({
    history: isRecordObject(raw.history)
      ? {
        past: Array.isArray((raw.history as Record<string, unknown>).past)
          ? ((raw.history as Record<string, unknown>).past as unknown[])
            .map(toHistoryEntry)
            .filter((e): e is HistoryEntry => e !== null)
          : [],
        future: Array.isArray((raw.history as Record<string, unknown>).future)
          ? ((raw.history as Record<string, unknown>).future as unknown[])
            .map(toHistoryEntry)
            .filter((e): e is HistoryEntry => e !== null)
          : [],
        lastSavedIndex: (raw.history as Record<string, unknown>).lastSavedIndex as number
      }
      : undefined
  });

  const extraResources = Array.isArray(raw.extraResources)
    ? raw.extraResources.filter(isExtraResource)
    : [];

  // Un v1 no trae manifiesto y eso es correcto, no un fallo: se normaliza
  // subiendo a la versión actual y se deja `manifest` indefinido. Solo a
  // partir de v2 el registro es autocontenido.
  const manifest =
    raw.version >= VERSION_WITH_MANIFEST && isRecordObject(raw.manifest)
      ? (raw.manifest as unknown as OMEGA_Manifest)
      : undefined;

  return {
    version: SESSION_VAULT_VERSION,
    documentId: raw.documentId,
    savedAt,
    manifestHash: raw.manifestHash,
    history,
    extraResources,
    lastStableHash: typeof raw.lastStableHash === 'string' ? raw.lastStableHash : null,
    manifest
  };
}

export function isSessionVaultRecord(value: unknown): value is SessionVaultRecord {
  return parseSessionVaultRecord(value) !== null;
}

/**
 * Extrae de un `DocumentState` lo que la bóveda guarda. No muta nada: la
 * pila y los recursos se referencian, y es IndexedDB quien los clona al
 * escribir (clonado estructural). Clonarlos aquí además sería tirar el
 * doble de memoria y de CPU en cada guardado, que es justo lo que esta
 * función existe para evitar.
 */
export function buildSessionVaultRecord(
  doc: DocumentState,
  manifestHash: string
): SessionVaultRecord {
  return {
    version: SESSION_VAULT_VERSION,
    documentId: doc.id,
    savedAt: Date.now(),
    manifestHash,
    history: {
      past: doc.history.past,
      future: doc.history.future,
      lastSavedIndex: doc.history.lastSavedIndex
    },
    extraResources: doc.extraResources,
    lastStableHash: doc.lastStableHash,
    manifest: doc.manifest
  };
}

/**
 * Copia del registro SIN historial, para reintentar una escritura que se
 * pasó de cuota.
 *
 * Se conservan `extraResources` y `manifest` a propósito: son los binarios y
 * el contenido del proyecto, y un editor al que le falta el documento vale
 * bastante menos que uno al que le falta el deshacer. El orden del sacrificio
 * es el correcto: primero lo recreable, después lo que no.
 */
export function withoutHistory(record: SessionVaultRecord): SessionVaultRecord {
  return { ...record, history: EMPTY_HISTORY };
}

/** Lo que una resurrección consigue devolver a la vida. */
export interface VaultRecovery {
  documentsById: Record<string, DocumentState>;
  activeDocumentId: string;
  /** Ids recuperados, del más reciente al más antiguo. */
  recoveredIds: string[];
  /** Ids con historial que NO traían manifiesto y se han descartado. */
  unrecoverableIds: string[];
}

/**
 * Reconstruye documentos desde la bóveda cuando `localStorage` perdió la
 * lista de documentos.
 *
 * Es la contrapartida de guardar el manifiesto en el registro: sin esta
 * función, el campo es peso muerto; con ella, una sesión rota se resucita en
 * vez de desaparecer.
 *
 * Solo se resucitan los registros CON manifiesto. Un v1 tiene historial pero
 * no dice qué documento era, y un historial sin manifiesto al que pertenece
 * no se puede pegar a nada: hacerlo por parecido (por `documentId`, por el
 * nombre) sería inventar un Ctrl+Z que lleva a un estado que el usuario nunca
 * vio. Esos ids se devuelven en `unrecoverableIds` para que se pueda decir en
 * voz alta que se perdió algo, en vez de dejar que el usuario adivine.
 *
 * Devuelve `null` solo si la bóveda no tenía NADA. Si tenía registros pero
 * ninguno era resucitable, devuelve el objeto con `recoveredIds` vacío y la
 * lista de lo perdido: ese es el caso en el que más urge hablar, y devolver
 * `null` aquí tiraría la información justo cuando más la necesita quien
 * llama.
 *
 * `isDirty` sale de comparar el `manifestHash` del registro con su
 * `lastStableHash`: son el estado del documento al escribir y la última
 * versión conocida como estable. Si difieren, el usuario tenía cambios sin
 * guardar y hay que decírselo aunque el documento vuelva.
 *
 * `isInitializing: false` porque aquí SÍ hay un manifiesto real: no hay nada
 * que recalcular, y dejarlo en `true` haría que el watcher hiciese
 * `CAPTURE_HASH`, que marca el documento como recién guardado y pondría el
 * contador de "sin guardar" a cero sobre documentos que sí tenían cambios.
 *
 * LO QUE NO SE RECUPERA: `contract` y `wasmBuffer` salen a `null`.
 *
 * Es una limitación real y a propósito. El registro guarda el manifiesto, y
 * el contrato y el binario WASM no están en el manifiesto: son los productos
 * de compilarlo, y guardarlos multiplicaría el tamaño de cada escritura sin
 * aportar nada que el manifiesto no baste para volver a derivarlos. Un
 * documento resucitado se recompila al abrirlo, igual que uno recién creado.
 *
 * Se documenta porque es la clase de detalle que se descubre tarde: si
 * alguien espera que "recuperar" signifique "volver exactamente como
 * estaba", esta es la excepción que lo rompe.
 */
export function recoverDocumentsFromVaultRecords(
  records: readonly SessionVaultRecord[]
): VaultRecovery | null {
  const documentsById: Record<string, DocumentState> = {};
  const recovered: SessionVaultRecord[] = [];
  const unrecoverableIds: string[] = [];

  // Gana el más reciente por documento, igual que en `applySessionVaultRecords`:
  // dos escrituras del mismo id no deberían coexistir, pero si lo hacen
  // manda la última, que es lo que el usuario tenía delante.
  const byId = new Map<string, SessionVaultRecord>();
  for (const record of records) {
    const previous = byId.get(record.documentId);
    if (!previous || record.savedAt >= previous.savedAt) {
      byId.set(record.documentId, record);
    }
  }

  for (const record of byId.values()) {
    if (!record.manifest) {
      unrecoverableIds.push(record.documentId);
      continue;
    }
    recovered.push(record);
    documentsById[record.documentId] = {
      id: record.documentId,
      manifest: record.manifest,
      isDirty: record.manifestHash !== record.lastStableHash,
      lastStableHash: record.lastStableHash ?? '',
      history: record.history,
      isInitializing: false,
      contract: null,
      wasmBuffer: null,
      extraResources: record.extraResources
    };
  }

  if (byId.size === 0) return null;

  // El activo es el más reciente: es el documento en el que el usuario
  // estaba trabajando cuando se perdió la sesión.
  recovered.sort((a, b) => b.savedAt - a.savedAt);

  return {
    documentsById,
    activeDocumentId: recovered[0]?.documentId ?? '',
    recoveredIds: recovered.map((r) => r.documentId),
    unrecoverableIds
  };
}

/**
 * Pega la pila de la bóveda en un documento ya reparado.
 *
 * `isInitializing` se deja en `false` A PROPÓSITO, y es lo más importante de
 * este módulo. `repairPersistedDocument` fuerza `isInitializing: true` para
 * que el watcher recalcule el hash, pero el watcher recalcula con
 * `CAPTURE_HASH`, que hace `lastSavedIndex = past.length`: es decir, marca
 * el documento como recién guardado. Si se dejara, la bóveda restauraría
 * 12 entradas y el contador de "sin guardar" saltaría de 12 a 0 al cabo de
 * 500 ms, y volver a deshacer hasta el punto de guardado ya no dejaría el
 * documento limpio —la promesa del indicador.
 *
 * Con `false`, el watcher toma su camino normal (comparar hash contra
 * `lastStableHash` y, si difiere, `SET_DIRTY`), que no toca el cursor del
 * punto de guardado. Lo que se repone es `lastStableHash` del propio
 * registro para que esa comparación tenga contra qué medir.
 */
function attachSessionVaultRecord(
  doc: DocumentState,
  record: SessionVaultRecord
): DocumentState {
  return {
    ...doc,
    history: record.history,
    extraResources: record.extraResources,
    lastStableHash: record.lastStableHash ?? doc.lastStableHash,
    isInitializing: false,
    isDirty: doc.lastStableHash !== record.lastStableHash
  };
}

/**
 * Enriquece el estado reparado con lo que hubiera en la bóveda.
 *
 * `manifestHashes` trae el hash del manifiesto TAL COMO SE VA A HIDRATAR
 * (ya normalizado), precalculado por el llamante porque el hash es asíncrono
 * y esto tiene que quedarse puro.
 *
 * Sólo se adjunta un documento si:
 *   1. existe en la sesión de `localStorage` (la bóveda no crea documentos),
 *   2. hay registro para él, y
 *   3. el hash del manifiesto coincide.
 *
 * Devuelve el mismo objeto de entrada si nada se adjunta, para que el
 * llamante pueda cheaply saltarse el re-render.
 */
export function applySessionVaultRecords(
  state: OrchestratorState,
  records: readonly SessionVaultRecord[],
  manifestHashes: Readonly<Record<string, string>>
): OrchestratorState {
  if (records.length === 0) return state;

  const byId = new Map<string, SessionVaultRecord>();
  for (const record of records) {
    // Gana el más reciente: dos escrituras del mismo documento no deberían
    // coexistir, pero si las hay (dos pestañas, un put que se solapa con
    // otro) el último en escribir es el que refleja lo que el usuario vio.
    const previous = byId.get(record.documentId);
    if (!previous || record.savedAt >= previous.savedAt) {
      byId.set(record.documentId, record);
    }
  }

  let documentsById = state.documentsById;
  for (const [documentId, record] of byId) {
    const doc = documentsById[documentId];
    if (!doc) continue;
    if (manifestHashes[documentId] !== record.manifestHash) continue;
    if (documentsById === state.documentsById) documentsById = { ...state.documentsById };
    documentsById[documentId] = attachSessionVaultRecord(doc, record);
  }

  if (documentsById === state.documentsById) return state;
  return { ...state, documentsById };
}
