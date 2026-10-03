/**
 * Regresión del "se revierte solo": `omegaTreeToManifest` devolvía `useUCA: true`
 * fijo, y como `ucaInjection` hace `ui: { ...manifest.ui, ...canonicalUpdates.ui }`,
 * cada escritura pisaba el valor real del documento.
 *
 * El fallo NO se ve con `omegaTreeToManifest` sola (su valor se ignora), sino en el
 * efecto que tiene al extenderse sobre un `ui` existente: eso es lo que se mide
 * aquí. El segundo test fija el otro extremo (lectura), para que quitar el flag
 * no haga perder un `ui.tree` de un `.json` viejo.
 */

import { manifestToOmegaTree, omegaTreeToManifest } from '../ucaBridge';
import type { OMEGA_Manifest, OmegaNode } from '../../types/manifest';

const arbol = (): OmegaNode => ({
  id: 'root',
  kind: 'root',
  layout: { pos: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
  children: [
    {
      id: 'celda_1',
      kind: 'cell',
      cellRef: 'knob',
      layout: { pos: { x: 10, y: 10 }, size: { width: 20, height: 20 } },
    },
  ],
});

const manifiesto = (useUCA: boolean): OMEGA_Manifest =>
  ({
    metadata: { name: 'legacy', version: '1' },
    resources: {},
    entities: [],
    ui: { useUCA, controls: [], jacks: [] },
  }) as unknown as OMEGA_Manifest;

/** Lo que hace `ucaInjection.injectBlueprintIntoManifest` al final. */
function inyectarSobre(original: OMEGA_Manifest, arbolNuevo: OmegaNode): OMEGA_Manifest {
  const canonicalUpdates = omegaTreeToManifest(arbolNuevo);
  return {
    ...original,
    ...canonicalUpdates,
    ui: { ...original.ui, ...canonicalUpdates.ui },
  } as OMEGA_Manifest;
}

describe('omegaTreeToManifest y el flag useUCA', () => {
  it('no inventa useUCA al serializar el arbol', () => {
    const ui = omegaTreeToManifest(arbol()).ui as Record<string, unknown>;
    expect('useUCA' in ui).toBe(false);
  });

  it('respeta un useUCA:false que ya traia el documento', () => {
    // El bug: despues de esta inyeccion, el flag pasaba a ser true.
    const resultado = inyectarSobre(manifiesto(false), arbol());
    expect(resultado.ui.useUCA).toBe(false);
  });

  it('respeta un useUCA:true que ya traia el documento', () => {
    const resultado = inyectarSobre(manifiesto(true), arbol());
    expect(resultado.ui.useUCA).toBe(true);
  });

  it('un documento sin el flag no lo recibe al escribir', () => {
    const original = manifiesto(false);
    delete (original.ui as Record<string, unknown>).useUCA;
    expect('useUCA' in inyectarSobre(original, arbol()).ui).toBe(false);
  });

  it('escribe el flag solo si el llamante se lo pasa', () => {
    const conservado = omegaTreeToManifest(arbol(), { useUCA: false });
    expect(conservado.ui?.useUCA).toBe(false);
    expect(omegaTreeToManifest(arbol(), { useUCA: true }).ui?.useUCA).toBe(true);
  });
});

describe('manifestToOmegaTree sin el flag', () => {
  it('usa ui.tree aunque el manifiesto no lleve useUCA', () => {
    // Un .json viejo: tiene arbol pero ni flag ni nodes. Antes caia en la
    // migracion legacy y se perdia.
    const legacy = manifiesto(false);
    delete (legacy.ui as Record<string, unknown>).useUCA;
    legacy.ui.tree = arbol();
    expect(manifestToOmegaTree(legacy).id).toBe('root');
  });

  it('sigue prefiriendo el arbol canonico (nodes) sobre ui.tree', () => {
    const m = manifiesto(true);
    m.ui.tree = { ...arbol(), id: 'el_de_ui' };
    m.nodes = [arbol()];
    expect(manifestToOmegaTree(m).id).toBe('root');
  });
});