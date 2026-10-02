/**
 * Tests for the persisted-session repair.
 *
 * La persistencia de sesión EXCLUYE `history` al guardar (el replacer de
 * `useSessionPersistence`), pero sí guarda `isDirty` y `lastStableHash`. Sin
 * reparación, al recargar un documento anunciaba "cambios sin guardar" sin
 * ninguna entrada que los respaldara: pestaña sucia, timeline a 0 y nada que
 * deshacer.
 */
import { repairPersistedDocument, repairPersistedState, readHistoryDepths } from '../sessionRestore';
import { countUnsavedChanges, hasUnsavedChanges } from '../historySavePoint';
import type { DocumentState, OrchestratorState } from '../../types/document';

const mkEntry = (label: string) =>
  ({
    id: `x_${label}`,
    type: 'SNAPSHOT' as const,
    label,
    timestamp: 1,
    correlationId: 'c',
    manifest: { id: 'm' } as never
  });

function mkDoc(overrides: Partial<DocumentState> = {}): DocumentState {
  return {
    id: 'd1',
    manifest: { id: 'm', metadata: { name: 'n', version: '1' } } as never,
    contract: null,
    wasmBuffer: null,
    extraResources: [],
    isDirty: false,
    lastStableHash: '',
    isInitializing: false,
    history: { past: [], future: [], lastSavedIndex: -1 },
    ...overrides
  };
}

describe('repairPersistedDocument', () => {
  it('descarta una sesión que se guardó sucia pero sin historial', () => {
    // Estado real tras recargar: isDirty persistido, historial descartado.
    const doc = mkDoc({ isDirty: true, lastStableHash: 'HASH_ANTES' });

    const fixed = repairPersistedDocument(doc);

    expect(fixed.isDirty).toBe(false);
    expect(fixed.isInitializing).toBe(true);
    expect(fixed.history).toEqual({ past: [], future: [], lastSavedIndex: -1 });
    // Sin historial no hay ni cambios sin guardar ni punto de guardado que mienta.
    expect(countUnsavedChanges(fixed.history)).toBe(0);
    expect(hasUnsavedChanges(fixed.history)).toBe(false);
  });

  it('fuerza el re-baselining para que el hash se recalcule', () => {
    // Si isInitializing se quedara en false, el watcher nunca haría
    // CAPTURE_HASH y compararía el manifiesto restaurado contra un hash viejo.
    expect(repairPersistedDocument(mkDoc()).isInitializing).toBe(true);
    expect(repairPersistedDocument(mkDoc({ isInitializing: true })).isInitializing).toBe(true);
  });

  it('rellena history ausente o corrupta sin lanzar', () => {
    const sinHistory = mkDoc();
    delete (sinHistory as Partial<DocumentState>).history;
    expect(repairPersistedDocument(sinHistory).history).toEqual({
      past: [], future: [], lastSavedIndex: -1
    });

    const basurero = mkDoc({
      history: { past: 'nope', future: null, lastSavedIndex: NaN } as never
    });
    expect(repairPersistedDocument(basurero).history).toEqual({
      past: [], future: [], lastSavedIndex: -1
    });
  });

  it('recorta lastSavedIndex fuera del rango válido del cursor', () => {
    // Rango válido: [-1, past.length]. Por encima no existe ninguna posición.
    const alto = mkDoc({
      history: { past: [mkEntry('a'), mkEntry('b')], future: [], lastSavedIndex: 99 }
    });
    expect(repairPersistedDocument(alto).history.lastSavedIndex).toBe(2);

    const bajo = mkDoc({
      history: { past: [mkEntry('a')], future: [], lastSavedIndex: -50 }
    });
    expect(repairPersistedDocument(bajo).history.lastSavedIndex).toBe(-1);
  });

  it('acepta lastSavedIndex === past.length (cursor en la punta)', () => {
    // Es un valor legítimo: el documento se guardó justo en esa posición.
    const doc = mkDoc({
      history: { past: [mkEntry('a'), mkEntry('b')], future: [], lastSavedIndex: 2 }
    });
    const fixed = repairPersistedDocument(doc);
    expect(fixed.history.lastSavedIndex).toBe(2);
    expect(countUnsavedChanges(fixed.history)).toBe(0);
  });

  it('topa past y future a 50 entradas', () => {
    const many = Array.from({ length: 120 }, (_, i) => mkEntry(`e${i}`));
    const doc = mkDoc({
      history: { past: many, future: many, lastSavedIndex: 3 }
    });

    const h = repairPersistedDocument(doc).history;
    expect(h.past).toHaveLength(50);
    expect(h.future).toHaveLength(50);
    // past conserva la cola (lo más reciente), future la cabeza (lo siguiente
    // a rehacer).
    expect(h.past[h.past.length - 1].label).toBe('e119');
    expect(h.future[0].label).toBe('e0');
  });

  it('rellena contract/wasmBuffer/extraResources ausentes', () => {
    const doc = mkDoc({
      contract: undefined as never,
      wasmBuffer: undefined as never,
      extraResources: undefined as never
    });
    const fixed = repairPersistedDocument(doc);
    expect(fixed.contract).toBeNull();
    expect(fixed.wasmBuffer).toBeNull();
    expect(fixed.extraResources).toEqual([]);
  });
});

