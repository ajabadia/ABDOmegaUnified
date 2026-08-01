/**
 * CableInteraction tests (Fase 4).
 * Verifies the ghosting collision check (doesCableCrossArea) with a
 * stubbed SVGPathElement (jsdom has no getPointAtLength) and the [H]
 * visibility toggle on the overlay.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    doesCableCrossArea,
    setupCableVisibilityToggle,
    computeRepulsionOffset,
    setupCableRepulsion,
    setupCableSoloMode,
    setupDragToPatch,
    closestDistanceToPath,
    findCableAtPoint,
    setupCableTooltip,
} from '../../src/Components/cables/CableInteraction.js';

/** Path fake: 100px long horizontal line at y=50. Points at length L = (L, 50). */
function fakePath(): SVGPathElement {
    const path = {
        getTotalLength: () => 100,
        getPointAtLength: (len: number) => ({ x: len, y: 50 }),
    } as unknown as SVGPathElement;
    return path;
}

/** Stub de manager: captura las llamadas de deformación. */
function stubManager(paths: { slotIndex: number; pathElement: SVGPathElement }[]) {
    const calls: { slot: number; offset: { x: number; y: number } | null }[] = [];
    const manager = {
        getActiveCablePaths: () => paths,
        setCableDeform: (slot: number, offset: { x: number; y: number } | null) => {
            calls.push({ slot, offset });
        },
        resetAllDeforms: () => {
            calls.push({ slot: -1, offset: null });
        },
    } as unknown as Parameters<typeof setupCableRepulsion>[0];
    return { manager, calls };
}

describe('doesCableCrossArea', () => {
    it('returns true when a sampled point falls inside the area', () => {
        const path = fakePath();
        expect(doesCableCrossArea(path, { left: 40, top: 40, right: 60, bottom: 60 }))
            .toBe(true); // point (50, 50) is sampled
    });

    it('returns false when the area is far from the cable', () => {
        const path = fakePath();
        expect(doesCableCrossArea(path, { left: 200, top: 200, right: 300, bottom: 300 }))
            .toBe(false);
    });

    it('returns false for a zero-length path (no throw)', () => {
        const path = { getTotalLength: () => 0 } as unknown as SVGPathElement;
        expect(doesCableCrossArea(path, { left: 0, top: 0, right: 10, bottom: 10 }))
            .toBe(false);
    });

    it('returns false when getTotalLength throws (disconnected path)', () => {
        const path = { getTotalLength: () => { throw new Error('disconnected'); } } as unknown as SVGPathElement;
        expect(doesCableCrossArea(path, { left: 0, top: 0, right: 10, bottom: 10 }))
            .toBe(false);
    });
});

describe('setupCableVisibilityToggle ([H])', () => {
    beforeEach(() => {
        const overlay = document.createElement('div');
        overlay.id = 'patch-cables-overlay';
        document.body.appendChild(overlay);
    });

    afterEach(() => {
        document.getElementById('patch-cables-overlay')?.remove();
    });

    it('toggles the cables-hidden class on H keydown', () => {
        setupCableVisibilityToggle();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
        const overlay = document.getElementById('patch-cables-overlay')!;
        expect(overlay.classList.contains('cables-hidden')).toBe(true);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'H' }));
        expect(overlay.classList.contains('cables-hidden')).toBe(false);
    });

    it('does not toggle while typing in an input', () => {
        setupCableVisibilityToggle();

        const input = document.createElement('input');
        document.body.appendChild(input);

        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
        const overlay = document.getElementById('patch-cables-overlay')!;
        expect(overlay.classList.contains('cables-hidden')).toBe(false);

        input.remove();
    });
});

