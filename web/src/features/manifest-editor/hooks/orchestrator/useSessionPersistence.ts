'use client';

/**
 * @purpose Gestiona persistencia de sesión para documentos en el editor de manifesto OMEGA cargando y guardando el estado en almacenamiento local y recuperando datos persistidos.
 * @purpose_en Manages session persistence for documents in the OMEGA manifest editor by loading and saving the state to local storage and handling recovery from persisted data.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:1kpy1im
 * @lastUpdated 2026-06-15T13:11:13.291Z
 */

import { useEffect, useRef } from 'react';
import type { DocumentState, OrchestratorState, OrchestratorAction } from '../../types/document';
import { DEFAULT_MANIFEST, normalizeManifest } from '../../constants/defaults';
import { BlueprintValidator } from '@/omega-ui-core/utils/blueprintValidator';
import { STORAGE_KEYS } from '../../constants/storage';
import { repairPersistedState, readHistoryDepths } from '../../utils/sessionRestore';
import { detectUndoHistoryLoss } from '../../utils/sessionRestoreNotice';
import { runSessionMigrations } from '../../utils/sessionMigrations';
import { publishSessionRestoreNotice, publishSessionRecoveryNotice } from '../useSessionRestoreNotice';
import {
  applySessionVaultRecords,
  buildSessionVaultRecord
} from '../../utils/sessionVault';
import type { SessionVaultRecord } from '../../utils/sessionVault';
import { recoverDocumentsFromVaultRecords } from '../../utils/sessionVault';
import {
  isSessionVaultAvailable,
  openSessionVaultStore,
  SessionVaultError
} from '../../utils/sessionVaultDb';
import type { SessionVaultStore } from '../../utils/sessionVaultDb';
import { IntegrityService } from '@/services/integrityService';
import { nextHistoryEntryId } from '@/omega-ui-core/utils/historyEntryId';
import { getService } from '@/services/globalEventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';

/**
 * Espera antes de volcar la bóveda.
 *
 * El historial cambia en cada pulsación (cada entrada arrastra un manifiesto
 * completo) y `structuredClone` de eso no es gratis. Sin este margen, un
 * `redo`x50 seguido de un `undo`x50 escribiendo 100 pilas enteras. Con él,
 * una ráfaga colapsa en una escritura, que además es la que el usuario
 * quiere: el estado al soltar.
 */
const VAULT_SAVE_DEBOUNCE_MS = 800;

