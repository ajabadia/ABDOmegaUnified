/**
 * PatchCableManager tests (Fase 3 data access).
 * Verifies the matrix is read from runtimeStore snapshot and that
 * active-slot counting works for both array and object matrix forms.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PatchCableManager } from '../../src/Components/cables/PatchCableManager.js';
import { INTERACTION } from '../../src/Components/cables/cableConstants.js';

function stubStore(matrix: unknown): void {
    (window as any).runtimeStore = {
        getSnapshot: () => ({ patch: { patchbayMatrix: matrix } }),
    };
}

describe('PatchCableManager.getActiveCableCount', () => {
    beforeEach(() => {
        (window as any).runtimeStore = undefined;
    });

    it('returns 0 when there is no store', () => {
        const mgr = new PatchCableManager();
        expect(mgr.getActiveCableCount()).toBe(0);
    });

    it('counts active slots from an array matrix', () => {
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true },
            { source: '1.gate_out', target: '2.gate', active: false },
            { source: '3.lfo', target: '2.cv', active: 'true' },
            {},
        ]);
        const mgr = new PatchCableManager();
        expect(mgr.getActiveCableCount()).toBe(2);
    });

    it('counts active slots from an object matrix (mapped by key)', () => {
        stubStore({
            '0': { source: '1.saw_out', target: '2.in', active: 1 },
            '1': { source: '2.out', target: '3.in', active: 0 },
        });
        const mgr = new PatchCableManager();
        expect(mgr.getActiveCableCount()).toBe(1);
    });

    it('has no cables in the SVG before init()', () => {
        const mgr = new PatchCableManager();
        expect(mgr.cableCount).toBe(0);
    });
});

describe('PatchCableManager signal pulse (Fase 5, opt-in)', () => {
    const realPulse = (INTERACTION as any).SIGNAL_PULSE;

    /** Monta rack + 2 módulos con port-sockets para que syncCablesFromState dibuje. */
    function setupRack(): void {
        const rack = document.createElement('div');
        rack.id = 'omega-rack';

        for (const [modId, ports] of [
            ['mod-v7_1', ['saw_out']],
            ['mod-v7_2', ['in']],
        ] as const) {
            const mod = document.createElement('div');
            mod.id = modId;
            mod.className = 'module';
            for (const port of ports) {
                const socket = document.createElement('div');
                socket.className = 'port-socket';
                socket.dataset.source = port;
                mod.appendChild(socket);
            }
            rack.appendChild(mod);
        }

        document.body.appendChild(rack);
    }

    beforeEach(() => {
        setupRack();
    });

    afterEach(() => {
        (INTERACTION as any).SIGNAL_PULSE = realPulse;
        (window as any).runtimeStore = undefined;
        document.getElementById('patch-cables-overlay')?.remove();
        document.getElementById('omega-rack')?.remove();
    });

    it('does not add .signal-active when the flag is off', async () => {
        (INTERACTION as any).SIGNAL_PULSE = false;

        const overlay = document.createElement('div');
        overlay.id = 'patch-cables-overlay';
        document.body.appendChild(overlay);

        stubStore([{ source: '1.saw_out', target: '2.in', active: true }]);

        const mgr = new PatchCableManager();
        mgr.syncCablesFromState();

        await new Promise((r) => setTimeout(r, 700));
        const path = overlay.querySelector('.patch-cable')!;
        expect(path.classList.contains('signal-active')).toBe(false);
        expect(mgr.cableCount).toBe(1);
    });

    it('adds .signal-active after the entering animation when the flag is on', async () => {
        (INTERACTION as any).SIGNAL_PULSE = true;

        const overlay = document.createElement('div');
        overlay.id = 'patch-cables-overlay';
        document.body.appendChild(overlay);

        stubStore([{ source: '1.saw_out', target: '2.in', active: true }]);

        const mgr = new PatchCableManager();
        mgr.syncCablesFromState();

        const path = overlay.querySelector('.patch-cable')!;
        expect(path.classList.contains('signal-active')).toBe(false);

        await new Promise((r) => setTimeout(r, 700));
        expect(path.classList.contains('signal-active')).toBe(true);
    });
});