describe('setupCableSoloMode (§9 Modo solo-cables)', () => {
    let rack: HTMLElement;
    let btn: HTMLButtonElement;
    let mode: ReturnType<typeof setupCableSoloMode>;

    beforeEach(() => {
        rack = document.createElement('div');
        rack.id = 'omega-rack';
        document.body.appendChild(rack);

        btn = document.createElement('button');
        btn.id = 'cable-solo-toggle';
        document.body.appendChild(btn);

        mode = setupCableSoloMode();
    });

    afterEach(() => {
        mode.dispose();
        rack.remove();
        btn.remove();
    });

    it('toggles the cables-only class via the top-menu button', () => {
        expect(mode.isActive()).toBe(false);

        btn.dispatchEvent(new MouseEvent('click'));
        expect(mode.isActive()).toBe(true);
        expect(rack.classList.contains('cables-only')).toBe(true);
        expect(btn.classList.contains('active')).toBe(true);

        btn.dispatchEvent(new MouseEvent('click'));
        expect(mode.isActive()).toBe(false);
        expect(btn.classList.contains('active')).toBe(false);
    });

    it('toggles on the [S] key, case-insensitive', () => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
        expect(mode.isActive()).toBe(true);

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }));
        expect(mode.isActive()).toBe(false);
    });

    it('does not toggle while typing in an input', () => {
        const input = document.createElement('input');
        document.body.appendChild(input);

        input.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
        expect(mode.isActive()).toBe(false);

        input.remove();
    });

    it('keeps modules in the DOM (visibility, not display:none) so jacks stay anchored', () => {
        const modulePanel = document.createElement('div');
        modulePanel.className = 'aseptic-module-panel';
        rack.appendChild(modulePanel);

        btn.dispatchEvent(new MouseEvent('click'));
        expect(mode.isActive()).toBe(true);
        expect(modulePanel.isConnected).toBe(true); // sigue en el DOM
    });

    it('is a safe no-op when the rack does not exist', () => {
        rack.remove();
        const detached = setupCableSoloMode();
        expect(detached.isActive()).toBe(false);
        expect(() => detached.dispose()).not.toThrow();
    });

    it('dispose removes listeners (click no longer toggles)', () => {
        mode.dispose();
        btn.dispatchEvent(new MouseEvent('click'));
        expect(mode.isActive()).toBe(false);
    });
});

describe('computeRepulsionOffset (§7.3)', () => {
    it('returns a lateral offset when the cursor is within the radius', () => {
        const path = fakePath(); // línea y=50, x 0..100
        // Cursor (10, 5): punto más cercano (10,50), distancia 45 (< 60).
        // falloff = 1 - 45/60 = 0.25 → magnitud = 90 * 0.25 = 22.5.
        // Dirección (0,1) → el cable se empuja hacia abajo (y=50 → +22.5).
        const offset = computeRepulsionOffset(path, 10, 5);
        expect(offset).not.toBeNull();
        expect(offset!.x).toBe(0);
        expect(offset!.y).toBeCloseTo(22.5, 5);
    });

    it('pushes harder the closer the cursor is', () => {
        const path = fakePath();
        // Cursor a 6px del cable → falloff 0.9 → magnitud 81
        const near = computeRepulsionOffset(path, 10, 44)!;
        // Cursor a 20px del cable → falloff 2/3 → magnitud 60
        const far = computeRepulsionOffset(path, 10, 30)!;
        expect(near.y).toBeCloseTo(81, 5);
        expect(far.y).toBeCloseTo(60, 5);
        expect(near.y).toBeGreaterThan(far.y);
    });

    it('returns null when the cursor is beyond the radius', () => {
        const path = fakePath();
        expect(computeRepulsionOffset(path, 500, 500)).toBeNull();
    });

    it('returns null for a zero-length path without throwing', () => {
        const path = { getTotalLength: () => 0 } as unknown as SVGPathElement;
        expect(computeRepulsionOffset(path, 0, 0)).toBeNull();
    });

    it('returns null when getTotalLength throws (disconnected path)', () => {
        const path = { getTotalLength: () => { throw new Error('disconnected'); } } as unknown as SVGPathElement;
        expect(computeRepulsionOffset(path, 0, 0)).toBeNull();
    });
});

