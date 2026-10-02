/**
 * Tests de la resurrección de sesión desde la bóveda.
 *
 * Esto es lo que da sentido a guardar el manifiesto en el registro: sin él,
 * una sesión que se pierde se pierde entera. Con él, la bóveda sabe resucitar
 * los documentos aunque `localStorage` haya perdido la lista.
 *
 * Lo que se protege sobre todo es la LÍMITE de lo que se resucita: un registro
 * sin manifiesto no se puede recuperar, y pegarle a un documento parecido
 * sería inventar un Ctrl+Z que lleva a un estado que el usuario nunca vio.
 */
import { describe, it, expect } from '@jest/globals';
import {
  SESSION_VAULT_VERSION,
  buildSessionVaultRecord,
  parseSessionVaultRecord,
  recoverDocumentsFromVaultRecords
} from '../sessionVault';
import type { SessionVaultRecord } from '../sessionVault';
import type { DocumentState } from '../../types/document';

const manifestOf = (id: string) => ({ id, metadata: { name: id } }) as never;

function mkDoc(overrides: Partial<DocumentState> = {}): DocumentState {
  return {
    id: 'd1',
    manifest: manifestOf('m1'),
    contract: null,
    wasmBuffer: null,
    extraResources: [],
    isDirty: false,
    lastStableHash: 'HASH',
    isInitializing: false,
    history: { past: [], future: [], lastSavedIndex: -1 },
    ...overrides
  };
}

describe('buildSessionVaultRecord — guarda el manifiesto', () => {
  it('incluye el manifiesto vivo en el registro', () => {
    const built = buildSessionVaultRecord(mkDoc({ manifest: manifestOf('mi-doc') }), 'H');
    expect(built.manifest).toEqual(manifestOf('mi-doc'));
  });

  it('el manifiesto guardado NO lleva wasmBuffer ni contract', () => {
    // El manifiesto es JSON puro; los binarios siguen en su sitio. Si se
    // colgara un ArrayBuffer aquí, el registro dejaría de caber donde tiene
    // que caber.
    const built = buildSessionVaultRecord(mkDoc(), 'H');
    expect(built.manifest).not.toHaveProperty('wasmBuffer');
  });
});