describe('repairPersistedState', () => {
  const state = (docs: Record<string, Partial<DocumentState>>, active: string): OrchestratorState =>
    ({ documentsById: docs as never, activeDocumentId: active });

  it('repara todos los documentos', () => {
    const out = repairPersistedState(
      state({ a: mkDoc({ id: 'a', isDirty: true }), b: mkDoc({ id: 'b' }) }, 'a')
    );
    expect(out).not.toBeNull();
    expect(Object.keys(out!.documentsById).sort()).toEqual(['a', 'b']);
    expect(out!.documentsById.a.isDirty).toBe(false);
  });

  it('reapunta activeDocumentId si el persistido no existe', () => {
    // CLOSE_DOCUMENT puede dejar 'primary' con documentsById vacío, y esa
    // sesión se guardaba tal cual: al restaurarla activeDocument quedaba
    // undefined y el editor reventaba al leer activeDoc.manifest.
    const out = repairPersistedState(state({ solo: mkDoc({ id: 'solo' }) }, 'primary'));
    expect(out!.activeDocumentId).toBe('solo');
  });

  it('conserva activeDocumentId cuando sí existe', () => {
    const out = repairPersistedState(state({ a: mkDoc({ id: 'a' }), b: mkDoc({ id: 'b' }) }, 'b'));
    expect(out!.activeDocumentId).toBe('b');
  });

  it('devuelve null si no hay nada que hidratar', () => {
    expect(repairPersistedState(null)).toBeNull();
    expect(repairPersistedState(undefined)).toBeNull();
    expect(repairPersistedState({ documentsById: {}, activeDocumentId: 'primary' } as never)).toBeNull();
    expect(repairPersistedState({ activeDocumentId: 'primary' } as never)).toBeNull();
  });

  it('el documento hidratado siempre resuelve a un activo real', () => {
    const out = repairPersistedState(state({ x: mkDoc({ id: 'x' }) }, 'fantasma'))!;
    expect(out.documentsById[out.activeDocumentId]).toBeDefined();
  });
});

describe('readHistoryDepths', () => {
  it('lee las profundidades del payload', () => {
    expect(readHistoryDepths({ historyDepthById: { primary: 12, otro: 3 } })).toEqual({
      primary: 12,
      otro: 3
    });
  });

  it('tolera payloads antiguos sin la propiedad', () => {
    // Sesiones guardadas antes de que existiera: sin depths, sin aviso. Es
    // el caso por defecto en la primera carga tras desplegar esto.
    expect(readHistoryDepths({ documentsById: {}, activeDocumentId: 'primary' })).toEqual({});
    expect(readHistoryDepths(null)).toEqual({});
    expect(readHistoryDepths('texto')).toEqual({});
  });

  it('descarta valores que no son profundidades', () => {
    // Un `NaN` serializado llega como `null`; un string, como string. Si
    // colaran, el aviso diría "null pasos".
    const depths = readHistoryDepths({
      historyDepthById: { a: 4, b: null, c: '7', d: -2, e: 1.7, f: Number.NaN }
    });
    expect(depths).toEqual({ a: 4, e: 1 });
  });

  it('ignora un array en lugar de un mapa', () => {
    expect(readHistoryDepths({ historyDepthById: [1, 2, 3] })).toEqual({});
  });

  it('el 0 no se anota: no hay nada que perder', () => {
    expect(readHistoryDepths({ historyDepthById: { a: 0 } })).toEqual({});
  });
});