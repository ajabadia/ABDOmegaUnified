/**
 * Tests de las migraciones de sesión.
 *
 * Lo que se fija aquí es qué se considera "roto", qué se reescribe y, sobre
 * todo, qué NO se toca. Una migración de datos es de las cosas más fáciles de
 * estropear en silencio: si distingue mal, se come una sesión buena; si
 * reescribe de más, borra trabajo.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { STORAGE_KEYS } from '@/omega-ui-core/constants/storage';
import {
  runSessionMigrations,
  hasEmptyDocumentsSession,
  buildRepairedSessionPayload,
  SESSION_MIGRATION_IDS,
  type SessionStorageLike
} from '../sessionMigrations';

/** Almacén en memoria: mismo contrato que `localStorage`, sin jsdom. */
function makeStorage(seed: Record<string, string> = {}): SessionStorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>(Object.entries(seed));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    }
  };
}

const brokenSession = () =>
  JSON.stringify({ documentsById: {}, activeDocumentId: 'primary', historyDepthById: {} });

const goodSession = () =>
  JSON.stringify({
    documentsById: { primary: { id: 'primary', history: { past: [], future: [], lastSavedIndex: -1 } } },
    activeDocumentId: 'primary',
    historyDepthById: { primary: 0 }
  });

beforeEach(() => {
  // nada global que limpiar: cada test usa su propio almacén
});

describe('hasEmptyDocumentsSession', () => {
  it('detecta el payload que dejaba el bug', () => {
    expect(hasEmptyDocumentsSession({ documentsById: {}, activeDocumentId: 'primary' })).toBe(true);
  });

  it('NO detecta una sesión con documentos', () => {
    expect(hasEmptyDocumentsSession({ documentsById: { primary: {} } })).toBe(false);
  });

  it('NO detecta la ausencia de sesión (usuario nuevo)', () => {
    // No hay payload roto: no hay nada. Avisar aquí sería gritarle a un
    // usuario que acaba de instalar la app.
    expect(hasEmptyDocumentsSession(null)).toBe(false);
    expect(hasEmptyDocumentsSession(undefined)).toBe(false);
    expect(hasEmptyDocumentsSession('{}')).toBe(false);
  });

  it('es escrupuloso con la forma de documentsById', () => {
    // Un `documentsById` que no es un objeto (ni siquiera un array) no es el
    // caso que migra esto: es corrupción de otro tipo, con otra reparación.
    expect(hasEmptyDocumentsSession({ documentsById: 'nope' })).toBe(false);
    expect(hasEmptyDocumentsSession({ documentsById: [] })).toBe(false);
    expect(hasEmptyDocumentsSession({ documentsById: null })).toBe(false);
    expect(hasEmptyDocumentsSession(42)).toBe(false);
  });
});

describe('buildRepairedSessionPayload', () => {
  it('produce un payload que ya NO está roto', () => {
    const reparado = JSON.parse(buildRepairedSessionPayload());
    expect(hasEmptyDocumentsSession(reparado)).toBe(false);
  });

  it('lleva historyDepthById, que el guardado normal sí escribe', () => {
    // Sin esta clave, la próxima carga leería `undefined` al pedir la
    // profundidad del documento activo.
    const reparado = JSON.parse(buildRepairedSessionPayload());
    expect(reparado.historyDepthById).toBeDefined();
    for (const id of Object.keys(reparado.documentsById)) {
      expect(typeof reparado.historyDepthById[id]).toBe('number');
    }
  });

  it('el documento activo existe de verdad en el payload reparado', () => {
    const reparado = JSON.parse(buildRepairedSessionPayload());
    expect(reparado.documentsById[reparado.activeDocumentId]).toBeDefined();
  });
});

