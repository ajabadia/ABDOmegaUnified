/**
 * Tests del cliente IndexedDB de la bóveda de sesión.
 *
 * Se prueba contra un doble en memoria (ver `fakeIndexedDb.ts`) porque
 * `fake-indexeddb` no es dependencia del proyecto y porque lo que importa no
 * es la API, es la SEMÁNTICA: clonado estructural, commit en `oncomplete` y
 * degradación por cuota.
 */
import {
  SESSION_VAULT_STORE,
  SessionVaultError,
  isSessionVaultAvailable,
  openSessionVaultStore
} from '../sessionVaultDb';
import { SESSION_VAULT_VERSION } from '../sessionVault';
import type { SessionVaultRecord } from '../sessionVault';
import { FakeFactory } from './fakeIndexedDb';

const bytes = (...values: number[]) => new Uint8Array(values).buffer;

function mkRecord(overrides: Partial<SessionVaultRecord> = {}): SessionVaultRecord {
  return {
    version: SESSION_VAULT_VERSION,
    documentId: 'd1',
    savedAt: 1,
    manifestHash: 'HASH',
    history: {
      past: [
        {
          id: 'e1',
          type: 'SNAPSHOT',
          label: 'cambio',
          timestamp: 1,
          correlationId: 'c',
          manifest: { id: 'm' } as never
        }
      ],
      future: [],
      lastSavedIndex: 0
    },
    extraResources: [{ name: 'kit.wav', data: bytes(1, 2, 3), type: 'audio/wav' }],
    lastStableHash: 'H1',
    ...overrides
  };
}

async function openWith(factory: FakeFactory) {
  return openSessionVaultStore({ factory: factory.asFactory(), dbName: 'test_vault' });
}

describe('openSessionVaultStore', () => {
  it('se niega si no hay IndexedDB en el entorno', async () => {
    // El entorno de test es `node`, sin IndexedDB. La bóveda tiene que
    // degradar, no reventar: perder el deshacer entre recargas es una
    // molestia, no abrir el editor es un incidente.
    expect(isSessionVaultAvailable()).toBe(false);
    await expect(openSessionVaultStore()).rejects.toBeInstanceOf(SessionVaultError);
    await expect(openSessionVaultStore()).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('crea el almacén en la primera apertura', async () => {
    const store = await openWith(new FakeFactory());
    expect(store).toBeDefined();
    store.close();
  });

  it('no escribe nada si no hay registros', async () => {
    const factory = new FakeFactory();
    const store = await openWith(factory);
    await store.putAll([]);
    expect((await store.getAll()).length).toBe(0);
    store.close();
  });
});

describe('round-trip', () => {
  it('conserva el historial y los ArrayBuffer de los recursos', async () => {
    const factory = new FakeFactory();
    const store = await openWith(factory);

    await store.putAll([mkRecord()]);
    const [read] = await store.getAll();

    expect(read.documentId).toBe('d1');
    expect(read.manifestHash).toBe('HASH');
    expect(read.history.past).toHaveLength(1);
    expect(read.history.past[0].label).toBe('cambio');
    // Esto es lo que `JSON.stringify` no podía hacer: el binario vuelve
    // siendo un ArrayBuffer, no `{}`.
    expect(read.extraResources[0].data).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(read.extraResources[0].data)).toEqual(new Uint8Array([1, 2, 3]));
    store.close();
  });

  it('CLONA al escribir: mutar la fuente no toca lo guardado', async () => {
    const factory = new FakeFactory();
    const store = await openWith(factory);
    const buffer = bytes(1, 2, 3);
    const record = mkRecord({ extraResources: [{ name: 'a.wav', data: buffer, type: 'audio/wav' }] });

    await store.putAll([record]);
    new Uint8Array(buffer)[0] = 99;

    const [read] = await store.getAll();
    expect(new Uint8Array(read.extraResources[0].data)).toEqual(new Uint8Array([1, 2, 3]));
    store.close();
  });

  it('CLONA al leer: mutar lo recibido no toca lo guardado', async () => {
    const factory = new FakeFactory();
    const store = await openWith(factory);
    await store.putAll([mkRecord()]);

    const [first] = await store.getAll();
    new Uint8Array(first.extraResources[0].data)[0] = 42;
    first.history.past.length = 0;

    const [second] = await store.getAll();
    expect(new Uint8Array(second.extraResources[0].data)[0]).toBe(1);
    expect(second.history.past).toHaveLength(1);
    store.close();
  });

  it('sobrescribe el registro del mismo documento', async () => {
    const factory = new FakeFactory();
    const store = await openWith(factory);

    await store.putAll([mkRecord({ manifestHash: 'viejo' })]);
    await store.putAll([mkRecord({ manifestHash: 'nuevo' })]);

    const all = await store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].manifestHash).toBe('nuevo');
    store.close();
  });

  it('borra los documentos indicados', async () => {
    const factory = new FakeFactory();
    const store = await openWith(factory);
    await store.putAll([mkRecord(), mkRecord({ documentId: 'd2' })]);

    await store.delete(['d1']);
    await store.delete([]);

    const all = await store.getAll();
    expect(all.map((r) => r.documentId)).toEqual(['d2']);
    store.close();
  });

  it('descarta registros ilegibles al leer en vez de fallar', async () => {
    const factory = new FakeFactory();
    const store = await openWith(factory);
    await store.putAll([mkRecord()]);
    // Simula un registro de una versión anterior o manipulado a mano.
    factory.connection.injectRaw(SESSION_VAULT_STORE, 'basura', { version: 999, documentId: 'x' });

    const all = await store.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].documentId).toBe('d1');
    store.close();
  });
});

