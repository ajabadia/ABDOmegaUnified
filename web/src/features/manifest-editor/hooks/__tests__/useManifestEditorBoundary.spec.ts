/**
 * @jest-environment jsdom
 *
 * Tests de la FRONTERA de `useManifestEditor`.
 *
 * `activeDocument` es `DocumentState | undefined` y este hook es su único
 * consumidor, así que aquí se decide qué hacer cuando vale `undefined`. La
 * forma de probarlo es sustituir `useDocumentOrchestrator` por un doble: es
 * la única manera de llegar al caso, porque el reducer real garantiza que
 * nunca ocurre desde la UI.
 *
 * Se prueba el hook de verdad, no una copia de su expresión. Una copia pasa
 * los tests aunque el hook se rompa, que es exactamente lo que pasó con la
 * primera versión de esta suite.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockOrchestrator: Record<string, unknown> = {
  documentsById: {} as Record<string, unknown>,
  activeDocumentId: 'primary',
  activeDocument: undefined as unknown,
  openDocument: jest.fn(),
  closeDocument: jest.fn(),
  updateDocument: jest.fn(),
  setActiveDocument: jest.fn(),
  captureStableSnapshot: jest.fn(async () => {}),
  flushPendingHash: jest.fn(async () => {}),
  resetDocument: jest.fn(),
  undo: jest.fn(),
  redo: jest.fn(),
  undoTo: jest.fn(),
  pushHistory: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  restoreHistoricalRevision: jest.fn()
};

// `useManifestEditor` tira de `getService()` (useSimulationBridge) y de
// `useToast`, así que hace falta el contenedor de DI y un ToastProvider
// alrededor. Mismo arranque que `accessibility.spec.tsx`.
import { ServiceContainer } from '@/omega-ui-core/di/ServiceContainer';
import { EventBus } from '@/omega-ui-core/di/EventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';
import { setGlobalContainer, setGlobalEventBus } from '@/services/globalEventBus';
import { ToastProvider } from '@/features/manifest-editor/components/ToastContainer';
import { createElement, type ReactNode } from 'react';

const container = new ServiceContainer();
const eventBus = new EventBus();
setGlobalEventBus(eventBus);
setGlobalContainer(container);
container.register(SERVICE_TOKENS.EVENT_BUS, eventBus);
container.register(SERVICE_TOKENS.OBSERVABILITY_SERVICE, {
  generateCorrelationId: () => 'test-corr-id',
  trackEvent: () => {},
  getHealthReport: () => ({ overall: 'CERTIFIED', score: 87, era: 7 }),
  trackHistoryEvent: () => {},
  updateHeartbeat: () => {}
} as unknown as typeof import('@/services/observabilityService').observabilityService);
container.register(SERVICE_TOKENS.PERSISTENCE_SERVICE, {
  load: () => null,
  save: () => {},
  clear: () => {}
} as unknown as typeof import('@/services/persistenceService').persistenceService);
// `useSimulationBridge` lo pide al arrancar.
container.register(SERVICE_TOKENS.WASM_RUNTIME, {
  isReady: () => false,
  load: async () => {},
  unload: () => {},
  getExports: () => null,
  connect: () => {},
  disconnect: () => {}
} as unknown as Parameters<typeof container.register>[1]);
container.register(SERVICE_TOKENS.RECONCILIATION_SERVICE, {
  reconcile: async () => ({}),
  getPending: () => []
} as unknown as Parameters<typeof container.register>[1]);
container.register(SERVICE_TOKENS.HISTORY_SERVICE, {
  getState: () => ({ past: [], future: [] }),
  push: jest.fn(),
  undo: jest.fn(),
  redo: jest.fn()
} as unknown as Parameters<typeof container.register>[1]);
container.register(SERVICE_TOKENS.INPUT_SIGNAL_SERVICE, {
  subscribe: () => () => {},
  emit: jest.fn()
} as unknown as Parameters<typeof container.register>[1]);

// `jest.mock` con paths no funciona en este repo: el comentario de
// `jest.config.js` lo dice ("SWC/import resolution mismatch with jest.mock +
// @/ aliases"). `doMock` + `require` sí, porque no depende del hoisting.
jest.doMock('../useDocumentOrchestrator', () => ({
  useDocumentOrchestrator: () => mockOrchestrator
}));

const makeDoc = (id: string, name: string) => ({
  id,
  manifest: { id, schemaVersion: '7.2.3', metadata: { name }, resources: {}, entities: [], ui: {} },
  isDirty: false,
  lastStableHash: '',
  history: { past: [], future: [], lastSavedIndex: -1 },
  isInitializing: false,
  contract: null,
  wasmBuffer: null,
  extraResources: []
});

import { renderHook } from '@testing-library/react';
import { DEFAULT_MANIFEST } from '../../constants/defaults';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useManifestEditor } = require('../useManifestEditor') as typeof import('../useManifestEditor');

beforeEach(() => {
  mockOrchestrator.activeDocument = undefined;
  mockOrchestrator.activeDocumentId = 'primary';
  mockOrchestrator.documentsById = {};
});

/** Monta el hook dentro del ToastProvider que exige. */
function montar() {
  return renderHook(() => useManifestEditor({} as never, {} as never), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(ToastProvider, null, children)
  });
}

describe('useManifestEditor — frontera de activeDocument', () => {
  it('SIN documento activo expone hasActiveDocument=false', () => {
    const { result } = montar();
    expect(result.current.hasActiveDocument).toBe(false);
  });

  it('SIN documento activo sirve DEFAULT_MANIFEST en vez de reventar', () => {
    // Antes esto era `const { manifest } = activeDoc` y sin documento
    // activo el hook lanzaba un TypeError al renderizar.
    const { result } = montar();
    expect(result.current.manifest).toBe(DEFAULT_MANIFEST);
  });

  it('SIN documento activo los campos derivados tienen la forma correcta', () => {
    // Los consumidores de abajo leen `.past.length` y `.extraResources.map`
    // sin comprobar nada, así que un `null` aquí los tumbaría igual que el
    // `undefined` que veníamos tapando.
    const { result } = montar();
    expect(result.current.contract).toBeNull();
    expect(result.current.wasmBuffer).toBeNull();
    expect(result.current.extraResources).toEqual([]);
    expect(result.current.isDirty).toBe(false);
    // `issues` lo produce el motor de auditoría sobre DEFAULT_MANIFEST, así
    // que no se comprueba su contenido: se comprueba que sea un array y no
    // un `undefined` que reventaría al pintar el contador de errores.
    expect(Array.isArray(result.current.issues)).toBe(true);
  });

  it('CON documento activo expone hasActiveDocument=true y NO sustituye el manifiesto', () => {
    const doc = makeDoc('primary', 'VcoTwo');
    mockOrchestrator.activeDocument = doc;
    mockOrchestrator.documentsById = { primary: doc };

    const { result } = montar();
    expect(result.current.hasActiveDocument).toBe(true);
    // La identidad importa: si aquí se fabricara una copia, cualquier
    // edición se guardaría en un objeto que el orquestador no conoce.
    expect(result.current.manifest).toBe(doc.manifest);
  });

  it('el fallback NO se cuela en el caso normal', () => {
    const doc = makeDoc('primary', 'VcoTwo');
    mockOrchestrator.activeDocument = doc;
    mockOrchestrator.documentsById = { primary: doc };

    const { result } = montar();
    expect(result.current.manifest).not.toBe(DEFAULT_MANIFEST);
  });
});