describe('recoverDocumentsFromVaultRecords', () => {
  it('resucita un documento desde su manifiesto guardado', () => {
    const rec = buildSessionVaultRecord(
      mkDoc({ id: 'vco', manifest: manifestOf('VcoTwo') }),
      'HASH'
    );
    const recovery = recoverDocumentsFromVaultRecords([rec]);

    expect(recovery).not.toBeNull();
    expect(recovery?.recoveredIds).toEqual(['vco']);
    expect(recovery?.documentsById['vco']).toBeDefined();
    expect(recovery?.documentsById['vco'].manifest).toEqual(manifestOf('VcoTwo'));
  });

  it('respeta el invariante del orquestador: el activo existe', () => {
    const rec = buildSessionVaultRecord(mkDoc({ id: 'vco', manifest: manifestOf('VcoTwo') }), 'H');
    const recovery = recoverDocumentsFromVaultRecords([rec]);
    expect(recovery?.documentsById[recovery?.activeDocumentId ?? '?']).toBeDefined();
  });

  it('trae el historial y los recursos del registro', () => {
    const doc = mkDoc({
      id: 'vco',
      manifest: manifestOf('VcoTwo'),
      extraResources: [{ name: 'a.wav', type: 'audio/wav', data: new ArrayBuffer(4) }],
      history: { past: [], future: [], lastSavedIndex: 3 }
    });
    const rec = buildSessionVaultRecord(doc, 'H');
    const recovery = recoverDocumentsFromVaultRecords([rec]);

    expect(recovery?.documentsById['vco'].history.lastSavedIndex).toBe(3);
    expect(recovery?.documentsById['vco'].extraResources).toHaveLength(1);
  });

  it('deja activo el documento MÁS RECIENTE', () => {
    // Es el documento en el que se estaba trabajando cuando se perdió la
    // sesión, así que es el que el usuario espera encontrar delante.
    const viejo = buildSessionVaultRecord(mkDoc({ id: 'viejo', manifest: manifestOf('viejo') }), 'H');
    const nuevo = buildSessionVaultRecord(mkDoc({ id: 'nuevo', manifest: manifestOf('nuevo') }), 'H');
    const old = { ...viejo, savedAt: 1 };
    const fresh = { ...nuevo, savedAt: 999 };

    const recovery = recoverDocumentsFromVaultRecords([old, fresh]);
    expect(recovery?.activeDocumentId).toBe('nuevo');
    expect(recovery?.recoveredIds[0]).toBe('nuevo');
  });

  it('marca como sucio lo que difiere de su último estado estable', () => {
    // El usuario tenía cambios sin guardar: el documento vuelve, pero hay que
    // decirlo o puede creerse que está todo guardado.
    const sucio = buildSessionVaultRecord(mkDoc({ id: 'vco', lastStableHash: 'H' }), 'OTRO_HASH');
    const recovery = recoverDocumentsFromVaultRecords([sucio]);
    expect(recovery?.documentsById['vco'].isDirty).toBe(true);
  });

  it('deja limpio lo que coincide con su último estado estable', () => {
    const limpio = buildSessionVaultRecord(mkDoc({ id: 'vco', lastStableHash: 'HASH' }), 'HASH');
    const recovery = recoverDocumentsFromVaultRecords([limpio]);
    expect(recovery?.documentsById['vco'].isDirty).toBe(false);
  });

  it('NO marca isInitializing: el watcher no debe dar el documento por guardado', () => {
    // Si fuera `true`, el watcher haría CAPTURE_HASH, que pone
    // `lastSavedIndex = past.length` y dejaría el contador de "sin guardar" a
    // cero sobre documentos que sí tenían cambios.
    const sucio = buildSessionVaultRecord(mkDoc({ id: 'vco', lastStableHash: 'H' }), 'OTRO');
    const recovery = recoverDocumentsFromVaultRecords([sucio]);
    expect(recovery?.documentsById['vco'].isInitializing).toBe(false);
  });

  it('devuelve null si la bóveda no tenía NADA', () => {
    // Sin registros no hay nada que decir ni que resucitar: un `null` limpio.
    expect(recoverDocumentsFromVaultRecords([])).toBeNull();
  });

  it('devuelve el objeto aunque NADA sea resucitable, para poder decir lo que se perdió', () => {
    // Un v1 sabe que hubo un documento y de qué versión estaba, pero no qué
    // era. Resucitarlo a ojo sería inventarse el contenido. Pero devolver
    // `null` aquí tiraría la lista de lo perdido, que es justo lo que el
    // usuario necesita para decidir si le importa.
    const v1 = parseSessionVaultRecord({
      version: 1,
      documentId: 'vco',
      savedAt: 1,
      manifestHash: 'H',
      history: { past: [], future: [], lastSavedIndex: -1 },
      extraResources: [],
      lastStableHash: 'H'
    });
    expect(v1).not.toBeNull();
    const recovery = recoverDocumentsFromVaultRecords([v1 as SessionVaultRecord]);

    expect(recovery).not.toBeNull();
    expect(recovery?.recoveredIds).toEqual([]);
    expect(recovery?.unrecoverableIds).toEqual(['vco']);
    expect(recovery?.documentsById['vco']).toBeUndefined();
  });

  it('informa de lo que NO se pudo recuperar en vez de perderlo en silencio', () => {
    // Es la diferencia entre "tu sesión se rehizo" y "no sé qué había y no te
    // lo digo": el usuario tiene que poder decidir si le importa.
    const v1 = parseSessionVaultRecord({
      version: 1,
      documentId: 'fantasma',
      savedAt: 1,
      manifestHash: 'H',
      history: { past: [], future: [], lastSavedIndex: -1 },
      extraResources: [],
      lastStableHash: 'H'
    }) as SessionVaultRecord;
    const bueno = buildSessionVaultRecord(mkDoc({ id: 'vco', manifest: manifestOf('VcoTwo') }), 'H');

    const recovery = recoverDocumentsFromVaultRecords([v1, bueno]);
    expect(recovery?.recoveredIds).toEqual(['vco']);
    expect(recovery?.unrecoverableIds).toEqual(['fantasma']);
    expect(recovery?.documentsById['fantasma']).toBeUndefined();
  });

  it('gana el registro más reciente cuando hay dos del mismo id', () => {
    // Dos pestañas escribiendo a la vez, o un put solapado con otro.
    const a = { ...buildSessionVaultRecord(mkDoc({ id: 'vco', manifest: manifestOf('viejo') }), 'H'), savedAt: 1 };
    const b = { ...buildSessionVaultRecord(mkDoc({ id: 'vco', manifest: manifestOf('nuevo') }), 'H'), savedAt: 9 };
    const recovery = recoverDocumentsFromVaultRecords([a, b]);
    expect(recovery?.documentsById['vco'].manifest).toEqual(manifestOf('nuevo'));
  });

  it('LO QUE NO SE RECUPERA: contrato y binario WASM salen a null', () => {
    // Limitación deliberada, fijada aquí para que no sorprenda a nadie. El
    // registro guarda el MANIFIESTO; el contrato y el WASM son sus productos
    // de compilación y no están dentro, así que no vuelven. Un documento
    // resucitado se recompila al abrirlo.
    //
    // Si algún día esto se cambia, este test es el que hay que mirar antes:
    // significaría que el registro ha crecido y que el coste de cada
    // escritura también.
    const doc = mkDoc({
      id: 'vco',
      manifest: manifestOf('VcoTwo'),
      contract: { compiled: true } as never,
      wasmBuffer: new ArrayBuffer(8)
    });
    const rec = buildSessionVaultRecord(doc, 'H');
    const recovery = recoverDocumentsFromVaultRecords([rec]);

    // El registro NI GUARDA esas dos cosas: no es que las pierda al
    // resucitar, es que nunca estuvieron. Se comprueba sobre el registro
    // entero, que es donde se ve de verdad.
    expect('contract' in rec).toBe(false);
    expect('wasmBuffer' in rec).toBe(false);
    expect(rec.manifest).toEqual(manifestOf('VcoTwo'));
    expect(recovery?.documentsById['vco'].contract).toBeNull();
    expect(recovery?.documentsById['vco'].wasmBuffer).toBeNull();
    // El manifiesto, que es lo que sí importa, viene entero.
    expect(recovery?.documentsById['vco'].manifest).toEqual(manifestOf('VcoTwo'));
  });

  it('no muta los registros de entrada', () => {
    const rec = buildSessionVaultRecord(mkDoc({ id: 'vco' }), 'H');
    const copia = JSON.parse(JSON.stringify(rec));
    recoverDocumentsFromVaultRecords([rec]);
    expect(JSON.parse(JSON.stringify(rec))).toEqual(copia);
  });
});

describe('v1 y v2 conviven', () => {
  it('un v1 se lee y un v2 se lee, y ninguno invalida al otro', () => {
    // Es el caso de quien actualiza con la sesión a medias: tiene registros
    // de las dos formas y no debe perder ni el historial viejo ni el
    // documento nuevo.
    const v1 = parseSessionVaultRecord({
      version: 1,
      documentId: 'viejo',
      savedAt: 1,
      manifestHash: 'H',
      history: { past: [], future: [], lastSavedIndex: -1 },
      extraResources: [],
      lastStableHash: 'H'
    });
    const v2 = buildSessionVaultRecord(mkDoc({ id: 'nuevo', manifest: manifestOf('nuevo') }), 'H');

    expect(v1?.version).toBe(SESSION_VAULT_VERSION);
    expect(v1?.manifest).toBeUndefined();
    expect(v2.version).toBe(SESSION_VAULT_VERSION);
    expect(v2.manifest).toBeDefined();

    const recovery = recoverDocumentsFromVaultRecords([v1 as SessionVaultRecord, v2]);
    expect(recovery?.documentsById['nuevo']).toBeDefined();
    expect(recovery?.unrecoverableIds).toEqual(['viejo']);
  });
});