describe('runSessionMigrations', () => {
  it('reescribe el payload roto y lo marca como migrado', () => {
    const storage = makeStorage({ [STORAGE_KEYS.SESSION_DOCS]: brokenSession() });
    const report = runSessionMigrations(storage);

    expect(report.detectedEmptyDocuments).toBe(true);
    expect(report.repaired).toBe(true);
    expect(report.applied).toEqual([SESSION_MIGRATION_IDS.EMPTY_DOCUMENTS]);

    // Lo que hay en disco ahora es válido.
    const enDisco = JSON.parse(storage.getItem(STORAGE_KEYS.SESSION_DOCS) ?? 'null');
    expect(hasEmptyDocumentsSession(enDisco)).toBe(false);
    expect(enDisco.activeDocumentId).toBeDefined();
  });

  it('es de UNA SOLA VEZ: la segunda pasada no repite', () => {
    const storage = makeStorage({ [STORAGE_KEYS.SESSION_DOCS]: brokenSession() });
    runSessionMigrations(storage);

    // La prueba de que corrió una sola vez es el marcador en disco, no el
    // informe: la segunda pasada no encuentra nada roto porque la primera ya
    // lo arregló, así que ni siquiera llega a consultar el marcador.
    const marcador = JSON.parse(storage.getItem(STORAGE_KEYS.SESSION_MIGRATIONS) ?? '[]');
    expect(marcador).toEqual([SESSION_MIGRATION_IDS.EMPTY_DOCUMENTS]);

    const segunda = runSessionMigrations(storage);
    expect(segunda.repaired).toBe(false);
    expect(segunda.applied).toEqual([]);
    expect(segunda.detectedEmptyDocuments).toBe(false);
  });

  it('consulta el marcador cuando el payload sigue roto, y lo salta', () => {
    // Esta es la rama del marcador: el payload continúa vacío (corrupto a
    // mano, o de otra build) pero la migración ya corrió una vez.
    const storage = makeStorage({
      [STORAGE_KEYS.SESSION_DOCS]: brokenSession(),
      [STORAGE_KEYS.SESSION_MIGRATIONS]: JSON.stringify([SESSION_MIGRATION_IDS.EMPTY_DOCUMENTS])
    });
    const report = runSessionMigrations(storage);

    expect(report.detectedEmptyDocuments).toBe(true);
    expect(report.repaired).toBe(false);
    expect(report.skipped).toEqual([SESSION_MIGRATION_IDS.EMPTY_DOCUMENTS]);
    // Y el payload roto se queda como estaba: la migración no reescribe en
    // bucle, aunque el resultado sea que la sesión siga rota.
    expect(storage.getItem(STORAGE_KEYS.SESSION_DOCS)).toBe(brokenSession());
  });

  it('una vez migrado, ni siquiera vuelve a avisar aunque el payload se rompa otra vez', () => {
    // El payload no puede volver a romperse (el reducer lo impide), pero si
    // se corrompe a mano la migración no debe reescribir en un bucle.
    const storage = makeStorage({ [STORAGE_KEYS.SESSION_DOCS]: brokenSession() });
    runSessionMigrations(storage);
    storage.setItem(STORAGE_KEYS.SESSION_DOCS, brokenSession());
    const segunda = runSessionMigrations(storage);

    expect(segunda.detectedEmptyDocuments).toBe(true);
    expect(segunda.repaired).toBe(false);
  });

  it('NO toca una sesión sana', () => {
    const original = goodSession();
    const storage = makeStorage({ [STORAGE_KEYS.SESSION_DOCS]: original });
    const report = runSessionMigrations(storage);

    expect(report.detectedEmptyDocuments).toBe(false);
    expect(report.repaired).toBe(false);
    expect(storage.getItem(STORAGE_KEYS.SESSION_DOCS)).toBe(original);
  });

  it('NO toca nada si no hay sesión', () => {
    const storage = makeStorage();
    const report = runSessionMigrations(storage);

    expect(report.detectedEmptyDocuments).toBe(false);
    expect(report.repaired).toBe(false);
    expect(storage.data.size).toBe(0);
  });

  it('NO inventa documentos perdidos: lostDocumentCount es null, no 0', () => {
    // El payload roto no guarda ni un rastro de lo que tenía. Decir "0" sería
    // afirmar que no había nada, que es justo lo contrario de lo que pasó.
    const storage = makeStorage({ [STORAGE_KEYS.SESSION_DOCS]: brokenSession() });
    expect(runSessionMigrations(storage).lostDocumentCount).toBeNull();
  });

  it('ignora un JSON corrupto en vez de inventar un documento', () => {
    // Reemplazar un payload ilegible por un documento por defecto es otra
    // decisión (descartar la sesión), no la de esta migración.
    const storage = makeStorage({ [STORAGE_KEYS.SESSION_DOCS]: '{no es json' });
    const report = runSessionMigrations(storage);

    expect(report.repaired).toBe(false);
    expect(storage.getItem(STORAGE_KEYS.SESSION_DOCS)).toBe('{no es json');
  });

  it('un marcador corrupto se trata como "no aplicado" y la migración corre', () => {
    const storage = makeStorage({
      [STORAGE_KEYS.SESSION_DOCS]: brokenSession(),
      [STORAGE_KEYS.SESSION_MIGRATIONS]: 'BASURA'
    });
    const report = runSessionMigrations(storage);
    expect(report.repaired).toBe(true);
  });

  it('un marcador con ids desconocidos no se arrastra a la siguiente pasada', () => {
    const storage = makeStorage({
      [STORAGE_KEYS.SESSION_DOCS]: brokenSession(),
      [STORAGE_KEYS.SESSION_MIGRATIONS]: JSON.stringify(['migracion-inventada'])
    });
    runSessionMigrations(storage);
    const guardados = JSON.parse(storage.getItem(STORAGE_KEYS.SESSION_MIGRATIONS) ?? '[]');
    expect(guardados).toEqual([SESSION_MIGRATION_IDS.EMPTY_DOCUMENTS]);
  });

  it('si no se puede escribir, no rompe el arranque', () => {
    const storage: SessionStorageLike = {
      getItem: () => brokenSession(),
      setItem: () => {
        throw new Error('QuotaExceededError');
      }
    };
    const report = runSessionMigrations(storage);
    // La reparación no se puede hacer, pero el editor sigue.
    expect(report.repaired).toBe(false);
  });

  it('si ni siquiera se puede leer, no rompe el arranque', () => {
    const storage: SessionStorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {}
    };
    const report = runSessionMigrations(storage);
    expect(report.repaired).toBe(false);
  });
});
