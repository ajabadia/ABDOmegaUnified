/**
 * @purpose Gestiona transiciones de estado para documentos en el editor de manifesto OMEGA.
 * @purpose_en Manages state transitions for documents in the OMEGA manifest editor.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:3,imports:4,sig:1lsxwoh
 * @lastUpdated 2026-06-15T13:11:03.612Z
 */

import type { OMEGA_Manifest } from '../../types/document';
import type { DocumentState, OrchestratorState, OrchestratorAction } from '../../types/document';
import type { HistoryEntry } from '../../types/document';
import { DEFAULT_MANIFEST, normalizeManifest } from '../../constants/defaults';
import { nextHistoryEntryId } from '@/omega-ui-core/utils/historyEntryId';

/**
 * Helper: Clonación profunda de un manifiesto SIN aplicar normalización.
 * El round-trip undo/redo debe restaurar el manifiesto exacto guardado;
 * normalizar aquí inyectaría DEFAULT_PALETTE/DEFAULT_SIZES/metadata por defecto
 * que no existían en el manifiesto original (drift de round-trip).
 *
 * Se usa `structuredClone` y NO `JSON.parse(JSON.stringify())`. El round-trip
 * por JSON no era una copia, era una serialización, y perdía cosas que este
 * repo sí usa:
 *
 *   1. Las claves con valor `undefined` desaparecían (JSON.stringify las
 *      omite). Los tipos del manifiesto están declarados con `| undefined`
 *      explícito —`frames?: number | undefined`, `w?: number | undefined`
 *      (LEGACY SHIM), `metadata?: Record<string, unknown> | undefined`— y el
 *      tsconfig tiene `exactOptionalPropertyTypes: true`, donde `{w: undefined}`
 *      y `{}` NO son el mismo tipo. El cast `as OMEGA_Manifest` tapaba la
 *      pérdida en lugar de señalarla.
 *   2. Una referencia cíclica reventaba con
 *      `TypeError: Converting circular structure to JSON`, tumbao el reducer
 *      entero en pleno undo/redo. `resources` es `Record<string, unknown>`,
 *      así que un ciclo es representable en runtime.
 *
 * `structuredClone` cubre ambos casos, y además clona bien Date/Map/Set si
 * algún manifest llega a contenerlos. No es una dependencia nueva: ya se usa
 * en el repo (manifestDiff, idManagement, idManager) y es native en Node 17+
 * y en todos los navegadores soportados.
 */
function cloneManifest(manifest: OMEGA_Manifest): OMEGA_Manifest {
  return structuredClone(manifest);
}

/**
 * Helper: Crea una entrada de historial tipo snapshot con valores por defecto.
 * Extraída para evitar duplicación de patrón en múltiples acciones del reducer y callbacks.
 */
export function createSnapshotEntry(
  label: string,
  correlationId: string,
  manifest: OMEGA_Manifest,
  extraResources?: DocumentState['extraResources'],
  uiState?: HistoryEntry['uiState']
): HistoryEntry {
  return {
    // `Date.now()` aquí producía el mismo id que en `historyService.undo()`
    // con cinco Ctrl+Z seguidos dentro del mismo milisegundo, que es
    // exactamente lo que pasa al pulsar la tecla rápido. El contador es
    // global al módulo y lleva nonce de sesión: ver `historyEntryId.ts`.
    id: nextHistoryEntryId(correlationId),
    type: 'SNAPSHOT',
    label,
    timestamp: Date.now(),
    correlationId,
    manifest: cloneManifest(manifest),
    extraResources,
    uiState: uiState ?? {
      selectedNodeId: null,
      multiSelectedNodeIds: [],
      pinnedNodeId: null,
      layoutRatio: 0.5
    }
  };
}

