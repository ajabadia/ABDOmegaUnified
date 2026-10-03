/**
 * @jest-environment jsdom
 *
 * CellNode — la clase CSS depende de `node.kind`.
 */
import { describe, it, expect } from '@jest/globals';
import { render } from '@testing-library/react';
import { CellNode } from '../CellNode';
import type { OmegaNode, OMEGA_Manifest } from '../../../types/manifest';

const manifest = { ui: {}, resources: {} } as unknown as OMEGA_Manifest;

function nodo(parcial: Partial<OmegaNode> & { id: string }): OmegaNode {
  return {
    layout: { pos: { x: 0, y: 0 }, size: { width: 48, height: 48 } },
    ...parcial,
  } as OmegaNode;
}

function pintar(node: OmegaNode) {
  return render(
    <CellNode
      node={node}
      manifest={manifest}
      depth={0}
      catalog={{}}
      worldPos={{ x: 0, y: 0 }}
      isLayoutGoverned={false}
      handleDebugClick={() => {}}
    />,
  );
}

describe('CellNode — clase CSS segun node.kind', () => {
  it('una celda sale con uca-cell', () => {
    const { container } = pintar(nodo({ id: 'k1', kind: 'cell', cellRef: 'knob' }));
    expect(container.querySelector('.uca-node.uca-cell')).not.toBeNull();
  });

  it('un puerto sale CON uca-cell y ADEMAS uca-port', () => {
    const { container } = pintar(nodo({ id: 'p1', kind: 'port', cellRef: 'port', role: 'stream' }));
    // uca-cell no puede desaparecer: StructuralNode la usa en closest() y 16
    // tests de navegador la buscan.
    expect(container.querySelector('.uca-node.uca-cell')).not.toBeNull();
    // Y un kind=port tiene que emitir su propia clase.
    expect(container.querySelector('.uca-node.uca-port')).not.toBeNull();
  });

  it('una celda NO emite uca-port', () => {
    const { container } = pintar(nodo({ id: 'k2', kind: 'cell', cellRef: 'knob' }));
    expect(container.querySelector('.uca-node.uca-port')).toBeNull();
  });
});