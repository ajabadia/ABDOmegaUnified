/**
 * @jest-environment jsdom
 *
 * Tests for useRackStartupAssistant — la condición de "rack vacío".
 *
 * El caso que motivó estos tests: al inyectar un blueprint se crea un
 * `container` bajo la raíz; al borrar la celda que había dentro, ese container
 * se queda vacío PERO SIGUE AHÍ. La condición usaba `tree.children.length > 0`,
 * así que el asistente de inicio no volvía a aparecer aunque el rack quedara
 * visualmente en blanco (medido en el e2e `rack-features` "Condition 4").
 */
import { describe, it, expect } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useRackStartupAssistant } from '../useRackStartupAssistant';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';

// ── Helpers ─────────────────────────────────────────────────────────────

function manifestConArbol(tree: OmegaNode): OMEGA_Manifest {
  return { ui: { tree } } as unknown as OMEGA_Manifest;
}

function nodo(parcial: Partial<OmegaNode> & { id: string }): OmegaNode {
  return { layout: { pos: { x: 0, y: 0 } }, ...parcial } as OmegaNode;
}

/** Raíz vacía: lo que hay al abrir un documento nuevo. */
const RAIZ_VACIA = nodo({ id: 'root', kind: 'container' });

/** Lo que deja blueprint inyectado → celda borrada: un container huérfano. */
const RAIZ_CON_CONTAINER_VACIO = nodo({
  id: 'root',
  kind: 'container',
  children: [nodo({ id: 'standard_abc', kind: 'container' })],
});

const RAIZ_CON_CELDA = nodo({
  id: 'root',
  kind: 'container',
  children: [
    nodo({
      id: 'standard_abc',
      kind: 'container',
      children: [nodo({ id: 'knob_1', kind: 'cell', cellRef: 'knob' })],
    }),
  ],
});

// ── Tests ───────────────────────────────────────────────────────────────

describe('useRackStartupAssistant — condición de rack vacío', () => {
  it('muestra el asistente cuando el árbol está vacío', () => {
    const { result } = renderHook(() =>
      useRackStartupAssistant(manifestConArbol(RAIZ_VACIA), false, 0),
    );
    expect(result.current.showAssistant).toBe(true);
  });

  it('oculta el asistente cuando hay una celda en el árbol', () => {
    const { result } = renderHook(() =>
      useRackStartupAssistant(manifestConArbol(RAIZ_CON_CELDA), false, 1),
    );
    expect(result.current.showAssistant).toBe(false);
  });

  /**
   * El test que faltaba y que destapó el bug: tras borrar la celda queda el
   * `container` del blueprint, vacío. El rack está en blanco, así que el
   * asistente tiene que volver.
   */
  it('vuelve a mostrar el asistente cuando solo queda un container vacío', () => {
    const { result } = renderHook(() =>
      useRackStartupAssistant(manifestConArbol(RAIZ_CON_CONTAINER_VACIO), false, 0),
    );
    expect(result.current.showAssistant).toBe(true);
  });

  it('trata un puerto como contenido (no como container vacío)', () => {
    const raizConPuerto = nodo({
      id: 'root',
      kind: 'container',
      children: [nodo({ id: 'port_1', kind: 'port', cellRef: 'port' })],
    });
    const { result } = renderHook(() =>
      useRackStartupAssistant(manifestConArbol(raizConPuerto), false, 1),
    );
    expect(result.current.showAssistant).toBe(false);
  });

  it('encuentra celdas anidadas más de un nivel', () => {
    const raizAnidada = nodo({
      id: 'root',
      kind: 'container',
      children: [
        nodo({
          id: 'grp',
          kind: 'group',
          children: [
            nodo({
              id: 'cont',
              kind: 'container',
              children: [nodo({ id: 'deep_knob', kind: 'cell', cellRef: 'knob' })],
            }),
          ],
        }),
      ],
    });
    const { result } = renderHook(() =>
      useRackStartupAssistant(manifestConArbol(raizAnidada), false, 1),
    );
    expect(result.current.showAssistant).toBe(false);
  });

  it('muestra el asistente si no hay árbol', () => {
    const { result } = renderHook(() =>
      useRackStartupAssistant({ ui: {} } as unknown as OMEGA_Manifest, false, 0),
    );
    expect(result.current.showAssistant).toBe(true);
  });

  // ── Los otros guardarraíles que ya existían ──────────────────────────

  it('nunca muestra el asistente en modo LIVE', () => {
    const { result } = renderHook(() =>
      useRackStartupAssistant(manifestConArbol(RAIZ_VACIA), true, 0),
    );
    expect(result.current.showAssistant).toBe(false);
  });

  it('no vuelve a aparecer tras dismissAssistant()', () => {
    const { result } = renderHook(() =>
      useRackStartupAssistant(manifestConArbol(RAIZ_VACIA), false, 0),
    );
    act(() => {
      result.current.dismissAssistant();
    });
    expect(result.current.showAssistant).toBe(false);
  });

  it('handleCreateFromScratch marca el asistente como descartado y llama al callback', () => {
    const { result } = renderHook(() =>
      useRackStartupAssistant(manifestConArbol(RAIZ_VACIA), false, 0),
    );
    let llamado = false;
    act(() => {
      result.current.handleCreateFromScratch(() => {
        llamado = true;
      });
    });
    expect(llamado).toBe(true);
    expect(result.current.showAssistant).toBe(false);
  });

  it('se apoya en allElementsCount aunque el árbol diga lo contrario', () => {
    // Cinturón y tirantes: si el motor de layout ve elementos, no hay asistente.
    const { result } = renderHook(() =>
      useRackStartupAssistant(manifestConArbol(RAIZ_VACIA), false, 3),
    );
    expect(result.current.showAssistant).toBe(false);
  });
});