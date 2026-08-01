/**
 * CableRenderer unit tests.
 * Verifies the cubic-Bezier sag math: control points must sit BELOW the
 * jack endpoints (sag > 0), and longer cables sag more (clamped to MAX_SAG).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { CableRenderer } from '../../src/Components/cables/CableRenderer.js';
import {
    CABLE_PHYSICS,
    CABLE_TENSION,
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