describe('setupCableRepulsion (§7.3)', () => {
    let rAFQueue: FrameRequestCallback[];

    beforeEach(() => {
        rAFQueue = [];
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            rAFQueue.push(cb);
            return rAFQueue.length;
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.getElementById('omega-rack')?.remove();
    });

    function makeRack(): HTMLElement {
        const rack = document.createElement('div');
        rack.id = 'omega-rack';
        document.body.appendChild(rack);
        return rack;
    }

    it('deforms cables near the cursor, coalesced to one pass per frame', () => {
        const rack = makeRack();
        const path = fakePath();
        const { manager, calls } = stubManager([{ slotIndex: 3, pathElement: path }]);

        const cleanup = setupCableRepulsion(manager);

        // Primer mousemove → programa UN frame
        rack.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 5 }));
        expect(rAFQueue.length).toBe(1);

        // mousemoves adicionales DENTRO del mismo frame no encolan más
        rack.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 10 }));
        expect(rAFQueue.length).toBe(1);

        // Al ejecutar el frame se procesa el cursor MÁS RECIENTE (20,10):
        // punto más cercano (20,50) → distancia 40 → falloff 1/3 → magnitud 30
        rAFQueue.shift()!(0);
        expect(calls.length).toBe(1);
        expect(calls[0].slot).toBe(3);
        expect(calls[0].offset!.x).toBe(0);
        expect(calls[0].offset!.y).toBeCloseTo(30, 5);

        cleanup();
    });

    it('restores cables to neutral when the cursor leaves the rack', () => {
        const rack = makeRack();
        const path = fakePath();
        const { manager, calls } = stubManager([{ slotIndex: 3, pathElement: path }]);

        const cleanup = setupCableRepulsion(manager);

        rack.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 5 }));
        rAFQueue.shift()!(0);
        calls.length = 0;

        rack.dispatchEvent(new MouseEvent('mouseleave'));
        expect(calls).toEqual([{ slot: -1, offset: null }]);

        cleanup();
    });

    it('does not crash with zero-length or throwing paths', () => {
        const rack = makeRack();
        const badPath = { getTotalLength: () => 0 } as unknown as SVGPathElement;
        const throwPath = { getTotalLength: () => { throw new Error('x'); } } as unknown as SVGPathElement;
        const { manager, calls } = stubManager([
            { slotIndex: 0, pathElement: badPath },
            { slotIndex: 1, pathElement: throwPath },
        ]);

        const cleanup = setupCableRepulsion(manager);
        rack.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 5 }));
        rAFQueue.shift()!(0);

        // Ningún cable consultable → offsets null, sin excepción
        expect(calls).toEqual([
            { slot: 0, offset: null },
            { slot: 1, offset: null },
        ]);

        cleanup();
    });

    it('cleanup removes listeners and resets deformations', () => {
        const rack = makeRack();
        const { manager, calls } = stubManager([]);

        const cleanup = setupCableRepulsion(manager);
        cleanup();

        calls.length = 0;
        rack.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 5 }));
        expect(rAFQueue.length).toBe(0); // listener eliminado → nada encolado

        // Y ninguna llamada nueva (ni deform ni reset) tras el cleanup
        expect(calls.length).toBe(0);
        cleanup();
    });

    it('is a no-op when the rack element does not exist', () => {
        const { manager } = stubManager([]);
        const cleanup = setupCableRepulsion(manager);
        expect(cleanup).toBeInstanceOf(Function);
        expect(cleanup()).toBeUndefined();
    });
});

/* ══════════════════════════════════════════════════════════════════
   Fase 7 (§9): setupDragToPatch
   jsdom NO tiene PointerEvent ni document.elementFromPoint → se
   despachan MouseEvent con tipo 'pointerdown'/'pointermove'/'pointerup'
   y el código cae al fallback `e.target` para el hit-testing.
   ══════════════════════════════════════════════════════════════════ */

/** Rastrea los drags creados para liberar sus listeners document en afterEach. */
const activeDrags: { dispose: () => void }[] = [];

