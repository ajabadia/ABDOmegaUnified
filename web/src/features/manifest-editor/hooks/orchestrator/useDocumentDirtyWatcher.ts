'use client';

/**
 * @purpose Gestiona el estado sucio de los documentos comparando hashes y actualizando banderas según sea necesario.
 * @purpose_en Manages the dirty state of documents by comparing hashes and updating flags accordingly.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:bcih2l
 * @lastUpdated 2026-10-02T00:00:00.000Z
 */

import { useEffect, useRef } from 'react';
import type { DocumentState, OrchestratorAction } from '../../types/document';
import { IntegrityService } from '@/services/integrityService';

/**
 * OMEGA Document Dirty Watcher (v8.0.0)
 * Observa cambios en los documentos y calcula el flag isDirty
 * comparando el hash actual contra lastStableHash.
 * Extraído de useDocumentOrchestrator.ts para reducir el monolito.
 */
export function useDocumentDirtyWatcher(
  documentsById: Record<string, DocumentState>,
  dispatch: React.Dispatch<OrchestratorAction>
) {
  const debouncedHashingRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const initTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const hashPromisesRef = useRef<Record<string, Promise<void> | null>>({});

  // Último `documentsById` conocido, para que una promesa de hashing que
  // resuelve tarde pueda descartar su resultado. Ver `isStale` más abajo.
  const latestRef = useRef(documentsById);
  latestRef.current = documentsById;

  useEffect(() => {
    Object.values(documentsById).forEach((doc: DocumentState) => {
      /**
       * ¿Este `doc` sigue siendo el documento vigente?
       *
       * El hashing es asíncrono y no se puede cancelar: cuando la promesa
       * resuelve, el documento puede haber cambiado (un reset, un undo, una
       * edición). El resultado se calculó contra un estado que ya no existe,
       * así que despacharlo volvería sucio un documento limpio.
       *
       * MEDIDO (2 de octubre de 2026): tras "Reset Workspace" el documento
       * pasaba por `isDirty: true` durante ~500 ms aunque el reducer lo hubiera
       * dejado limpio, por un hash que se había pedido ANTES del reset y
       * resolvió después. Con esta guarda ese transitorio desaparece.
       *
       * La comparación es por identidad de objeto: el reducer produce un
       * documento nuevo en cada transición, así que si el objeto sigue siendo
       * el mismo es que nada lo tocó.
       */
      const isStale = () => latestRef.current[doc.id] !== doc;

      if (doc.isInitializing) {
        const t = setTimeout(async () => {
          const promise = (async () => {
            const hash = await IntegrityService.generateManifestHash(doc.manifest);
            // El documento cambió mientras se hasheaba: el ciclo que pidió
            // este hash ya no es el vigente. Su propio efecto-programa se
            // encargará, y `SET_INITIALIZED` aquí volvería a apagar
            // prematuramente la bandera de un documento recién reseteado.
            if (isStale()) return;
            dispatch({ type: 'CAPTURE_HASH', id: doc.id, hash });
            dispatch({ type: 'SET_INITIALIZED', id: doc.id });
          })();

          hashPromisesRef.current[doc.id] = promise;
          await promise;
          if (hashPromisesRef.current[doc.id] === promise) {
            hashPromisesRef.current[doc.id] = null;
          }
        }, 500);
        // Este temporizador se guarda aparte porque el `return` de arriba está
        // dentro del `forEach`: solo salía del callback, y el cleanup del
        // efecto NUNCA lo ejecutaba. Sin este ref, un documento que se
        // inicializa y se cambia dentro de la ventana de 500 ms se quedaba con
        // dos temporizadores de inicialización vivos.
        initTimersRef.current[doc.id] = t;
        return;
      }

      if (debouncedHashingRef.current[doc.id]) {
        clearTimeout(debouncedHashingRef.current[doc.id]);
      }

      debouncedHashingRef.current[doc.id] = setTimeout(async () => {
        const promise = (async () => {
          const currentHash = await IntegrityService.generateManifestHash(doc.manifest);
          if (isStale()) return;
          const isNowDirty = currentHash !== doc.lastStableHash;
          if (isNowDirty !== doc.isDirty) {
            dispatch({ type: 'SET_DIRTY', id: doc.id, isDirty: isNowDirty });
          }
        })();

        hashPromisesRef.current[doc.id] = promise;
        await promise;
        if (hashPromisesRef.current[doc.id] === promise) {
          hashPromisesRef.current[doc.id] = null;
          delete debouncedHashingRef.current[doc.id];
        }
      }, 200);
    });

    // Los `ref` son los mismos objetos entre renders, así que capturarlos aquí
    // es seguro y el cleanup ve siempre lo último que se programó.
    const currentDebounced = debouncedHashingRef.current;
    const currentInitTimers = initTimersRef.current;
    return () => {
      Object.values(currentDebounced).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      Object.values(currentInitTimers).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [documentsById, dispatch]);

  /**
   * Limpia cualquier operación de hash pendiente para un documento.
   * Usado por captureStableSnapshot para garantizar consistencia antes del snapshot.
   */
  const flushPendingHash = async (id: string): Promise<void> => {
    if (initTimersRef.current[id]) {
      clearTimeout(initTimersRef.current[id]);
      delete initTimersRef.current[id];
    }
    if (debouncedHashingRef.current[id]) {
      clearTimeout(debouncedHashingRef.current[id]);
      delete debouncedHashingRef.current[id];
    }
    if (hashPromisesRef.current[id]) {
      await hashPromisesRef.current[id];
    }
  };

  return { flushPendingHash };
}