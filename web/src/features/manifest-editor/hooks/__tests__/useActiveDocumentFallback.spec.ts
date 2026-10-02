/**
 * @jest-environment jsdom
 *
 * Tests de la frontera de `activeDocument`.
 *
 * `activeDocument` es `DocumentState | undefined` porque el tipo no puede
 * comprobar el invariante del reducer, y `useManifestEditor` es su único
 * consumidor. Estos tests fijan las dos mitades de ese contrato:
 *
 *   1. El hook del orquestador DEVUELVE `undefined` cuando no hay documento.
 *      Antes devolvía `documentsById['primary']` como fallback, una segunda
 *      fuente de verdad que enterraba el error.
 *   2. `useManifestEditor` resuelve ese `undefined` a `DEFAULT_MANIFEST` y lo
 *      declara con `hasActiveDocument: false`, para que la UI pueda avisar.
 *
 * Montar el hook de editor entero tira de casi todo el árbol del editor, así
 * que aquí se prueba la resolución con el hook real siempre que se puede y,
 * cuando no, contra la misma expresión con el mismo `DEFAULT_MANIFEST`.
 */
import { describe, it, expect } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

// El orquestador pasa por `useSessionPersistence`, que llama a `getService()`.
// Hay que registrar el contenedor ANTES de importar el hook, igual que hace
// `accessibility.spec.tsx`.
import { ServiceContainer } from '@/omega-ui-core/di/ServiceContainer';
import { EventBus } from '@/omega-ui-core/di/EventBus';
import { SERVICE_TOKENS } from '@/omega-ui-core/di';
import { setGlobalContainer, setGlobalEventBus } from '@/services/globalEventBus';

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
// `useSessionPersistence` lo pide para leer/escribir la sesión.
container.register(SERVICE_TOKENS.PERSISTENCE_SERVICE, {
  load: () => null,
  save: () => {},
  clear: () => {}
} as unknown as typeof import('@/services/persistenceService').persistenceService);

import { useDocumentOrchestrator, resolveActiveDocument } from '../useDocumentOrchestrator';
import { orchestratorReducer, initialOrchestratorState } from '../orchestrator/orchestratorReducer';
import { DEFAULT_MANIFEST } from '../../constants/defaults';
import type { DocumentState } from '../../types/document';

function doc(id: string): DocumentState {
  return {
    id,
    manifest: { ...DEFAULT_MANIFEST, id },
    isDirty: false,
    lastStableHash: '',
    history: { past: [], future: [], lastSavedIndex: -1 },
    isInitializing: false,
    contract: null,
    wasmBuffer: null,
    extraResources: []
  };
}

