/**
 * @jest-environment jsdom
 *
 * Test de INTEGRACIÓN de la persistencia de sesión con la bóveda.
 *
 * Los tests de `sessionVault.spec.ts` prueban la lógica y los de
 * `sessionVaultDb.spec.ts` la API, pero ninguno de los dos toca el cableado:
 * que el hook lea la bóveda, espere a la apertura, calcule los hashes en el
 * orden correcto y despache la hidratación. Ese orden es donde se decide si
 * la función sirve de algo, y es exactamente lo que un test unitario no
 * puede equivocar.
 *
 * El escenario que se reproduce es el del usuario: editar, recargar, deshacer.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { render, renderHook, act } from '@testing-library/react';
import { useReducer, createElement } from 'react';
import { useSessionPersistence } from '../useSessionPersistence';
import { orchestratorReducer, initialOrchestratorState } from '../orchestratorReducer';
import { initializeServiceContainer, resetServiceContainer } from '@/services/serviceInit';
import { IntegrityService } from '@/services/integrityService';
import { normalizeManifest } from '../../../constants/defaults';
import { STORAGE_KEYS } from '../../../constants/storage';
import { SESSION_VAULT_VERSION, buildSessionVaultRecord } from '../../../utils/sessionVault';
import { openSessionVaultStore } from '../../../utils/sessionVaultDb';
import { countUnsavedChanges } from '../../../utils/historySavePoint';
import { FakeFactory } from '../../../utils/__tests__/fakeIndexedDb';
import {
  getSessionRestoreNotice,
  resetSessionRestoreNoticeStore,
  getSessionRecoveryNotice,
  resetSessionRecoveryNoticeStore
} from '../../useSessionRestoreNotice';
import type { DocumentState, OrchestratorState } from '../../../types/document';

const manifest = { id: 'm', metadata: { name: 'M', version: '1.0.0' } } as never;

function mkDoc(overrides: Partial<DocumentState> = {}): DocumentState {
  return {
    id: 'primary',
    manifest,
    contract: null,
    wasmBuffer: null,
    extraResources: [],
    isDirty: false,
    lastStableHash: 'H1',
    isInitializing: false,
    history: { past: [], future: [], lastSavedIndex: -1 },
    ...overrides
  };
}

function mkState(doc: DocumentState): OrchestratorState {
  return { documentsById: { [doc.id]: doc }, activeDocumentId: doc.id };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Espera a que el hook despache la hidratación (es una promesa encadenada). */
async function waitForHydrate(dispatch: jest.Mock, timeoutMs = 3000): Promise<OrchestratorState> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const call = dispatch.mock.calls.find(
      (c) => (c[0] as { type?: string })?.type === 'HYDRATE_SESSION'
    );
    if (call) return (call[0] as { state: OrchestratorState }).state;
    await sleep(10);
  }
  throw new Error('HYDRATE_SESSION no llegó');
}

let factory: FakeFactory;

beforeEach(() => {
  initializeServiceContainer();
  factory = new FakeFactory();
  // jsdom no implementa IndexedDB; se le da el doble en memoria.
  Object.defineProperty(globalThis, 'indexedDB', {
    value: factory.asFactory(),
    configurable: true,
    writable: true
  });
  localStorage.clear();
  resetSessionRestoreNoticeStore();
  resetSessionRecoveryNoticeStore();
});

afterEach(() => {
  resetServiceContainer();
});

