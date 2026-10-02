/**
 * Doble en memoria de IndexedDB para probar `sessionVaultDb`.
 *
 * POR QUÉ UN DOBLE Y NO `fake-indexeddb`
 *
 * El proyecto no tiene esa dependencia y añadir una para cuatro llamadas
 * (`put`, `getAll`, `delete`, `clear`) sería una dependencia entera por un
 * detalle. Este doble implementa justo la semántica que el cliente depende
 * de, y esa semántica es la que interesa:
 *
 *   1. `put` y `getAll` CLONAN. Si el doble devolviera la misma referencia,
 *      el test "mutar la fuente no cambia lo guardado" pasaría sin que
 *      clonado exista, que es exactamente el bug que no queremos.
 *   2. La transacción resuelve en `oncomplete`, y un `put` fallido ABORTA la
 *      transacción. Un doble que resolviera en `onsuccess` dejaría pasar la
 *      reimplementación que el comentario del cliente dice que no vale.
 *   3. `close()` cierra la CONEXIÓN, no la base: reabrir con el mismo
 *      `FakeFactory` devuelve una conexión nueva a los mismos datos. Es lo
 *      que hace el navegador, y es el escenario que la bóveda necesita
 *      (recargar la pestaña).
 */

/** Estado que sobrevive a `close()`: es el "disco". */
interface Backing {
  stores: Map<string, { keyPath: string; data: Map<string, unknown> }>;
  /**
   * Cuántos `put` VAN a fallar por cuota antes de dejar de fallar.
   * Un contador y no un "quota restante" porque lo que se simula es la
   * Baekpressure: la escritura grande falla, la pequeña cabe.
   */
  quotaFailures: number;
}

class FakeRequest<T> {
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
  /** Solo lo usan las peticiones de `open()`. */
  onupgradeneeded: (() => void) | null = null;
  result!: T;
  error: unknown = null;
}

class FakeTransaction {
  error: unknown = null;
  oncomplete: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  private queue: (() => void)[] = [];
  private state: 'active' | 'done' = 'active';

  constructor(
    private db: FakeDatabase,
    private storeName: string,
    readonly mode: string
  ) {}

  objectStore(name: string): FakeObjectStore {
    if (name !== this.storeName) {
      const err = new Error('store not found');
      err.name = 'NotFoundError';
      throw err;
    }
    return new FakeObjectStore(this.db, this, this.db.storeData(name));
  }

  abort(): void {
    const err = new Error('abortado');
    err.name = 'AbortError';
    this.fail(err);
  }

  push(fn: () => void): void {
    this.queue.push(fn);
  }

  run(): void {
    setTimeout(() => {
      for (const fn of this.queue) {
        if (this.state !== 'active') return;
        try {
          fn();
        } catch (err) {
          this.fail(err);
          return;
        }
      }
      if (this.state !== 'active') return;
      this.state = 'done';
      this.oncomplete?.();
    }, 0);
  }

  private fail(err: unknown): void {
    if (this.state !== 'active') return;
    this.state = 'done';
    this.error = err;
    // El navegador emite `error` y luego `abort`; el cliente se protege del
    // doble disparo y el doble también debe poder hacerlo.
    this.onerror?.();
    this.onabort?.();
  }
}

class FakeObjectStore {
  constructor(
    private db: FakeDatabase,
    private tx: FakeTransaction,
    private store: { keyPath: string; data: Map<string, unknown> }
  ) {}

  put(value: unknown): FakeRequest<string> {
    const request = new FakeRequest<string>();
    this.tx.push(() => {
      this.db.chargeQuota();
      const key = String((value as Record<string, unknown>)[this.store.keyPath]);
      // Clonado estructural: es lo que IndexedDB hace de verdad y lo que
      // permite que `ArrayBuffer` sobreviva sin serializar.
      this.store.data.set(key, structuredClone(value));
      request.result = key;
      request.onsuccess?.();
    });
    return request;
  }

  getAll(): FakeRequest<unknown[]> {
    const request = new FakeRequest<unknown[]>();
    this.tx.push(() => {
      request.result = structuredClone([...this.store.data.values()]);
      request.onsuccess?.();
    });
    return request;
  }

  delete(key: string): FakeRequest<void> {
    const request = new FakeRequest<void>();
    this.tx.push(() => {
      this.store.data.delete(key);
      request.onsuccess?.();
    });
    return request;
  }

  clear(): FakeRequest<void> {
    const request = new FakeRequest<void>();
    this.tx.push(() => {
      this.store.data.clear();
      request.onsuccess?.();
    });
    return request;
  }
}

export class FakeDatabase {
  readonly objectStoreNames = {
    contains: (name: string) => this.backing.stores.has(name)
  };

  private closed = false;

  constructor(private backing: Backing) {}

  storeData(name: string): { keyPath: string; data: Map<string, unknown> } {
    if (this.closed) {
      const err = new Error('conexión cerrada');
      err.name = 'InvalidStateError';
      throw err;
    }
    const store = this.backing.stores.get(name);
    if (!store) {
      const err = new Error('store not found');
      err.name = 'NotFoundError';
      throw err;
    }
    return store;
  }

  createObjectStore(name: string, options: { keyPath: string }): unknown {
    this.backing.stores.set(name, { keyPath: options.keyPath, data: new Map() });
    return {};
  }

  transaction(name: string, mode: string): FakeTransaction {
    // Valida que el store existe ANTES de crear la transacción, como el
    // navegador: un nombre de store inválido lanza, no devuelve una promesa
    // que se rechaza.
    this.storeData(name);
    const tx = new FakeTransaction(this, name, mode);
    // El cuerpo de la transacción se ejecuta de forma sincrónica, igual que
    // en el API real; las peticiones se resuelven después.
    queueMicrotask(() => tx.run());
    return tx;
  }

  close(): void {
    this.closed = true;
  }

  chargeQuota(): void {
    if (this.backing.quotaFailures <= 0) return;
    this.backing.quotaFailures -= 1;
    const err = new Error('sin cuota');
    err.name = 'QuotaExceededError';
    throw err;
  }

  /** Inyecta un registro sin pasar por `put`, para probar lecturas sucias. */
  injectRaw(storeName: string, key: string, value: unknown): void {
    this.backing.stores.get(storeName)!.data.set(key, value);
  }
}

export class FakeFactory {
  private backing: Backing = { stores: new Map(), quotaFailures: 0 };

  /** Conexión viva, para hablar con el "disco" desde el test. */
  get connection(): FakeDatabase {
    return this.last;
  }

  private last!: FakeDatabase;

  set quotaFailures(n: number) {
    this.backing.quotaFailures = n;
  }

  open(_name: string, _version?: number): FakeRequest<FakeDatabase> {
    const request = new FakeRequest<FakeDatabase>();
    setTimeout(() => {
      this.last = new FakeDatabase(this.backing);
      request.result = this.last;
      request.onupgradeneeded?.();
      request.onsuccess?.();
    }, 0);
    return request;
  }

  asFactory(): IDBFactory {
    return this as unknown as IDBFactory;
  }
}