/**
 * Límite duro de entradas en `history.past`.
 * Al recortar por la cabeza todos los índices se desplazan, así que el cap
 * debe pasar siempre por los helpers de abajo: un `shift()` suelto dejaría
 * `lastSavedIndex` apuntando a la entrada equivocada.
 *
 * Invariante de `lastSavedIndex` (cursor del punto de guardado):
 *   - Es una POSICIÓN en la línea de tiempo, no un índice que se reindexe en
 *     cada operación.
 *   - `past[i]` es el snapshot anterior a la entrada `i`, así que el
 *     documento vivo está en la posición `past.length`. Guardar fija aquí el
 *     cursor: `lastSavedIndex = past.length`.
 *   - Los cambios sin guardar son los que quedan por encima del cursor
 *     (`past.length - lastSavedIndex`). Ver `utils/historySavePoint.ts`.
 */
const HISTORY_LIMIT = 50;

/**
 * Helper: desplaza `lastSavedIndex` y lo clampa a -1 ("nada guardado")
 * cuando cae por delante de la ventana.
 *
 * Solo para recortes POR LA CABEZA, que sí cambian la posición de todas las
 * entradas. Un append o un undo no desplazan este cursor: ver `CAPTURE_HASH`.
 */
function shiftLastSavedIndex(lastSavedIndex: number, delta: number): number {
  const next = lastSavedIndex + delta;
  return next < 0 ? -1 : next;
}

/**
 * Helper: añade una entrada al final de `past` aplicando el cap de
 * `HISTORY_LIMIT` y reindexando `lastSavedIndex` en la misma medida.
 * Empujar al final no mueve las entradas existentes, así que el puntero de
 * guardado se conserva salvo que la propia ventana lo recorte.
 */
function appendToPast(
  past: HistoryEntry[],
  entry: HistoryEntry,
  lastSavedIndex: number
): { past: HistoryEntry[]; lastSavedIndex: number } {
  const next = [...past, entry];
  const overflow = next.length - HISTORY_LIMIT;
  if (overflow <= 0) return { past: next, lastSavedIndex };
  return {
    past: next.slice(overflow),
    lastSavedIndex: shiftLastSavedIndex(lastSavedIndex, -overflow)
  };
}

/**
 * Helper: trunca `past` a las `keep` primeras entradas.
 *
 * `lastSavedIndex` es la posición del cursor guardado, y puede valer `keep`
 * exactamente (el cursor vivo tras la truncación ES `keep`). Ese caso es
 * "documento limpio" y debe conservarse; solo si el punto de guardado queda
 * estrictamente por ENCIMA de la nueva ventana se pierde, y entonces pasa a -1
 * ("nada guardado en la ventana"), que es lo conservative: se cuentan como
 * sin guardar todas las entradas que quedan.
 */
function truncatePastTo(
  past: HistoryEntry[],
  keep: number,
  lastSavedIndex: number
): { past: HistoryEntry[]; lastSavedIndex: number } {
  if (keep >= past.length) return { past, lastSavedIndex };
  return {
    past: past.slice(0, keep),
    lastSavedIndex: lastSavedIndex <= keep ? lastSavedIndex : -1
  };
}

/**
 * Helper: limita `future` al mismo `HISTORY_LIMIT` que `past`.
 *
 * `future` crece por la CABEZA (`[...lo nuevo, ...lo viejo]`) y `future[0]` es
 * la PRIMERA entrada que replay un redo, o sea la más valiosa. Por eso el
 * recorte cae por la COLA: se descarta lo más viejo y más inalcanzable, nunca
 * lo siguiente a rehacer.
 *
 * OJO, sobre si esto hace falta hoy: en el reducer `future` NO crece sin tope.
 * Cada operación que crece `future` (UNDO_DOCUMENT, UNDO_TO_INDEX) saca las
 * entradas de `past` en la MISMA operación, así que `past.length +
 * future.length` es un invariante, y como `past` está topado en
 * `HISTORY_LIMIT` (y PUSH_HISTORY además vacía `future`), `future` tampoco
 * puede pasar de `HISTORY_LIMIT`. Se comprobó con 200k de operaciones
 * aleatorias: el máximo observado fue exactamente 50.
 *
 * El límite se aplica igualmente, y por dos razones concretas:
 *   1. `HYDRATE_SESSION` devuelve `action.state` tal cual (línea ~268). Una
 *      sesión restaurada de localStorage, o un `.omega` desempaquetado, entran
 *      sin pasar por `appendToPast` y podrían traer una `future` mayor.
 *   2. Convierte un invariante implícito en uno explícito: si alguien toca
 *      `future` dentro del reducer sin pasar por aquí, el test que comprueba
 *      el tope falla en vez de degradarse en silencio.
 */