describe('PatchCableManager route highlight (§9 Ruta destacada)', () => {
    const realPulse = (INTERACTION as any).SIGNAL_PULSE;

    /**
     * Monta rack + 2 módulos con 3 pares de port-sockets, de modo que la
     * matrix pueda describir 3 rutas: saw, gate y noise/filter.
     */
    function setupRack(): void {
        const rack = document.createElement('div');
        rack.id = 'omega-rack';

        for (const [modId, ports] of [
            ['mod-v7_1', ['saw_out', 'gate_out', 'noise_out']],
            ['mod-v7_2', ['in', 'gate', 'filter_in']],
        ] as const) {
            const mod = document.createElement('div');
            mod.id = modId;
            mod.className = 'module';
            for (const port of ports) {
                const socket = document.createElement('div');
                socket.className = 'port-socket';
                socket.dataset.source = port;
                mod.appendChild(socket);
            }
            rack.appendChild(mod);
        }

        document.body.appendChild(rack);
    }

    function setupOverlay(): void {
        const overlay = document.createElement('div');
        overlay.id = 'patch-cables-overlay';
        document.body.appendChild(overlay);
    }

    function cables(mgr: PatchCableManager): { slot: number; path: SVGPathElement }[] {
        return mgr.getActiveCablePaths().map((c) => ({
            slot: c.slotIndex,
            path: c.pathElement,
        }));
    }

    beforeEach(() => {
        (INTERACTION as any).SIGNAL_PULSE = false;
        setupRack();
        setupOverlay();
    });

    afterEach(() => {
        (INTERACTION as any).SIGNAL_PULSE = realPulse;
        (window as any).runtimeStore = undefined;
        document.getElementById('patch-cables-overlay')?.remove();
        document.getElementById('omega-rack')?.remove();
    });

    it('starts with no highlighted slot and no route-* classes', () => {
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true },
            { source: '1.gate_out', target: '2.gate', active: true },
        ]);

        const mgr = new PatchCableManager();
        mgr.syncCablesFromState();

        expect(mgr.getHighlightedSlot()).toBeNull();
        for (const c of cables(mgr)) {
            expect(c.path.classList.contains('route-highlight')).toBe(false);
            expect(c.path.classList.contains('route-dimmed')).toBe(false);
        }
    });

    it('highlights the selected slot cable and dims the others', () => {
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true },
            { source: '1.gate_out', target: '2.gate', active: true },
        ]);

        const mgr = new PatchCableManager();
        mgr.syncCablesFromState();
        mgr.highlightRoute(0);

        const list = cables(mgr);
        const slot0 = list.find((c) => c.slot === 0)!;
        const slot1 = list.find((c) => c.slot === 1)!;

        expect(slot0.path.classList.contains('route-highlight')).toBe(true);
        expect(slot0.path.classList.contains('route-dimmed')).toBe(false);
        expect(slot1.path.classList.contains('route-dimmed')).toBe(true);
        expect(slot1.path.classList.contains('route-highlight')).toBe(false);
        expect(mgr.getHighlightedSlot()).toBe(0);
    });

    it('restores normal appearance when highlightRoute(null) is called', () => {
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true },
            { source: '1.gate_out', target: '2.gate', active: true },
        ]);

        const mgr = new PatchCableManager();
        mgr.syncCablesFromState();
        mgr.highlightRoute(1);
        mgr.highlightRoute(null);

        expect(mgr.getHighlightedSlot()).toBeNull();
        for (const c of cables(mgr)) {
            expect(c.path.classList.contains('route-highlight')).toBe(false);
            expect(c.path.classList.contains('route-dimmed')).toBe(false);
        }
    });

    it('re-applies the highlight to cables created by a later sync', () => {
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true },
        ]);

        const mgr = new PatchCableManager();
        mgr.syncCablesFromState();
        mgr.highlightRoute(0);

        // Aparece un tercer cable en un sync posterior
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true },
            { source: '1.gate_out', target: '2.gate', active: true },
            { source: '1.noise_out', target: '2.filter_in', active: true },
        ]);
        mgr.syncCablesFromState();

        const list = cables(mgr);
        const slot0 = list.find((c) => c.slot === 0)!;
        const slot2 = list.find((c) => c.slot === 2)!;

        expect(slot0.path.classList.contains('route-highlight')).toBe(true);
        expect(slot2.path.classList.contains('route-dimmed')).toBe(true);
        expect(mgr.getHighlightedSlot()).toBe(0);
    });
});

