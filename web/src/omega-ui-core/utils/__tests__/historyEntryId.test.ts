/**
 * Tests del generador de ids de historial.
 *
 * Lo que importa no es que el id "sea distinto" sino cuándo tiene que serlo.
 * Estos tests fijan tres fronteras:
 *
 *   1. Dentro de una ráfaga (el bug original: `Date.now()` en milisegundos).
 *   2. Entre productores distintos que comparten generador.
 *   3. Entre SESIONES, que es el caso que abrió la bóveda en IndexedDB: al
 *      recargar el contador vuelve a cero mientras las entradas de la sesión
 *      anterior siguen en la pila.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { nextHistoryEntryId, HISTORY_ID_SESSION_NONCE } from '../historyEntryId';

describe('nextHistoryEntryId', () => {
  it('nunca repite dentro de una ráfaga', () => {
    // 1000 llamadas sin reloj: es el equivalente a un usuario que mantiene
    // pulsado Ctrl+Z, y con el `Date.now()` anterior caían docenas de ids
    // sobre el mismo valor.
    const ids = Array.from({ length: 1000 }, () => nextHistoryEntryId('undo_op'));
    expect(new Set(ids).size).toBe(1000);
  });

  it('es monótono: cada id ordena después del anterior', () => {
    const ids = Array.from({ length: 50 }, () => nextHistoryEntryId('redo'));
    // El relleno a 6 dígitos es lo que hace que esto sea cierto también al
    // pasar de 9 a 10; sin él, `..._10` ordenaría antes que `..._9`.
    const sorted = [...ids].sort();
    expect(sorted).toEqual(ids);
  });

  it('comparte contador entre prefijos distintos', () => {
    // El contador es global al módulo, no por prefijo: dos productores
    // distintos generando en el mismo instante no pueden coincidir.
    const a = nextHistoryEntryId('redo');
    const b = nextHistoryEntryId('undo_op');
    expect(a).not.toBe(b);
    expect(a.split('_').at(-1)).not.toBe(b.split('_').at(-1));
  });

  it('mantiene el prefijo del productor', () => {
    for (const prefix of ['redo', 'undo', 'undo_op', 'tx', 'restore', 'recovery']) {
      expect(nextHistoryEntryId(prefix).startsWith(`${prefix}_`)).toBe(true);
    }
  });

  it('el id incluye el nonce de la sesión', () => {
    const id = nextHistoryEntryId('tx');
    expect(id).toContain(HISTORY_ID_SESSION_NONCE);
  });
});

describe('unicidad entre sesiones', () => {
  it('una instancia nueva del módulo no repite ids de la anterior', () => {
    // Simula una recarga de página: el módulo se evalúa otra vez, el contador
    // vuelve a 1 y el nonce cambia. Con un contador desnudo, el primer id
    // nuevo sería idéntico a uno de los de antes, que es la misma colisión
    // del bug original pero entre recargas.
    const antes: string[] = [];
    for (let i = 0; i < 5; i++) antes.push(nextHistoryEntryId('redo'));

    let despues: string[] = [];
    let nonceDespues = '';
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../historyEntryId') as typeof import('../historyEntryId');
      nonceDespues = mod.HISTORY_ID_SESSION_NONCE;
      for (let i = 0; i < 5; i++) despues.push(mod.nextHistoryEntryId('redo'));
    });

    // El contador efectivamente se reinició (si no, este test no probaría
    // nada): los ids de la sesión nueva empiezan otra vez en 1.
    expect(despues[0].endsWith('_000001')).toBe(true);
    // Y aun así no comparten ni un id.
    expect(despues.filter((id) => antes.includes(id))).toHaveLength(0);
    // La razón por la que no colisionan: el nonce cambió. Si fuera solo
    // `Date.now()`, dos recargas dentro del mismo milisegundo lo compartirían
    // y el contador reiniciado reconstruyería los ids anteriores exactos.
    expect(nonceDespues).not.toBe(HISTORY_ID_SESSION_NONCE);
    expect(despues[0]).toContain(nonceDespues);
  });

  it('el nonce no depende solo del reloj: dos cargas en el MISMO milisegundo difieren', () => {
    // El test anterior compara el nonce nuevo contra el viejo, pero entre
    // ambas evaluaciones el reloj avanza y el resultado depende de si el test
    // tardó más de un milisegundo: con un nonce hecho solo de `Date.now()`
    // pasaría casi siempre y no probaría nada.
    //
    // Congelando el reloj, la única fuente de diferencia es el componente
    // aleatorio, que es justo lo que hay que exigir: dos cargas en el mismo
    // milisegundo (dos pestañas abiertas a la vez, o un reload instantáneo)
    // no pueden compartir nonce, o el contador reiniciado reconstruye los
    // ids de la sesión anterior al revés.
    const reloj = jest.spyOn(Date, 'now').mockReturnValue(1750000000000);
    try {
      const idsPorCarga: string[][] = [];
      for (let carga = 0; carga < 5; carga++) {
        const ids: string[] = [];
        jest.isolateModules(() => {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const mod = require('../historyEntryId') as typeof import('../historyEntryId');
          for (let i = 0; i < 3; i++) ids.push(mod.nextHistoryEntryId('redo'));
        });
        idsPorCarga.push(ids);
      }

      const todos = idsPorCarga.flat();
      expect(new Set(todos).size).toBe(todos.length);
    } finally {
      reloj.mockRestore();
    }
  });

  it('el nonce es estable dentro de la sesión', () => {
    // Si el nonce se calculara por llamada en vez de al cargar el módulo,
    // volvería a ser `Date.now()` con más pasos, y dos llamadas en el mismo
    // milisegundo coincidirían.
    const a = nextHistoryEntryId('x');
    const b = nextHistoryEntryId('x');
    expect(a.split('_')[1]).toBe(b.split('_')[1]);
  });
});