export function useSessionPersistence(
  state: OrchestratorState,
  dispatch: React.Dispatch<OrchestratorAction>
) {
  const persistenceService = getService(SERVICE_TOKENS.PERSISTENCE_SERVICE);
  const observabilityService = getService(SERVICE_TOKENS.OBSERVABILITY_SERVICE);

  /**
   * Estado de la lectura de sesión para este montaje.
   *
   * Vive en un `ref` y no en `useState` a propósito: cambiarlo no debe
   * provocar renders. Y `hydrated` bloquea AMBAS escrituras hasta que la
   * lectura inicial ha terminado, porque si no el primer volcado escribiría
   * el estado por defecto (`primary` recién creado, historial vacío) encima
   * de lo que acabamos de leer.
   *
   * Para la bóveda eso significaba perder el deshacer; para `localStorage`
   * significa perder la sesión entera. Y el caso de `localStorage` es
   * peor en un detalle: lo que se pisa ahí es la LISTA DE DOCUMENTOS, así
   * que un volcado prematuro no degrada el historial, lo borra. Por eso el
   * guard se pone antes del volcado y no "ya corregido después" como se
   * podía hacer con la bóveda.
   *
   * Para medir si algo sobrevive a un F5 real en el navegador (y evitar
   * falsos positivos de pérdida de datos), ver
   * `docs/guides-and-standards/MEASURING_RELOAD_IN_BROWSER.md`.
   */
  const vaultRef = useRef<{ store: SessionVaultStore | null; hydrated: boolean }>({
    store: null,
    hydrated: false
  });

  /**
   * Abre la bóveda sin dejar que un fallo tumbe el editor.
   *
   * Devuelve `null` en cualquier fallo, incluidos los de cuota y los de
   * "IndexedDB no existe aquí" (SSR, pruebas, modo privado). Perder el
   * deshacer entre recargas es una molestia; no abrir el editor sería un
   * incidente.
   */
  const openVault = async (): Promise<SessionVaultStore | null> => {
    if (vaultRef.current.store) return vaultRef.current.store;
    if (!isSessionVaultAvailable()) return null;
    try {
      vaultRef.current.store = await openSessionVaultStore();
      return vaultRef.current.store;
    } catch (err) {
      const reason = err instanceof SessionVaultError ? err.message : 'IndexedDB no disponible';
      console.warn('[OMEGA ORCHESTRATOR] Bóveda de sesión desactivada:', reason);
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    // La apertura de la base y la lectura de registros son asíncronas. La
    // hidratación se ESPERA a que terminen en vez de lanzar primero el
    // `HYDRATE_SESSION` y parchear después: un `HYDRATE_SESSION` sustituye
    // el estado entero, así que llegar tarde pisaría lo que el usuario haya
    // hecho en esos milisegundos.
    void (async () => {
    try {
      const persisted = persistenceService.loadCanonicalState();
      if (persisted) {
        try {
          BlueprintValidator.validate(persisted.graph, { id: persisted.id });
          observabilityService.trackEvent({
            correlationId: persisted.metadata.lastCorrelationId,
            phase: 'PHASE_20_RECOVERY',
            component: 'ORCHESTRATOR',
            state: 'SUCCESS',
            message: `Rehydrated canonical state for ${persisted.id} (Hash: ${persisted.metadata.syncHash})`
          });
          const recoveredManifest = normalizeManifest({
            ...DEFAULT_MANIFEST,
            id: persisted.id,
            ui: {
              ...DEFAULT_MANIFEST.ui,
              tree: persisted.graph
            }
          });
          dispatch({
            type: 'OPEN_DOCUMENT',
            id: persisted.id,
            manifest: recoveredManifest
          });
          dispatch({
            type: 'PUSH_HISTORY',
            id: persisted.id,
            entry: {
              id: nextHistoryEntryId('recovery'),
              type: 'RECOVERY_POINT',
              label: 'Session Recovery Point',
              timestamp: Date.now(),
              correlationId: persisted.metadata.lastCorrelationId,
              manifest: recoveredManifest,
              uiState: {
                selectedNodeId: null,
                multiSelectedNodeIds: [],
                pinnedNodeId: null,
                layoutRatio: 0.5
              }
            }
          });
          return;
        } catch (valErr: unknown) {
          const error = valErr as Error;
          observabilityService.trackEvent({
            correlationId: persisted.metadata.lastCorrelationId,
            phase: 'PHASE_20_RECOVERY',
            component: 'ORCHESTRATOR',
            state: 'FAILURE',
            code: 'RECOVERY_VALIDATION_FAILED',
            message: `Persisted state invalid: ${error.message}`
          });
          persistenceService.clearPersistedState();
        }
      }
      // La migración va ANTES de leer, y a propósito. Si se leyera primero, el
      // `stored` en memoria seguiría siendo el payload corrupto y la sesión
      // reparada solo entraría en la PRÓXIMA carga. Leyéndolo después, la
      // sesión reparada se rehidrata por la vía normal —con su reparación de
      // historial y su aviso de deshacer— en vez de colarse por un atajo.
      //
      // Es seguro por el orden de los efectos: el de lectura está declarado
      // antes que el de guardado, así que se ejecuta primero. Y aunque el de
      // guardado llegara a correr antes, su guard `hydrated` lo frenaría: solo
      // escribe una vez que la lectura ha terminado.
      const migration = runSessionMigrations();
      if (migration.repaired) {
        observabilityService.trackEvent({
          correlationId: persisted?.metadata.lastCorrelationId ?? 'session-migration',
          phase: 'PHASE_20_RECOVERY',
          component: 'ORCHESTRATOR',
          state: 'SUCCESS',
          code: 'SESSION_EMPTY_DOCUMENTS_REPAIRED',
          message: 'Sesión persistida con documentsById vacío; reescrita a un documento por defecto.'
        });
      }

      const stored = localStorage.getItem(STORAGE_KEYS.SESSION_DOCS);
      if (stored) {
        // Toda la reparación vive en `sessionRestore.ts` (puro y testeable): el
        // historial se descarta al guardar, así que hay que reestablecer sus
        // invariantes de índice, la línea base de "sucio" y el puntero de documento
        // activo antes de hidratar. Ver el módulo para el detalle del por qué.
        const rawPayload = JSON.parse(stored) as OrchestratorState;
        // Se lee del payload CRUDO, antes de reparar: la reparación deja la
        // pila vacía a propósito, y este número es justo lo que permite
        // después distinguir "nunca se editó" de "se editó y la recarga tiró
        // el deshacer". Ver `readHistoryDepths`.
        const historyDepths = readHistoryDepths(rawPayload);
        const repaired = repairPersistedState(rawPayload);
        if (repaired) {
          for (const id of Object.keys(repaired.documentsById)) {
            repaired.documentsById[id] = {
              ...repaired.documentsById[id],
              manifest: normalizeManifest(repaired.documentsById[id].manifest)
            };
          }
          // Los hashes se calculan DESPUÉS de normalizar, porque es el
          // manifiesto ya normalizado el que se va a comparar contra el que
          // se guardó en la bóveda. Hashear antes compararía dos
          // representaciones distintas del mismo documento y la unión
          // fallaría siempre, dejando el editor sin deshacer sin motivo.
          const manifestHashes: Record<string, string> = {};
          for (const id of Object.keys(repaired.documentsById)) {
            manifestHashes[id] = await IntegrityService.generateManifestHash(
              repaired.documentsById[id].manifest
            );
          }

          const store = await openVault();
          const records = store ? await store.getAll() : [];
          if (cancelled) return;

          /**
           * RESURRECCIÓN
           *
           * Si la migración acaba de reparar una sesión que venía vacía, el
           * estado que tenemos delante NO es el del usuario: es el documento
           * por defecto que la migración escribió. La bóveda, en cambio, puede
           * seguir teniendo los documentos de verdad, porque su manifiesto se
           * escribe entero (v2). Se resucitan y, si hay algo, TIENEN prioridad
           * sobre el documento por defecto.
           *
           * No se llama a `applySessionVaultRecords` en esta rama porque la
           * recuperación ya se ha servido de los MISMOS registros y les ha
           * pegado su historial. Volver a pasarlos por ahí solo volvería a
           * comprobar el hash para terminar haciendo lo mismo.
           *
           * Y si no hay nada que resucitar, la migración ya dejó un documento
           * por defecto coherente y se sigue por el camino normal.
           */
          const recovery = migration.detectedEmptyDocuments
            ? recoverDocumentsFromVaultRecords(records)
            : null;

          let hydrated: OrchestratorState;
          let recoveredIds: string[] = [];
          let unrecoverableIds: string[] = recovery?.unrecoverableIds ?? [];
          if (recovery && recovery.recoveredIds.length > 0) {
            const documentsById: Record<string, DocumentState> = {};
            for (const id of recovery.recoveredIds) {
              const doc = recovery.documentsById[id];
              documentsById[id] = {
                ...doc,
                // Normalizar aquí y no confiar en lo que venía guardado: el
                // manifiesto se escribió con la lógica de defaults de su
                // momento, y el resto del editor asume el actual.
                manifest: normalizeManifest(doc.manifest)
              };
            }
            // Los hashes se recalculan del manifiesto YA normalizado por el
            // mismo motivo que antes: la unión con la bóveda compara
            // representaciones, no ids.
            for (const id of Object.keys(documentsById)) {
              manifestHashes[id] = await IntegrityService.generateManifestHash(
                documentsById[id].manifest
              );
            }
            hydrated = { documentsById, activeDocumentId: recovery.activeDocumentId };
            recoveredIds = recovery.recoveredIds;
            unrecoverableIds = recovery.unrecoverableIds;
          } else {
            hydrated = applySessionVaultRecords(repaired, records, manifestHashes);
          }

          if (recovery && recovery.recoveredIds.length > 0) {
            publishSessionRecoveryNotice({
              recoveredIds,
              unrecoverableIds,
              documentNames: recoveredIds.map(
                (id) =>
                  hydrated.documentsById[id]?.manifest?.metadata?.name ||
                  hydrated.documentsById[id]?.manifest?.id ||
                  id
              )
            });
          } else if (migration.detectedEmptyDocuments) {
            // Se avisa TAMBIÉN cuando no se ha podido recuperar nada, y se
            // avisa de lo que no se pudo. Publicar solo en el caso bueno
            // callaría justo en el peor: el usuario abriría un módulo en
            // blanco creyendo que es el suyo, sin una palabra de que su
            // sesión se perdió ni de cuántos documentos dejó atrás.
            publishSessionRecoveryNotice({ recoveredIds: [], unrecoverableIds, documentNames: [] });
          }

          // Aviso de historial perdido. Se decide UNA vez, aquí, y solo para
          // el documento activo: es el que el usuario tiene delante. La
          // pila se puede haber restaurado (nada que avisar) o no (y entonces
          // hay que decirlo, porque el botón de deshacer va a aparecer gris
          // sin explicación). Ver `utils/sessionRestoreNotice.ts`.
          const activeId = hydrated.activeDocumentId;
          const activeDoc = hydrated.documentsById[activeId];
          const activeRecord = records.find((r) => r.documentId === activeId);
          publishSessionRestoreNotice(
            activeDoc
              ? detectUndoHistoryLoss({
                documentId: activeId,
                documentName:
                  activeDoc.manifest.metadata?.name || activeDoc.manifest.id || activeId,
                persistedDepth: historyDepths[activeId] ?? 0,
                restoredDepth: activeDoc.history.past.length,
                vaultAvailable: store !== null,
                vaultDepth: activeRecord?.history.past.length,
                vaultHashMatched: manifestHashes[activeId] === activeRecord?.manifestHash
              })
              : null
          );

          dispatch({ type: 'HYDRATE_SESSION', state: hydrated });
        }
      }
    } catch (err: unknown) {
      console.error('[OMEGA ORCHESTRATOR] Session restore failed:', err);
    } finally {
      // Cubre TODOS los caminos: los que hidratan y los que no (sesion
      // vacia, `repaired === null`, error de lectura). En cuanto pasa por
      // aquí el editor puede persistir.
      if (!cancelled) vaultRef.current.hydrated = true;
    }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, observabilityService, persistenceService]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      /**
       * MISMO GUARD QUE EL VOLCADO DE LA BÓVEDA, Y POR EL MOTIVO DE ALÍ.
       *
       * `hydrated` bloquea la escritura hasta que la lectura inicial ha
       * terminado. Sin él, este efecto dispara en el MONTAJE y escribe el
       * estado por defecto (`primary` recién creado) encima de lo que el
       * efecto de lectura está a punto de cargar. Para la bóveda eso
       * significaba perder el deshacer; aquí significa perder la sesión
       * entera.
       *
       * HOY NO PASA NADA, y es lo que hace dangerous este agujero. Funciona
       * por un detalle invisible: el efecto de lectura ejecuta su IIFE de
       * forma síncrona hasta el primer `await`, así que su
       * `localStorage.getItem` ocurre ANTES de que corra este efecto. La
       * lectura se lleva el valor bueno, y la escritura de aquí lo pisa con
       * un valor válido que luego se sobrescribe con el bueno otra vez.
       *
       * Es decir: la sesión sobrevive por el orden de los efectos y por una
       * línea de código situada a cientos de líneas de distancia. Cualquier
       * `await` que alguien meta antes del `getItem` —o reordenar los
       * efectos— convierte esto en pérdida silenciosa de la sesión del
       * usuario, sin ningún error que lo delate. Un guard hace que la
       * corrección dependa de lo que dice el código y no de cuándo corre.
       *
       * Y `hydrated` (y no un "ya he leído el payload") a propósito: no basta
       * con haber leído la sesión, hace falta haberla PUESTO en el estado.
       * El instante intermedio —leída sí, rehidratada todavía no— es
       * precisamente donde el estado en memoria sigue siendo el `primary`
       * de fábrica, y escribir ahí sí que borraría la sesión de verdad.
       *
       * El precio es que `localStorage` queda en el mismo régimen que la
       * bóveda: si abrir IndexedDB se demora, el editor no persiste durante
       * esa demora. Se acepta porque es el mismo compromiso que ya hacía el
       * volcado de la bóveda, y paga un incoherente peor: perder la lista de
       * documentos no degrada el historial, lo borra.
       */
      if (!vaultRef.current.hydrated) return;
      // `historyDepthById` es un número por documento, no la pila: cabe en el
      // JSON y es lo que permite que la próxima carga sepa si tenía deshacer
      // que perder. Sin esto, una recarga que lo tire es indistinguible de un
      // documento que nunca se editó.
      const historyDepthById: Record<string, number> = {};
      for (const id of Object.keys(state.documentsById)) {
        historyDepthById[id] = state.documentsById[id].history.past.length;
      }
      const data = {
        documentsById: state.documentsById,
        activeDocumentId: state.activeDocumentId,
        historyDepthById
      };
      // `history` se EXCLUYE a propósito: cada entrada lleva un manifiesto completo y
      // `extraResources` lleva ArrayBuffers, así que la pila no es serializable a
      // JSON dentro de un presupuesto razonable. La contrapartida era que al
      // recargar no había deshacer; esa contrapartida la cubre ahora la
      // bóveda de sesión (IndexedDB, clonado estructural), que se escribe
      // justo debajo. Lo que sigue mandando aquí es el MANIFIESTO.
      // Ver `utils/sessionRestore.ts` y `utils/sessionVault.ts`.
      localStorage.setItem(STORAGE_KEYS.SESSION_DOCS, JSON.stringify(data, (key, value) => {
        if (key === 'wasmBuffer' || key === 'contract' || key === 'extraResources' || key === 'history') return undefined;
        return value;
      }));
    }
  }, [state.documentsById, state.activeDocumentId]);

  /**
   * Volcado de la bóveda: historial y `extraResources` por documento.
   *
   * Se escribe el estado COMPLETO de cada documento en cada volcado en vez
   * de un diff. Suena caro, y lo es, pero un diff exige comparar 50
   * manifiestos para saber cuánto se puede recortar la pila, y la
   * escritura completa es la única que no puede quedar a medias: o queda
   * la pila entera o no queda. IndexedDB escribe en transacción, así que
   * un corte a mitad de petición no deja registros a medio camino.
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!vaultRef.current.hydrated) return;

    const timer = setTimeout(() => {
      void (async () => {
        const store = await openVault();
        if (!store) return;
        const liveIds = Object.keys(state.documentsById);
        try {
          const records: SessionVaultRecord[] = [];
          for (const id of liveIds) {
            const doc: DocumentState = state.documentsById[id];
            const manifestHash = await IntegrityService.generateManifestHash(doc.manifest);
            records.push(buildSessionVaultRecord(doc, manifestHash));
          }
          await store.putAll(records);

          // `CLOSE_DOCUMENT` quita el documento del estado pero su registro
          // seguiría en la bóveda para siempre. Borrarlo aquí evita
          // que una sesión que se cierra y se reabre con el mismo id herede
          // un historial de una sesión que ya no existe.
          const existing = await store.getAll();
          const stale = existing
            .map((record) => record.documentId)
            .filter((id) => !liveIds.includes(id));
          await store.delete(stale);
        } catch (err) {
          const reason = err instanceof SessionVaultError ? err.message : 'error desconocido';
          console.warn('[OMEGA ORCHESTRATOR] No se pudo volcar la b\u00f3veda de sesi\u00f3n:', reason);
        }
      })();
    }, VAULT_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [state.documentsById]);
}
