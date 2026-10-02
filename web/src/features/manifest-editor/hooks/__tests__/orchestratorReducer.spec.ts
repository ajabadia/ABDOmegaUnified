/**
 * Round-trip tests for the orchestrator reducer's history stack.
 *
 * Guardan contra el drift de round-trip: undo/redo debe restaurar el
 * manifiesto EXACTO guardado. `normalizeManifest` en la ruta de historial
 * inyectaba DEFAULT_PALETTE/DEFAULT_SIZES/metadata por defecto que no
 * existían en el manifiesto original.
 */

import type { OMEGA_Manifest, OrchestratorState, HistoryEntry } from '../../types/document';
import { orchestratorReducer, createSnapshotEntry } from '../orchestrator/orchestratorReducer';
import {
  countUnsavedChanges,
  hasUnsavedChanges,
  isEntryUnsaved
} from '../../utils/historySavePoint';

const customManifest: OMEGA_Manifest = {
  id: 'custom-module',
  schemaVersion: '7.2.3',
  metadata: { name: 'Custom Module', version: '2.0.0' },
  resources: {},
  entities: [],
  ui: {
    // Palette parcial: normalizeManifest inyectaría los 22 tokens de DEFAULT_PALETTE
    palette: { primary: '#123456' },
    // Sizes parcial: normalizeManifest inyectaría A/B/D
    sizes: { C: 48 }
  }
};

function makeState(
  manifest: OMEGA_Manifest,
  past: HistoryEntry[] = [],
  future: HistoryEntry[] = [],
  lastSavedIndex = -1
): OrchestratorState {
  return {
    documentsById: {
      primary: {
        id: 'primary',
        manifest,
        isDirty: false,
        lastStableHash: '',
        history: { past, future, lastSavedIndex },
        isInitializing: false,
        contract: null,
        wasmBuffer: null,
        extraResources: []
      }
    },
    activeDocumentId: 'primary'
  };
}