describe('PatchCableManager.getSlotData (§8.2 Tooltip)', () => {
    beforeEach(() => {
        (window as any).runtimeStore = undefined;
    });

    it('returns source/target/amount/active for an active slot', () => {
        stubStore([
            { source: '1.saw_out', target: '1.fm_in', amount: 0.75, active: true },
        ]);
        const mgr = new PatchCableManager();
        expect(mgr.getSlotData(0)).toEqual({
            source: '1.saw_out',
            target: '1.fm_in',
            amount: 0.75,
            active: true,
        });
    });

    it('returns null for an inactive slot', () => {
        stubStore([
            { source: '1.saw_out', target: '1.fm_in', active: false },
        ]);
        const mgr = new PatchCableManager();
        expect(mgr.getSlotData(0)).toBeNull();
    });

    it('returns null when the slot index does not exist', () => {
        stubStore([
            { source: '1.saw_out', target: '1.fm_in', active: true },
        ]);
        const mgr = new PatchCableManager();
        expect(mgr.getSlotData(7)).toBeNull();
    });

    it('coerces a string amount and defaults a missing amount to 1', () => {
        stubStore([
            { source: 'a', target: 'b', amount: '0.5', active: true },
            { source: 'c', target: 'd', active: true },
        ]);
        const mgr = new PatchCableManager();
        expect(mgr.getSlotData(0)!.amount).toBe(0.5);
        expect(mgr.getSlotData(1)!.amount).toBe(1);
    });

    it('returns null when there is no store', () => {
        const mgr = new PatchCableManager();
        expect(mgr.getSlotData(0)).toBeNull();
    });
});

describe('PatchCableManager cable color (§9 Color Picker)', () => {
    const realPulse = (INTERACTION as any).SIGNAL_PULSE;

    function setupRack(): void {
        const rack = document.createElement('div');
        rack.id = 'omega-rack';

        for (const [modId, ports] of [
            ['mod-v7_1', ['saw_out']],
            ['mod-v7_2', ['in']],
        ] as const) {
            const mod = document.createElement('div');
            mod.id = modId;
            mod.className = 'module';
            for (const port of ports) {
                const socket = document.createElement('div');
                socket.className = 'port-socket';
                socket.dataset.source = port;
                mod.appendChild(socket);
            }
            rack.appendChild(mod);
        }

        document.body.appendChild(rack);
    }

    function setupOverlay(): void {
        const overlay = document.createElement('div');
        overlay.id = 'patch-cables-overlay';
        document.body.appendChild(overlay);
    }

    beforeEach(() => {
        (INTERACTION as any).SIGNAL_PULSE = false;
        setupRack();
        setupOverlay();
    });

    afterEach(() => {
        (INTERACTION as any).SIGNAL_PULSE = realPulse;
        (window as any).runtimeStore = undefined;
        document.getElementById('patch-cables-overlay')?.remove();
        document.getElementById('omega-rack')?.remove();
    });

    it('applies the slot color to path and plugs on creation', () => {
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true, color: '#ff8800' },
        ]);

        const mgr = new PatchCableManager();
        mgr.syncCablesFromState();

        const path = document.querySelector('.patch-cable')!;
        expect(path.style.stroke).toBe('#ff8800');
        const fills = Array.from(document.querySelectorAll('.cable-plug'))
            .map((p) => p.getAttribute('fill'));
        expect(fills).toEqual(['#ff8800', '#ff8800']);
    });

    it('falls back to the signal-type color when the slot has no color', () => {
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true },
        ]);

        const mgr = new PatchCableManager();
        mgr.syncCablesFromState();

        const path = document.querySelector('.patch-cable')!;
        // Sin inventario → el tipo se resuelve a 'cv' (#06b6d4).
        // El path SIN override inline deja que el CSS [data-signal] mande...
        expect(path.style.stroke).toBe('');
        // ...pero los plugs siempre llevan el fill resuelto explícito.
        const fills = Array.from(document.querySelectorAll('.cable-plug'))
            .map((p) => p.getAttribute('fill'));
        expect(fills).toEqual(['#06b6d4', '#06b6d4']);
    });

    it('re-applies the color live on the existing cable (Caso A)', () => {
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true },
        ]);

        const mgr = new PatchCableManager();
        mgr.syncCablesFromState();
        expect(document.querySelector('.patch-cable')!.style.stroke).toBe('');

        // El usuario elige un color en el inspector → el backend responde con
        // el slot actualizado y syncCablesFromState() recolorea SIN recrear.
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true, color: '#3b82f6' },
        ]);
        mgr.syncCablesFromState();

        const path = document.querySelector('.patch-cable')!;
        expect(path.style.stroke).toBe('#3b82f6');
        const fills = Array.from(document.querySelectorAll('.cable-plug'))
            .map((p) => p.getAttribute('fill'));
        expect(fills).toEqual(['#3b82f6', '#3b82f6']);
        expect(mgr.cableCount).toBe(1); // no se duplicó el cable
    });

    it('clears the override when the slot color becomes empty (back to default)', () => {
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true, color: '#f97316' },
        ]);

        const mgr = new PatchCableManager();
        mgr.syncCablesFromState();
        expect(document.querySelector('.patch-cable')!.style.stroke).toBe('#f97316');

        // Swatch AUTO → color vacío → vuelve al CSS [data-signal]
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true, color: '' },
        ]);
        mgr.syncCablesFromState();

        const path = document.querySelector('.patch-cable')!;
        expect(path.style.stroke).toBe('');
        const fills = Array.from(document.querySelectorAll('.cable-plug'))
            .map((p) => p.getAttribute('fill'));
        expect(fills).toEqual(['#06b6d4', '#06b6d4']);
    });

    it('ignores a malformed color string and falls back', () => {
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true, color: 'red;stroke:red' },
        ]);

        const mgr = new PatchCableManager();
        mgr.syncCablesFromState();

        const path = document.querySelector('.patch-cable')!;
        expect(path.style.stroke).toBe(''); // no inyecta CSS arbitrario
    });
});

