/**
 * PHASE 21 - HISTORY ENGINE TEST (Jest)
 *
 * Verifies push, undo, redo and industrial state management.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { historyService } from './historyService';
import type { HistoryEntry } from '@/omega-ui-core/types/history';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

const manifestA: OMEGA_Manifest = {
  metadata: { name: 'Test A', version: '1.0' },
  nodes: [],
  resources: {},
  entities: [],
  ui: {} as OMEGA_Manifest['ui'],
};

const manifestB: OMEGA_Manifest = {
  ...manifestA,
  metadata: { ...manifestA.metadata, name: 'Test B' },
};

function makeEntry(id: string, label: string, manifest: OMEGA_Manifest): HistoryEntry {
  return {
    id,
    type: 'CONTENT_CHANGE',
    label,
    timestamp: Date.now(),
    correlationId: `tx_${id}`,
    manifest,
  };
}

describe('HistoryService', () => {
  beforeEach(() => {
    historyService.clear();
  });

  describe('push', () => {
    it('should push entries to history stack', () => {
      historyService.push(makeEntry('a', 'Initial State', manifestA));
      historyService.push(makeEntry('b', 'Changed Name', manifestB));

      const history = historyService.getHistory();
      expect(history.past).toHaveLength(2);
      expect(history.past[0]).toMatchObject({ id: 'a', label: 'Initial State' });
      expect(history.past[1]).toMatchObject({ id: 'b', label: 'Changed Name' });
    });

    it('should clear future stack on new push (branching rule)', () => {
      historyService.push(makeEntry('a', 'Initial State', manifestA));

      // Simulate undo by moving past to future
      historyService.undo(manifestB);
      let history = historyService.getHistory();
      expect(history.past).toHaveLength(0);
      expect(history.future).toHaveLength(1);

      // New push should clear future
      historyService.push(makeEntry('c', 'New Branch', manifestA));
      history = historyService.getHistory();
      expect(history.future).toHaveLength(0);
    });

    it('should respect maxEntries limit', () => {
      for (let i = 0; i < 60; i++) {
        historyService.push(makeEntry(`e${i}`, `Entry ${i}`, manifestA));
      }
      const history = historyService.getHistory();
      expect(history.past.length).toBeLessThanOrEqual(50);
    });
  });

  describe('undo', () => {
    it('should return null when history is empty', () => {
      const result = historyService.undo(manifestA);
      expect(result).toBeNull();
    });

    it('should move last entry from past to future', () => {
      historyService.push(makeEntry('a', 'Initial State', manifestA));
      historyService.push(makeEntry('b', 'Changed Name', manifestB));

      const result = historyService.undo(manifestB);
      expect(result).not.toBeNull();
      expect(result!.entry).toMatchObject({ id: 'b', label: 'Changed Name' });

      const history = historyService.getHistory();
      expect(history.past).toHaveLength(1);
      expect(history.future).toHaveLength(1);
    });
  });

  describe('redo', () => {
    it('should return null when future is empty', () => {
      const result = historyService.redo(manifestA);
      expect(result).toBeNull();
    });

    it('should move first entry from future back to past', () => {
      historyService.push(makeEntry('a', 'Initial State', manifestA));
      historyService.push(makeEntry('b', 'Changed Name', manifestB));

      // Undo → the popped entry is 'b'; a snapshot is saved to future
      const undoResult = historyService.undo(manifestB);
      expect(undoResult).not.toBeNull();
      expect(undoResult!.entry).toMatchObject({ id: 'b', label: 'Changed Name' });

      let history = historyService.getHistory();
      expect(history.future).toHaveLength(1);
      expect(history.past).toHaveLength(1);

      // Redo → restores the snapshot from future (label 'Pre-Undo State'),
      // and adds a pre-redo snapshot to history
      const result = historyService.redo(manifestA);
      expect(result).not.toBeNull();
      // The entry from future is the snapshot saved during undo
      expect(result!.entry.label).toBe('Pre-Undo State');
      // currentState is the pre-redo snapshot
      expect(result!.currentState.label).toBe('Pre-Redo State');

      history = historyService.getHistory();
      // past = [a, pre-redo snapshot] = 2
      expect(history.past).toHaveLength(2);
      expect(history.future).toHaveLength(0);
    });
  });

  describe('getHistory', () => {
    it('should return copies of past and future arrays', () => {
      historyService.push(makeEntry('a', 'Test', manifestA));
      const history = historyService.getHistory();
      expect(history.past).toHaveLength(1);
      expect(history.future).toHaveLength(0);

      // Should return copies, not references
      history.past.push({} as HistoryEntry);
      expect(historyService.getHistory().past).toHaveLength(1);
    });
  });

  describe('getRevision', () => {
    it('should find entry by ID in past', () => {
      historyService.push(makeEntry('a', 'Test', manifestA));
      const rev = historyService.getRevision('a');
      expect(rev).toBeDefined();
      expect(rev!.id).toBe('a');
    });

    it('should return undefined for unknown ID', () => {
      const rev = historyService.getRevision('nonexistent');
      expect(rev).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all history and future', () => {
      historyService.push(makeEntry('a', 'Test', manifestA));
      historyService.clear();
      const history = historyService.getHistory();
      expect(history.past).toHaveLength(0);
      expect(history.future).toHaveLength(0);
    });
  });

  describe('restore', () => {
    it('should replace entire history stack', () => {
      historyService.push(makeEntry('a', 'Old', manifestA));
      const newPast = [makeEntry('b', 'Restored B', manifestB)];
      const newFuture = [makeEntry('c', 'Restored C', manifestA)];
      historyService.restore({ past: newPast, future: newFuture });

      const history = historyService.getHistory();
      expect(history.past).toHaveLength(1);
      expect(history.past[0].id).toBe('b');
      expect(history.future).toHaveLength(1);
      expect(history.future[0].id).toBe('c');
    });

    it('should handle empty arrays', () => {
      historyService.push(makeEntry('a', 'Old', manifestA));
      historyService.restore({ past: [], future: [] });
      const history = historyService.getHistory();
      expect(history.past).toHaveLength(0);
      expect(history.future).toHaveLength(0);
    });
  });
});

/**
 * `future` también obeyece el tope de 50.
 *
 * `maxEntries` solo se aplicaba a `history` dentro de `push()`, así que
 * `future` crecía sin límite: `undo()` hacia `unshift` en cada llamada y
 * `restore()` aceptaba la pila del `.omega` sin comprobarla. Este es el growth
 * sin topar real (en el reducer del orchestrator no lo hay, porque allí
 * `past + future` es un invariante y `past` está topado).
 */