describe('useSessionPersistence + bóveda de sesión', () => {
  it('escribe historial y recursos en IndexedDB tras el debounce', async () => {
    const doc = mkDoc({
      extraResources: [{ name: 'kit.wav', data: new Uint8Array([1, 2, 3]).buffer, type: 'audio/wav' }],
      history: {
        past: [
          { id: 'e1', type: 'SNAPSHOT', label: 'crear nodo', timestamp: 1, correlationId: 'c', manifest }
        ],
        future: [],
        lastSavedIndex: 0
      }
    });
    const dispatch = jest.fn();

    renderHook(() => useSessionPersistence(mkState(doc), dispatch as never));

    // Antes del debounce no se ha escrito nada: una ráfaga de ediciones no
    // debe escribir una pila por pulsación.
    await sleep(200);
    const store = await openSessionVaultStore({ factory: factory.asFactory(), dbName: 'omega_session_vault' });
    expect(await store.getAll()).toHaveLength(0);

    await act(async () => {
      await sleep(1200);
    });

    const records = await store.getAll();
    expect(records).toHaveLength(1);
    expect(records[0].history.past).toHaveLength(1);
    expect(records[0].history.past[0].label).toBe('crear nodo');
    // Ojo con `toBeInstanceOf(ArrayBuffer)`: el polyfill de `structuredClone`
    // de `jest.setup.js` (v8 serialize/deserialize) devuelve un ArrayBuffer
    // del reino de Node, no del contexto jsdom, y `instanceof` da false con
    // el mensaje "Expected constructor: ArrayBuffer / Received constructor:
    // ArrayBuffer". El tag es el que no cruza reino, y es el mismo que usa
    // `isBinaryData` en producción.
    expect(Object.prototype.toString.call(records[0].extraResources[0].data)).toBe('[object ArrayBuffer]');
    expect(new Uint8Array(records[0].extraResources[0].data)).toEqual(new Uint8Array([1, 2, 3]));
    expect(records[0].version).toBe(SESSION_VAULT_VERSION);
    store.close();
  });

  it('tras recargar, rehidrata el historial y CONSERVA el punto de guardado', async () => {
    // Sesión en localStorage (sin historial: el replacer lo descarta).
    const stored = mkState(mkDoc({ isDirty: true, isInitializing: false }));
    localStorage.setItem(STORAGE_KEYS.SESSION_DOCS, JSON.stringify(stored));

    // Bóveda con la pila que la sesión anterior escribió.
    const hash = await IntegrityService.generateManifestHash(normalizeManifest(manifest));
    const store = await openSessionVaultStore({ factory: factory.asFactory(), dbName: 'omega_session_vault' });
    await store.putAll([
      buildSessionVaultRecord(
        mkDoc({
          history: {
            past: [
              { id: 'e1', type: 'SNAPSHOT', label: 'uno', timestamp: 1, correlationId: 'c', manifest },
              { id: 'e2', type: 'SNAPSHOT', label: 'dos', timestamp: 2, correlationId: 'c', manifest },
              { id: 'e3', type: 'SNAPSHOT', label: 'tres', timestamp: 3, correlationId: 'c', manifest }
            ],
            future: [],
            lastSavedIndex: 1
          }
        }),
        hash
      )
    ]);
    store.close();

    const dispatch = jest.fn();
    renderHook(() => useSessionPersistence(mkState(mkDoc()), dispatch as never));

    const state = await waitForHydrate(dispatch);
    const doc = state.documentsById.primary;

    expect(doc.history.past.map((e) => e.label)).toEqual(['uno', 'dos', 'tres']);
    expect(doc.history.lastSavedIndex).toBe(1);
    // El número que ve el usuario en la línea de tiempo es el mismo antes y
    // después de recargar. Si esto salta a 0, el watcher hizo CAPTURE_HASH y
    // el punto de guardado se perdió por el camino.
    expect(countUnsavedChanges(doc.history)).toBe(2);
    // Y el documento NO se queda en `isInitializing`, que es lo que
    // dispararía ese CAPTURE_HASH.
    expect(doc.isInitializing).toBe(false);
  });

  it('no adjunta la pila si el manifiesto ya no es el mismo', async () => {
    const stored = mkState(mkDoc());
    localStorage.setItem(STORAGE_KEYS.SESSION_DOCS, JSON.stringify(stored));

    const store = await openSessionVaultStore({ factory: factory.asFactory(), dbName: 'omega_session_vault' });
    await store.putAll([
      buildSessionVaultRecord(
        mkDoc({
          history: {
            past: [
              { id: 'e1', type: 'SNAPSHOT', label: 'viejo', timestamp: 1, correlationId: 'c', manifest }
            ],
            future: [],
            lastSavedIndex: -1
          }
        }),
        'HASH-DE-OTRA-SESION'
      )
    ]);
    store.close();

    const dispatch = jest.fn();
    renderHook(() => useSessionPersistence(mkState(mkDoc()), dispatch as never));

    const state = await waitForHydrate(dispatch);
    // Sin pila pegada, pero el documento sí se rehidrata (el manifiesto manda).
    expect(state.documentsById.primary.history.past).toHaveLength(0);
    expect(state.documentsById.primary.manifest.id).toBe('m');
    expect(state.documentsById.primary.manifest.metadata.name).toBe('M');
  });

  it('anota la profundidad del historial en el payload', async () => {
    const doc = mkDoc({
      history: {
        past: [
          { id: 'e1', type: 'SNAPSHOT', label: 'a', timestamp: 1, correlationId: 'c', manifest },
          { id: 'e2', type: 'SNAPSHOT', label: 'b', timestamp: 2, correlationId: 'c', manifest }
        ],
        future: [],
        lastSavedIndex: 0
      }
    });

    renderHook(() => useSessionPersistence(mkState(doc), jest.fn() as never));
    await act(async () => {
      await sleep(200);
    });

    // Un número por documento, no la pila. Es lo que permite que la próxima
    // carga distinga "nunca editado" de "editado y la recarga lo tiró".
    const payload = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION_DOCS)!);
    expect(payload.historyDepthById).toEqual({ primary: 2 });
    expect(JSON.stringify(payload)).not.toContain('"a"');
  });

  it('publica aviso cuando la recarga descartó una pila que sí existía', async () => {
    // Sesión que dice "había 5 pasos" y bóveda vacía: se perdieron.
    localStorage.setItem(
      STORAGE_KEYS.SESSION_DOCS,
      JSON.stringify({ ...mkState(mkDoc()), historyDepthById: { primary: 5 } })
    );

    const dispatch = jest.fn();
    renderHook(() => useSessionPersistence(mkState(mkDoc()), dispatch as never));
    await waitForHydrate(dispatch);

    const notice = getSessionRestoreNotice();
    expect(notice).not.toBeNull();
    expect(notice!.reason).toBe('vault-missing');
    expect(notice!.lostSteps).toBe(5);
  });

  it('no publica aviso si la bóveda devolvió la pila', async () => {
    const hash = await IntegrityService.generateManifestHash(normalizeManifest(manifest));
    const store = await openSessionVaultStore({ factory: factory.asFactory(), dbName: 'omega_session_vault' });
    await store.putAll([
      buildSessionVaultRecord(
        mkDoc({
          history: {
            past: [{ id: 'e1', type: 'SNAPSHOT', label: 'uno', timestamp: 1, correlationId: 'c', manifest }],
            future: [],
            lastSavedIndex: 0
          }
        }),
        hash
      )
    ]);
    store.close();

    localStorage.setItem(
      STORAGE_KEYS.SESSION_DOCS,
      JSON.stringify({ ...mkState(mkDoc()), historyDepthById: { primary: 5 } })
    );

    const dispatch = jest.fn();
    renderHook(() => useSessionPersistence(mkState(mkDoc()), dispatch as never));
    await waitForHydrate(dispatch);

    // Si esto avisa, el usuario ve "historial descartado" sobre un documento
    // que sí tiene historial: el peor fallo posible de este aviso.
    expect(getSessionRestoreNotice()).toBeNull();
  });

  it('no publica aviso en una sesión que nunca se editó', async () => {
    localStorage.setItem(STORAGE_KEYS.SESSION_DOCS, JSON.stringify(mkState(mkDoc())));

    const dispatch = jest.fn();
    renderHook(() => useSessionPersistence(mkState(mkDoc()), dispatch as never));
    await waitForHydrate(dispatch);

    expect(getSessionRestoreNotice()).toBeNull();
  });

  it('avisa de la causa correcta cuando el registro era de otra versión', async () => {
    const store = await openSessionVaultStore({ factory: factory.asFactory(), dbName: 'omega_session_vault' });
    await store.putAll([
      buildSessionVaultRecord(
        mkDoc({
          history: {
            past: [
              { id: 'e1', type: 'SNAPSHOT', label: 'viejo', timestamp: 1, correlationId: 'c', manifest },
              { id: 'e2', type: 'SNAPSHOT', label: 'viejo2', timestamp: 2, correlationId: 'c', manifest }
            ],
            future: [],
            lastSavedIndex: 0
          }
        }),
        'HASH-DE-OTRA-SESION'
      )
    ]);
    store.close();

    localStorage.setItem(
      STORAGE_KEYS.SESSION_DOCS,
      JSON.stringify({ ...mkState(mkDoc()), historyDepthById: { primary: 1 } })
    );

    const dispatch = jest.fn();
    renderHook(() => useSessionPersistence(mkState(mkDoc()), dispatch as never));
    await waitForHydrate(dispatch);

    const notice = getSessionRestoreNotice();
    expect(notice!.reason).toBe('vault-stale');
    // El número es el de la pila DESCARTADA (2), no el de la sesión (1).
    expect(notice!.lostSteps).toBe(2);
  });

  it('sobrevive a que IndexedDB no exista', async () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      value: undefined,
      configurable: true,
      writable: true
    });
    localStorage.setItem(STORAGE_KEYS.SESSION_DOCS, JSON.stringify(mkState(mkDoc())));

    const dispatch = jest.fn();
    renderHook(() => useSessionPersistence(mkState(mkDoc()), dispatch as never));

    // La sesión de localStorage se rehidrata igual: la bóveda es un extra.
    const state = await waitForHydrate(dispatch);
    expect(state.documentsById.primary).toBeDefined();
  });
});

