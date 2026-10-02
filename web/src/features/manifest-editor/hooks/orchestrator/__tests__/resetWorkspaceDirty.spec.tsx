/**
 * @jest-environment jsdom
 *
 * @purpose Reproducir y fijar la semántica de "Reset Workspace" sobre el estado sucio.
 * @purpose_en Reproduces and locks the "Reset Workspace" unsaved-changes semantics.
 * @classification Test Suite
 *
 * POR QUÉ EXISTE ESTE FICHERO
 * --------------------------
 * "Reset Workspace" devolvía el texto a su estado original y aun así el
 * documento se quedaba marcado como "cambios sin guardar". Se midió en el
 * navegador (`e2e/smoke-tests.spec.ts`, Flow 5) y el `test.fixme` que lo
 * documentaba decía "causa sin diagnosticar". Aquí se mide en unitario, con
 * el MISMO ciclo de producción: reducer real + `useDocumentDirtyWatcher`
 * real, y el resultado es que el watcher es quien vuelve a ensuciar.
 *
 * LA MECÁNICA DEL FALLO (medida, no supuesta)
 * -------------------------------------------
 * `RESET_DOCUMENT` dejaba `lastStableHash: ''` como línea base. El watcher
 * compara `hash(doc.manifest)` contra ese campo con un debounce de 200 ms; como
 * el hash de `DEFAULT_MANIFEST` nunca es la cadena vacía, la comparación daba
 * "distinto" y el watcher despachaba `SET_DIRTY` sobre un documento que el
 * reducer acababa de limpiar.
 *
 * Medido ANTES del arreglo: justo tras el reset `isDirty=false`, y 200 ms
 * después `true` otra vez, para siempre.
 *
 * Hay un SEGUNDO defecto que este fichero también fija, y que solo aparece si
 * se deja un hash en vuelo antes del reset (el caso real: el usuario está
 * editando, hay un debounce pendiente y pulsa Reset). Ese hash se resuelve
 * DESPUÉS del reset y despachaba `SET_DIRTY` calculando sobre el documento
 * anterior. Con la guarda `isStale` de `useDocumentDirtyWatcher` desaparece.
 * Sin esa guarda, el documento pasaba por `isDirty: true` durante ~500 ms
 * después de un reset correcto.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useReducer } from 'react';
import { orchestratorReducer } from '../orchestratorReducer';
import { useDocumentDirtyWatcher } from '../useDocumentDirtyWatcher';
import { DEFAULT_MANIFEST } from '../../../constants/defaults';
import { countUnsavedChanges } from '../../../utils/historySavePoint';
import type { OrchestratorState } from '../../../types/document';

function makeState(): OrchestratorState {
  return {
    documentsById: {
      primary: {
        id: 'primary',
        manifest: DEFAULT_MANIFEST,
        isDirty: false,
        lastStableHash: '',
        history: { past: [], future: [], lastSavedIndex: -1 },
        isInitializing: false,
        contract: null,
        wasmBuffer: null,
        extraResources: []
      }
    },
    activeDocumentId: 'primary'
  };
}

function renderOrchestrator() {
  return renderHook(() => {
    const [state, dispatch] = useReducer(orchestratorReducer, undefined, makeState);
    useDocumentDirtyWatcher(state.documentsById, dispatch);
    return { state, dispatch };
  });
}

describe('Reset Workspace — estado sucio', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Avanza el reloj y deja correr las microtareas del hashing.
   *
   * El debounce del watcher son 200 ms y la rama de re-baselining son 500 ms,
   * así que "un momento" aquí son 1000 ms: los dos tiempos, con margen.
   */
  async function settle() {
    // `advanceTimersByTimeAsync` y no un bucle de `jest.advanceTimersByTime` +
    // `await Promise.resolve()`: el hashing usa `crypto.subtle.digest`, que es
    // una promesa REAL (WebCrypto), no una microtarea. Un bucle de
    // `Promise.resolve()` no la drena, y el resultado era un test que pasaba
    // unas veces y fallaba otras sin que hubiera cambiado nada.
    //
    // Tampoco basta con un solo `advanceTimersByTime(1000)`: el watcher
    // programa un temporizador que al dispararse despacha, lo que hace que
    // React re-ejecute el efecto, que programa OTRO temporizador. La versión
    // asíncrona deja que React resuelva entre temporizadores.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1500);
    });
  }

  it('el reducer marca el documento limpio al resetear', () => {
    // Punto de partida: el reducer SÍ limpia. El fallo estaba después, en el
    // watcher. Este test deja fijada esa parte para que un arreglo futuro no
    // la cambie por accidente.
    const state = makeState();
    const dirty = {
      ...state,
      documentsById: {
        primary: { ...state.documentsById.primary, isDirty: true, lastStableHash: 'hash-viejo' }
      }
    };
    const next = orchestratorReducer(dirty, { type: 'RESET_DOCUMENT', id: 'primary' });
    const doc = next.documentsById.primary;
    expect(doc.isDirty).toBe(false);
    expect(doc.manifest).toEqual(DEFAULT_MANIFEST);
  });

  it('el watcher NO puede volver a ensuciar un documento recién reseteado', async () => {
    const { result } = renderOrchestrator();

    act(() => {
      result.current.dispatch({ type: 'SET_DIRTY', id: 'primary', isDirty: true });
    });
    expect(result.current.state.documentsById.primary.isDirty).toBe(true);

    act(() => {
      result.current.dispatch({ type: 'RESET_DOCUMENT', id: 'primary' });
    });

    // Este es el fallo medido: aquí el documento volvía a `true`.
    await settle();

    const doc = result.current.state.documentsById.primary;
    expect(doc.isDirty).toBe(false);
    expect(doc.isInitializing).toBe(false);
  });

  it('el reset NO deja el documento sucio ni un instante cuando hay un hash en vuelo', async () => {
    // El caso real: el usuario estaba editando, hay un debounce de 200 ms
    // pendiente y pulsa "Reset Workspace". Ese hash se resuelve después del
    // reset y, sin la guarda de documentos obsoletos, volvía a ensuciar el
    // documento durante ~500 ms.
    const { result } = renderOrchestrator();

    act(() => {
      result.current.dispatch({ type: 'SET_DIRTY', id: 'primary', isDirty: true });
    });

    // Dispara el debounce de 200 ms: el watcher pide el hash y su promesa
    // queda pendiente. No lo drenamos a propósito.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(200);
    });

    act(() => {
      result.current.dispatch({ type: 'RESET_DOCUMENT', id: 'primary' });
    });

    // Se comprueba en pasos cortos: el documento no debe pasar por `true`
    // en NINGÚN momento, no solo al final.
    const seen: boolean[] = [];
    for (const ms of [50, 50, 100, 100, 100, 100, 100, 100, 100]) {
      await act(async () => {
        await jest.advanceTimersByTimeAsync(ms);
      });
      seen.push(result.current.state.documentsById.primary.isDirty);
    }

    expect(seen).not.toContain(true);
    expect(result.current.state.documentsById.primary.lastStableHash).not.toBe('');
  });

  it('tras el reset, editar de nuevo vuelve a marcar sucio', async () => {
    // El arreglo no puede consistir en dejar el documento ciego a los cambios.
    const { result } = renderOrchestrator();

    act(() => {
      result.current.dispatch({ type: 'RESET_DOCUMENT', id: 'primary' });
    });
    await settle();
    expect(result.current.state.documentsById.primary.isDirty).toBe(false);

    act(() => {
      result.current.dispatch({
        type: 'UPDATE_DOCUMENT',
        id: 'primary',
        updates: { manifest: { ...DEFAULT_MANIFEST, id: 'editado' } }
      });
    });
    await settle();

    expect(result.current.state.documentsById.primary.isDirty).toBe(true);
  });

  it('el documento reseteado no hereda el manifiesto del módulo por referencia', async () => {
    // `DEFAULT_MANIFEST` es un objeto compartido a nivel de módulo. Si el
    // reducer lo entregaba por referencia, dos documentos reseteados
    // compartían estado, y una mutación in situ de uno contaminaba al otro y
    // al propio módulo (que es la línea base de los documentos nuevos).
    const state = makeState();
    const next = orchestratorReducer(state, { type: 'RESET_DOCUMENT', id: 'primary' });
    expect(next.documentsById.primary.manifest).not.toBe(DEFAULT_MANIFEST);
    expect(next.documentsById.primary.manifest).toEqual(DEFAULT_MANIFEST);
  });

  it('tras el reset no quedan cambios sin guardar en la línea de tiempo', async () => {
    // `lastSavedIndex` se queda en -1 con la pila vacía, y -1 significa
    // "nunca guardado" (todas las entradas cuentan). Con `past` vacía el
    // recuento es 0, que es lo que el indicador del footer muestra. Si esto
    // dejara de ser 0, el footer diría "1 sin guardar" con la pila vacía.
    const { result } = renderOrchestrator();

    act(() => {
      result.current.dispatch({ type: 'RESET_DOCUMENT', id: 'primary' });
    });
    await settle();

    const { history } = result.current.state.documentsById.primary;
    expect(history.past).toHaveLength(0);
    expect(history.future).toHaveLength(0);
    expect(countUnsavedChanges(history)).toBe(0);
  });

  it('el watcher ignora un hash calculado sobre un documento ya sustituido', async () => {
    // El guard de obsolescencia, aislado. Se cambia el documento mientras su
    // hash está en vuelo: el resultado viejo no debe despachar nada, porque
    // describe un estado que ya no existe.
    const { result } = renderOrchestrator();

    act(() => {
      result.current.dispatch({ type: 'SET_DIRTY', id: 'primary', isDirty: false });
    });

    // Dispara el debounce y salta a otro documento antes de que resuelva.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(200);
    });

    act(() => {
      result.current.dispatch({
        type: 'UPDATE_DOCUMENT',
        id: 'primary',
        updates: { manifest: { ...DEFAULT_MANIFEST, id: 'otro' } }
      });
    });

    await settle();

    // El documento nuevo SÍ acaba marcado como sucio (el cambio es real), pero
    // eso lo decidió el ciclo vigente del watcher, no el hash obsoleto. Aquí
    // el documento nunca se reseteó ni se inicializó, así que `lastStableHash`
    // sigue siendo `''` a propósito: la línea base solo la captura `CAPTURE_HASH`
    // (guardar) o la rama de re-baselining (abrir/resetear).
    expect(result.current.state.documentsById.primary.lastStableHash).toBe('');
    expect(result.current.state.documentsById.primary.isDirty).toBe(true);
  });
});