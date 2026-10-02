/**
 * @purpose Cliente mínimo de IndexedDB para la bóveda de sesión: abre la base y expone escritura, lectura y borrado de registros con `put`/`getAll`, apoyándose en el clonado estructural del navegador.
 * @purpose_en Minimal IndexedDB client for the session vault: opens the database and exposes record write, read and delete via `put`/`getAll`, relying on the browser's structured clone algorithm.
 * @refactorable false
 * @classification Service
 * @complexity Medium
 * @exports SESSION_VAULT_DB_NAME, SESSION_VAULT_STORE, SessionVaultError, SessionVaultStore, isSessionVaultAvailable, openSessionVaultStore
 * @lastUpdated 2026-10-01T00:00:00.000Z
 */

/**
 * POR QUÉ NO HAY UNA DEPENDENCIA
 *
 * El API que hace falta son cuatro llamadas (`open`, `transaction`,
 * `put`, `getAll`) y `idb` son ~600 líneas para eso. Encima, añadir un
 * paquete al `package.json` significa otra entrada en el lockfile y otro
 * nodo en el grafo de dependencias de un editor que ya tiene el grafo
 * delicate. Aquí no hay abstracción que valga la pena: la API cruda con
 * tres helpers de promesas es más corta que la documentación del wrapper.
 *
 * POR QUÉ ESTO PUEDE FALLAR Y ESTÁ DISEÑADO PARA ESO
 *
 * IndexedDB no está disponible en SSR, en pruebas sin `fake-indexeddb`, en
 * modo privado de algunos navegadores y en contextos con cookies de
 * terceros bloqueadas. `openSessionVaultStore` REECHAZA en esos casos y el
 * llamante degrada a "sin deshacer tras recargar", que es el comportamiento
 * de siempre. La persistencia del historial es una mejora: no puede ser la
 * razón de que el editor deje de abrir.
 */

import { parseSessionVaultRecord, withoutHistory } from './sessionVault';
import type { SessionVaultRecord } from './sessionVault';

export const SESSION_VAULT_DB_NAME = 'omega_session_vault';
export const SESSION_VAULT_STORE = 'sessions';

/** Razón de fallo, para que el llamante pueda distinguir cuota de ausencia. */
export type SessionVaultErrorKind = 'unavailable' | 'quota' | 'failed';

export class SessionVaultError extends Error {
  readonly kind: SessionVaultErrorKind;
  constructor(kind: SessionVaultErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SessionVaultError';
    this.kind = kind;
  }
}

export interface SessionVaultStore {
  /** Escribe (sobrescribe) los registros indicados en una sola transacción. */
  putAll(records: readonly SessionVaultRecord[]): Promise<void>;
  /** Devuelve los registros legibles; los corruptos se descartan en silencio. */
  getAll(): Promise<SessionVaultRecord[]>;
  /** Borra los documentos indicados (pestaña cerrada, documento cerrado). */
  delete(documentIds: readonly string[]): Promise<void>;
  clear(): Promise<void>;
  close(): void;
}

/** ¿Hay IndexedDB en este entorno? Se comprueba sin lanzar. */
export function isSessionVaultAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    // Algunos entornos lanzan al ACCEDER al global (políticas de CSP), no al
    // comparar. Un `try` vacío es la respuesta correcta, no un descuido.
    return false;
  }
}

function openDatabase(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(name, 1);
    } catch (err) {
      reject(new SessionVaultError('unavailable', 'No se pudo abrir la base de sesión', { cause: err }));
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSION_VAULT_STORE)) {
        // `documentId` como clave: un registro por documento, y `put` lo
        // sobrescribe. No hay índice secondary porque siempre se lee todo el
        // almacén (son unos pocos documentos) y un índice que nadie consulta
        // solo añade trabajo de escritura.
        db.createObjectStore(SESSION_VAULT_STORE, { keyPath: 'documentId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new SessionVaultError('unavailable', 'No se pudo abrir la base de sesión', { cause: request.error }));
    request.onblocked = () =>
      reject(new SessionVaultError('unavailable', 'La base de sesión está bloqueada por otra pestaña'));
  });
}

function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: unknown }).name;
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

function wrapError(cause: unknown, message: string): SessionVaultError {
  return isQuotaError(cause)
    ? new SessionVaultError('quota', 'Cuota de IndexedDB agotada', { cause })
    : new SessionVaultError('failed', message, { cause });
}

