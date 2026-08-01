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