describe('cuota agotada', () => {
  it('reintenta sin historial antes de rendirse', async () => {
    const factory = new FakeFactory();
    const store = await openWith(factory);
    // Falla solo el primer `put` (la pila completa) y deja pasar el segundo
    // (el reintento sin historial). Es el caso real: lo que no cabe es la
    // pila, no los assets.
    factory.quotaFailures = 1;

    await store.putAll([mkRecord()]);

    const [read] = await store.getAll();
    expect(read.history.past).toHaveLength(0);
    // Los assets sobreviven: son el contenido del proyecto.
    expect(read.extraResources).toHaveLength(1);
    store.close();
  });

  it('falla cuando no hay historial que sacrificar', async () => {
    const factory = new FakeFactory();
    const store = await openWith(factory);
    // Ahora fallan los DOS intentos: el reintento no puede ayudar.
    factory.quotaFailures = 2;

    const vacio = mkRecord({ history: { past: [], future: [], lastSavedIndex: -1 } });
    await expect(store.putAll([vacio])).rejects.toMatchObject({ kind: 'quota' });
    store.close();
  });
});

describe('ciclo de vida', () => {
  it('los datos sobreviven a cerrar y reabrir (o sea: a recargar)', async () => {
    const factory = new FakeFactory();

    const primera = await openWith(factory);
    await primera.putAll([mkRecord()]);
    primera.close();

    // La pestaña se recarga: nueva conexión, mismos datos en disco. Esto es
    // exactamente el escenario que motiva la funcionalidad.
    const segunda = await openWith(factory);
    const all = await segunda.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].history.past[0].label).toBe('cambio');
    segunda.close();
  });

  it('deja de aceptar escrituras tras cerrar', async () => {
    const factory = new FakeFactory();
    const store = await openWith(factory);
    store.close();
    await expect(store.putAll([mkRecord()])).rejects.toBeInstanceOf(SessionVaultError);
  });

  it('clear() vacía el almacén', async () => {
    const factory = new FakeFactory();
    const store = await openWith(factory);
    await store.putAll([mkRecord(), mkRecord({ documentId: 'd2' })]);
    await store.clear();
    expect(await store.getAll()).toHaveLength(0);
    store.close();
  });
});
