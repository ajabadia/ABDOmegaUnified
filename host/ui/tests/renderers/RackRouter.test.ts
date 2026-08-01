/**
 * Tests for RackRouter.ts — pure structural pipeline functions
 * No DOM required; these are pure functions.
 */
import { describe, it, expect } from 'vitest';
import {
  computeFingerprint,
  resolveRackTarget,
  processRackUpdate,
} from '../../src/Logic/RackRouter.js';

// ---------------------------------------------------------------------------
// computeFingerprint
// ---------------------------------------------------------------------------
describe('computeFingerprint', () => {
  it('returns a joined string of instanceId:componentId:theme', () => {
    const modules = [
      { instanceId: '1', componentId: 'osc_va', theme: 'dark' },
      { instanceId: '2', componentId: 'vcf_moog', theme: '' },
    ];
    const fp = computeFingerprint(modules);
    expect(fp).toBe('1:osc_va:dark|2:vcf_moog:');
  });

  it('handles empty module list', () => {
    expect(computeFingerprint([])).toBe('');
  });

  it('uses empty string for missing theme', () => {
    const modules = [
      { instanceId: 'a', componentId: 'env_ad' },
    ];
    const fp = computeFingerprint(modules);
    expect(fp).toBe('a:env_ad:');
  });

  it('produces different fingerprints for different componentIds', () => {
    const a = computeFingerprint([{ instanceId: '1', componentId: 'osc' }]);
    const b = computeFingerprint([{ instanceId: '1', componentId: 'vcf' }]);
    expect(a).not.toBe(b);
  });

  it('produces different fingerprints for different instanceIds', () => {
    const a = computeFingerprint([{ instanceId: '1', componentId: 'osc' }]);
    const b = computeFingerprint([{ instanceId: '2', componentId: 'osc' }]);
    expect(a).not.toBe(b);
  });

  it('produces different fingerprints for different themes', () => {
    const a = computeFingerprint([{ instanceId: '1', componentId: 'osc', theme: 'dark' }]);
    const b = computeFingerprint([{ instanceId: '1', componentId: 'osc', theme: 'light' }]);
    expect(a).not.toBe(b);
  });

  it('produces same fingerprint for same modules in same order', () => {
    const mods = [
      { instanceId: '1', componentId: 'osc_va' },
      { instanceId: '2', componentId: 'vcf_moog' },
    ];
    const a = computeFingerprint(mods);
    const b = computeFingerprint(mods);
    expect(a).toBe(b);
  });

  it('produces different fingerprints for different order', () => {
    const modsA = [
      { instanceId: '1', componentId: 'osc_va' },
      { instanceId: '2', componentId: 'vcf_moog' },
    ];
    const modsB = [
      { instanceId: '2', componentId: 'vcf_moog' },
      { instanceId: '1', componentId: 'osc_va' },
    ];
    expect(computeFingerprint(modsA)).not.toBe(computeFingerprint(modsB));
  });
});