describe('HistoryService — límite de future', () => {
  beforeEach(() => {
    historyService.clear();
  });

  it('undo() no deja future por encima de 50', () => {
    for (let i = 0; i < 80; i++) {
      historyService.push(makeEntry(`e${i}`, `Label ${i}`, manifestA));
    }
    expect(historyService.getHistory().past.length).toBe(50);

    // 80 undos = 80 unshifts sobre future.
    for (let i = 0; i < 80; i++) {
      historyService.undo(manifestB);
      expect(historyService.getHistory().future.length).toBeLessThanOrEqual(50);
    }
  });

  it('el recorte de future conserva la entrada siguiente a rehacer', () => {
    for (let i = 0; i < 80; i++) {
      historyService.push(makeEntry(`e${i}`, `Label ${i}`, manifestA));
    }
    for (let i = 0; i < 60; i++) {
      historyService.undo(manifestB);
    }

    const { future } = historyService.getHistory();
    expect(future.length).toBe(50);
    // Lo último deshecho queda primero: es lo que replay el próximo redo.
    expect(future[0].correlationId).toBe('undo_op');
    // Los 50 primeros undone siguen siendo alcanzables por redo.
    expect(future.length).toBe(50);
    // El orden se conserva: todos los deshacer siguen siendo alcanzables por
    // redo en secuencia, sin huecos. (Ojo: los `id` NO son únicos entre sí —
    // ver el bug de `Date.now()` documentado abajo.)
    const timestamps = future.map((e) => e.timestamp);
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1]);
    }
  });

  it('restore() recorta una future mayor que el tope', () => {
    const hugePast = Array.from({ length: 120 }, (_, i) => makeEntry(`p${i}`, `P${i}`, manifestA));
    const hugeFuture = Array.from({ length: 120 }, (_, i) => makeEntry(`f${i}`, `F${i}`, manifestA));

    historyService.restore({ past: hugePast, future: hugeFuture });

    const { past, future } = historyService.getHistory();
    expect(past.length).toBe(50);
    expect(future.length).toBe(50);
    // future conserva la CABEZA (lo siguiente a rehacer), no la cola.
    expect(future[0].label).toBe('F0');
    expect(past[past.length - 1].label).toBe('P119');
  });

  it('restore() con pilas dentro del límite no las toca', () => {
    const past = Array.from({ length: 5 }, (_, i) => makeEntry(`p${i}`, `P${i}`, manifestA));
    const future = Array.from({ length: 3 }, (_, i) => makeEntry(`f${i}`, `F${i}`, manifestA));

    historyService.restore({ past, future });

    expect(historyService.getHistory().past.length).toBe(5);
    expect(historyService.getHistory().future.length).toBe(3);
  });
});

