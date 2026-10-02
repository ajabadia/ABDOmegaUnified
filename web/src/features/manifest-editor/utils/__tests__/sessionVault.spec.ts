/**
 * Tests de la bóveda de sesión (módulo puro).
 *
 * Lo que se protege aquí es la promesa de la funcionalidad: después de
 * recargar, el contador de "sin guardar" y la pila que se puede deshacer
 * siguen siendo los mismos, no un cero.
 */
import {
  SESSION_VAULT_VERSION,
  applySessionVaultRecords,
  buildSessionVaultRecord,
  isSessionVaultRecord,
  parseSessionVaultRecord,
  withoutHistory
} from '../sessionVault';
import type { SessionVaultRecord } from '../sessionVault';
import { countUnsavedChanges, hasUnsavedChanges } from '../historySavePoint';
import vm from 'node:vm';
import type { DocumentState, OrchestratorState } from '../../types/document';

const entry = (n: number) => ({
  id: `e${n}`,
  type: 'SNAPSHOT' as const,
  label: `cambio ${n}`,
  timestamp: 1000 + n,
  correlationId: 'c',
  manifest: { id: 'm' } as never
});

function mkDoc(overrides: Partial<DocumentState> = {}): DocumentState {
  return {
    id: 'd1',
    manifest: { id: 'm' } as never,
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

function mkRecord(overrides: Partial<SessionVaultRecord> = {}): SessionVaultRecord {
  return {
    version: SESSION_VAULT_VERSION,
    documentId: 'd1',
    savedAt: 5,
    manifestHash: 'HASH',
    history: { past: [entry(1), entry(2), entry(3)], future: [], lastSavedIndex: 1 },
    extraResources: [],
    lastStableHash: 'H1',
    ...overrides
  };
}

const bytes = (...values: number[]) => new Uint8Array(values).buffer;

describe('buildSessionVaultRecord', () => {
  it('extrae historial y recursos del documento', () => {
    const resources = [{ name: 'a.wav', data: bytes(1, 2, 3), type: 'audio/wav' }];
    const doc = mkDoc({
      extraResources: resources,
      history: { past: [entry(1)], future: [entry(2)], lastSavedIndex: 0 }
    });

    const record = buildSessionVaultRecord(doc, 'HASH');

    expect(record.documentId).toBe('d1');
    expect(record.manifestHash).toBe('HASH');
    expect(record.history.past).toHaveLength(1);
    expect(record.history.future).toHaveLength(1);
    expect(record.history.lastSavedIndex).toBe(0);
    expect(record.extraResources).toBe(resources);
  });

  it('no clona: el clonado es de IndexedDB y hacerlo aquí dobla el coste', () => {
    // Si esto clona, cada guardado de una pila de 50 entradas paga dos
    // structuredClone del mismo objeto. El test falla si alguien "optimiza"
    // por whimsical.
    const doc = mkDoc();
    const record = buildSessionVaultRecord(doc, 'HASH');
    expect(record.extraResources).toBe(doc.extraResources);
    expect(record.history.past).toBe(doc.history.past);
  });
});

describe('parseSessionVaultRecord', () => {
  it('rechaza registros de otra versión de esquema', () => {
    // Interpretar un esquema desconocido con la lógica de esta versión
    // produciría un deshacer que lleva a estados que nunca existieron.
    // (El 2 dejó de ser "desconocido": es la versión actual, y el 1 se lee
    // para no dejar a nadie sin deshacer al publicar esto.)
    expect(parseSessionVaultRecord(mkRecord({ version: 99 }))).toBeNull();
    expect(parseSessionVaultRecord(mkRecord({ version: 0 }))).toBeNull();
    expect(parseSessionVaultRecord(mkRecord({ version: undefined as never }))).toBeNull();
  });

  it('LEE un registro v1, que no traía manifiesto', () => {
    // Publicar v2 no puede costarle el deshacer a quien ya tenía v1 escrito.
    // Un v1 sigue sirviendo para lo que servía: historial y recursos.
    const v1 = parseSessionVaultRecord(mkRecord({ version: 1, manifest: undefined }));
    expect(v1).not.toBeNull();
    expect(v1?.history.past).toHaveLength(3);
    expect(v1?.manifest).toBeUndefined();
    // Y se normaliza subiendo a la versión actual.
    expect(v1?.version).toBe(SESSION_VAULT_VERSION);
  });

  it('un v1 que por lo que sea traiga manifiesto NO lo aprovecha', () => {
    // La versión dice cuál es la forma del registro, no lo que hay en el
    // objeto: fiarse del contenido de un v1 sería leer un esquema que esta
    // build no garantiza.
    const v1ConManifiesto = parseSessionVaultRecord(mkRecord({ version: 1 }));
    expect(v1ConManifiesto?.manifest).toBeUndefined();
  });

  it('un v2 sin manifiesto legible degrada a "sin manifiesto", no a null', () => {
    // El historial sigue siendo válido aunque el manifiesto falte: es el
    // mismo trato que recibe un v1, y permite distinguir "registro roto" de
    // "registro que no se puede resucitar".
    const v2SinManifiesto = parseSessionVaultRecord(
      mkRecord({ version: SESSION_VAULT_VERSION, manifest: undefined })
    );
    expect(v2SinManifiesto).not.toBeNull();
    expect(v2SinManifiesto?.manifest).toBeUndefined();
  });

  it('rechaza lo que no tiene identidad ni unión posible', () => {
    expect(parseSessionVaultRecord(null)).toBeNull();
    expect(parseSessionVaultRecord('{}')).toBeNull();
    expect(parseSessionVaultRecord(mkRecord({ documentId: '' }))).toBeNull();
    expect(parseSessionVaultRecord(mkRecord({ manifestHash: '' }))).toBeNull();
  });

  it('acepta un registro bien formado', () => {
    const parsed = parseSessionVaultRecord(mkRecord());
    expect(parsed).not.toBeNull();
    expect(parsed!.history.past).toHaveLength(3);
    expect(isSessionVaultRecord(mkRecord())).toBe(true);
    expect(isSessionVaultRecord({ nope: true })).toBe(false);
  });

  it('descarta entradas corruptas sin tirar la pila entera', () => {
    const raw = mkRecord();
    (raw.history.past as unknown[]).push(
      null,
      { id: 'sin-manifiesto' },
      { ...entry(9), timestamp: 'no' }
    );

    const parsed = parseSessionVaultRecord(raw)!;

    // Las tres primeras están bien; las tres añadidas no son utilizables por el
    // reducer (sin id, sin manifiesto, timestamp no numérico) y se van. Perder
    // 3 de 6 es un incidente; perder las 6 porque una llegó mal, no.
    expect(parsed.history.past).toHaveLength(3);
    expect(parsed.history.past.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
  });

  it('aplica el mismo tope de 50 que el reducer', () => {
    const raw = mkRecord({
      history: {
        past: Array.from({ length: 80 }, (_, i) => entry(i)),
        future: [],
        lastSavedIndex: 70
      }
    });

    const parsed = parseSessionVaultRecord(raw)!;

    // Conserva la CABEZA de `past`, igual que `appendToPast`.
    expect(parsed.history.past).toHaveLength(50);
    expect(parsed.history.past[0].id).toBe('e30');
    expect(parsed.history.lastSavedIndex).toBe(50);
  });

  it('recorta los recursos cuyo binario se perdió', () => {
    // Lo que deja un round-trip por JSON: `{ name, type }` sin `data`. Un
    // `ArrayBuffer` serializado sale como `{}` y el recurso apuntaría a nada.
    const raw = mkRecord({
      extraResources: [
        { name: 'roto', type: 'audio/wav' } as never,
        { name: 'bueno', type: 'audio/wav', data: bytes(9) }
      ]
    });

    const parsed = parseSessionVaultRecord(raw)!;

    expect(parsed.extraResources).toHaveLength(1);
    expect(parsed.extraResources[0].name).toBe('bueno');
  });

  it('acepta un binario que viene de otro reino', () => {
    // `instanceof ArrayBuffer` da FALSE para un ArrayBuffer de otro contexto
    // (worker, iframe, vm) aunque sea perfectamente válido. Si el guard fuera
    // `instanceof`, este recurso se descartaría en silencio y el documento
    // volvería sin sus assets, sin error ni aviso. IndexedDB clona a través
    // de la frontera cuando el dato viene de un worker, así que el caso es
    // real, no teórico.
    const foreign = vm.runInNewContext('new Uint8Array([7, 8, 9]).buffer') as ArrayBuffer;
    expect(foreign instanceof ArrayBuffer).toBe(false);

    const parsed = parseSessionVaultRecord(
      mkRecord({ extraResources: [{ name: 'worker.wav', type: 'audio/wav', data: foreign }] })
    )!;

    expect(parsed.extraResources).toHaveLength(1);
    expect(new Uint8Array(parsed.extraResources[0].data)).toEqual(new Uint8Array([7, 8, 9]));
  });

  it('acepta TypedArrays y rechaza el resto', () => {
    const ok = parseSessionVaultRecord(
      mkRecord({ extraResources: [{ name: 'v.wav', type: 'audio/wav', data: new Uint8Array([1]) as never }] })
    )!;
    expect(ok.extraResources).toHaveLength(1);

    const bad = parseSessionVaultRecord(
      mkRecord({
        extraResources: [
          { name: 'c.wav', type: 'audio/wav', data: 'data:audio/wav;base64,AA' } as never,
          { name: 'n.wav', type: 'audio/wav', data: null as never }
        ]
      })
    )!;
    expect(bad.extraResources).toHaveLength(0);
  });

  it('tolera un historial que no es un historial', () => {
    const raw = mkRecord({ history: { past: 'nope', future: 7, lastSavedIndex: 3 } as never });
    const parsed = parseSessionVaultRecord(raw)!;
    // El cursor se recorta a `past.length` (0), que es lo que dicta
    // `repairHistoryState`. Con la pila vacía, 0 y -1 dan ambos 0 cambios sin
    // guardar: el documento se rehidrata limpio en cualquiera de los dos.
    expect(parsed.history).toEqual({ past: [], future: [], lastSavedIndex: 0 });
    expect(countUnsavedChanges(parsed.history)).toBe(0);
  });
});

describe('withoutHistory', () => {
  it('sacrifica el historial antes que los assets', () => {
    const resources = [{ name: 'a.wav', data: bytes(1), type: 'audio/wav' }];
    const stripped = withoutHistory(mkRecord({ extraResources: resources }));

    expect(stripped.history.past).toHaveLength(0);
    expect(stripped.history.lastSavedIndex).toBe(-1);
    // Los binarios del proyecto se quedan: sin assets el documento vale
    // bastante menos que sin deshacer.
    expect(stripped.extraResources).toBe(resources);
  });
});

describe('applySessionVaultRecords', () => {
  const HASHES = { d1: 'HASH' };

  it('pega la pila y CONSERVA el punto de guardado', () => {
    // Este es el corazón de la funcionalidad. Si `isInitializing` se
    // quedara en true, el watcher haría CAPTURE_HASH a los 500 ms y
    // lastSavedIndex saltaría a past.length: el contador de "sin guardar"
    // pasa de 2 a 0 y deshacer hasta el guardado ya no deja el documento
    // limpio.
    const doc = mkDoc({ isInitializing: true, isDirty: false });
    const state = mkState(doc);

    const next = applySessionVaultRecords(state, [mkRecord()], HASHES);

    const restored = next.documentsById.d1;
    expect(restored.history.past).toHaveLength(3);
    expect(restored.history.lastSavedIndex).toBe(1);
    expect(restored.isInitializing).toBe(false);
    // 3 entradas vivas, cursor en 1 → 2 sin guardar, igual que antes de
    // recargar.
    expect(countUnsavedChanges(restored.history)).toBe(2);
    expect(hasUnsavedChanges(restored.history)).toBe(true);
  });

  it('no toca el manifiesto: la bóveda es un complemento, no la autoridad', () => {
    const manifest = { id: 'm' } as never;
    const state = mkState(mkDoc({ manifest }));
    const next = applySessionVaultRecords(state, [mkRecord()], HASHES);
    expect(next.documentsById.d1.manifest).toBe(manifest);
  });

  it('recupera los extraResources con sus ArrayBuffer', () => {
    const state = mkState(mkDoc());
    const record = mkRecord({
      extraResources: [{ name: 'kit.wav', data: bytes(1, 2, 3, 4), type: 'audio/wav' }]
    });

    const next = applySessionVaultRecords(state, [record], HASHES);

    const resources = next.documentsById.d1.extraResources;
    expect(resources).toHaveLength(1);
    expect(new Uint8Array(resources[0].data)).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('ignora el registro si el manifiesto no es el mismo', () => {
    // La pila pertenece al manifiesto del que salió. Si el manifiesto en
    // pantalla es otro (sesión más nueva, escritura de localStorage que sí
    // llegó y la de IndexedDB que no), colgarla llevaría al primer Ctrl+Z a
    // un estado que el usuario nunca vio.
    const state = mkState(mkDoc());
    const result = applySessionVaultRecords(state, [mkRecord()], { d1: 'OTRO_HASH' });
    expect(result).toBe(state);
  });

  it('no crea documentos que no están en la sesión', () => {
    const state = mkState(mkDoc());
    const result = applySessionVaultRecords(
      state,
      [mkRecord({ documentId: 'fantasma' })],
      { fantasma: 'HASH' }
    );
    expect(result).toBe(state);
    expect(Object.keys(result.documentsById)).toEqual(['d1']);
  });

  it('gana el registro más reciente cuando hay dos del mismo documento', () => {
    const state = mkState(mkDoc());
    const older = mkRecord({ savedAt: 1, history: { past: [entry(1)], future: [], lastSavedIndex: 0 } });
    const newer = mkRecord({ savedAt: 9, history: { past: [entry(1), entry(2)], future: [], lastSavedIndex: 0 } });

    const next = applySessionVaultRecords(state, [newer, older], HASHES);

    expect(next.documentsById.d1.history.past).toHaveLength(2);
  });

  it('marca sucio solo si el hash guardado difiere del estable', () => {
    const state = mkState(mkDoc({ lastStableHash: 'H1' }));

    const limpio = applySessionVaultRecords(state, [mkRecord({ lastStableHash: 'H1' })], HASHES);
    expect(limpio.documentsById.d1.isDirty).toBe(false);

    const sucio = applySessionVaultRecords(state, [mkRecord({ lastStableHash: 'H9' })], HASHES);
    expect(sucio.documentsById.d1.isDirty).toBe(true);
  });

  it('devuelve la misma referencia si no hay nada que pegar', () => {
    const state = mkState(mkDoc());
    expect(applySessionVaultRecords(state, [], HASHES)).toBe(state);
  });

  it('no muta el estado de entrada', () => {
    const doc = mkDoc({ isInitializing: true });
    const state = mkState(doc);
    applySessionVaultRecords(state, [mkRecord()], HASHES);
    expect(doc.history.past).toHaveLength(0);
    expect(doc.isInitializing).toBe(true);
  });
});
