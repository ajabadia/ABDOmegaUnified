/**
 * Tests for GlobalFxStrip pure helpers — no DOM required for these.
 * The DOM component itself is wired in index.ts and validated by tsc/vitest
 * jsdom environment; the pure functions are the testable contract.
 */
import { describe, it, expect } from 'vitest';
import {
    GLOBAL_FX_PARAM_META,
    readGlobalFxParams,
    formatFxValue,
} from '../../src/Components/GlobalFxStrip.js';

describe('GLOBAL_FX_PARAM_META', () => {
    it('exposes the 5 known global FX ParamIds (C++ range 200-204)', () => {
        expect(GLOBAL_FX_PARAM_META.map((m) => m.id)).toEqual(['200', '201', '202', '203', '204']);
    });

    it('uses unique ids', () => {
        const ids = GLOBAL_FX_PARAM_META.map((m) => m.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('readGlobalFxParams', () => {
    it('returns empty object for null/undefined patch', () => {
        expect(readGlobalFxParams(null)).toEqual({});
        expect(readGlobalFxParams(undefined)).toEqual({});
    });

    it('returns empty object when globalFxParams is absent (older payloads)', () => {
        expect(readGlobalFxParams({ name: 'x', modules: [] })).toEqual({});
    });

    it('returns empty object when globalFxParams is not an object', () => {
        expect(readGlobalFxParams({ globalFxParams: 'not-an-object' })).toEqual({});
        expect(readGlobalFxParams({ globalFxParams: 42 })).toEqual({});
    });

    it('copies numeric values keyed by id-string', () => {
        const params = readGlobalFxParams({ globalFxParams: { '200': 0.6, '201': 0.3 } });
        expect(params).toEqual({ '200': 0.6, '201': 0.3 });
    });

    it('skips non-numeric values (strings, NaN, booleans)', () => {
        const params = readGlobalFxParams({
            globalFxParams: { '200': 0.6, '201': 'x', '202': NaN, '203': true },
        });
        expect(params).toEqual({ '200': 0.6 });
    });
});

describe('formatFxValue', () => {
    it('formats normalized 0..1 values as percentages', () => {
        expect(formatFxValue(0)).toBe('0%');
        expect(formatFxValue(0.5)).toBe('50%');
        expect(formatFxValue(1)).toBe('100%');
    });

    it('handles undefined/negative defensively', () => {
        expect(formatFxValue(undefined as unknown as number)).toBe('0%');
        expect(formatFxValue(-0.5)).toBe('-50%');
    });
});
