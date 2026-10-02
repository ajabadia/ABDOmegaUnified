/**
 * @purpose Repara una sesión persistida antes de hidratar el orchestrator, reestableciendo los invariantes de índice del historial, la línea base de "sucio" y el puntero de documento activo.
 * @purpose_en Repairs a persisted session before hydrating the orchestrator, re-establishing history index invariants, the dirty baseline, and the active document pointer.
 * @exports repairHistoryState (compartido con la bóveda de sesión), readHistoryDepths
 * @refactorable false
 * @classification Utility
 * @complexity Medium
 * @fingerprint exports:2,imports:1,sig:sr7p2kx
 * @lastUpdated 2026-10-01T00:00:00.000Z
 */

import type { DocumentState, OrchestratorState } from '../types/document';
import type { HistoryState } from '@/omega-ui-core/types/history';

/**
 * Tope de entradas por pila. Debe coincidir con `HISTORY_LIMIT` del reducer.
 * Se replica aquí (y no se importa) porque `HISTORY_LIMIT` es privado a ese
 * módulo y este utility tiene que poder usarse sin arrastrar el reducer.
 */
const HISTORY_LIMIT = 50;

/**
 * Reconstruye `history` para que sus índices sean coherentes.
 *
 * `lastSavedIndex` es el CURSOR del punto de guardado y su rango válido es
 * `[-1, past.length]` (el límite superior es `past.length` porque el cursor
 * vivo está una posición más allá de la última entrada; ver
 * `historySavePoint.ts`). Un valor fuera de ese rango viene de una carga útil
 * antigua o manipulada y hay que recortarlo, no dejarlo apuntando al vacío.
 *
 * Cuando no hay historial, `-1` significa "nada guardado" y, con la pila
 * vacía, `countUnsavedChanges` da 0. Es el estado limpio de un documento
 * recién abierto.
 *
 * Se EXPORTA porque la bóveda de sesión (`utils/sessionVault.ts`) repara
 * pilas de historial venidas de otra fuente (IndexedDB) y necesita el mismo
 * tope de 50 y el mismo clamp del cursor. Dos copias del tope divergirían
 * justo en el sitio donde importa: cuántas entradas sobreviven a una recarga.
 */
export function repairHistoryState(doc: {
  history?: HistoryState | undefined;
}): HistoryState {
  const history = doc.history;
  if (!history || !Array.isArray(history.past) || !Array.isArray(history.future)) {
    return { past: [], future: [], lastSavedIndex: -1 };
  }

  // Mismo criterio que el reducer: `past` conserva la CABEZA (lo más reciente
  // va al final, así que se recorta por delante) y `future` también, porque su
  // índice 0 es la entrada que replay el siguiente redo.
  const past =
    history.past.length > HISTORY_LIMIT
      ? history.past.slice(history.past.length - HISTORY_LIMIT)
      : history.past;
  const future =
    history.future.length > HISTORY_LIMIT
      ? history.future.slice(0, HISTORY_LIMIT)
      : history.future;

  const raw = typeof history.lastSavedIndex === 'number' ? history.lastSavedIndex : -1;
  const lastSavedIndex = Math.min(Math.max(raw, -1), past.length);

  return { past, future, lastSavedIndex };
}

/**
 * Normaliza un documento vindo de `localStorage`.
 *
 * Lo importante es la línea base de "sucio": la persistencia guarda `isDirty`
 * y `lastStableHash` pero DESCARTA `history` (el replacer de
 * `useSessionPersistence` la excluye, porque las entradas llevan ArrayBuffers y
 * manifiestos completos). El resultado era un documento que se recargaba
 * anunciando "cambios sin guardar" (`isDirty: true`) sin ninguna entrada que
 * los respaldara: la pestaña marcaba sucio, la línea de tiempo decía "0 sin
 * guardar" y no había nada que deshacer. Una afirmación sin su evidencia.
 *
 * La coherente es Treat-as-clean: se reinicia la línea base y se fuerza
 * `isInitializing`, de modo que `useDocumentDirtyWatcher` vuelve a calcular el
 * hash del manifiesto realmente restaurado y hace `CAPTURE_HASH`, que deja el
 * documento limpio y recoloca el punto de guardado. Sin historial no hay
 * punto de guardado que preservar.
 */
export function repairPersistedDocument(doc: DocumentState): DocumentState {
  return {
    ...doc,
    manifest: doc.manifest,
    history: repairHistoryState(doc),
    extraResources: Array.isArray(doc.extraResources) ? doc.extraResources : [],
    // Se fuerza el re-baselining aunque la carga útil trajera `false`: el
    // manifiesto recién normalizado casi nunca vuelve a dar el hash guardado.
    isInitializing: true,
    isDirty: false,
    contract: doc.contract ?? null,
    wasmBuffer: doc.wasmBuffer ?? null
  };
}

/**
 * Lee la profundidad de la pila que la sesión anterior dejó anotada.
 *
 * El payload de `localStorage` descarta la pila (los ArrayBuffers y los
 * 50 manifiestos no caben), pero guarda CUÁNTAS entradas tenía. Sin ese
 * número, al restaurar no hay forma de distinguir "este documento nunca se
 * editó" de "se editó y la recarga tiró el deshacer": en los dos casos llega
 * una pila vacía. Es la diferencia entre no avisar y avisar, y una sola
 * propiedad extra en el JSON.
 *
 * Se lee del payload CRUDO, antes de reparar: `repairPersistedDocument` deja
 * la pila vacía a propósito, y para eso ya se ha usado.
 */
export function readHistoryDepths(payload: unknown): Record<string, number> {
  if (!payload || typeof payload !== 'object') return {};
  const depths = (payload as { historyDepthById?: unknown }).historyDepthById;
  if (!depths || typeof depths !== 'object' || Array.isArray(depths)) return {};

  const out: Record<string, number> = {};
  for (const [id, value] of Object.entries(depths as Record<string, unknown>)) {
    // Un número no negativo y finito, o nada: un `NaN` serializado llega
    // como `null` y contamination el aviso con "NaN pasos".
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      out[id] = Math.floor(value);
    }
  }
  return out;
}

/**
 * Repara la sesión completa y devuelve el estado a hidratar, o `null` si no
 * hay nada que hidratar.
 *
 * `activeDocumentId` se valida contra las claves reales: `CLOSE_DOCUMENT`
 * puede dejar el id apuntando a `'primary'` con `documentsById` vacío, y esa
 * sesión se persistía tal cual. Al restaurarla, `activeDocument` quedaba
 * `undefined` y el editor reventaba al leer `activeDoc.manifest`.
 */
export function repairPersistedState(
  parsed: OrchestratorState | null | undefined
): OrchestratorState | null {
  if (!parsed || !parsed.documentsById) return null;

  const ids = Object.keys(parsed.documentsById);
  if (ids.length === 0) return null;

  const documentsById: Record<string, DocumentState> = {};
  for (const id of ids) {
    const doc = parsed.documentsById[id];
    if (doc) documentsById[id] = repairPersistedDocument(doc);
  }

  const remaining = Object.keys(documentsById);
  if (remaining.length === 0) return null;

  const activeDocumentId = documentsById[parsed.activeDocumentId]
    ? parsed.activeDocumentId
    : remaining[0];

  return { documentsById, activeDocumentId };
}