/**
 * IDs DE ENTRADA DE HISTORIAL.
 *
 * Antes se generaban con `Date.now()`, que tiene resolución de milisegundo:
 * cinco `undo()` seguidos caían entera dentro de uno y producían el mismo id.
 * Medido antes del arreglo: 5 deshacer → 2 identificadores distintos.
 *
 * No era cosmético. La línea de tiempo renderiza con `key={entry.id}`, así que
 * con claves duplicadas React reutilizaba la fila equivocada al reconciliar
 * (etiqueta y diff de otra entrada), y `getRevision(id)` —que devuelve la
 * primera coincidencia— reaplicaba la revisión equivocada.
 *
 * El arreglo es un contador monotónico con nonce de sesión
 * (`omega-ui-core/utils/historyEntryId.ts`). Los tests siguientes fijan las
 * propiedades que importan: unicidad dentro de una ráfaga, unicidad con
 * deshacer y rehacer mezclados, y recuperabilidad por id. La unicidad ENTRE
 * sesiones tiene su propio archivo, porque necesita recargar el módulo.
 */
describe('ids de entrada de historial', () => {
  beforeEach(() => {
    historyService.clear();
  });

  it('ids únicos en future tras varios undo() seguidos', () => {
    for (let i = 0; i < 5; i++) {
      historyService.push(makeEntry(`e${i}`, `Label ${i}`, manifestA));
    }
    for (let i = 0; i < 5; i++) {
      historyService.undo(manifestB);
    }

    const ids = historyService.getHistory().future.map((e) => e.id);
    expect(ids.length).toBe(5);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ids únicos mezclando undo y redo', () => {
    // El caso que el test anterior NO cubría: los dos generadores convivían
    // en dos pilas y `Date.now()` los hacía caer al mismo valor.
    for (let i = 0; i < 6; i++) {
      historyService.push(makeEntry(`e${i}`, `Label ${i}`, manifestA));
    }
    const generated: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = historyService.undo(manifestB);
      if (r) generated.push(r.currentState.id);
      const d = historyService.redo(manifestB);
      if (d) generated.push(d.currentState.id);
    }

    expect(generated.length).toBe(6);
    expect(new Set(generated).size).toBe(generated.length);
  });

  it('conserva el prefijo del productor', () => {
    // El prefijo identifica el origen en los logs; el arreglo del id no debe
    // borrarlo.
    for (let i = 0; i < 2; i++) {
      historyService.push(makeEntry(`e${i}`, `Label ${i}`, manifestA));
    }
    const undone = historyService.undo(manifestB)!;
    const redone = historyService.redo(manifestB)!;

    expect(undone.currentState.id.startsWith('redo_')).toBe(true);
    expect(redone.currentState.id.startsWith('undo_')).toBe(true);
  });

  it('getRevision encuentra la entrada correcta entre ids únicos', () => {
    // El síntoma observable del bug: con ids duplicados, buscar por id
    // devolvía la primera coincidencia, que no era la pedida.
    for (let i = 0; i < 3; i++) {
      historyService.push(makeEntry(`e${i}`, `Label ${i}`, manifestA));
    }
    const ids = historyService.getHistory().past.map((e) => e.id);

    for (const id of ids) {
      expect(historyService.getRevision(id)).toBeDefined();
    }
    // Y una entrada concreta es recuperable, no una homónima.
    expect(historyService.getRevision(ids[1])?.id).toBe(ids[1]);
  });
});