describe('PatchCableManager mazo (§9 agrupación de cables)', () => {
    const realPulse = (INTERACTION as any).SIGNAL_PULSE;

    /** Socket layout: port -> rect (los centros salen relativos al rack en (0,0)). */
    const MOD_1_PORTS: Record<string, { left: number; top: number; width: number; height: number }> = {
        saw_out: { left: 100, top: 80, width: 8, height: 8 },
        gate_out: { left: 100, top: 90, width: 8, height: 8 },
    };
    const MOD_2_PORTS: Record<string, { left: number; top: number; width: number; height: number }> = {
        in: { left: 500, top: 200, width: 8, height: 8 },
        gate: { left: 500, top: 210, width: 8, height: 8 },
    };
    const MOD_3_PORTS: Record<string, { left: number; top: number; width: number; height: number }> = {
        out: { left: 900, top: 80, width: 8, height: 8 },
    };
    const MOD_4_PORTS: Record<string, { left: number; top: number; width: number; height: number }> = {
        in: { left: 900, top: 300, width: 8, height: 8 },
    };

    function rect(left: number, top: number, width: number, height: number): DOMRect {
        return {
            x: left, y: top, width, height, left, top,
            right: left + width, bottom: top + height,
            toJSON: () => ({
                x: left, y: top, width, height, left, top,
                right: left + width, bottom: top + height,
            }),
        } as DOMRect;
    }

    /** Monta 4 módulos con rects controlados para posiciones deterministas. */
    function setupRack(): void {
        const rack = document.createElement('div');
        rack.id = 'omega-rack';

        for (const [modId, ports] of [
            ['mod-v7_1', MOD_1_PORTS],
            ['mod-v7_2', MOD_2_PORTS],
            ['mod-v7_3', MOD_3_PORTS],
            ['mod-v7_4', MOD_4_PORTS],
        ] as const) {
            const mod = document.createElement('div');
            mod.id = modId;
            mod.className = 'module';
            for (const [port, r] of Object.entries(ports)) {
                const socket = document.createElement('div');
                socket.className = 'port-socket';
                socket.dataset.source = port;
                socket.getBoundingClientRect = () => rect(r.left, r.top, r.width, r.height);
                mod.appendChild(socket);
            }
            rack.appendChild(mod);
        }

        document.body.appendChild(rack);
    }

    function setupOverlay(): void {
        const overlay = document.createElement('div');
        overlay.id = 'patch-cables-overlay';
        document.body.appendChild(overlay);
    }

    function parsePath(d: string): number[] {
        return (d.match(/-?\d*\.?\d+/g) ?? []).map((n) => parseFloat(n));
    }

    /** Punto medio (t=0.5) de la Bézier cúbica. */
    function bezierMid(nums: number[]): { x: number; y: number } {
        const x1 = nums[0], y1 = nums[1];
        const cx1 = nums[2], cy1 = nums[3];
        const cx2 = nums[4], cy2 = nums[5];
        const x2 = nums[6], y2 = nums[7];
        return {
            x: (x1 + 3 * cx1 + 3 * cx2 + x2) / 8,
            y: (y1 + 3 * cy1 + 3 * cy2 + y2) / 8,
        };
    }

    /** Punto medio de los extremos (lo que el cable tendría sin spread). */
    function baseMid(nums: number[]): { x: number; y: number } {
        const x1 = nums[0], y1 = nums[1];
        const x2 = nums[6], y2 = nums[7];
        return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    }

    function pathOf(mgr: PatchCableManager, slot: number): SVGPathElement {
        return mgr.getActiveCablePaths().find((c) => c.slotIndex === slot)!.pathElement;
    }

    beforeEach(() => {
        (INTERACTION as any).SIGNAL_PULSE = false;
        setupRack();
        setupOverlay();
    });

    afterEach(() => {
        (INTERACTION as any).SIGNAL_PULSE = realPulse;
        (window as any).runtimeStore = undefined;
        document.getElementById('patch-cables-overlay')?.remove();
        document.getElementById('omega-rack')?.remove();
    });

    it('separates two cables between the same module pair into a mazo', () => {
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true },
            { source: '1.gate_out', target: '2.gate', active: true },
        ]);
        const mgr = new PatchCableManager();
        mgr.syncCablesFromState();

        const p0 = parsePath(pathOf(mgr, 0).getAttribute('d')!);
        const p1 = parsePath(pathOf(mgr, 1).getAttribute('d')!);

        // Extremos clavados en sus jacks (centro del socket - rack en 0,0)
        expect([p0[0], p0[1]]).toEqual([104, 84]);
        expect([p0[6], p0[7]]).toEqual([504, 204]);
        expect([p1[0], p1[1]]).toEqual([104, 94]);
        expect([p1[6], p1[7]]).toEqual([504, 214]);

        // Desplazamiento del mazo en el punto medio: medio de la curva - base del cable
        const s0 = {
            x: bezierMid(p0).x - baseMid(p0).x,
            y: bezierMid(p0).y - baseMid(p0).y,
        };
        const s1 = {
            x: bezierMid(p1).x - baseMid(p1).x,
            y: bezierMid(p1).y - baseMid(p1).y,
        };
        const diff = { x: s1.x - s0.x, y: s1.y - s0.y };

        // Ambos cables se separan del eje (spread no nulo)
        expect(Math.hypot(s0.x, s0.y)).toBeGreaterThan(0.5);
        expect(Math.hypot(s1.x, s1.y)).toBeGreaterThan(0.5);

        // La separación entre cables es perpendicular al eje
        // (mismo axis en ambos: dx=400, dy=120 → jacks paralelos)
        const axis = { x: 400, y: 120 };
        const dot = axis.x * diff.x + axis.y * diff.y;
        expect(Math.abs(dot)).toBeLessThan(1);
    });

    it('leaves a lone cable (different module pairs) unbundled', () => {
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true },
            { source: '3.out', target: '4.in', active: true },
        ]);
        const mgr = new PatchCableManager();
        mgr.syncCablesFromState();

        for (const slot of [0, 1]) {
            const nums = parsePath(pathOf(mgr, slot).getAttribute('d')!);
            // Sin mazo → puntos de control alineados con el X del jack
            expect(nums[2]).toBe(nums[0]); // cx1 == x1
            expect(nums[4]).toBe(nums[6]); // cx2 == x2
        }
    });

    it('re-groups when a cable leaves the mazo via a route change', () => {
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true },
            { source: '1.gate_out', target: '2.gate', active: true },
        ]);
        const mgr = new PatchCableManager();
        mgr.syncCablesFromState();

        // slot 1 se re-enruta al par {3,4} → el mazo {1,2} queda con un solo cable
        stubStore([
            { source: '1.saw_out', target: '2.in', active: true },
            { source: '3.out', target: '4.in', active: true },
        ]);
        mgr.syncCablesFromState();

        const nums0 = parsePath(pathOf(mgr, 0).getAttribute('d')!);
        expect(nums0[2]).toBe(nums0[0]); // ya no está agrupado
    });
});
