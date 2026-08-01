/**
 * CableRenderer unit tests.
 * Verifies the cubic-Bezier sag math: control points must sit BELOW the
 * jack endpoints (sag > 0), and longer cables sag more (clamped to MAX_SAG).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { CableRenderer, computeBundleSpread } from '../../src/Components/cables/CableRenderer.js';
import {
    CABLE_PHYSICS,
    CABLE_TENSION,
    CABLE_BUNDLE,
    setGlobalTension,
    getGlobalTension,
} from '../../src/Components/cables/cableConstants.js';

function parsePath(d: string): { cmd: string; nums: number[] } {
    const nums = (d.match(/-?\d*\.?\d+/g) ?? []).map((n) => parseFloat(n));
    return { cmd: d.trim()[0], nums };
}

// La tensión es estado global a nivel de módulo: restaurar el default
// (0 = espagueti) tras cada test para no contaminar el resto.
afterEach(() => setGlobalTension(CABLE_TENSION.DEFAULT));

describe('CableRenderer.calculatePath', () => {
    it('produces a cubic bezier (M ... C ...) not a straight line', () => {
        const d = CableRenderer.calculatePath({ x1: 100, y1: 80, x2: 400, y2: 300 });
        const { cmd, nums } = parsePath(d);
        expect(cmd).toBe('M');
        // M x1 y1 C cx1 cy1, cx2 cy2, x2 y2  →  8 numbers total
        expect(nums).toHaveLength(8);
        expect(d.includes(' C ')).toBe(true);
    });

    it('places control points below the endpoints (sag > 0)', () => {
        const d = CableRenderer.calculatePath({ x1: 100, y1: 80, x2: 400, y2: 300 });
        const nums = parsePath(d).nums;
        const [, , cx1, cy1, cx2, cy2] = nums;
        expect(cy1).toBeGreaterThan(80);   // below y1
        expect(cy2).toBeGreaterThan(300);  // below y2
        expect(cx1).toBe(100);             // aligned with x1
        expect(cx2).toBe(400);             // aligned with x2
    });

    it('sags more for longer cables, clamped to MAX_SAG', () => {
        const sagOf = (dist: number) => {
            const d = CableRenderer.calculatePath({ x1: 0, y1: 0, x2: dist, y2: 0 });
            return parsePath(d).nums[3]; // cy1 == y1 + sag == sag
        };

        const near = sagOf(10);
        const far = sagOf(5000);
        expect(near).toBeGreaterThan(0);
        expect(far).toBeGreaterThan(near);
        expect(far).toBeLessThanOrEqual(CABLE_PHYSICS.MAX_SAG);
        // Minimum sag for a zero-length cable
        const zero = sagOf(0);
        expect(zero).toBe(CABLE_PHYSICS.BASE_SAG);
    });

    it('keeps control-point X aligned with the jacks', () => {
        const d = CableRenderer.calculatePath({ x1: 100, y1: 80, x2: 400, y2: 300 });
        const nums = parsePath(d).nums;
        expect(nums[2]).toBe(100); // cx1 == x1
        expect(nums[6]).toBe(400); // cx2 == x2
    });
});

describe('CableRenderer tension (§9)', () => {
    const ep = { x1: 0, y1: 0, x2: 1000, y2: 0 };
    const baseSag = () => parsePath(CableRenderer.calculatePath(ep)).nums[3];

    it('defaults to 0 (spaghetti) and preserves the current sag', () => {
        expect(getGlobalTension()).toBe(CABLE_TENSION.DEFAULT);
        expect(baseSag()).toBe(CABLE_PHYSICS.BASE_SAG + 1000 * CABLE_PHYSICS.SAG_FACTOR);
    });

    it('reduces sag as tension increases (tight at 1)', () => {
        const sagSpaghetti = baseSag();

        setGlobalTension(1);
        const sagTight = baseSag();
        expect(sagTight).toBeLessThan(sagSpaghetti);
        expect(sagTight).toBeCloseTo(sagSpaghetti * CABLE_TENSION.MIN_SAG_RATIO, 5);
    });

    it('scales sag linearly with tension in between', () => {
        const sagSpaghetti = baseSag();
        const sagTight = parsePath(
            CableRenderer.calculatePath({ ...ep }),
        ).nums[3]; // still tension 0 from previous? No — recompute below
        void sagTight;

        setGlobalTension(0.5);
        const sagMid = baseSag();
        const expectedMid = sagSpaghetti * (
            CABLE_TENSION.MIN_SAG_RATIO +
            (1 - CABLE_TENSION.MIN_SAG_RATIO) * 0.5
        );
        expect(sagMid).toBeCloseTo(expectedMid, 5);
        setGlobalTension(1);
        const sagTight2 = baseSag();
        expect(sagMid).toBeGreaterThan(sagTight2);
    });

    it('clamps out-of-range tension values to [0, 1]', () => {
        setGlobalTension(-5);
        expect(getGlobalTension()).toBe(0);
        setGlobalTension(2);
        expect(getGlobalTension()).toBe(1);
        expect(baseSag()).toBeCloseTo(
            (CABLE_PHYSICS.BASE_SAG + 1000 * CABLE_PHYSICS.SAG_FACTOR) *
            CABLE_TENSION.MIN_SAG_RATIO,
            5,
        );
    });

    it('tension and repulsion deform compose (sag scaled, controls offset)', () => {
        setGlobalTension(1);
        const d = CableRenderer.calculatePath(ep, { x: 30, y: -10 });
        const nums = parsePath(d).nums;
        const base = parsePath(CableRenderer.calculatePath(ep)).nums;
        const expectedSag = base[3];
        expect(nums[2]).toBe(0 + 30);   // cx1 = x1 + offX
        expect(nums[3]).toBeCloseTo(expectedSag - 10, 5); // cy1 = sag - offY
    });
});

describe('CableRenderer cable color (§9 Color Picker)', () => {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    function makePath(): SVGPathElement {
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('data-signal', 'cv');
        return path;
    }

    function makePlugs(): SVGGElement {
        const group = document.createElementNS(SVG_NS, 'g');
        for (let i = 0; i < 2; i++) {
            const plug = document.createElementNS(SVG_NS, 'circle');
            plug.setAttribute('fill', '#000');
            group.appendChild(plug);
        }
        return group;
    }

    afterEach(() => {
        document.getElementById('patch-cables-overlay')?.remove();
    });

    it('createCablePath sets the inline stroke when a color is provided', () => {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.id = 'patch-cables-overlay';
        document.body.appendChild(svg);

        const path = CableRenderer.createCablePath(
            0, { x1: 0, y1: 0, x2: 100, y2: 0 }, 'cv', '#ff8800',
        );
        // El inline style GANA a la regla CSS [data-signal]
        expect(path.style.stroke).toBe('#ff8800');
        expect(path.getAttribute('data-signal')).toBe('cv');
    });

    it('createCablePath leaves the inline stroke empty without a custom color', () => {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.id = 'patch-cables-overlay';
        document.body.appendChild(svg);

        const path = CableRenderer.createCablePath(
            0, { x1: 0, y1: 0, x2: 100, y2: 0 }, 'audio', undefined,
        );
        // Sin color personalizado → el CSS [data-signal] manda
        expect(path.style.stroke).toBe('');
    });

    it('createPlugs fills the plugs with the resolved color', () => {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.id = 'patch-cables-overlay';
        document.body.appendChild(svg);

        const group = CableRenderer.createPlugs(10, 20, 30, 40, '#06b6d4');
        const fills = Array.from(group.querySelectorAll('circle'))
            .map((c) => c.getAttribute('fill'));
        expect(fills).toEqual(['#06b6d4', '#06b6d4']);
    });

    it('setCableColor applies and clears the inline stroke', () => {
        const path = makePath();
        CableRenderer.setCableColor(path, '#ec4899');
        expect(path.style.stroke).toBe('#ec4899');
        CableRenderer.setCableColor(path, null);
        expect(path.style.stroke).toBe('');
    });

    it('setPlugsColor recolors every plug', () => {
        const group = makePlugs();
        CableRenderer.setPlugsColor(group, '#f59e0b');
        const fills = Array.from(group.querySelectorAll('circle'))
            .map((c) => c.getAttribute('fill'));
        expect(fills).toEqual(['#f59e0b', '#f59e0b']);
    });
});

describe('CableRenderer computeBundleSpread (§9 mazo)', () => {
    it('spreads perpendicular to a horizontal axis (vertical separation)', () => {
        const ep = { x1: 0, y1: 0, x2: 100, y2: 0 };
        const s0 = computeBundleSpread(ep, 0, 2);
        const s1 = computeBundleSpread(ep, 1, 2);
        expect(s0.x).toBeCloseTo(0, 5);
        expect(s1.x).toBeCloseTo(0, 5);
        expect(s0.y).toBeCloseTo(-CABLE_BUNDLE.SPREAD / 2, 5);
        expect(s1.y).toBeCloseTo(CABLE_BUNDLE.SPREAD / 2, 5);
    });

    it('spreads perpendicular to a vertical axis (horizontal separation)', () => {
        const ep = { x1: 0, y1: 0, x2: 0, y2: 100 };
        const s0 = computeBundleSpread(ep, 0, 2);
        const s1 = computeBundleSpread(ep, 1, 2);
        expect(s0.x).toBeCloseTo(CABLE_BUNDLE.SPREAD / 2, 5);
        expect(s1.x).toBeCloseTo(-CABLE_BUNDLE.SPREAD / 2, 5);
        expect(s0.y).toBeCloseTo(0, 5);
        expect(s1.y).toBeCloseTo(0, 5);
    });

    it('is always perpendicular to the source→target axis', () => {
        const ep = { x1: 10, y1: 20, x2: 30, y2: 50 };
        const axis = { x: 20, y: 30 };
        for (let i = 0; i < 4; i++) {
            const s = computeBundleSpread(ep, i, 4);
            const dot = axis.x * s.x + axis.y * s.y;
            expect(dot).toBeCloseTo(0, 5);
        }
    });

    it('centers the group: middle cable on the axis, symmetric spread', () => {
        const ep = { x1: 0, y1: 0, x2: 100, y2: 0 };
        const s0 = computeBundleSpread(ep, 0, 3);
        const s1 = computeBundleSpread(ep, 1, 3);
        const s2 = computeBundleSpread(ep, 2, 3);
        expect(s1.x).toBeCloseTo(0, 5);
        expect(s1.y).toBeCloseTo(0, 5);
        expect(s0.y).toBeCloseTo(-s2.y, 5);
        expect(s2.y).toBeCloseTo(CABLE_BUNDLE.SPREAD, 5);
    });

    it('a group of 1 has zero spread', () => {
        const ep = { x1: 0, y1: 0, x2: 100, y2: 0 };
        const s = computeBundleSpread(ep, 0, 1);
        expect(s.x).toBeCloseTo(0, 5);
        expect(s.y).toBeCloseTo(0, 5);
    });
});

describe('CableRenderer bundle offset (§9 mazo) in calculatePath', () => {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    it('shifts both control points by the bundle offset, endpoints pinned', () => {
        const ep = { x1: 100, y1: 80, x2: 400, y2: 300 };
        const d = CableRenderer.calculatePath(ep, undefined, { x: 20, y: 30 });
        const nums = parsePath(d).nums;
        const base = parsePath(CableRenderer.calculatePath(ep)).nums;
        // extremos intactos
        expect(nums[0]).toBe(100);
        expect(nums[1]).toBe(80);
        expect(nums[6]).toBe(400);
        expect(nums[7]).toBe(300);
        // puntos de control desplazados por el offset del mazo
        expect(nums[2]).toBe(base[2] + 20); // cx1 = x1 + offX
        expect(nums[3]).toBe(base[3] + 30); // cy1 = y1 + sag + offY
        expect(nums[4]).toBe(base[4] + 20); // cx2 = x2 + offX
        expect(nums[5]).toBe(base[5] + 30); // cy2 = y2 + sag + offY
    });

    it('combines repulsion deform and bundle offset additively', () => {
        const ep = { x1: 0, y1: 0, x2: 100, y2: 0 };
        const d = CableRenderer.calculatePath(ep, { x: 1, y: 2 }, { x: 3, y: 4 });
        const nums = parsePath(d).nums;
        const base = parsePath(CableRenderer.calculatePath(ep)).nums;
        expect(nums[2]).toBeCloseTo(base[2] + 1 + 3, 5);
        expect(nums[3]).toBeCloseTo(base[3] + 2 + 4, 5);
    });

    it('updateCablePath writes the bundled path', () => {
        const path = document.createElementNS(SVG_NS, 'path');
        CableRenderer.updateCablePath(
            path,
            { x1: 0, y1: 0, x2: 100, y2: 0 },
            undefined,
            { x: 7, y: 0 },
        );
        const nums = parsePath(path.getAttribute('d')!).nums;
        expect(nums[0]).toBe(0);   // x1
        expect(nums[2]).toBe(7);   // cx1 = x1 + offX
        expect(nums[6]).toBe(100); // x2
    });
});
