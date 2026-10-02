'use client';

/**
 * @purpose Store externo mínimo para el aviso de "historial de deshacer descartado al restaurar", con enlace a React vía `useSyncExternalStore`.
 * @purpose_en Minimal external store for the "undo history discarded on restore" notice, bound to React via `useSyncExternalStore`.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Low
 * @exports publishSessionRestoreNotice, dismissSessionRestoreNotice, resetSessionRestoreNoticeStore, getSessionRestoreNotice, useSessionRestoreNotice, SessionRecoveryNotice, publishSessionRecoveryNotice, getSessionRecoveryNotice, dismissSessionRecoveryNotice, resetSessionRecoveryNoticeStore, useSessionRecoveryNotice
 * @lastUpdated 2026-10-01T00:00:00.000Z
 */

import { useSyncExternalStore } from 'react';
import type { SessionRestoreNotice } from '../utils/sessionRestoreNotice';

/**
 * POR QUÉ UN STORE EXTERNO Y NO UN CONTEXTO
 *
 * Quien publica el aviso es `useSessionPersistence`, que cuelga del
 * orquestador, a tres niveles del árbol de React; quien lo muestra es un
 * componente hermano del footer. Meter un provider para pasar un objeto que
 * solo se escribe una vez por carga obligaría a envolver el editor entero
 * (y a sus tests) para pasar una sola pieza de estado.
 *
 * `useSyncExternalStore` es la respuesta de React a esto: lectura coherente
 * durante el render (no el `useEffect` + `setState` que produce el
 * "undefined en el primer render" del que warned React 18), sin provider y
 * sin coste de contexto para el resto de la app.
 *
 * El estado es un singleton a propósito: el aviso es de SESIÓN, no de
 * documento. Se decide una vez, al hidratar, y no vuelve a cambiar hasta que
 * se descarta a mano o se recarga la página.
 */

let current: SessionRestoreNotice | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SessionRestoreNotice | null {
  return current;
}

/**
 * Publica el aviso. Publicar `null` es lo mismo que no publicar, y publicar
 * dos veces el mismo aviso no dispara renders de más: la identidad del objeto
 * se compara en `getSnapshot`.
 */
export function publishSessionRestoreNotice(notice: SessionRestoreNotice | null): void {
  if (notice === null) {
    dismissSessionRestoreNotice();
    return;
  }
  if (current && current.documentId === notice.documentId && current.reason === notice.reason) {
    return;
  }
  current = notice;
  emit();
}

/**
 * Estado actual. Exportado para los tests: leer el singleton desde fuera es
 * lo que permite comprobar que el aviso se publicó SIN tener que montar el
 * banner, que es un test de render y no de cableado.
 */
export function getSessionRestoreNotice(): SessionRestoreNotice | null {
  return current;
}

export function dismissSessionRestoreNotice(): void {
  if (current === null) return;
  current = null;
  emit();
}

/** Solo para tests: deja el singleton como estaba. */
export function resetSessionRestoreNoticeStore(): void {
  if (current === null) return;
  current = null;
  emit();
}

export function useSessionRestoreNotice(): SessionRestoreNotice | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * AVISO DE SESIÓN RESUCITADA
 *
 * Un store aparte, y no un `UndoLossReason` más. Son dos ejes distintos: el
 * aviso de deshacer es "este documento perdió su pila", y este es "la sesión
 * entera venía rota y hemos tenido que rehacerla". Meterlo en la misma tabla
 * de decisión la haría mentir: un documento que nunca tuvo pila que perder no
 * ha perdido nada, y ahí el aviso de deshacer calla mientras este tiene que
 * hablar.
 *
 * Guarda el RESULTADO y no un booleano porque el resultado tiene tres formas
 * que el usuario lee distinto: se han recuperado N documentos, se ha
 * recuperado alguno pero otros no, o no se ha podido recuperar nada. Decir
 * siempre lo mismo sería tan inútil como no decir nada.
 *
 * Es un aviso aparte también porque el otro se descarta con su propio botón y
 * este no: la resurrección no se deshace, así que no hay nada que cerrar.
 */
export interface SessionRecoveryNotice {
  recoveredIds: string[];
  unrecoverableIds: string[];
  documentNames: string[];
}

let recovery: SessionRecoveryNotice | null = null;
const recoveryListeners = new Set<() => void>();

function emitRecovery(): void {
  for (const listener of recoveryListeners) listener();
}

export function publishSessionRecoveryNotice(notice: SessionRecoveryNotice): void {
  recovery = notice;
  emitRecovery();
}

export function getSessionRecoveryNotice(): SessionRecoveryNotice | null {
  return recovery;
}

export function dismissSessionRecoveryNotice(): void {
  if (recovery === null) return;
  recovery = null;
  emitRecovery();
}

/** Solo para tests. */
export function resetSessionRecoveryNoticeStore(): void {
  if (recovery === null) return;
  recovery = null;
  emitRecovery();
}

export function useSessionRecoveryNotice(): SessionRecoveryNotice | null {
  return useSyncExternalStore(
    (listener) => {
      recoveryListeners.add(listener);
      return () => {
        recoveryListeners.delete(listener);
      };
    },
    getSessionRecoveryNotice,
    getSessionRecoveryNotice
  );
}