/** Crea un .module-jack con su .port-socket interno. */
function makeJack(direction: string, source: string): HTMLElement {
    const jack = document.createElement('div');
    jack.className = 'module-jack';
    jack.setAttribute('data-jack-direction', direction);
    const socket = document.createElement('div');
    socket.className = 'port-socket';
    socket.setAttribute('data-source', source);
    jack.appendChild(socket);
    return jack;
}

interface DragHarness {
    rack: HTMLElement;
    svg: SVGSVGElement;
    sourceSocket: HTMLElement;
    targetSocket: HTMLElement;
    dispatches: { type: string; payload: any }[];
    drag: { dispose: () => void };
    fire: (el: Element, type: string, x: number, y: number) => void;
}

function makeDragHarness(opts?: {
    freeSlot?: number;
    withMetadata?: boolean;
    sourceId?: string;
    targetId?: string;
}): DragHarness {
    const rack = document.createElement('div');
    rack.id = 'omega-rack';
    document.body.appendChild(rack);

    const overlay = document.createElement('div');
    overlay.id = 'patch-cables-overlay';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    overlay.appendChild(svg);
    document.body.appendChild(overlay);

    const sourceJack = makeJack('output', opts?.sourceId || '1.saw_out');
    const targetJack = makeJack('input', opts?.targetId || '1.fm_in');
    rack.appendChild(sourceJack);
    rack.appendChild(targetJack);
    const sourceSocket = sourceJack.querySelector('.port-socket') as HTMLElement;
    const targetSocket = targetJack.querySelector('.port-socket') as HTMLElement;

    const dispatches: { type: string; payload: any }[] = [];
    (window as any).rpcCommandDispatcher = { dispatch: (msg: any) => dispatches.push(msg) };

    if (opts?.withMetadata) {
        (window as any).inventoryStore = {
            getAllItems: () => [{
                id: 'osc1',
                name: 'Osc1',
                registry: [
                    { id: 'saw_out', label: 'Saw', type: 'CV', roles: ['output'] },
                    { id: 'fm_in', label: 'FM', type: 'CV', roles: ['input'] },
                ],
            }],
        };
        (window as any).runtimeStore = {
            getSnapshot: () => ({
                patch: { modules: [{ componentId: 'osc1', instanceId: '1', name: 'Osc1' }] },
            }),
        };
    }

    const jacks = new Map<string, any>([
        [opts?.sourceId || '1.saw_out', { el: sourceSocket, x: 50, y: 50 }],
        [opts?.targetId || '1.fm_in', { el: targetSocket, x: 200, y: 100 }],
    ]);

    const manager = {
        jackRegistry: {
            getPosition: (id: string) => {
                const j = jacks.get(id);
                return j ? { x: j.x, y: j.y } : null;
            },
            getAll: () => jacks,
        },
        getFreeMatrixSlot: () => (opts?.freeSlot ?? 4),
    } as unknown as Parameters<typeof setupDragToPatch>[0];

    const drag = setupDragToPatch(manager);
    activeDrags.push(drag);

    const fire = (el: Element, type: string, x: number, y: number) => {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 }));
    };

    return { rack, svg, sourceSocket, targetSocket, dispatches, drag, fire };
}

function validDrag(h: DragHarness): void {
    h.fire(h.sourceSocket, 'pointerdown', 0, 0);
    h.fire(h.targetSocket, 'pointermove', 100, 100);
    h.fire(h.targetSocket, 'pointerup', 100, 100);
}

