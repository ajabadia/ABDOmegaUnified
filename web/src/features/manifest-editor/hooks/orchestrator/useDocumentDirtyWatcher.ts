'use client';

/**
 * @purpose Gestiona el estado sucio de los documentos comparando hashes y actualizando banderas según sea necesario.
 * @purpose_en Manages the dirty state of documents by comparing hashes and updating flags accordingly.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:3,sig:bcih2l
 * @lastUpdated 2026-06-15T13:11:07.715Z
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
  const hashPromisesRef = useRef<Record<string, Promise<void> | null>>({});

  useEffect(() => {
    Object.values(documentsById).forEach((doc: DocumentState) => {
      if (doc.isInitializing) {
        const t = setTimeout(async () => {
          const promise = (async () => {
            const hash = await IntegrityService.generateManifestHash(doc.manifest);
            dispatch({ type: 'CAPTURE_HASH', id: doc.id, hash });
            dispatch({ type: 'SET_INITIALIZED', id: doc.id });
          })();

          hashPromisesRef.current[doc.id] = promise;
          await promise;
          if (hashPromisesRef.current[doc.id] === promise) {
            hashPromisesRef.current[doc.id] = null;
          }
        }, 500);
        return () => clearTimeout(t);
      }

      if (debouncedHashingRef.current[doc.id]) {
        clearTimeout(debouncedHashingRef.current[doc.id]);
      }

      debouncedHashingRef.current[doc.id] = setTimeout(async () => {
        const promise = (async () => {
          const currentHash = await IntegrityService.generateManifestHash(doc.manifest);
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

    const currentDebounced = debouncedHashingRef.current;
    return () => {
      Object.values(currentDebounced).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [documentsById, dispatch]);

  /**
   * Limpia cualquier operación de hash pendiente para un documento.
   * Usado por captureStableSnapshot para garantizar consistencia antes del snapshot.
   */
  const flushPendingHash = async (id: string): Promise<void> => {
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
