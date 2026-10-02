/**
 * POR QUÉ ESTE TEST EXISTE
 *
 * `orchestrator.openDocument` estuvo meses sin un solo llamador en producción,
 * y cuando se conectó aparecieron dos defectos que solo existen con VARIOS
 * documentos abiertos. Ambos son del tipo que no falla al abrirse: fallan
 * después, en otra pestaña, y parecen un bug de renderizado.
 *
 *   1. IDs COLISIONADOS. `Date.now()` tiene resolución de milisegundo, así que
 *      dos "Nuevo" seguidos podem producir el mismo id — y `OPEN_DOCUMENT`
 *      trata un id repetido como "activar el existente": el segundo clic no
 *      crea nada y el usuario no ve por qué.
 *
 *   2. REFERENCIAS COMPARTIDAS. `normalizeManifest` hace spread superficial y
 *      su campo `ui.tree` cae en un `|| DEFAULT_MANIFEST.ui.tree` que entrega la
 *      referencia original SIN COPIAR. Dos documentos recién creados comparten
 *      el mismo objeto `ui.tree`: mover un nodo en uno lo mueve en el otro.
 */

import { createNewManifest, nextDocumentId } from '../newDocument';
import { DEFAULT_MANIFEST } from '../../constants/defaults';

describe('nextDocumentId', () => {
  it('never repeats, even within the same millisecond', () => {
    // Un bucle cerrado es la forma de simular pulsaciones rápidas: en un test
    // real estos ids caen todos en el mismo milisegundo, que es exactamente
    // donde `Date.now()` colapsaría.
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(nextDocumentId());
    }
    expect(ids.size).toBe(1000);
  });

  it('is stable and readable across calls', () => {
    const id = nextDocumentId();
    expect(id).toMatch(/^doc_[a-z0-9]+_\d{6}$/);
  });
});

describe('createNewManifest', () => {
  it('gives each document its own id', () => {
    expect(createNewManifest().id).not.toBe(createNewManifest().id);
  });

  it('does not reuse the default manifest id', () => {
    // `DEFAULT_MANIFEST.id` es 'new-module'. Si un documento nuevo lo
    // heredara, dos arrancarían con la misma identidad.
    expect(createNewManifest().id).not.toBe(DEFAULT_MANIFEST.id);
  });

  it('accepts an explicit name', () => {
    expect(createNewManifest('Rack Patch B').metadata?.name).toBe('Rack Patch B');
  });

  it('falls back to the default name', () => {
    expect(createNewManifest().metadata?.name).toBe(DEFAULT_MANIFEST.metadata?.name);
  });
});

describe('createNewManifest — structural independence', () => {
  // ESTOS SON LOS ASSERTS IMPORTANTES. `toEqual` pasaría con objetos que
  // comparten referencias: dos documentos idénticos en valor son IGUALES
  // aunque mutar uno mute al otro. Hay que comprobar la identidad.
  it('does not share ui.tree with the default manifest', () => {
    const doc = createNewManifest();
    expect(doc.ui.tree).not.toBe(DEFAULT_MANIFEST.ui.tree);
  });

  it('does not share ui.tree between two new documents', () => {
    const a = createNewManifest();
    const b = createNewManifest();
    expect(a.ui.tree).not.toBe(b.ui.tree);
  });

  it('does not share palette, sizes, resources, entities or nodes', () => {
    const a = createNewManifest();
    const b = createNewManifest();

    expect(a.ui.palette).not.toBe(b.ui.palette);
    expect(a.ui.palette).not.toBe(DEFAULT_MANIFEST.ui.palette);
    expect(a.ui.sizes).not.toBe(b.ui.sizes);
    expect(a.ui.sizes).not.toBe(DEFAULT_MANIFEST.ui.sizes);
    expect(a.resources).not.toBe(b.resources);
    expect(a.entities).not.toBe(b.entities);
    expect(a.nodes).not.toBe(b.nodes);
  });

  it('mutating one document does not leak into another', () => {
    // El síntoma real del bug: editar en la pestaña A y ver el cambio en la B.
    const a = createNewManifest();
    const b = createNewManifest();

    // `ui.tree` y `tree.children` son opcionales en el tipo, pero
    // `createNewManifest` garantiza que existen. Se leen con `!` porque aquí
    // lo que se comprueba es precisamente esa garantía.
    a.ui.tree!.children!.push({
      id: 'leaked',
      kind: 'container',
      role: 'structure',
      layout: { pos: { x: 0, y: 0 }, size: { width: 10, height: 10 } },
      children: [],
    } as never);

    expect(b.ui.tree!.children).toHaveLength(0);
    expect(DEFAULT_MANIFEST.ui.tree!.children).toHaveLength(0);
  });
});