describe('setupDragToPatch (§9 Drag-to-patch)', () => {
    afterEach(() => {
        while (activeDrags.length) activeDrags.pop()!.dispose();
        document.getElementById('omega-rack')?.remove();
        document.getElementById('patch-cables-overlay')?.remove();
        delete (window as any).rpcCommandDispatcher;
        delete (window as any).inventoryStore;
        delete (window as any).runtimeStore;
    });

    it('creates a hanging preview path and marks the source jack while dragging', () => {
        const h = makeDragHarness();

        h.fire(h.sourceSocket, 'pointerdown', 0, 0);
        h.fire(h.targetSocket, 'pointermove', 100, 100);

        const preview = h.svg.querySelector('.cable-drag-preview');
        expect(preview).not.toBeNull();
        expect(preview!.getAttribute('data-signal')).toBe('cv');
        expect(preview!.getAttribute('d')).toContain('M 50 50');
        expect(h.sourceSocket.classList.contains('drag-active-jack')).toBe(true);
    });

    it('highlights the valid input jack under the cursor', () => {
        const h = makeDragHarness();

        h.fire(h.sourceSocket, 'pointerdown', 0, 0);
        h.fire(h.targetSocket, 'pointermove', 100, 100);

        expect(h.targetSocket.classList.contains('target-highlight')).toBe(true);
    });

    it('pointerup on a valid input commits source/target/amount/active to the free slot', () => {
        const h = makeDragHarness();

        validDrag(h);

        expect(h.dispatches.map((d) => d.payload.key)).toEqual(['source', 'target', 'amount', 'active']);
        expect(h.dispatches.every((d) => d.type === 'updatePatchbayMatrixSlot')).toBe(true);
        expect(h.dispatches.every((d) => d.payload.slot === 4)).toBe(true);
        expect(h.dispatches[0].payload.value).toBe('1.saw_out');
        expect(h.dispatches[1].payload.value).toBe('1.fm_in');
        expect(h.dispatches[2].payload.value).toBe(1);
        expect(h.dispatches[3].payload.value).toBe(true);
    });

    it('cleans up the preview and highlights after a commit', () => {
        const h = makeDragHarness();

        validDrag(h);

        expect(h.svg.querySelector('.cable-drag-preview')).toBeNull();
        expect(h.sourceSocket.classList.contains('drag-active-jack')).toBe(false);
        expect(h.targetSocket.classList.contains('target-highlight')).toBe(false);
    });

    it('does not commit when dropped on empty space', () => {
        const h = makeDragHarness();
        const blank = document.createElement('div');
        h.rack.appendChild(blank);

        h.fire(h.sourceSocket, 'pointerdown', 0, 0);
        h.fire(blank, 'pointermove', 100, 100);
        h.fire(blank, 'pointerup', 100, 100);

        expect(h.dispatches).toHaveLength(0);
        expect(h.svg.querySelector('.cable-drag-preview')).toBeNull();
    });

    it('does not commit when dropped on another output jack', () => {
        const h = makeDragHarness();
        const otherJack = makeJack('output', '2.other_out');
        h.rack.appendChild(otherJack);
        const otherSocket = otherJack.querySelector('.port-socket') as HTMLElement;

        h.fire(h.sourceSocket, 'pointerdown', 0, 0);
        h.fire(otherSocket, 'pointermove', 100, 100);
        h.fire(otherSocket, 'pointerup', 100, 100);

        expect(h.dispatches).toHaveLength(0);
    });

    it('does not commit when the drop lands on the source jack itself', () => {
        const h = makeDragHarness();

        h.fire(h.sourceSocket, 'pointerdown', 0, 0);
        h.fire(h.sourceSocket, 'pointermove', 100, 100);
        h.fire(h.sourceSocket, 'pointerup', 100, 100);

        expect(h.dispatches).toHaveLength(0);
    });

    it('does not create a preview for a sub-threshold drag, and cleans up pending state', () => {
        const h = makeDragHarness();

        h.fire(h.sourceSocket, 'pointerdown', 0, 0);
        h.fire(h.targetSocket, 'pointermove', 2, 2);
        h.fire(h.targetSocket, 'pointerup', 2, 2);

        expect(h.svg.querySelector('.cable-drag-preview')).toBeNull();
        expect(h.dispatches).toHaveLength(0);
    });

    it('does not start a drag from an input jack', () => {
        const h = makeDragHarness();

        h.fire(h.targetSocket, 'pointerdown', 0, 0);
        h.fire(h.sourceSocket, 'pointermove', 100, 100);
        h.fire(h.sourceSocket, 'pointerup', 100, 100);

        expect(h.svg.querySelector('.cable-drag-preview')).toBeNull();
        expect(h.dispatches).toHaveLength(0);
    });

    it('does not commit when the matrix has no free slot', () => {
        const h = makeDragHarness({ freeSlot: -1 });

        validDrag(h);

        expect(h.dispatches).toHaveLength(0);
    });

    it('resolves jack roles from the inventory metadata when data-jack-direction is missing', () => {
        const h = makeDragHarness({ withMetadata: true });
        // Quitar el atributo → el rol cae al metadata (inventoryStore).
        h.sourceSocket.removeAttribute('data-jack-direction');
        h.targetSocket.removeAttribute('data-jack-direction');

        validDrag(h);

        expect(h.dispatches[0].payload.value).toBe('1.saw_out');
        expect(h.dispatches[1].payload.value).toBe('1.fm_in');
    });

    it('dispose removes all listeners', () => {
        const h = makeDragHarness();
        h.drag.dispose();

        validDrag(h);

        expect(h.svg.querySelector('.cable-drag-preview')).toBeNull();
        expect(h.dispatches).toHaveLength(0);
    });
});