// ---------------------------------------------------------------------------
// resolveRackTarget
// ---------------------------------------------------------------------------
describe('resolveRackTarget', () => {
  it('routes to lower rack (main) by default when no manifest or mod rack info', () => {
    const result = resolveRackTarget('test', {}, undefined);
    expect(result.isUpper).toBe(false);
    expect(result.rackType).toBe('main');
  });

  it('routes to upper rack when manifest rack.slot is "upper"', () => {
    const manifest = { rack: { slot: 'upper' } };
    const result = resolveRackTarget('test', {}, manifest);
    expect(result.isUpper).toBe(true);
    expect(result.rackType).toBe('aux');
  });

  it('routes to upper rack when manifest rack is "top"', () => {
    const manifest = { rack: 'top' };
    const result = resolveRackTarget('test', {}, manifest);
    expect(result.isUpper).toBe(true);
    expect(result.rackType).toBe('aux');
  });

  it('routes to upper rack when manifest height_mode is "compact"', () => {
    const manifest = { height_mode: 'compact' };
    const result = resolveRackTarget('test', {}, manifest);
    expect(result.isUpper).toBe(true);
    expect(result.rackType).toBe('aux');
  });

  it('routes to upper rack when metadata.rack.height_mode is "compact"', () => {
    const manifest = { metadata: { rack: { height_mode: 'compact' } } };
    const result = resolveRackTarget('test', {}, manifest);
    expect(result.isUpper).toBe(true);
    expect(result.rackType).toBe('aux');
  });

  it('routes to upper rack when manifest.rack.height_mode is "compact"', () => {
    const manifest = { rack: { height_mode: 'compact' } };
    const result = resolveRackTarget('test', {}, manifest);
    expect(result.isUpper).toBe(true);
    expect(result.rackType).toBe('aux');
  });

  it('uses mod.rack as fallback when manifest has no rack info', () => {
    const mod = { rack: 'upper' };
    const result = resolveRackTarget('test', mod, {});
    expect(result.isUpper).toBe(true);
    expect(result.rackType).toBe('aux');
  });

  it('manifest rack.slot takes priority over mod.rack', () => {
    const mod = { rack: 'lower' };
    const manifest = { rack: { slot: 'upper' } };
    const result = resolveRackTarget('test', mod, manifest);
    // manifest says upper, so it should be upper regardless of mod.rack
    expect(result.isUpper).toBe(true);
    expect(result.rackType).toBe('aux');
  });

  it('returns main for "lower" rack value', () => {
    const manifest = { rack: 'lower' };
    const result = resolveRackTarget('test', {}, manifest);
    expect(result.isUpper).toBe(false);
    expect(result.rackType).toBe('main');
  });

  it('is case-insensitive for rack values', () => {
    const manifest = { rack: 'UPPER' };
    const result = resolveRackTarget('test', {}, manifest);
    expect(result.isUpper).toBe(true);
    expect(result.rackType).toBe('aux');
  });

  it('handles missing manifest gracefully', () => {
    const result = resolveRackTarget('test', {}, null);
    expect(result.isUpper).toBe(false);
    expect(result.rackType).toBe('main');
  });
});

// ---------------------------------------------------------------------------
// processRackUpdate
// ---------------------------------------------------------------------------
describe('processRackUpdate', () => {
  it('returns null when state has no patch', () => {
    const result = processRackUpdate({}, '');
    expect(result).toBeNull();
  });

  it('returns null when state is undefined', () => {
    const result = processRackUpdate(undefined, '');
    expect(result).toBeNull();
  });

  it('returns null when state is null', () => {
    const result = processRackUpdate(null, '');
    expect(result).toBeNull();
  });

  it('detects empty rack', () => {
    const state = { patch: { modules: [] } };
    const result = processRackUpdate(state, '');
    expect(result).not.toBeNull();
    expect(result!.isRackEmpty).toBe(true);
    expect(result!.isStable).toBe(false);
  });

  it('detects stable state when fingerprint matches and rack is not empty', () => {
    const modules = [
      { instanceId: '1', componentId: 'osc_va' },
    ];
    const state = { patch: { modules } };
    const fp = '1:osc_va:';
    const result = processRackUpdate(state, fp);
    expect(result).not.toBeNull();
    expect(result!.isStable).toBe(true);
    expect(result!.isRackEmpty).toBe(false);
    expect(result!.fingerprint).toBe(fp);
  });

  it('detects structural change when fingerprint differs', () => {
    const state = { patch: { modules: [{ instanceId: '1', componentId: 'osc_va' }] } };
    const result = processRackUpdate(state, 'old_fingerprint');
    expect(result).not.toBeNull();
    expect(result!.isStable).toBe(false);
    expect(result!.fingerprint).toBe('1:osc_va:');
  });

  it('detects structural change when rack was empty and now has modules', () => {
    const state = { patch: { modules: [{ instanceId: '1', componentId: 'osc_va' }] } };
    // Empty rack with empty fingerprint → transition to non-empty
    const result = processRackUpdate(state, '');
    expect(result).not.toBeNull();
    expect(result!.isStable).toBe(false);
    expect(result!.isRackEmpty).toBe(false);
  });

  it('returns modules array from patch', () => {
    const modules = [
      { instanceId: '1', componentId: 'osc_va' },
      { instanceId: '2', componentId: 'vcf_moog' },
    ];
    const state = { patch: { modules } };
    const result = processRackUpdate(state, '');
    expect(result!.modules).toEqual(modules);
  });

  it('handles patch with no modules array (undefined)', () => {
    const state = { patch: {} };
    const result = processRackUpdate(state, '');
    expect(result).not.toBeNull();
    expect(result!.modules).toEqual([]);
    expect(result!.isRackEmpty).toBe(true);
  });
});