function capFuture(future: HistoryEntry[]): HistoryEntry[] {
  return future.length <= HISTORY_LIMIT ? future : future.slice(0, HISTORY_LIMIT);
}

/**
 * OMEGA Orchestrator Reducer (v8.0.0)
 * Maneja todas las transiciones de estado de documentos multi-sesión.
 * Extraído de useDocumentOrchestrator.ts para facilitar testing y mantenimiento.
 *
 * INVARIANTE: siempre hay un documento activo.
 *
 * `documentsById` nunca queda vacío y `activeDocumentId` siempre nombra una
 * clave que existe en él. No es una preferencia de diseño: los consumidores
 * asumen que sí. `useDocumentOrchestrator` resuelve el documento activo como
 * `documentsById[activeDocumentId] || documentsById['primary']`, y
 * `useManifestEditor` desestructura `activeDoc.manifest` sin comprobar nada.
 * Con el mapa vacío las dos ramas caen y el editor revienta con un TypeError.
 *
 * Se sostiene en el reducer y no en el llamador porque el llamador no es el
 * único que puede romperlo: `HYDRATE_SESSION` mete un estado que viene de
 * disco. Y donde antes lo sujetaba `repairPersistedState`, al RESTAURAR, el
 * estado roto ya se había escrito en la bóveda con `activeDocumentId`
 * apuntando al `'primary'` fantasma.
 *
 * Las tres acciones que podrían violarlo están guardadas abajo:
 * `CLOSE_DOCUMENT` rechaza el cierre del último documento, `HYDRATE_SESSION`
 * rechaza una sesión vacía, y `SET_ACTIVE_DOCUMENT` rechaza un id que no
 * existe en el mapa.
 */
