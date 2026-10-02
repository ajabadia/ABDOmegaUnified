/**
 * @jest-environment jsdom
 *
 * END-TO-END de la recuperacion de una sesion perdida.
 *
 * Los tests de `sessionMigrations.test.ts` comprueban la logica con un
 * almacen en memoria, y los de `useSessionPersistence.spec.ts` el cableado
 * con un `dispatch` falso. Ninguno de los dos cierra el circulo entero, que
 * es lo que importa aqui: que un `localStorage` ROTO en disco acabe
 * rehidratado en el estado del orquestador, con la franja visible y el
 * payload de vuelta a ser utilizable.
 *
 * QUE ES "END-TO-END" AQUI Y QUE NO
 *
 * Entra de verdad: `localStorage` de jsdom, el reducer real, la migracion,
 * la boveda (con el doble en memoria, porque jsdom no trae IndexedDB), el
 * store de avisos y el componente de la franja.
 *
 * NO entra: `WorkbenchContainer` entero. Montarlo arrastra el arbol completo
 * del editor (providers, modales, docks, la bóveda de recursos) y este test
 * pasaria a medir el montaje del editor en lugar de la recuperacion de la
 * sesion. El harness replica exactamente el tramo que decide: reducer +
 * `useSessionPersistence` + `SessionRestoreNotice`, que es lo que monta
 * `WorkbenchContainer` para este proposito.
 *
 * Que sea una copia del cableado es justo lo que hay que vigilar, asi que el
 * harness usa el `useSessionPersistence` REAL y el `orchestratorReducer` REAL,
 * no imitaciones. Si alguien cambia la forma de conectarlos en el
 * contenedor, este test seguira verde y habra que moverlo: es el limite
 * conscious de la prueba, no un descuido.
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { useReducer } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useSessionPersistence } from '../useSessionPersistence';
import { orchestratorReducer, initialOrchestratorState } from '../orchestratorReducer';
import SessionRestoreNotice from '@/features/manifest-editor/components/layout/SessionRestoreNotice';
import { initializeServiceContainer, resetServiceContainer } from '@/services/serviceInit';
import { STORAGE_KEYS } from '../../../constants/storage';
import { SESSION_VAULT_VERSION, buildSessionVaultRecord } from '../../../utils/sessionVault';
import { openSessionVaultStore } from '../../../utils/sessionVaultDb';
import { FakeFactory } from '../../../utils/__tests__/fakeIndexedDb';
import { resetSessionRestoreNoticeStore, resetSessionRecoveryNoticeStore } from '../../useSessionRestoreNotice';
import type { DocumentState, OrchestratorState } from '../../../types/document';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

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

/** El payload roto que dejaba `CLOSE_DOCUMENT` antes del guard. */
function sembrarSesionRota() {
  localStorage.setItem(
    STORAGE_KEYS.SESSION_DOCS,
    JSON.stringify({ documentsById: {}, activeDocumentId: 'primary', historyDepthById: {} })
  );
}

async function sembrarBoveda(records: ReturnType<typeof buildSessionVaultRecord>[]) {
  const store = await openSessionVaultStore({ factory: factory.asFactory(), dbName: 'omega_session_vault' });
  await store.putAll(records);
  store.close();
}

/**
 * El editor con la sesion. `useSessionPersistence` publishes en un store
 * externo y `SessionRestoreNotice` lo lee: por eso el banner aparece sin que
 * nadie le pase props.
 */
function Editor() {
  const [state, dispatch] = useReducer(orchestratorReducer, initialOrchestratorState);
  useSessionPersistence(state, dispatch);
  return <SessionRestoreNotice />;
}

let factory: FakeFactory;

/** Estado que acaba en el orquestador, leído de lo que se ha rehidratado. */
function leerPayload() {
  const raw = localStorage.getItem(STORAGE_KEYS.SESSION_DOCS);
  return raw === null ? null : (JSON.parse(raw) as OrchestratorState & { historyDepthById?: Record<string, number> });
}

/**
 * Espera a que el payload refleje lo rehidratado.
 *
 * Hace falta porque la escritura NO es síncrona con la hidratación: hay un
 * re-render, y el guardado cuelga de `state.documentsById`. Un `sleep` fijo
 * mide lo que dé la gana y da falsos verdes: la primera versión de este test
 * leía a los 700 ms y veía el documento de fábrica, cuando un poco más tarde
 * ya estaba el bueno.
 */