/* ══════════════════════════════════════════════════════════════════
   Fase 5 (§8.2): Tooltip de información del cable
   Alt + hover sobre un cable → muestreo de proximidad a la curva
   (getPointAtLength), igual que la repulsión §7.3.
   ══════════════════════════════════════════════════════════════════ */

/** Cable fake: 100px de línea horizontal en y dado, con data-signal. */
function makeCablePath(y: number, signal: string): SVGPathElement {
    const el = document.createElement('div') as unknown as SVGPathElement;
    Object.assign(el, {
        getTotalLength: () => 100,
        getPointAtLength: (len: number) => ({ x: len, y }),
    });
    el.setAttribute('data-signal', signal);
    return el;
}

function tooltipManager() {
    return {
        getActiveCablePaths: () => [
            { slotIndex: 0, pathElement: makeCablePath(50, 'cv') },
            { slotIndex: 1, pathElement: makeCablePath(80, 'audio') },
        ],
        getSlotData: (slot: number) =>
            slot === 0
                ? { source: '1.saw_out', target: '1.fm_in', amount: 0.75, active: true as const }
                : slot === 1
                    ? { source: '2.lfo_out', target: '3.pwm_in', amount: 1, active: true as const }
                    : null,
    } as unknown as Parameters<typeof setupCableTooltip>[0];
}

function makeTooltipHarness(opts?: { withNames?: boolean }): {
    rack: HTMLElement;
    dispose: () => void;
} {
    const rack = document.createElement('div');
    rack.id = 'omega-rack';
    document.body.appendChild(rack);

    if (opts?.withNames) {
        (window as any).inventoryStore = {
            getAllItems: () => [{
                id: 'osc1',
                name: 'Osc1',
                registry: [
                    { id: 'saw_out', label: 'Saw', type: 'CV', roles: ['output'] },
                    { id: 'fm_in', label: 'FM', type: 'CV', roles: ['input'] },
                ],
            }],
        };
        (window as any).runtimeStore = {
            getSnapshot: () => ({
                patch: { modules: [{ componentId: 'osc1', instanceId: '1', name: 'Osc1' }] },
            }),
        };
    }

    const { dispose } = setupCableTooltip(tooltipManager());
    return { rack, dispose };
}

/** El tooltip se crea de forma perezosa: solo existe en el DOM si se mostró. */
function tooltipShown(): boolean {
    const el = document.querySelector('.cable-tooltip') as HTMLElement | null;
    return el !== null && el.style.display !== 'none';
}

describe('closestDistanceToPath (§8.2)', () => {
    it('returns the distance from the cursor to a line path', () => {
        const path = makeCablePath(50, 'cv');
        expect(closestDistanceToPath(path, 50, 50)).toBeCloseTo(0, 5);
        expect(closestDistanceToPath(path, 50, 60)).toBeCloseTo(10, 5);
    });

    it('returns null for zero-length or throwing paths', () => {
        const zero = { getTotalLength: () => 0 } as unknown as SVGPathElement;
        const thrower = { getTotalLength: () => { throw new Error('x'); } } as unknown as SVGPathElement;
        expect(closestDistanceToPath(zero, 0, 0)).toBeNull();
        expect(closestDistanceToPath(thrower, 0, 0)).toBeNull();
    });
});