export const orchestratorReducer = (state: OrchestratorState, action: OrchestratorAction): OrchestratorState => {
  switch (action.type) {
    case 'OPEN_DOCUMENT':
      if (state.documentsById[action.id]) {
        return { ...state, activeDocumentId: action.id };
      }
      return {
        ...state,
        activeDocumentId: action.id,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            id: action.id,
            manifest: normalizeManifest(action.manifest),
            isDirty: false,
            lastStableHash: '',
            history: { past: [], future: [], lastSavedIndex: -1 },
            isInitializing: true,
            contract: null,
            wasmBuffer: null,
            extraResources: []
          }
        }
      };

    case 'CLOSE_DOCUMENT': {
      // El invariante "siempre hay un documento activo" se sostiene aquí, no
      // en los consumidores. Ver el docblock del reducer.
      if (Object.keys(state.documentsById).length <= 1) return state;
      const { [action.id]: _removed, ...remainingDocs } = state.documentsById;
      const nextActiveId = state.activeDocumentId === action.id
        ? Object.keys(remainingDocs)[0] || state.activeDocumentId
        : state.activeDocumentId;
      return {
        ...state,
        activeDocumentId: nextActiveId,
        documentsById: remainingDocs
      };
    }

    case 'UPDATE_DOCUMENT': {
      const doc = state.documentsById[action.id];
      if (!doc) return state;

      const updatedManifest = action.updates.manifest 
        ? normalizeManifest({ ...doc.manifest, ...action.updates.manifest })
        : doc.manifest;

      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...doc,
            ...action.updates,
            manifest: updatedManifest
          }
        }
      };
    }

    case 'SET_ACTIVE_DOCUMENT':
      // Mismo invariante, otra puerta. `UPDATE_DOCUMENT`, `SET_DIRTY`,
      // `CAPTURE_HASH` y `RESET_DOCUMENT` ya hacen no-op ante un id
      // desconocido; aquí no, y un id obsoleto (una pestaña cerrada hace rato,
      // un `setActiveDocument` con un id de la sesión anterior) dejaba el
      // `activeDocumentId` apuntando a la nada con el mismo TypeError detrás.
      if (!state.documentsById[action.id]) return state;
      return { ...state, activeDocumentId: action.id };

    case 'SET_DIRTY': {
      const dirtyDoc = state.documentsById[action.id];
      if (!dirtyDoc) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: { ...dirtyDoc, isDirty: action.isDirty }
        }
      };
    }

    case 'CAPTURE_HASH': {
      const hashDoc = state.documentsById[action.id];
      if (!hashDoc) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...hashDoc,
            lastStableHash: action.hash,
            isDirty: false,
            // `lastSavedIndex` va DENTRO de `history`, no en el documento.
            history: {
              ...hashDoc.history,
              // Este es el ÚNICO punto de confirmación de "el estado actual ya
              // está a salvo": lo despachan `captureStableSnapshot` (guardar) y
              // el watcher en la inicialización (abrir un documento, cuyo
              // estado pasa a ser la referencia limpia). Ambas cosas dejan el
              // documento limpio, así que ambas deben mover el punto de
              // guardado al cursor vivo, que es `past.length`.
              //
              // Y NO es lo mismo que `lastStableHash`: el hash responde "¿el
              // contenido cambió?" y no tiene nada que ver con la posición en
              // la línea de tiempo. Un undo que vuelve al contenido guardado
              // da hash igual pero sigue siendo un cambio sin guardar si el
              // cursor quedó por encima del punto de guardado.
              lastSavedIndex: hashDoc.history.past.length
            }
          }
        }
      };
    }

    case 'SET_INITIALIZED': {
      const initDoc = state.documentsById[action.id];
      if (!initDoc) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: { ...initDoc, isInitializing: false }
        }
      };
    }

    case 'HYDRATE_SESSION': {
      // `action.state` entra sin validar y antes se aceptaba tal cual. Una
      // sesión guardada por una build anterior al guard de `CLOSE_DOCUMENT`
      // puede venir con `documentsById` VACÍO (era exactamente lo que pasaba),
      // y colarse por aquí devolvía el mismo estado que tumbaba el editor.
      // Ahora el invariante se sostiene en el reducer y no en el llamador, que
      // era quien tenía que acordarse de reparar.
      if (Object.keys(action.state.documentsById).length === 0) return state;
      return action.state;
    }

    case 'RESET_DOCUMENT': {
      const resetDoc = state.documentsById[action.id];
      if (!resetDoc) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...resetDoc,
            manifest: DEFAULT_MANIFEST,
            isDirty: false,
            lastStableHash: '',
            history: { past: [], future: [], lastSavedIndex: -1 }
          }
        }
      };
    }

    case 'UNDO_DOCUMENT': {
      const d = state.documentsById[action.id];
      if (!d || d.history.past.length === 0) return state;

      const lastPast = d.history.past[d.history.past.length - 1];
      const newPast = d.history.past.slice(0, -1);

      const currentEntry = createSnapshotEntry(
        'Current State', 'undo_op', d.manifest, d.extraResources
      );

      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            manifest: cloneManifest(lastPast.manifest),
            extraResources: lastPast.extraResources || d.extraResources,
            history: {
              ...d.history,
              past: newPast,
              // `lastSavedIndex` NO se desplaza: es la posición del cursor en
              // la línea de tiempo, no un índice que haya que reindexar. La
              // entrada 0 de `past` sigue siendo la misma entrada tras un
              // undo, así que su posición no cambia. Desplazarlo aquí
              // desplazaría también `past.length` y la diferencia entre ambos
              // —los cambios sin guardar— se quedaría clavada, impidiendo que
              // deshacer de vuelta al punto de guardado limpiese el estado.
              lastSavedIndex: d.history.lastSavedIndex,
              future: capFuture([currentEntry, ...d.history.future])
            }
          }
        }
      };
    }

    case 'UNDO_TO_INDEX': {
      const d = state.documentsById[action.id];
      if (!d || action.index < 0 || action.index >= d.history.past.length) return state;

      const targetEntry = d.history.past[action.index];
      const { past: newPast, lastSavedIndex } = truncatePastTo(
        d.history.past,
        action.index,
        d.history.lastSavedIndex
      );
      const poppedEntries = d.history.past.slice(action.index + 1);

      const currentEntry = createSnapshotEntry(
        'State before Timeline Jump', 'undo_to_op', d.manifest, d.extraResources
      );

      // Cada entry de `past` ya es el snapshot previo a su propia mutación,
      // así que conserva SU manifest: el redo debe recorrerlas exactamente
      // en orden. Reasignar el manifest del siguiente (o el actual) saltaba
      // un estado y duplicaba el final.
      const newFuture = capFuture([
        ...poppedEntries,
        currentEntry,
        ...d.history.future
      ]);

      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            manifest: cloneManifest(targetEntry.manifest),
            extraResources: targetEntry.extraResources || d.extraResources,
            history: {
              ...d.history,
              past: newPast,
              lastSavedIndex,
              future: newFuture
            }
          }
        }
      };
    }

    case 'REDO_DOCUMENT': {
      const d = state.documentsById[action.id];
      if (!d || d.history.future.length === 0) return state;

      const firstFuture = d.history.future[0];
      const nextFuture = d.history.future.slice(1);
      const { past, lastSavedIndex } = appendToPast(
        d.history.past,
        createSnapshotEntry('Previous State', 'redo_op', d.manifest, d.extraResources),
        d.history.lastSavedIndex
      );

      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            manifest: cloneManifest(firstFuture.manifest),
            extraResources: firstFuture.extraResources || d.extraResources,
            history: {
              ...d.history,
              past,
              lastSavedIndex,
              future: nextFuture
            }
          }
        }
      };
    }

    case 'PUSH_HISTORY': {
      const d = state.documentsById[action.id];
      if (!d) return state;

      const { past, lastSavedIndex } = appendToPast(
        d.history.past,
        action.entry,
        d.history.lastSavedIndex
      );

      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            history: {
              ...d.history,
              past,
              lastSavedIndex,
              future: []
            }
          }
        }
      };
    }

    case 'START_TRANSACTION': {
      const d = state.documentsById[action.id];
      if (!d) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            activeTransaction: {
              label: action.label,
              correlationId: action.correlationId,
              baseNodes: d.manifest.nodes || []
            }
          }
        }
      };
    }

    case 'COMMIT_TRANSACTION': {
      const d = state.documentsById[action.id];
      if (!d) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            activeTransaction: undefined
          }
        }
      };
    }

    case 'ABORT_TRANSACTION': {
      const d = state.documentsById[action.id];
      if (!d || !d.activeTransaction) return state;
      return {
        ...state,
        documentsById: {
          ...state.documentsById,
          [action.id]: {
            ...d,
            manifest: { ...d.manifest, nodes: d.activeTransaction.baseNodes },
            activeTransaction: undefined
          }
        }
      };
    }

    default:
      return state;
  }
};

export const initialOrchestratorState: OrchestratorState = {
  documentsById: {
    'primary': {
      id: 'primary',
      manifest: DEFAULT_MANIFEST,
      isDirty: false,
      lastStableHash: '',
      history: { past: [], future: [], lastSavedIndex: -1 },
      isInitializing: true,
      contract: null,
      wasmBuffer: null,
      extraResources: []
    }
  },
  activeDocumentId: 'primary'
};
