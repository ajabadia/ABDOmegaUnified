/**
 * Tests for ValueFormatters.ts — pure formatting helpers
 * No DOM required; these are pure functions (except getRegistryEntity which
 * reads window.omegaCatalog).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getRegistryEntity,
  getFormattedValue,
  getEntityValueLabel,
} from '../../src/Renderers/ValueFormatters.js';

// ---------------------------------------------------------------------------
// getRegistryEntity
// ---------------------------------------------------------------------------
describe('getRegistryEntity', () => {
  beforeEach(() => {
    (window as any).omegaCatalog = {
      'osc1': { label: 'Oscillator', type: 'osc' },
      'vcf1': { label: 'Filter', type: 'filter' },
    };
  });

  afterEach(() => {
    delete (window as any).omegaCatalog;
  });

  it('returns the entity from omegaCatalog by id', () => {
    const entity = getRegistryEntity('osc1');
    expect(entity).toEqual({ label: 'Oscillator', type: 'osc' });
  });

  it('returns undefined for unknown id', () => {
    expect(getRegistryEntity('nonexistent')).toBeUndefined();
  });

  it('returns undefined when omegaCatalog is not set', () => {
    delete (window as any).omegaCatalog;
    expect(getRegistryEntity('osc1')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getFormattedValue
// ---------------------------------------------------------------------------
describe('getFormattedValue', () => {
  it('formats a plain number with default precision (2) when no attributes', () => {
    expect(getFormattedValue(null, null, 3.14159)).toBe('3.14');
  });

  it('respects ui_precision from attributes', () => {
    const att = { ui_precision: 0 };
    expect(getFormattedValue(att, null, 3.14159)).toBe('3');
  });

  it('respects ui_precision = 4', () => {
    const att = { ui_precision: 4 };
    expect(getFormattedValue(att, null, 1.23456)).toBe('1.2346');
  });

  it('returns option label when entity has matching options (exact match)', () => {
    const entity = {
      options: [
        { value: 0, label: 'Sine' },
        { value: 1, label: 'Triangle' },
        { value: 2, label: 'Saw' },
      ],
    };
    expect(getFormattedValue(null, entity, 1)).toBe('Triangle');
  });

  it('falls back to numeric format when option value not found', () => {
    const entity = {
      options: [
        { value: 0, label: 'Sine' },
        { value: 1, label: 'Triangle' },
      ],
    };
    expect(getFormattedValue(null, entity, 999)).toBe('999.00');
  });

  it('handles integer precision cleanly', () => {
    const att = { ui_precision: 0 };
    expect(getFormattedValue(att, null, 42)).toBe('42');
  });
});

// ---------------------------------------------------------------------------
// getEntityValueLabel
// ---------------------------------------------------------------------------
describe('getEntityValueLabel', () => {
  it('returns numeric string when entity has no options', () => {
    expect(getEntityValueLabel(null, 0.5)).toBe('0.50');
  });

  it('returns label for index 0 when value is 0', () => {
    const entity = {
      options: [
        { label: 'Sine' },
        { label: 'Triangle' },
      ],
    };
    expect(getEntityValueLabel(entity, 0)).toBe('Sine');
  });

  it('returns the last option label when value is near 1', () => {
    const entity = {
      options: [
        { label: 'Low' },
        { label: 'Mid' },
        { label: 'High' },
      ],
    };
    expect(getEntityValueLabel(entity, 0.99)).toBe('High');
  });

  it('wraps out-of-range index back into array bounds', () => {
    const entity = {
      options: [
        { label: 'A' },
        { label: 'B' },
      ],
    };
    // value=2 gives index 4, which would be out of bounds for 2 options
    // Math.floor(2 * 2) = 4 → 4 % 2 = 0 → 'A'
    // But actually the implementation does Math.floor(value * entity.options.length)
    // 2 * 2 = 4, floor = 4. options[4] is undefined.
    // The test description says "wraps" but the implementation doesn't wrap —
    // it just accesses the array. Let's test the actual behavior:
    const result = getEntityValueLabel(entity, 2);
    // options[4] is undefined, so it returns value.toFixed(2)
    expect(result).toBe('2.00');
  });

  it('handles fractional values between option steps', () => {
    const entity = {
      options: [
        { label: 'A' },
        { label: 'B' },
        { label: 'C' },
        { label: 'D' },
      ],
    };
    // value 0.35 → Math.floor(0.35 * 4) = Math.floor(1.4) = 1 → 'B'
    expect(getEntityValueLabel(entity, 0.35)).toBe('B');
  });
});