describe('findCableAtPoint (§8.2)', () => {
    it('returns the nearest cable within the hover radius', () => {
        const manager = tooltipManager();
        const hit = findCableAtPoint(manager, 50, 50);
        expect(hit).not.toBeNull();
        expect(hit!.slotIndex).toBe(0);
        expect(hit!.distance).toBeCloseTo(0, 5);
    });

    it('returns null when the cursor is beyond the hover radius', () => {
        const manager = tooltipManager();
        expect(findCableAtPoint(manager, 50, 200)).toBeNull();
    });

    it('skips paths that cannot be queried', () => {
        const badPath = { getTotalLength: () => { throw new Error('x'); } } as unknown as SVGPathElement;
        const manager = { getActiveCablePaths: () => [{ slotIndex: 0, pathElement: badPath }] };
        expect(findCableAtPoint(manager as any, 0, 0)).toBeNull();
    });
});

describe('setupCableTooltip (§8.2 Tooltip del cable)', () => {
    afterEach(() => {
        document.getElementById('omega-rack')?.remove();
        document.querySelector('.cable-tooltip')?.remove();
        delete (window as any).inventoryStore;
        delete (window as any).runtimeStore;
    });

    it('shows the tooltip with route, signal and amount while Alt is held', () => {
        const { rack, dispose } = makeTooltipHarness({ withNames: true });

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
        rack.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 50 }));

        const tip = document.querySelector('.cable-tooltip') as HTMLElement;
        expect(tip).not.toBeNull();
        expect(tip.style.display).toBe('block');
        expect(tip.textContent).toContain('CABLE 01');
        expect(tip.textContent).toContain('Osc1 Saw');   // source legible
        expect(tip.textContent).toContain('Osc1 FM');    // target legible
        expect(tip.textContent).toContain('CV');         // tipo de señal
        expect(tip.textContent).toContain('×0.75');      // multiplicador

        dispose();
    });

    it('does not show the tooltip without Alt held', () => {
        const { rack, dispose } = makeTooltipHarness();

        rack.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 50 }));
        expect(tooltipShown()).toBe(false);

        dispose();
    });

    it('does not show when the cursor is not near any cable', () => {
        const { rack, dispose } = makeTooltipHarness();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
        rack.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: 500 }));
        expect(tooltipShown()).toBe(false);

        dispose();
    });

    it('hides the tooltip when Alt is released', () => {
        const { rack, dispose } = makeTooltipHarness();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
        rack.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 50 }));
        expect(tooltipShown()).toBe(true);

        document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt' }));
        expect(tooltipShown()).toBe(false);

        dispose();
    });

    it('switches content when the cursor moves onto another cable', () => {
        const { rack, dispose } = makeTooltipHarness();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));

        rack.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 50 }));
        expect(document.querySelector('.cable-tooltip')!.textContent).toContain('CABLE 01');

        rack.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 80 }));
        const tip = document.querySelector('.cable-tooltip') as HTMLElement;
        expect(tip.textContent).toContain('CABLE 02');
        expect(tip.textContent).toContain('2.lfo_out');
        expect(tip.textContent).toContain('3.pwm_in');
        expect(tip.textContent).toContain('AUDIO');

        dispose();
    });

    it('dispose removes listeners and removes the tooltip element', () => {
        const { rack, dispose } = makeTooltipHarness();

        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Alt' }));
        rack.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 50 }));
        expect(document.querySelector('.cable-tooltip')).not.toBeNull();

        dispose();
        expect(document.querySelector('.cable-tooltip')).toBeNull();

        // Listener eliminado: mover el ratón ya no crea tooltip nuevo.
        rack.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 50 }));
        expect(document.querySelector('.cable-tooltip')).toBeNull();
    });
});
