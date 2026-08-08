/**
 * @jest-environment node
 *
 * Tests for SharedModuleCatalogService — the catalog derived from modules/
 * (via acemmCatalog.generated.ts). Verifies there are NO hardcoded module lists
 * and that every module in the shelf is exposed (including midi_2_cv).
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  SharedModuleCatalogService,
  SHARED_MODULES_CATALOG,
} from '../sharedModuleCatalog';

// ── fetch mock helper ──────────────────────────────────────────────
function mockFetchResponse(body: string, ok = true, status = 200) {
  return jest.fn(() =>
    Promise.resolve({
      ok,
      status,
      text: () => Promise.resolve(body),
    } as unknown as Response)
  ) as unknown as typeof fetch;
}

describe('SharedModuleCatalogService — catalog derivation', () => {
  it('exposes every module from the generated catalog (no hardcoded list)', () => {
    const ids = SHARED_MODULES_CATALOG.map((m) => m.id).sort();
    expect(ids).toEqual([
      '440demo',
      'midi_2_cv',
      'midi_in',
      'midi_trigger',
      'omega_lab_monitor',
      'test_parity',
    ]);
  });

  it('includes midi_2_cv (regression: missing from old hardcoded list)', () => {
    const entry = SharedModuleCatalogService.getModuleById('midi_2_cv');
    expect(entry).toBeDefined();
    expect(entry?.name).toBe('MIDI 2 CV');
  });

  it('derives fields from the raw catalog entry', () => {
    const entry = SharedModuleCatalogService.getModuleById('midi_2_cv')!;
    expect(entry.id).toBe('midi_2_cv');
    expect(entry.family).toBe('control');
    expect(entry.version).toBe('1.0.0');
    expect(entry.hpWidth).toBe(8);
    expect(entry.manifestUrl).toBe('/modules/midi_2_cv/midi_2_cv.acemm');
    expect(entry.wasmUrl).toBe('/wasm/midi_2_cv.wasm');
    expect(entry.hasSource).toBe(true);
    expect(entry.skin).toBe('industrial');
  });

  it('counts ports and non-port controls per module', () => {
    const midi2cv = SharedModuleCatalogService.getModuleById('midi_2_cv')!;
    // 4 port controls (CV, GATE, VEL, AT) + 5 hidden knobs
    expect(midi2cv.portsCount).toBe(4);
    expect(midi2cv.controlsCount).toBe(5);
  });

  it('marks modules without assets as source-less', () => {
    const parity = SharedModuleCatalogService.getModuleById('test_parity')!;
    expect(parity.hasSource).toBe(false);
    expect(parity.wasmUrl).toBeUndefined();
  });

  it('getCatalog returns the shared catalog (same reference)', () => {
    expect(SharedModuleCatalogService.getCatalog()).toBe(SHARED_MODULES_CATALOG);
  });
});

describe('SharedModuleCatalogService — getModuleById', () => {
  it('finds by exact id', () => {
    expect(SharedModuleCatalogService.getModuleById('midi_in')?.id).toBe('midi_in');
  });

  it('returns undefined for unknown id', () => {
    expect(SharedModuleCatalogService.getModuleById('does_not_exist')).toBeUndefined();
  });

  it('hasSource returns false for unknown id', () => {
    expect(SharedModuleCatalogService.hasSource('does_not_exist')).toBe(false);
  });
});

describe('SharedModuleCatalogService — fetchManifest', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('parses a JSON manifest', async () => {
    globalThis.fetch = mockFetchResponse('{"id":"midi_2_cv"}');
    const manifest = await SharedModuleCatalogService.fetchManifest('midi_2_cv');
    expect(manifest).toEqual({ id: 'midi_2_cv' });
    expect(globalThis.fetch).toHaveBeenCalledWith('/modules/midi_2_cv/midi_2_cv.acemm');
  });

  it('falls back to YAML when the manifest is not JSON', async () => {
    globalThis.fetch = mockFetchResponse('id: midi_2_cv\nname: MIDI 2 CV\n');
    const manifest = await SharedModuleCatalogService.fetchManifest('midi_2_cv');
    expect(manifest).toEqual({ id: 'midi_2_cv', name: 'MIDI 2 CV' });
  });

  it('falls back to a direct URL for unknown modules', async () => {
    globalThis.fetch = mockFetchResponse('{"id":"ghost"}');
    const manifest = await SharedModuleCatalogService.fetchManifest('ghost');
    expect(manifest).toEqual({ id: 'ghost' });
    expect(globalThis.fetch).toHaveBeenCalledWith('/modules/ghost/ghost.acemm');
  });
});

describe('SharedModuleCatalogService — fetchSource', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns the C++ source text for a module', async () => {
    globalThis.fetch = mockFetchResponse('// midi_2_cv.cpp');
    await expect(SharedModuleCatalogService.fetchSource('midi_2_cv')).resolves.toBe(
      '// midi_2_cv.cpp'
    );
    expect(globalThis.fetch).toHaveBeenCalledWith('/modules/midi_2_cv/midi_2_cv.cpp');
  });

  it('throws with HTTP status when the source is missing', async () => {
    globalThis.fetch = mockFetchResponse('', false, 404);
    await expect(SharedModuleCatalogService.fetchSource('midi_2_cv')).rejects.toThrow(
      /404/
    );
  });
});