describe('orchestratorReducer — ids de entrada', () => {
  it('createSnapshotEntry no repite id dentro de una ráfaga', () => {
    // El otro half del bug de ids colisionados: el reducer generaba
    // `${correlationId}_${Date.now()}`, así que cinco Ctrl+Z seguidos (que
    // caen en el mismo milisegundo) producían cinco entradas con el mismo
    // id — y la línea de tiempo usa `key={entry.id}`.
    const ids = Array.from({ length: 50 }, (_, i) =>
      createSnapshotEntry(`edit ${i}`, 'undo_op', customManifest).id
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('el id de UNDO no choca con el de una entrada previa ya apilada', () => {
    // `UNDO_DOCUMENT` genera DOS entradas por operación (el estado previo y
    // el "Current State" que manda a `future`). Con `Date.now()` ambas
    // compartían prefijo y milisegundo, así que una podía repetir el id de
    // la otra y ambas convivían en la misma pila.
    let current = makeState(customManifest);
    for (let i = 0; i < 4; i++) {
      current = orchestratorReducer(current, {
        type: 'PUSH_HISTORY',
        id: 'primary',
        entry: createSnapshotEntry(`edit ${i}`, 'corr', customManifest)
      });
    }

    for (let i = 0; i < 3; i++) {
      current = orchestratorReducer(current, { type: 'UNDO_DOCUMENT', id: 'primary' });
    }

    const { past, future } = current.documentsById.primary.history;
    const ids = [...past, ...future].map((e) => e.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('orchestratorReducer — history round-trip', () => {
  it('createSnapshotEntry preserves the exact manifest shape without injecting defaults', () => {
    const entry = createSnapshotEntry('label', 'corr', customManifest);
    expect(entry.manifest).toEqual(customManifest);
    expect(entry.manifest.ui.palette).toEqual({ primary: '#123456' });
    expect(entry.manifest.ui.sizes).toEqual({ C: 48 });
    expect(entry.type).toBe('SNAPSHOT');
    expect(entry.uiState).toEqual({
      selectedNodeId: null,
      multiSelectedNodeIds: [],
      pinnedNodeId: null,
      layoutRatio: 0.5
    });
  });

  it('UNDO_DOCUMENT restores the exact pre-mutation manifest (no palette/size injection)', () => {
    const snapshot = createSnapshotEntry('first edit', 'corr-1', customManifest);
    const mutated: OMEGA_Manifest = {
      ...customManifest,
      metadata: { name: 'Renamed Module', version: '2.0.0' }
    };
    const next = orchestratorReducer(makeState(mutated, [snapshot]), {
      type: 'UNDO_DOCUMENT',
      id: 'primary'
    });
    expect(next.documentsById.primary.manifest).toEqual(customManifest);
    expect(next.documentsById.primary.manifest.ui.palette).toEqual({ primary: '#123456' });
  });

  it('REDO_DOCUMENT restores the exact manifest captured before undo', () => {
    const snapshot = createSnapshotEntry('first edit', 'corr-1', customManifest);
    const mutated: OMEGA_Manifest = {
      ...customManifest,
      metadata: { name: 'Renamed Module', version: '2.0.0' }
    };
    const undone = orchestratorReducer(makeState(mutated, [snapshot]), {
      type: 'UNDO_DOCUMENT',
      id: 'primary'
    });
    const redone = orchestratorReducer(undone, { type: 'REDO_DOCUMENT', id: 'primary' });
    expect(redone.documentsById.primary.manifest).toEqual(mutated);
  });

  it('UNDO_TO_INDEX restores the exact target entry manifest', () => {
    const entry0 = createSnapshotEntry('initial', 'c0', customManifest);
    const second: OMEGA_Manifest = {
      ...customManifest,
      metadata: { name: 'Second', version: '2.0.0' }
    };
    const entry1 = createSnapshotEntry('second', 'c1', second);
    const current: OMEGA_Manifest = {
      ...customManifest,
      metadata: { name: 'Third', version: '2.0.0' }
    };
    const next = orchestratorReducer(makeState(current, [entry0, entry1]), {
      type: 'UNDO_TO_INDEX',
      id: 'primary',
      index: 0
    });
    expect(next.documentsById.primary.manifest).toEqual(customManifest);
  });

  it('full undo round-trip (PUSH_HISTORY + UPDATE_DOCUMENT + UNDO) preserves the exact original', () => {
    const snapshot = createSnapshotEntry('rename module', 'corr-rename', customManifest);
    const afterPush = orchestratorReducer(makeState(customManifest), {
      type: 'PUSH_HISTORY',
      id: 'primary',
      entry: snapshot
    });
    const mutated: OMEGA_Manifest = {
      ...customManifest,
      metadata: { name: 'Renamed', version: '2.0.0' }
    };
    const afterUpdate = orchestratorReducer(afterPush, {
      type: 'UPDATE_DOCUMENT',
      id: 'primary',
      updates: { manifest: mutated }
    });
    expect(afterUpdate.documentsById.primary.manifest.metadata.name).toBe('Renamed');

    const undone = orchestratorReducer(afterUpdate, { type: 'UNDO_DOCUMENT', id: 'primary' });
    expect(undone.documentsById.primary.manifest).toEqual(customManifest);
    expect(undone.documentsById.primary.manifest.metadata.name).toBe('Custom Module');
  });

  it('UNDO_TO_INDEX + REDO walks every popped state exactly once, in order', () => {
    const named = (name: string): OMEGA_Manifest => ({
      ...customManifest,
      metadata: { name, version: '2.0.0' }
    });
    const e0 = createSnapshotEntry('e0', 'c0', named('s0'));
    const e1 = createSnapshotEntry('e1', 'c1', named('s1'));
    const e2 = createSnapshotEntry('e2', 'c2', named('s2'));
    const current = named('current');

    const jumped = orchestratorReducer(makeState(current, [e0, e1, e2]), {
      type: 'UNDO_TO_INDEX',
      id: 'primary',
      index: 0
    });
    expect(jumped.documentsById.primary.manifest.metadata.name).toBe('s0');

    // Redo must replay s1, s2, then the pre-jump state: no skipped state and
    // no duplicated tail.
    const walk: string[] = [];
    let cursor = jumped;
    while (cursor.documentsById.primary.history.future.length > 0) {
      cursor = orchestratorReducer(cursor, { type: 'REDO_DOCUMENT', id: 'primary' });
      walk.push(cursor.documentsById.primary.manifest.metadata.name);
    }
    expect(walk).toEqual(['s1', 's2', 'current']);
  });

  it('PUSH_HISTORY clears the redo stack', () => {
    const entry = createSnapshotEntry('edit', 'c', customManifest);
    const next = orchestratorReducer(makeState(customManifest, [], [entry]), {
      type: 'PUSH_HISTORY',
      id: 'primary',
      entry: createSnapshotEntry('new edit', 'c2', customManifest)
    });
    expect(next.documentsById.primary.history.future).toEqual([]);
    expect(next.documentsById.primary.history.past).toHaveLength(1);
  });

  it('PUSH_HISTORY caps the past stack at 50 entries (drops oldest)', () => {
    let state = makeState(customManifest);
    for (let i = 0; i < 52; i++) {
      state = orchestratorReducer(state, {
        type: 'PUSH_HISTORY',
        id: 'primary',
        entry: createSnapshotEntry(`e${i}`, `c${i}`, customManifest)
      });
    }
    const past = state.documentsById.primary.history.past;
    expect(past).toHaveLength(50);
    expect(past[0].label).toBe('e2');
    expect(past[49].label).toBe('e51');
  });
});

/**
 * `lastSavedIndex` es un índice DENTRO de `history.past`. Cualquier recorte de
 * esa pila lo invalida: un `shift()` sin reindexar dejaba el puntero apuntando
 * a la entrada equivocada (o a un índice que ya no existía).
 */
describe('orchestratorReducer — lastSavedIndex sigue al recorte de past', () => {
  const push = (state: OrchestratorState, label: string): OrchestratorState =>
    orchestratorReducer(state, {
      type: 'PUSH_HISTORY',
      id: 'primary',
      entry: createSnapshotEntry(label, `c_${label}`, customManifest)
    });

  /** Marca como guardada la entrada en `index` de `past` (lo que haría un save). */
  const markSaved = (state: OrchestratorState, index: number): OrchestratorState => ({
    ...state,
    documentsById: {
      ...state.documentsById,
      primary: {
        ...state.documentsById.primary,
        history: { ...state.documentsById.primary.history, lastSavedIndex: index }
      }
    }
  });

  it('decrementa lastSavedIndex en la misma medida que el recorte por cabeza', () => {
    // 48 entradas + puntero en la 47 -> al empujar dos más se recorta 1.
    let state = makeState(customManifest);
    for (let i = 0; i < 48; i++) state = push(state, `e${i}`);
    state = markSaved(state, 47);

    state = push(state, 'e48');
    expect(state.documentsById.primary.history.lastSavedIndex).toBe(47);

    // 50 es el límite exacto, así que hace falta una entrada más (la 51)
    // para desbordar: overflow 1 -> la guardada pasa de 47 a 46.
    state = push(state, 'e49');
    expect(state.documentsById.primary.history.past).toHaveLength(50);
    expect(state.documentsById.primary.history.lastSavedIndex).toBe(47);

    state = push(state, 'e50');
    const hist = state.documentsById.primary.history;
    expect(hist.past).toHaveLength(50);
    expect(hist.past[0].label).toBe('e1');
    expect(hist.lastSavedIndex).toBe(46);
  });

  it('clampa a -1 cuando la entrada guardada cae fuera de la ventana', () => {
    // Puntero en la 0: tras dos recortes se quedaría en -2, debe ser -1.
    let state = makeState(customManifest);
    for (let i = 0; i < 10; i++) state = push(state, `e${i}`);
    state = markSaved(state, 0);
    for (let i = 10; i < 52; i++) state = push(state, `e${i}`);

    const hist = state.documentsById.primary.history;
    expect(hist.past).toHaveLength(50);
    expect(hist.lastSavedIndex).toBe(-1);
  });

  it('no toca lastSavedIndex mientras la pila no exceda el límite', () => {
    let state = makeState(customManifest);
    for (let i = 0; i < 10; i++) state = push(state, `e${i}`);
    state = markSaved(state, 3);

    for (let i = 10; i < 20; i++) state = push(state, `e${i}`);

    const hist = state.documentsById.primary.history;
    expect(hist.past).toHaveLength(20);
    expect(hist.lastSavedIndex).toBe(3);
  });

  it('REDO_DOCUMENT también respeta el límite de 50', () => {
    // REDO empujaba directo con [...past, entry] y se saltaba el cap por
    // completo, así que un redo encadenado hacía crecer la pila sin tope.
    const past = Array.from({ length: 50 }, (_, i) =>
      createSnapshotEntry(`e${i}`, `c${i}`, customManifest)
    );
    const future = [createSnapshotEntry('f0', 'cf', customManifest)];

    const next = orchestratorReducer(makeState(customManifest, past, future), {
      type: 'REDO_DOCUMENT',
      id: 'primary'
    });

    const hist = next.documentsById.primary.history;
    expect(hist.past).toHaveLength(50);
    expect(hist.past[0].label).toBe('e1');
    expect(hist.future).toHaveLength(0);
  });

  it('UNDO_DOCUMENT NO mueve lastSavedIndex: es un cursor, no un índice reindexado', () => {
    // `past[i]` es el snapshot ANTERIOR a la entrada `i`, así que la entrada
    // que ocupa el índice 0 sigue siendo la misma tras desapilar. Si el undo
    // desplazara también el cursor, `past.length` y `lastSavedIndex` bajarían
    // los dos y su diferencia —los cambios sin guardar— quedaría clavada:
    // deshacer hasta el punto de guardado no limpiaría nunca el estado.
    const past = [0, 1, 2].map(i => createSnapshotEntry(`e${i}`, `c${i}`, customManifest));
    const next = orchestratorReducer(makeState(customManifest, past, [], 2), {
      type: 'UNDO_DOCUMENT',
      id: 'primary'
    });

    const hist = next.documentsById.primary.history;
    expect(hist.past).toHaveLength(2);
    expect(hist.past[0].label).toBe('e0'); // la entrada 0 no se movió
    expect(hist.lastSavedIndex).toBe(2);

    // Efecto observable: deshacer hasta el punto de guardado deja 0 sin guardar.
    expect(countUnsavedChanges(hist)).toBe(0);
  });

  it('UNDO_TO_INDEX invalida lastSavedIndex si la truncación descarta la entrada guardada', () => {
    const past = [0, 1, 2].map(i => createSnapshotEntry(`e${i}`, `c${i}`, customManifest));

    const discards = orchestratorReducer(makeState(customManifest, past, [], 2), {
      type: 'UNDO_TO_INDEX',
      id: 'primary',
      index: 1
    });
    expect(discards.documentsById.primary.history.lastSavedIndex).toBe(-1);

    // Saltar a una posición posterior a la guardada la deja intacta.
    const keeps = orchestratorReducer(makeState(customManifest, past, [], 0), {
      type: 'UNDO_TO_INDEX',
      id: 'primary',
      index: 2
    });
    expect(keeps.documentsById.primary.history.lastSavedIndex).toBe(0);
  });
});

/**
 * `cloneManifest` debe ser una COPIA exacta, no una serialización.
 *
 * `JSON.parse(JSON.stringify())` no lo era: borraba las claves con valor
 * `undefined` y reventaba con referencias cíclicas. Los tipos del manifiesto
 * declaran `| undefined` explícito (`frames?`, `w?`, `metadata?`) y el tsconfig
 * activa `exactOptionalPropertyTypes`, donde `{w: undefined}` ≠ `{}`.
 */
describe('orchestratorReducer — cloneManifest es una copia exacta', () => {
  it('conserva las claves con valor undefined explícito', () => {
    const withUndefined = {
      ...customManifest,
      // `frames?: number | undefined` es un caso real del tipo OMEGA_Asset.
      assets: [{ id: 'a1', url: 'asset://x.png', type: 'image', frames: undefined }]
    } as unknown as OMEGA_Manifest;

    const entry = createSnapshotEntry('e', 'c', withUndefined);
    const asset = (entry.manifest as unknown as { assets: Array<Record<string, unknown>> }).assets[0];

    // La clave debe seguir existiendo; el round-trip por JSON la borraba.
    expect('frames' in asset).toBe(true);
    expect(Object.keys(asset)).toContain('frames');
    expect(asset.frames).toBeUndefined();
  });

  it('no revienta con referencias cíclicas', () => {
    const cyclic = { ...customManifest } as unknown as Record<string, unknown>;
    // `resources` es Record<string, unknown>: un ciclo es representable.
    const resources: Record<string, unknown> = { self: null };
    resources.self = resources;
    cyclic.resources = resources;

    let entry!: ReturnType<typeof createSnapshotEntry>;
    expect(() => {
      entry = createSnapshotEntry('e', 'c', cyclic as unknown as OMEGA_Manifest);
    }).not.toThrow();

    // Y el clon mantiene el ciclo apuntando a sí mismo, no al original.
    const cloned = entry.manifest as unknown as { resources: Record<string, unknown> };
    expect(cloned.resources).toBe(entry.manifest.resources);
    expect(cloned.resources.self).toBe(cloned.resources);
    expect(cloned.resources.self).not.toBe(resources);
  });

  it('produce un grafo nuevo: mutar el clon no toca el original', () => {
    const source = {
      ...customManifest,
      ui: { ...customManifest.ui, palette: { primary: '#123456' } }
    } as unknown as OMEGA_Manifest;

    const entry = createSnapshotEntry('e', 'c', source);
    const clone = entry.manifest as unknown as {
      ui: { palette: { primary: string } };
      metadata: { name: string };
    };

    //Referencias nuevas en todos los niveles.
    expect(clone).not.toBe(source);
    expect(clone.ui).not.toBe(source.ui);
    expect(clone.ui.palette).not.toBe(source.ui.palette);

    clone.ui.palette.primary = '#ffffff';
    clone.metadata.name = 'Mutado';

    expect((source.ui.palette as { primary: string }).primary).toBe('#123456');
    expect((source.metadata as { name: string }).name).toBe('Custom Module');
  });

  it('el undo restaura las claves undefined del snapshot guardado', () => {
    const conUndefined = {
      ...customManifest,
      assets: [{ id: 'a1', url: 'asset://x.png', type: 'image', defaultFrame: undefined }]
    } as unknown as OMEGA_Manifest;

    // Estado actual mutado + un snapshot previo que tenía la clave `undefined`.
    const snapshotPrevio = createSnapshotEntry('previo', 'c0', conUndefined);
    const actual = { ...conUndefined, id: 'mutado' } as unknown as OMEGA_Manifest;

    const undone = orchestratorReducer(makeState(actual, [snapshotPrevio]), {
      type: 'UNDO_DOCUMENT',
      id: 'primary'
    });

    const restaurado = (
      undone.documentsById.primary.manifest as unknown as {
        assets: Array<Record<string, unknown>>;
      }
    ).assets[0];
    expect('defaultFrame' in restaurado).toBe(true);
    expect(restaurado.defaultFrame).toBeUndefined();
  });
});

/**
 * `lastSavedIndex` cableado de verdad: el guardado marca la entrada y el
 * timeline puede derivar qué cambios siguen sin guardar.
 *
 * `lastSavedIndex` estaba muerto (solo se inicializaba a -1 y se reindexaba al
 * recortar `past`, pero nunca se leía). Antes de este cambio no había forma de
 * que una entrada marcara "guardado", así que la UI no tenía nada que
 * derivar. Estos tests fijan el contrato completo.
 */
describe('orchestratorReducer — el guardado marca el punto de guardado', () => {
  const entries = (n: number) =>
    Array.from({ length: n }, (_, i) => createSnapshotEntry(`e${i}`, `c${i}`, customManifest));

  const save = (state: OrchestratorState) =>
    orchestratorReducer(state, { type: 'CAPTURE_HASH', id: 'primary', hash: 'h1' });

  const pushEntry = (state: OrchestratorState, label: string) =>
    orchestratorReducer(state, {
      type: 'PUSH_HISTORY',
      id: 'primary',
      entry: createSnapshotEntry(label, `c_${label}`, customManifest)
    });

  it('CAPTURE_HASH fija el cursor en past.length y deja el documento limpio', () => {
    // Documento recién abierto: nada escrito todavía, luego todo está guardado.
    const opened = orchestratorReducer(
      {
        documentsById: {},
        activeDocumentId: 'primary'
      } as unknown as OrchestratorState,
      { type: 'OPEN_DOCUMENT', id: 'primary', manifest: customManifest }
    );
    const saved = save(opened);
    const hist = saved.documentsById.primary.history;

    expect(hist.lastSavedIndex).toBe(0);
    expect(countUnsavedChanges(hist)).toBe(0);
    expect(hasUnsavedChanges(hist)).toBe(false);
  });

  it('cada entrada posterior al guardado cuenta como cambio sin guardar', () => {
    let state = makeState(customManifest, entries(3), [], 3); // guardado en el cursor 3
    expect(countUnsavedChanges(state.documentsById.primary.history)).toBe(0);

    state = pushEntry(state, 'a');
    expect(countUnsavedChanges(state.documentsById.primary.history)).toBe(1);

    state = pushEntry(state, 'b');
    const hist = state.documentsById.primary.history;
    expect(countUnsavedChanges(hist)).toBe(2);
    expect(hasUnsavedChanges(hist)).toBe(true);

    // El corte es `>= lastSavedIndex`: la entrada que ocupaba la posición del
    // cursor al guardar es la PRIMERA hecha después del guardado. Con `>`
    // el contador diría 2 y solo se marcaría 1 entrada.
    expect(isEntryUnsaved(hist, 2)).toBe(false);
    expect(isEntryUnsaved(hist, 3)).toBe(true);
    expect(isEntryUnsaved(hist, 4)).toBe(true);

    // Coherencia: el número de entradas marcadas es el contador.
    const marked = hist.past.map((_, i) => i).filter((i) => isEntryUnsaved(hist, i));
    expect(marked).toHaveLength(countUnsavedChanges(hist));
  });

  it('volver a guardar en el cursor actual limpia el contador', () => {
    let state = makeState(customManifest, entries(3), [], 3);
    state = pushEntry(state, 'a');
    state = pushEntry(state, 'b');
    expect(countUnsavedChanges(state.documentsById.primary.history)).toBe(2);

    state = save(state);
    const hist = state.documentsById.primary.history;
    expect(hist.lastSavedIndex).toBe(5);
    expect(countUnsavedChanges(hist)).toBe(0);
  });

  it('deshacer hasta el punto de guardado vuelve a limpiar el documento', () => {
    // Este es el comportamiento que pedía el cableado y que el shift previo
    // en UNDO_DOCUMENT impossibilitaba.
    let state = makeState(customManifest, entries(3), [], 3);
    state = pushEntry(state, 'a');
    state = pushEntry(state, 'b');
    expect(countUnsavedChanges(state.documentsById.primary.history)).toBe(2);

    state = orchestratorReducer(state, { type: 'UNDO_DOCUMENT', id: 'primary' });
    expect(countUnsavedChanges(state.documentsById.primary.history)).toBe(1);

    state = orchestratorReducer(state, { type: 'UNDO_DOCUMENT', id: 'primary' });
    const hist = state.documentsById.primary.history;
    expect(countUnsavedChanges(hist)).toBe(0);
    expect(hasUnsavedChanges(hist)).toBe(false);
  });

  it('un undo que va MÁS ALLÁ del punto de guardado sigue contando cambios', () => {
    let state = makeState(customManifest, entries(3), [], 3);
    state = orchestratorReducer(state, { type: 'UNDO_DOCUMENT', id: 'primary' });
    state = orchestratorReducer(state, { type: 'UNDO_DOCUMENT', id: 'primary' });
    // cursor 1, guardado en 3 → 2 pasos por detrás, luego no hay negativos.
    expect(countUnsavedChanges(state.documentsById.primary.history)).toBe(0);

    // Saltar hacia atrás deja el punto de guardado dentro de la ventana solo
    // si no se descarta; saltar por encima lo invalida y todo cuenta como
    // sin guardar, que es la lectura conservadora.
    const jumped = orchestratorReducer(makeState(customManifest, entries(4), [], 3), {
      type: 'UNDO_TO_INDEX',
      id: 'primary',
      index: 1
    });
    expect(jumped.documentsById.primary.history.lastSavedIndex).toBe(-1);
    expect(countUnsavedChanges(jumped.documentsById.primary.history)).toBe(1);
  });

  it('nunca cuenta cambios sin guardar negativos al deshacer de más', () => {
    let state = makeState(customManifest, entries(2), [], 2);
    state = orchestratorReducer(state, { type: 'UNDO_DOCUMENT', id: 'primary' });
    state = orchestratorReducer(state, { type: 'UNDO_DOCUMENT', id: 'primary' });
    state = orchestratorReducer(state, { type: 'UNDO_DOCUMENT', id: 'primary' });
    expect(countUnsavedChanges(state.documentsById.primary.history)).toBe(0);
  });

  it('CAPTURE_HASH también limpia isDirty y fija el hash estable a la vez', () => {
    const dirty = {
      ...makeState(customManifest, entries(2), [], 2).documentsById.primary,
      isDirty: true
    };
    const state: OrchestratorState = {
      documentsById: { primary: dirty },
      activeDocumentId: 'primary'
    };

    const doc = save(state).documentsById.primary;
    expect(doc.isDirty).toBe(false);
    expect(doc.lastStableHash).toBe('h1');
    expect(doc.history.lastSavedIndex).toBe(2);

    // `lastSavedIndex` pertenece a `history`. Si se colara en el documento,
    // TypeScript no lo detectaría (el objeto se construye con un cast) y la
    // UI leería history.lastSavedIndex = -1 para siempre, sin errores.
    expect('lastSavedIndex' in doc).toBe(false);
  });

  it('el recorte por cabeza desplaza el cursor guardado junto con la ventana', () => {
    // 50 entradas con el cursor guardado en 49; al empujar la 51 la primera
    // cae y TODAS las posiciones bajan una, incluido el punto de guardado.
    const past = entries(50);
    let state = makeState(customManifest, past, [], 49);
    state = pushEntry(state, 'overflow');

    const hist = state.documentsById.primary.history;
    expect(hist.past).toHaveLength(50);
    expect(hist.lastSavedIndex).toBe(48);
    expect(countUnsavedChanges(hist)).toBe(2);
  });

  it('el contador SIEMPRE coincide con las entradas marcadas', () => {
    // Invariante de la UI: el badge dice N y hay N filas con data-unsaved.
    // Si divergen, el usuario ve "2 unsaved" con un solo punto ámbar.
    const casos: Array<[number, number]> = [
      [0, 0], [1, 0], [1, 1], [5, 3], [5, -1], [50, 49], [50, 0], [3, 7]
    ];
    for (const [len, lsi] of casos) {
      const hist = makeState(customManifest, entries(len), [], lsi).documentsById.primary.history;
      const marked = hist.past.filter((_, i) => isEntryUnsaved(hist, i)).length;
      expect({ len, lsi, count: countUnsavedChanges(hist), marked }).toEqual({
        len, lsi, count: marked, marked
      });
    }
  });

  it('si el punto de guardado se sale de la ventana, todo cuenta como sin guardar', () => {
    // Cursor en 0 y cae la cabeza: la entrada guardada ya no está, así que no
    // se puede afirmar nada y se marca todo como pendiente (conservador).
    let state = makeState(customManifest, entries(50), [], 0);
    state = pushEntry(state, 'overflow');

    const hist = state.documentsById.primary.history;
    expect(hist.lastSavedIndex).toBe(-1);
    expect(countUnsavedChanges(hist)).toBe(50);
    expect(hist.past.every((_, i) => isEntryUnsaved(hist, i))).toBe(true);
  });
});

/**
 * `history.future` topado al mismo límite que `past`.
 *
 * En el reducer `future` no llegaba a crecer sin tope (cada operación que lo
 * crece saca las entradas de `past` en la misma llamada, así que
 * `past + future` es un invariante), pero el tope se hace explícito para
 * defenderse de `HYDRATE_SESSION`, que devuelve el estado tal cual.
 */
describe('orchestratorReducer — future también está topado', () => {
  const entries = (n: number, p = 'f') =>
    Array.from({ length: n }, (_, i) => createSnapshotEntry(`${p}${i}`, `c_${p}${i}`, customManifest));

  it('UNDO_DOCUMENT nunca deja future por encima de 50', () => {
    // future previo al límite, llenado de entradas distinguibles.
    let state = makeState(customManifest, entries(50, 'p'), entries(50, 'f'), 50);

    for (let i = 0; i < 10; i++) {
      state = orchestratorReducer(state, { type: 'UNDO_DOCUMENT', id: 'primary' });
      expect(state.documentsById.primary.history.future.length).toBeLessThanOrEqual(50);
    }
  });

  it('UNDO_TO_INDEX nunca deja future por encima de 50', () => {
    let state = makeState(customManifest, entries(50, 'p'), entries(50, 'f'), 50);

    for (let i = 0; i < 10; i++) {
      const pastLen = state.documentsById.primary.history.past.length;
      if (pastLen === 0) break;
      state = orchestratorReducer(state, {
        type: 'UNDO_TO_INDEX',
        id: 'primary',
        index: Math.floor(pastLen / 2)
      });
      expect(state.documentsById.primary.history.future.length).toBeLessThanOrEqual(50);
    }
  });

  it('al recortar future se conserva la entrada siguiente a rehacer', () => {
    // future[0] es lo que replay el próximo redo: si el recorte cayera por la
    // cabeza se perdería justo lo que el usuario está a punto de rehacer.
    const future = entries(80, 'f');
    const nextUp = future[0];

    let state = makeState(customManifest, entries(50, 'p'), future, 50);
    state = orchestratorReducer(state, { type: 'UNDO_DOCUMENT', id: 'primary' });

    const after = state.documentsById.primary.history.future;
    expect(after.length).toBe(50);
    // Lo nuevo (el estado previo al undo) queda primero; el resto es la cola.
    // Ojo: la etiqueta es la del reducer, 'Current State', no la de
    // historyService ('Pre-Undo State'): son dos implementaciones distintas.
    expect(after[0].label).toBe('Current State');
    // Y la cola de redo previa sigue empezando por f0: no se perdió lo
    // siguiente a rehacer.
    expect(after[1].label).toBe(nextUp.label);
  });

  it('el recorte descarta por la cola, no por la cabeza', () => {
    const future = entries(80, 'f'); // f0..f79
    let state = makeState(customManifest, entries(50, 'p'), future, 50);
    state = orchestratorReducer(state, { type: 'UNDO_DOCUMENT', id: 'primary' });

    const labels = state.documentsById.primary.history.future.map((e) => e.label);
    // f79 es lo más viejo (cola) y es lo que debe desaparecer.
    expect(labels).not.toContain('f79');
    expect(labels).toContain('f1');
  });

  it('una sesión hidratada con future enorme queda recortada al usarlo', () => {
    // HYDRATE_SESSION no pasa por appendToPast, así que puede traer más de 50.
    const hydrated = orchestratorReducer(makeState(customManifest), {
      type: 'HYDRATE_SESSION',
      state: makeState(customManifest, entries(50, 'p'), entries(500, 'f'), 50)
    });
    expect(hydrated.documentsById.primary.history.future.length).toBe(500);

    // La siguiente operación que crece future aplica el tope.
    const next = orchestratorReducer(hydrated, { type: 'UNDO_DOCUMENT', id: 'primary' });
    expect(next.documentsById.primary.history.future.length).toBe(50);
  });
});

/**
 * INVARIANTE: siempre hay un documento activo.
 *
 * No es una preferencia de estilo. `useDocumentOrchestrator` resuelve el
 * documento activo como `documentsById[activeDocumentId] ||
 * documentsById['primary']` y `useManifestEditor` desestructura
 * `activeDoc.manifest` sin comprobar nada. Con el mapa vacío, las dos ramas
 * caen y el editor revienta con un TypeError. Estos tests fijan las tres
 * puertas por las que se puede entrar ese estado.
 */
describe('orchestratorReducer — invariante de documento activo', () => {
  /** Dos documentos, `primary` activo. */
  function twoDocs(): OrchestratorState {
    const base = makeState(customManifest);
    return {
      documentsById: {
        ...base.documentsById,
        second: { ...base.documentsById.primary, id: 'second' }
      },
      activeDocumentId: 'primary'
    };
  }

  /** El estado roto que producía el bug: mapa vacío e id fantasma. */
  function emptyState(): OrchestratorState {
    return { documentsById: {}, activeDocumentId: 'primary' };
  }

  it('cerrar el ÚLTIMO documento no lo cierra', () => {
    const state = makeState(customManifest);
    const next = orchestratorReducer(state, { type: 'CLOSE_DOCUMENT', id: 'primary' });

    // No-op: se devuelve el MISMO estado, no uno equivalente.
    expect(next).toBe(state);
    expect(Object.keys(next.documentsById)).toEqual(['primary']);
    expect(next.documentsById[next.activeDocumentId]).toBeDefined();
  });

  it('el documento que se resiste a cerrar conserva su historial y su dirty', () => {
    // El no-op tiene que ser de VERDAD: si descartara el documento, el
    // "guard" sería una forma educada de perder el trabajo sin guardar.
    const state = makeState(customManifest, [
      createSnapshotEntry('edit', 'undo_op', customManifest)
    ]);
    const dirty = orchestratorReducer(state, { type: 'SET_DIRTY', id: 'primary', isDirty: true });
    const next = orchestratorReducer(dirty, { type: 'CLOSE_DOCUMENT', id: 'primary' });

    expect(next.documentsById.primary.isDirty).toBe(true);
    expect(next.documentsById.primary.history.past).toHaveLength(1);
  });

  it('cerrar uno de varios sí cierra y deja activo un documento real', () => {
    const next = orchestratorReducer(twoDocs(), { type: 'CLOSE_DOCUMENT', id: 'second' });
    expect(Object.keys(next.documentsById)).toEqual(['primary']);
    expect(next.documentsById[next.activeDocumentId]).toBeDefined();
  });

  it('cerrar el documento ACTIVO con otros abiertos reasigna a uno existente', () => {
    const next = orchestratorReducer(twoDocs(), { type: 'CLOSE_DOCUMENT', id: 'primary' });
    expect(Object.keys(next.documentsById)).toEqual(['second']);
    expect(next.activeDocumentId).toBe('second');
    expect(next.documentsById[next.activeDocumentId]).toBeDefined();
  });

  it('cerrar en cascada nunca deja el mapa vacío', () => {
    // El caso que de verdad importaba: tres cierres seguidos
    // seguidas. El último close tenía que seguir teniendo a qué agarrarse.
    let state = twoDocs();
    state = orchestratorReducer(state, { type: 'OPEN_DOCUMENT', id: 'third', manifest: customManifest });
    for (const id of ['third', 'second', 'primary']) {
      state = orchestratorReducer(state, { type: 'CLOSE_DOCUMENT', id });
      expect(Object.keys(state.documentsById).length).toBeGreaterThan(0);
      expect(state.documentsById[state.activeDocumentId]).toBeDefined();
    }
    expect(Object.keys(state.documentsById)).toEqual(['primary']);
  });

  it('cerrar un id que no existe es inocuo', () => {
    const next = orchestratorReducer(makeState(customManifest), {
      type: 'CLOSE_DOCUMENT',
      id: 'ghost'
    });
    expect(Object.keys(next.documentsById)).toEqual(['primary']);
  });

  it('HYDRATE_SESSION rechaza una sesión vacía en vez de propagarla', () => {
    // Una sesión guardada por una build anterior al guard puede venir con el
    // mapa vacío. Aceptarla devolvía el estado que tumbaba el editor.
    const state = makeState(customManifest);
    const next = orchestratorReducer(state, {
      type: 'HYDRATE_SESSION',
      state: emptyState()
    });
    expect(next).toBe(state);
    expect(next.documentsById[next.activeDocumentId]).toBeDefined();
  });

  it('HYDRATE_SESSION sigue aceptando una sesión con documentos', () => {
    const next = orchestratorReducer(makeState(customManifest), {
      type: 'HYDRATE_SESSION',
      state: twoDocs()
    });
    expect(Object.keys(next.documentsById).sort()).toEqual(['primary', 'second']);
  });

  it('SET_ACTIVE_DOCUMENT rechaza un id que no existe', () => {
    // UPDATE_DOCUMENT, SET_DIRTY, CAPTURE_HASH y RESET_DOCUMENT ya hacían
    // no-op ante un id desconocido. Éste no, y dejaba el id activo apuntando
    // a la nada con el mismo TypeError detrás.
    const state = makeState(customManifest);
    const next = orchestratorReducer(state, { type: 'SET_ACTIVE_DOCUMENT', id: 'ghost' });
    expect(next).toBe(state);
    expect(next.documentsById[next.activeDocumentId]).toBeDefined();
  });

  it('ninguna acción del reducer puede dejar el estado sin documento activo', () => {
    // Barrido a ciegas sobre TODAS las acciones con un id de documento, desde
    // el estado de un solo documento. Si alguien añade una acción nueva que
    // rompa el invariante, esto lo nota sin que nadie tenga que pensarlo.
    const docActions = [
      { type: 'CLOSE_DOCUMENT' },
      { type: 'UPDATE_DOCUMENT', updates: {} },
      { type: 'SET_ACTIVE_DOCUMENT' },
      { type: 'SET_DIRTY', isDirty: true },
      { type: 'CAPTURE_HASH', hash: 'abc' },
      { type: 'SET_INITIALIZED' },
      { type: 'RESET_DOCUMENT' },
      { type: 'UNDO_DOCUMENT' },
      { type: 'REDO_DOCUMENT' },
      { type: 'UNDO_TO_INDEX', index: 0 },
      { type: 'PUSH_HISTORY', entry: createSnapshotEntry('e', 'tx', customManifest) },
      { type: 'START_TRANSACTION', label: 'l', correlationId: 'tx' },
      { type: 'COMMIT_TRANSACTION' },
      { type: 'ABORT_TRANSACTION' }
    ] as const;

    for (const action of docActions) {
      const next = orchestratorReducer(makeState(customManifest), {
        ...action,
        id: 'primary'
      } as unknown as Parameters<typeof orchestratorReducer>[1]);
      expect(Object.keys(next.documentsById).length).toBeGreaterThan(0);
      expect(next.documentsById[next.activeDocumentId]).toBeDefined();
    }
  });
});