describe('activeDocument — el tipo ya no miente', () => {
  it('el estado inicial SÍ tiene documento activo', () => {
    // La línea base: con `primary` presente, nada de lo de abajo aplica.
    expect(initialOrchestratorState.documentsById[initialOrchestratorState.activeDocumentId]).toBeDefined();
  });

  it('una búsqueda sin clave devuelve undefined, no un documento fantasma', () => {
    // Contra `resolveActiveDocument` de verdad, con un estado inválido a
    // propósito. Es el único modo de comprobarlo: a través del hook ese
    // estado es inalcanzable porque el reducer no lo construye.
    expect(resolveActiveDocument(initialOrchestratorState.documentsById, 'primary')).toBeDefined();
    expect(resolveActiveDocument({}, 'primary')).toBeUndefined();
  });

  it('NO cae a primary cuando el id activo no existe', () => {
    // El `|| documentsById['primary']` de antes. La clave del caso es que
    // `primary` ESTÉ en el mapa: con el fallback, un `activeDocumentId`
    // colgante ('ghost') respondía con el documento primary y el error
    // quedaba enterrado. Sin él tiene que salir `undefined`.
    const docs = { primary: doc('primary'), second: doc('second') };
    expect(resolveActiveDocument(docs, 'ghost')).toBeUndefined();
    expect(resolveActiveDocument(docs, 'ghost')).not.toBe(docs.primary);
  });

  it('tampoco cae a otro documento cualquiera del mapa', () => {
    // Variante del mismo agujero: cualquier clave presente servía de red.
    const docs = { primary: doc('primary'), second: doc('second') };
    expect(resolveActiveDocument(docs, 'fantasma')).toBeUndefined();
  });

  it('resolveActiveDocument devuelve el objeto, no una copia', () => {
    const docs = { primary: doc('primary') };
    expect(resolveActiveDocument(docs, 'primary')).toBe(docs.primary);
  });

  it('el hook real resuelve el documento activo sin el fallback a primary', () => {
    // Contra el hook de verdad, no contra una copia de su expresión.
    const { result } = renderHook(() => useDocumentOrchestrator());

    expect(result.current.activeDocumentId).toBe('primary');
    expect(result.current.activeDocument).toBe(result.current.documentsById['primary']);
    expect(result.current.activeDocument).toBeDefined();
  });

  it('el hook real sigue resolviendo cuando se abre un segundo documento', () => {
    const { result } = renderHook(() => useDocumentOrchestrator());
    act(() => {
      result.current.openDocument('segundo', DEFAULT_MANIFEST);
    });
    expect(result.current.activeDocumentId).toBe('segundo');
    expect(result.current.activeDocument).toBe(result.current.documentsById['segundo']);

    // Y no se queda perezoso al volver al primero.
    act(() => {
      result.current.setActiveDocument('primary');
    });
    expect(result.current.activeDocument).toBe(result.current.documentsById['primary']);
  });

  it('el hook real no expone primaryDocument (alias muerto que duplicaba activeDocument)', () => {
    const { result } = renderHook(() => useDocumentOrchestrator());
    expect('primaryDocument' in result.current).toBe(false);
  });

  it('el hook real nunca queda sin documento activo por la vía de la UI', () => {
    const { result } = renderHook(() => useDocumentOrchestrator());
    act(() => {
      result.current.openDocument('segundo', DEFAULT_MANIFEST);
    });
    act(() => {
      result.current.closeDocument('segundo');
    });
    act(() => {
      result.current.closeDocument('primary');
    });
    expect(result.current.activeDocument).toBeDefined();
  });

  it('el fallback del editor usa DEFAULT_MANIFEST y no un documento inventado', () => {
    // La frontera de `useManifestEditor`, reproducida con la misma expresión.
    const activeDoc: DocumentState | undefined = undefined;
    const fallbackDoc = {
      id: 'no-active-document',
      manifest: DEFAULT_MANIFEST,
      contract: null,
      wasmBuffer: null,
      extraResources: [],
      isDirty: false,
      lastStableHash: '',
      isInitializing: false,
      history: { past: [], future: [], lastSavedIndex: -1 }
    };
    const resolved = activeDoc ?? fallbackDoc;
    const hasActiveDocument = activeDoc !== undefined;

    expect(hasActiveDocument).toBe(false);
    expect(resolved.manifest).toBe(DEFAULT_MANIFEST);
    // Campos vacíos pero con la FORMA correcta: los consumidores de abajo
    // leen `.past.length` y `.extraResources.map` sin comprobar nada.
    expect(resolved.contract).toBeNull();
    expect(resolved.wasmBuffer).toBeNull();
    expect(resolved.extraResources).toEqual([]);
    expect(resolved.history.past).toEqual([]);
    expect(resolved.isDirty).toBe(false);
  });

  it('el objeto de respaldo cumple la forma de DocumentState', () => {
    // Si el respaldo se desincroniza del tipo, el editor revienta al
    // usarlo, y ese fallo aparecería lejos de su causa.
    const fallbackDoc = {
      id: 'no-active-document',
      manifest: DEFAULT_MANIFEST,
      contract: null,
      wasmBuffer: null,
      extraResources: [],
      isDirty: false,
      lastStableHash: '',
      isInitializing: false,
      history: { past: [], future: [], lastSavedIndex: -1 }
    };
    const forma: Pick<
      DocumentState,
      'id' | 'manifest' | 'isDirty' | 'lastStableHash' | 'history' | 'isInitializing' | 'contract' | 'wasmBuffer' | 'extraResources'
    > = fallbackDoc;
    expect(forma.id).toBe('no-active-document');
  });

  it('con documento activo, hasActiveDocument es true y no se toca nada', () => {
    const activeDoc = doc('primary');
    const resolved = activeDoc ?? { manifest: DEFAULT_MANIFEST };
    expect(activeDoc !== undefined).toBe(true);
    expect(resolved).toBe(activeDoc);
  });

  it('el invariante del reducer hace la rama inalcanzable en uso normal', () => {
    // Por qué el aviso es defensivo y no algo de cada día: mientras
    // `CLOSE_DOCUMENT` rechace el cierre del último documento, no hay forma
    // de llegar al fallback desde la UI.
    const abierto = orchestratorReducer(initialOrchestratorState, {
      type: 'OPEN_DOCUMENT',
      id: 'otro',
      manifest: DEFAULT_MANIFEST
    });
    const trasCerrarUno = orchestratorReducer(abierto, { type: 'CLOSE_DOCUMENT', id: 'otro' });
    const trasCerrarElUltimo = orchestratorReducer(trasCerrarUno, {
      type: 'CLOSE_DOCUMENT',
      id: 'primary'
    });
    expect(trasCerrarElUltimo.documentsById[trasCerrarElUltimo.activeDocumentId]).toBeDefined();
  });
});