describe('useSessionPersistence — resurrección de una sesión perdida', () => {
  /**
   * Escribe en la bóveda los registros de una sesión que `localStorage` ya no
   * sabe Listar, y deja el payload roto que dejaba el bug.
   */
  async function sembrarSesionPerdida(records: ReturnType<typeof buildSessionVaultRecord>[]) {
    const store = await openSessionVaultStore({
      factory: factory.asFactory(),
      dbName: 'omega_session_vault'
    });
    await store.putAll(records);
    store.close();
    localStorage.setItem(
      STORAGE_KEYS.SESSION_DOCS,
      JSON.stringify({ documentsById: {}, activeDocumentId: 'primary', historyDepthById: {} })
    );
  }

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEYS.SESSION_MIGRATIONS);
  });

  it('resucita el documento desde el manifiesto guardado en la bóveda', async () => {
    const doc = mkDoc({ id: 'vco', manifest: { id: 'vco', metadata: { name: 'VcoTwo' } } as never });
    await sembrarSesionPerdida([buildSessionVaultRecord(doc, 'H1')]);

    const dispatch = jest.fn();
    renderHook(() => useSessionPersistence(mkState(mkDoc()), dispatch as never));

    const state = await waitForHydrate(dispatch);
    expect(state.documentsById['vco']).toBeDefined();
    expect(state.documentsById['vco'].manifest.metadata?.name).toBe('VcoTwo');
    // Y el activo existe: el invariante del orquestador sigue valiendo.
    expect(state.documentsById[state.activeDocumentId]).toBeDefined();
  });

  it('el documento resucitado GANA al documento por defecto de la migración', async () => {
    // La migración escribe un `primary` en blanco para que el editor arranque.
    // Ese en blanco no puede ganarle a lo que el usuario tenía abierto.
    const doc = mkDoc({ id: 'vco', manifest: { id: 'vco', metadata: { name: 'VcoTwo' } } as never });
    await sembrarSesionPerdida([buildSessionVaultRecord(doc, 'H1')]);

    const dispatch = jest.fn();
    renderHook(() => useSessionPersistence(mkState(mkDoc()), dispatch as never));

    const state = await waitForHydrate(dispatch);
    expect(Object.keys(state.documentsById)).toEqual(['vco']);
    expect(state.activeDocumentId).toBe('vco');
  });

  it('publica el aviso de resurrección nombrando lo recuperado', async () => {
    const doc = mkDoc({ id: 'vco', manifest: { id: 'vco', metadata: { name: 'VcoTwo' } } as never });
    await sembrarSesionPerdida([buildSessionVaultRecord(doc, 'H1')]);

    const dispatch = jest.fn();
    renderHook(() => useSessionPersistence(mkState(mkDoc()), dispatch as never));
    await waitForHydrate(dispatch);

    const notice = getSessionRecoveryNotice();
    expect(notice?.recoveredIds).toEqual(['vco']);
    expect(notice?.documentNames).toEqual(['VcoTwo']);
  });

  it('sin nada en la bóveda, arranca limpio y NO dice que recuperó nada', async () => {
    // El peor caso: sesión perdida y bóveda vacía. Lo único honesto es un
    // módulo en blanco decirlo, no fingir una recuperación.
    localStorage.setItem(
      STORAGE_KEYS.SESSION_DOCS,
      JSON.stringify({ documentsById: {}, activeDocumentId: 'primary', historyDepthById: {} })
    );

    const dispatch = jest.fn();
    renderHook(() => useSessionPersistence(mkState(mkDoc()), dispatch as never));
    const state = await waitForHydrate(dispatch);

    expect(state.documentsById[state.activeDocumentId]).toBeDefined();
    // La migración dejó un documento válido, así que el editor abre.
    expect(Object.keys(state.documentsById).length).toBeGreaterThan(0);
    const notice = getSessionRecoveryNotice();
    expect(notice === null || notice.recoveredIds.length === 0).toBe(true);
  });

  it('un registro v1 NO se resucita, y el aviso lo reconoce', async () => {
    // Un v1 no sabe qué documento era. Pegar su historial a algo parecido
    // sería inventar un Ctrl+Z que lleva a un estado que nunca existió.
    const store = await openSessionVaultStore({
      factory: factory.asFactory(),
      dbName: 'omega_session_vault'
    });
    const v1 = { ...buildSessionVaultRecord(mkDoc({ id: 'vco' }), 'H1'), version: 1, manifest: undefined };
    await store.putAll([v1 as never]);
    store.close();
    localStorage.setItem(
      STORAGE_KEYS.SESSION_DOCS,
      JSON.stringify({ documentsById: {}, activeDocumentId: 'primary', historyDepthById: {} })
    );

    const dispatch = jest.fn();
    renderHook(() => useSessionPersistence(mkState(mkDoc()), dispatch as never));
    const state = await waitForHydrate(dispatch);

    expect(state.documentsById['vco']).toBeUndefined();
    const notice = getSessionRecoveryNotice();
    expect(notice?.unrecoverableIds).toEqual(['vco']);
  });

  it('la sesión resucitada se vuelve a persistir con sus documentos', async () => {
    // Si no, la próxima recarga perdería otra vez lo que acabamos de
    // recuperar: el editor abriría en blanco y avisaría otra vez.
    //
    // Este test monta el reducer DE VERDAD a propósito. Con un `dispatch`
    // falso, el estado que el hook persiste es el que se le pasa por props y
    // nunca cambia, así que escribiría `primary` pase lo que pase y el test
    // probaría el doble, no el cableado. Con el reducer real, la hidratación
    // se aplica y el guardado ve lo mismo que verá el editor.
    const doc = mkDoc({ id: 'vco', manifest: { id: 'vco', metadata: { name: 'VcoTwo' } } as never });
    await sembrarSesionPerdida([buildSessionVaultRecord(doc, 'H1')]);

    function Montado() {
      const [state, dispatch] = useReducer(orchestratorReducer, initialOrchestratorState);
      useSessionPersistence(state, dispatch);
      return null;
    }

    await act(async () => {
      render(createElement(Montado));
      await sleep(600);
    });
    await act(async () => {
      await sleep(100);
    });

    const guardado = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION_DOCS) ?? '{}');
    expect(Object.keys(guardado.documentsById ?? {})).toEqual(['vco']);
  });
});