async function esperarPayload(que: (payload: NonNullable<ReturnType<typeof leerPayload>>) => boolean) {
  await waitFor(() => {
    const payload = leerPayload();
    if (payload === null) throw new Error('aun no hay payload');
    if (!que(payload)) throw new Error(`payload aun no cumple: ${Object.keys(payload.documentsById).join(',')}`);
  });
}

beforeEach(() => {
  initializeServiceContainer();
  factory = new FakeFactory();
  // jsdom no implementa IndexedDB; se le da el doble en memoria, que clona
  // de verdad igual que haria el navegador.
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

describe('SESIÓN PERDIDA — extremo a extremo', () => {
  it('con la bóveda intacta, recupera el documento y lo dice', async () => {
    const doc = mkDoc({ id: 'vco', manifest: { id: 'vco', metadata: { name: 'VcoTwo' } } as never });
    await sembrarBoveda([buildSessionVaultRecord(doc, 'H1')]);
    sembrarSesionRota();

    await act(async () => {
      render(<Editor />);
      await sleep(700);
    });

    // 1. LA FRANJA. Es lo que el usuario ve, y lo único que no se puede
    //    deducir del payload: que su sesión estaba rota.
    const banner = await screen.findByTestId('session-recovery-notice');
    expect(banner.getAttribute('role')).toBe('alert');
    expect(banner.textContent).toContain('Previous session recovered');
    expect(banner.textContent).toContain('VcoTwo');
    expect(banner.getAttribute('data-recovered')).toBe('1');

    // 2. EL PAYLOAD. Reparado de verdad: con documentos, y con un documento
    //    activo que existe de verdad entre ellos.
    await esperarPayload((p) => Object.keys(p.documentsById).includes('vco'));
    const payload = leerPayload();
    const ids = Object.keys(payload?.documentsById ?? {});
    expect(ids.length).toBeGreaterThan(0);
    expect(payload?.documentsById[payload?.activeDocumentId ?? '?']).toBeDefined();
  });

  it('el documento recuperado es el que queda activo y en el payload', async () => {
    // Y no un `primary` de fábrica al lado: la recuperación tiene que GANAR
    // al documento por defecto que escribe la migración.
    const doc = mkDoc({ id: 'vco', manifest: { id: 'vco', metadata: { name: 'VcoTwo' } } as never });
    await sembrarBoveda([buildSessionVaultRecord(doc, 'H1')]);
    sembrarSesionRota();

    await act(async () => {
      render(<Editor />);
      await sleep(700);
    });

    await esperarPayload((p) => Object.keys(p.documentsById).includes('vco'));
    const payload = leerPayload();
    expect(Object.keys(payload?.documentsById ?? {})).toEqual(['vco']);
    expect(payload?.activeDocumentId).toBe('vco');
  });

  it('con la bóveda VACÍA, avisa de que no se recuperó nada', async () => {
    // El peor caso, y el que mas obliga a decir la verdad: el usuario
    // abriría un módulo en blanco creyendo que es el suyo.
    sembrarSesionRota();

    await act(async () => {
      render(<Editor />);
      await sleep(700);
    });

    const banner = await screen.findByTestId('session-recovery-notice');
    expect(banner.textContent).toContain('could not be recovered');
    expect(banner.textContent).toContain('blank module');
    expect(banner.getAttribute('data-recovered')).toBe('0');

    // Aun así, el payload queda utilizable: el editor tiene que abrir.
    await esperarPayload((p) => Object.keys(p.documentsById).length > 0);
    const payload = leerPayload();
    expect(Object.keys(payload?.documentsById ?? {}).length).toBeGreaterThan(0);
    expect(payload?.documentsById[payload?.activeDocumentId ?? '?']).toBeDefined();
  });

  it('con un registro v1, avisa de lo que no se pudo recuperar', async () => {
    // Un v1 sabe que hubo un documento pero no qué era. Recuperarlo a ojo
    // sería inventar un Ctrl+Z; callarse sería dejar al usuario sin saber
    // que perdió algo.
    const store = await openSessionVaultStore({ factory: factory.asFactory(), dbName: 'omega_session_vault' });
    const v1 = {
      ...buildSessionVaultRecord(mkDoc({ id: 'fantasma' }), 'H1'),
      version: 1,
      manifest: undefined
    };
    await store.putAll([v1 as never]);
    store.close();
    sembrarSesionRota();

    await act(async () => {
      render(<Editor />);
      await sleep(700);
    });

    const banner = await screen.findByTestId('session-recovery-notice');
    expect(banner.getAttribute('data-recovered')).toBe('0');
    expect(banner.getAttribute('data-unrecoverable')).toBe('1');
    expect(banner.textContent).toContain('unrecoverable');
    // Y el documento fantasma NO aparece: no se inventa.
    await esperarPayload((p) => Object.keys(p.documentsById).length > 0);
    const payload = leerPayload();
    expect(Object.keys(payload?.documentsById ?? {})).not.toContain('fantasma');
  });

  it('tras la reparación, recargar ya NO muestra la franja', async () => {
    // La prueba de que la sesión quedó SANADA y no solo avisada. Si el
    // payload siguiera roto, la siguiente carga volvería a perderlo y a
    // avisar otra vez: el usuario no podría confiar en que su sesión está a
    // salvo.
    const doc = mkDoc({ id: 'vco', manifest: { id: 'vco', metadata: { name: 'VcoTwo' } } as never });
    await sembrarBoveda([buildSessionVaultRecord(doc, 'H1')]);
    sembrarSesionRota();

    const primera = await act(async () => {
      const r = render(<Editor />);
      await sleep(700);
      return r;
    });
    expect(await screen.findByTestId('session-recovery-notice')).toBeDefined();
    await esperarPayload((p) => Object.keys(p.documentsById).includes('vco'));
    primera.unmount();

    // Una recarga de verdad: el estado en memoria del módulo también arranca
    // limpio, que es lo que hace el store singleton.
    resetSessionRestoreNoticeStore();
    resetSessionRecoveryNoticeStore();

    await act(async () => {
      render(<Editor />);
      await sleep(700);
    });

    expect(screen.queryByTestId('session-recovery-notice')).toBeNull();
  });

  it('deja escrito el marcador de migración, para no repetirla', async () => {
    sembrarSesionRota();
    await act(async () => {
      render(<Editor />);
      await sleep(700);
    });

    const marcador = JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION_MIGRATIONS) ?? 'null');
    expect(Array.isArray(marcador)).toBe(true);
    expect(marcador).toContain('empty-documents-2026-10');
  });

  it('una sesión SANA no se toca ni se avisa de nada', async () => {
    // La contraprueba: una migración que se dispara de más es una migración
    // que puede comerse la sesión de alguien.
    const sana = { documentsById: { vco: mkDoc({ id: 'vco' }) }, activeDocumentId: 'vco' };
    localStorage.setItem(STORAGE_KEYS.SESSION_DOCS, JSON.stringify(sana));

    await act(async () => {
      render(<Editor />);
      await sleep(700);
    });

    expect(screen.queryByTestId('session-recovery-notice')).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.SESSION_MIGRATIONS)).toBeNull();
    const payload = leerPayload();
    expect(Object.keys(payload?.documentsById ?? {})).toEqual(['vco']);
  });

  it('el documento recuperado conserva su historial de deshacer', async () => {
    // Resucitar el contenido y perder el deshacer sería medio recuperar: el
    // usuario vería su documento pero no podría volver atrás.
    const doc = mkDoc({
      id: 'vco',
      manifest: { id: 'vco', metadata: { name: 'VcoTwo' } } as never,
      history: {
        past: [
          { id: 'e1', type: 'SNAPSHOT', label: 'crear nodo', timestamp: 1, correlationId: 'c', manifest },
          { id: 'e2', type: 'SNAPSHOT', label: 'mover nodo', timestamp: 2, correlationId: 'c', manifest }
        ],
        future: [],
        lastSavedIndex: 1
      }
    });
    await sembrarBoveda([buildSessionVaultRecord(doc, 'H1')]);
    sembrarSesionRota();

    await act(async () => {
      render(<Editor />);
      await sleep(700);
    });

    const guardado = await openSessionVaultStore({
      factory: factory.asFactory(),
      dbName: 'omega_session_vault'
    });
    const records = await guardado.getAll();
    const recuperado = records.find((r) => r.documentId === 'vco');
    expect(recuperado).toBeDefined();
    expect(recuperado?.history.past).toHaveLength(2);
    expect(recuperado?.version).toBe(SESSION_VAULT_VERSION);
    guardado.close();
  });
});
