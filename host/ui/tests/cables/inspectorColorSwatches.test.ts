/**
 * Tests for the cable color swatches (§9 Color Picker) in the Matrix inspector.
 * renderInspector builds the swatch row (AUTO reset + CABLE_PALETTE) and marks
 * the swatch that matches the current slot.color.
 */
import { describe, it, expect } from 'vitest';
import { renderInspector } from '../../src/Components/patchbay/matrixTemplates.js';
import { CABLE_PALETTE } from '../../src/Components/cables/cableConstants.js';

function render(slotColor: string | undefined): HTMLElement {
    const container = document.createElement('div');
    renderInspector(
        container,
        0,
        [{
            active: true,
            source: '1.saw_out',
            target: '2.in',
            amount: 1,
            color: slotColor,
        }],
        [],
        [],
    );
    return container;
}

describe('Matrix inspector cable color swatches (§9)', () => {
    it('renders the AUTO reset swatch plus one swatch per palette color', () => {
        const el = render(undefined);
        const swatches = el.querySelectorAll('.cable-swatch');
        expect(swatches.length).toBe(1 + CABLE_PALETTE.length);
        // Todos los swatches se envían vía data-key="color"
        for (const s of Array.from(swatches)) {
            expect(s.getAttribute('data-key')).toBe('color');
        }
    });

    it('marks the reset (AUTO) swatch active when the slot has no color', () => {
        const el = render(undefined);
        const reset = el.querySelector('.cable-swatch.reset')!;
        expect(reset.classList.contains('active')).toBe(true);
    });

    it('marks the reset swatch active for an empty color string', () => {
        const el = render('');
        const reset = el.querySelector('.cable-swatch.reset')!;
        expect(reset.classList.contains('active')).toBe(true);
    });

    it('marks the matching palette swatch active when a color is set', () => {
        const el = render('#ec4899');
        const reset = el.querySelector('.cable-swatch.reset')!;
        expect(reset.classList.contains('active')).toBe(false);

        const swatch = el.querySelector('.cable-swatch[data-value="#ec4899"]')!;
        expect(swatch).toBeTruthy();
        expect(swatch.classList.contains('active')).toBe(true);
    });

    it('falls back to reset-active for a malformed color', () => {
        const el = render('red;stroke:red');
        const reset = el.querySelector('.cable-swatch.reset')!;
        expect(reset.classList.contains('active')).toBe(true);
        expect(el.querySelectorAll('.cable-swatch.active').length).toBe(1);
    });

    it('normalizes an uppercase hex to lowercase before matching', () => {
        const el = render('#EC4899');
        const swatch = el.querySelector('.cable-swatch[data-value="#ec4899"]')!;
        expect(swatch.classList.contains('active')).toBe(true);
    });
});