describe('useSessionPersistence — el guardado no pisa la sesión sin leer', () => {
  /**
   * Espía `setItem` para ver QUÉ se escribe y EN QUÉ ORDEN, no solo el estado
   * final. Es lo que distingue "el guardado espera a la rehidratación" de
   * "el guardado pisa y luego corrige": las dos dejan el mismo valor al
   * final, y solo el orden delata la que se pierde si la pestaña se cierra a
   * mitad de la carga.
   *
   * Se espía el PROTOTIPO porque el `localStorage` de jsdom es un Proxy y no
   * admite `defineProperty` por instancia.
   */
  function espiarEscrituras() {
    const escritos: string[] = [];
    const original = Storage.prototype.setItem;
    const espia = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, k: string, v: string) {
        if (k === STORAGE_KEYS.SESSION_DOCS) escritos.push(v);
        original.call(this, k, v);
      });
    return { escritos, restaurar: () => espia.mockRestore() };
  }

  /**
   * Monta el reducer DE VERDAD. Con un `dispatch` falso no hay re-render, y el
   * guardado —que depende de `state.documentsById`— no volvería a dispararse
   * nunca: se mediría un hook que no escribe, no el que escribe el editor.
   */
  function montarEditorReal() {
    function Editor() {
      const [state, dispatch] = useReducer(orchestratorReducer, initialOrchestratorState);
      useSessionPersistence(state, dispatch);
      return null;
    }
    return render(createElement(Editor));
  }

  it('lo PRIMERO que se escribe es la sesión del usuario, no la de fábrica', async () => {
    // El fallo que previene: el guardado dispara en el montaje y escribe el
    // `primary` de fábrica encima de la sesión real. Si el usuario cierra la
    // pestaña en esa ventana, la sesión desaparece sin dejar rastro. Con el
    // guard, la primera escritura ya es la sesión rehidratada.
    const miSesion = mkState(
      mkDoc({ id: 'vco', manifest: { id: 'vco', metadata: { name: 'Mio' } } as never })
    );
    localStorage.setItem(STORAGE_KEYS.SESSION_DOCS, JSON.stringify(miSesion));

    const espia = espiarEscrituras();
    try {
      await act(async () => {
        montarEditorReal();
        await sleep(600);
      });
      await act(async () => {
        await sleep(100);
      });

      expect(espia.escritos.length).toBeGreaterThan(0);
      // La clave: la primera escritura NO es la de fábrica.
      expect(espia.escritos[0]).toContain('Mio');
    } finally {
      espia.restaurar();
    }
  });

  it('mientras no se ha rehidratado, no se escribe NADA', async () => {
    // Formulación directa del guard: hasta que hay un documento en el estado,
    // el guardado calla.
    localStorage.setItem(STORAGE_KEYS.SESSION_DOCS, JSON.stringify(mkState(mkDoc())));

    const espia = espiarEscrituras();
    try {
      await act(async () => {
        montarEditorReal();
        await sleep(600);
      });
      await act(async () => {
        await sleep(100);
      });

      expect(espia.escritos.length).toBeGreaterThan(0);
      // Y ninguna de las escrituras es el documento de fábrica: todas son
      // posteriores a la rehidratación.
      for (const escrito of espia.escritos) {
        expect(escrito).toContain('M');
      }
    } finally {
      espia.restaurar();
    }
  });

  it('el volcado de la bóveda NUNCA se adelanta a la rehidratación', async () => {
    // Si se adelantara, su limpieza de registros huérfanos borraría todos los
    // documentos que no estén en el estado de fábrica —incluidos los que
    // hacen falta para resucitar una sesión perdida.
    const doc = mkDoc({ id: 'vco', manifest: { id: 'vco', metadata: { name: 'Mio' } } as never });
    const store = await openSessionVaultStore({ factory: factory.asFactory(), dbName: 'omega_session_vault' });
    await store.putAll([buildSessionVaultRecord(doc, 'H1')]);
    store.close();
    localStorage.setItem(
      STORAGE_KEYS.SESSION_DOCS,
      JSON.stringify({ documentsById: {}, activeDocumentId: 'primary', historyDepthById: {} })
    );

    await act(async () => {
      montarEditorReal();
      await sleep(700);
    });

    // El registro del documento recuperado sigue ahí: el volcado lo reescribió
    // con su contenido, no lo borró por considerarlo huérfano.
    const despues = await openSessionVaultStore({
      factory: factory.asFactory(),
      dbName: 'omega_session_vault'
    });
    const records = await despues.getAll();
    expect(records.map((r) => r.documentId)).toContain('vco');
    despues.close();
  });

  it('tras rehidratar, el guardado vuelve a funcionar con normalidad', async () => {
    // El guard no puede convertirse en "no guardar nunca": si lo fuera, la
    // segunda carga de la sesión no existiría y el editor perdería el trabajo
    // en CADA recarga.
    localStorage.setItem(STORAGE_KEYS.SESSION_DOCS, JSON.stringify(mkState(mkDoc())));

    await act(async () => {
      montarEditorReal();
      await sleep(600);
    });
    await act(async () => {
      await sleep(100);
    });

    const guardado = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION_DOCS) ?? '{}');
    expect(guardado.documentsById).toBeDefined();
    expect(guardado.activeDocumentId).toBeDefined();
  });
});