/**
 * Ejecuta una escritura y resuelve cuando la transacción COMMITE.
 *
 * Resolver en `oncomplete` y no en el `onsuccess` de la petición es lo que
 * hace que un `put` no confirmado sea un `put` hecho: si la transacción
 * aborta después, la promesa tiene que rechazarse. Confiar en la petición
 * deja estados fantasma en los que se cree haber guardado algo que no está.
 */
function runWrite(
  db: IDBDatabase,
  storeName: string,
  body: (store: IDBObjectStore) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(storeName, 'readwrite');
    } catch (err) {
      reject(new SessionVaultError('failed', 'No se pudo iniciar la transacción de sesión', { cause: err }));
      return;
    }
    let settled = false;
    const fail = (cause: unknown, message: string) => {
      if (settled) return;
      settled = true;
      reject(wrapError(cause, message));
    };
    tx.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    tx.onerror = () => fail(tx.error, 'La transacción de sesión falló');
    tx.onabort = () => fail(tx.error, 'La transacción de sesión se abortó');
    try {
      body(tx.objectStore(storeName));
    } catch (err) {
      try {
        tx.abort();
      } catch {
        // abort() sobre una transacción ya terminada: nada que hacer.
      }
      fail(err, 'La operación de sesión falló');
    }
  });
}

/**
 * Lee todo el almacén. En una transacción de solo lectura no hay commit que
 * esperar: la petición `getAll` ya entrega el estado visible, que es lo que
 * interesa.
 */
function readAll(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise<unknown[]>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(storeName, 'readonly');
    } catch (err) {
      reject(new SessionVaultError('failed', 'No se pudo iniciar la lectura de sesión', { cause: err }));
      return;
    }
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as unknown[]);
    request.onerror = () => reject(wrapError(request.error, 'La lectura de sesión falló'));
  });
}

export interface OpenSessionVaultOptions {
  /** Inyectable para pruebas: por defecto el `indexedDB` del entorno. */
  factory?: IDBFactory | undefined;
  /** Inyectable para pruebas: por defecto `omega_session_vault`. */
  dbName?: string | undefined;
}

/**
 * Abre la bóveda y devuelve el cliente.
 *
 * `factory`/`dbName` existen para poder probar contra un doble en memoria sin
 * `fake-indexeddb` (que no es dependencia del proyecto) y sin tocar el
 * almacén real de quien corre los tests.
 */
export async function openSessionVaultStore(
  options: OpenSessionVaultOptions = {}
): Promise<SessionVaultStore> {
  const factory = options.factory ?? (isSessionVaultAvailable() ? indexedDB : undefined);
  if (!factory) {
    throw new SessionVaultError('unavailable', 'IndexedDB no está disponible en este entorno');
  }

  const db = await openDatabase(factory, options.dbName ?? SESSION_VAULT_DB_NAME);

  return {
    async putAll(records) {
      if (records.length === 0) return;
      const write = (list: readonly SessionVaultRecord[]) =>
        runWrite(db, SESSION_VAULT_STORE, (store) => {
          for (const record of list) store.put(record);
        });

      try {
        await write(records);
      } catch (err) {
        // Una pila de 50 entradas, cada una con su manifiesto completo y con
        // sus ArrayBuffer, es con diferencia lo más grande que se guarda
        // aquí. Ante cuota agotada se reintenta SIN historial, y el orden del
        // sacrificio está escrito en `withoutHistory`: primero lo recreable
        // (el deshacer se puede volver a construir editando), después los
        // binarios del proyecto.
        if (err instanceof SessionVaultError && err.kind === 'quota') {
          const stripped = records.map(withoutHistory);
          if (stripped.every((record, i) => record === records[i])) {
            // No había historial que sacrificar: el error no es recuperable.
            throw err;
          }
          await write(stripped);
          return;
        }
        throw err;
      }
    },

    async getAll() {
      const raw = await readAll(db, SESSION_VAULT_STORE);
      const records: SessionVaultRecord[] = [];
      for (const item of raw) {
        const parsed = parseSessionVaultRecord(item);
        if (parsed) records.push(parsed);
      }
      return records;
    },

    async delete(documentIds) {
      if (documentIds.length === 0) return;
      await runWrite(db, SESSION_VAULT_STORE, (store) => {
        for (const id of documentIds) store.delete(id);
      });
    },

    async clear() {
      await runWrite(db, SESSION_VAULT_STORE, (store) => {
        store.clear();
      });
    },

    close() {
      db.close();
    }
  };
}
