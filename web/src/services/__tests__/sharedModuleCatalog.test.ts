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
      'adsr',
      'lfo',
      'midi_2_cv',
      'midi_in',
      'midi_trigger',
      'omega_lab_monitor',
      'test_parity',
      'vca',
      'vcf',
      'vco',
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

  // ── La clase de bug que estos tests fijan ──────────────────────────
  //
  // `fetchManifest` no comprobaba `res.ok`. Ante un 404, `yaml.load` sobre el
  // cuerpo de error NO LANZA: devuelve un string ("Not Found"), o un objeto si
  // el cuerpo es HTML con dos puntos. El llamante hacía `if (manifest)`, un
  // string es truthy, y acababa con:
  //
  //   TypeError: Cannot create property 'ui' on string 'Not Found'
  //
  // que dice "el módulo está mal formado" cuando la causa real es que el
  // fichero no existe. Cada test de abajo afirma sobre el CUERPO REAL de un
  // error, no sobre un caso imaginario.

  it('lanza nombrando el módulo y la URL cuando el manifiesto da 404', async () => {
    globalThis.fetch = mockFetchResponse('Not Found', false, 404);

    await expect(SharedModuleCatalogService.fetchManifest('vco')).rejects.toThrow(
      /No se encontró el manifiesto de "vco"[\s\S]*404[\s\S]*\/modules\/vco\/vco\.acemm/
    );
  });

  it('no devuelve el cuerpo de error de Vercel parseado como YAML', async () => {
    // Este cuerpo es el caso peligroso: contiene dos puntos, así que YAML lo
    // lee como un MAPA y devolvía un objeto con basura en vez de un string.
    const cuerpo = '<!DOCTYPE html><html><head><title>404: Not Found</title></head></html>';
    globalThis.fetch = mockFetchResponse(cuerpo, false, 404);

    await expect(SharedModuleCatalogService.fetchManifest('adsr')).rejects.toThrow(/adsr/);
  });

  it('lanza si un 200 trae un texto plano que no es un manifiesto', async () => {
    // Barrera de forma: un string no es un manifiesto, aunque el status sea 200.
    globalThis.fetch = mockFetchResponse('Not Found', true, 200);

    await expect(SharedModuleCatalogService.fetchManifest('lfo')).rejects.toThrow(
      /no es un objeto[\s\S]*string/
    );
  });

  it('lanza si un 200 trae JSON que no es un objeto', async () => {
    globalThis.fetch = mockFetchResponse('"solo una cadena"', true, 200);

    await expect(SharedModuleCatalogService.fetchManifest('vca')).rejects.toThrow(/vca/);
  });

  it('lanza nombrando el módulo si el cuerpo no es ni JSON ni YAML', async () => {
    globalThis.fetch = mockFetchResponse('\t- : ][\n  :::', true, 200);

    await expect(SharedModuleCatalogService.fetchManifest('midi_in')).rejects.toThrow(/midi_in/);
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

describe('SharedModuleCatalogService — loadCatalog (live /api/modules)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    // Limpia la caché en vivo para no contaminar otros tests.
    (SharedModuleCatalogService as any).liveCatalog = null;
  });

  it('loads the live catalog from GET /api/modules and caches it', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            vco: {
              id: 'vco',
              name: 'VCO',
              metadata: { family: 'synth', version: '1.0.0' },
              rack: { hp: 10 },
              assets: { source: true, wasm: false },
              ui: {
                controls: [{ presentation: { component: 'knob' } }],
              },
            },
            'midi_2_cv': {
              id: 'midi_2_cv',
              name: 'MIDI 2 CV',
              metadata: { family: 'control', version: '1.0.0' },
              rack: { hp: 8 },
              assets: { source: true, wasm: false },
              ui: {
                controls: [
                  { presentation: { component: 'port' } },
                  { presentation: { component: 'port' } },
                  { presentation: { component: 'knob' } },
                ],
              },
            },
          }),
      } as unknown as Response)
    ) as unknown as typeof fetch;

    const entries = await SharedModuleCatalogService.loadCatalog();
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/modules', expect.any(Object));

    const ids = entries.map((m) => m.id).sort();
    expect(ids).toEqual(['midi_2_cv', 'vco']);

    const vco = SharedModuleCatalogService.getModuleById('vco')!;
    expect(vco.name).toBe('VCO');
    expect(vco.family).toBe('synth');
    expect(vco.hpWidth).toBe(10);

    const midi2cv = SharedModuleCatalogService.getModuleById('midi_2_cv')!;
    expect(midi2cv.portsCount).toBe(2);
    expect(midi2cv.controlsCount).toBe(1);

    // getCatalog devuelve la caché en vivo (no el catálogo generado).
    expect(SharedModuleCatalogService.getCatalog()).toBe(entries);
    expect(SharedModuleCatalogService.getCatalog()).not.toBe(SHARED_MODULES_CATALOG);
  });

  it('falls back to the generated catalog when /api/modules is unavailable', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.reject(new Error('network down'))
    ) as unknown as typeof fetch;

    const entries = await SharedModuleCatalogService.loadCatalog();
    expect(entries).toBe(SHARED_MODULES_CATALOG);
    expect(SharedModuleCatalogService.getCatalog()).toBe(SHARED_MODULES_CATALOG);
  });

  it('falls back when /api/modules returns an error status', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, status: 500 } as unknown as Response)
    ) as unknown as typeof fetch;

    const entries = await SharedModuleCatalogService.loadCatalog();
    expect(entries).toBe(SHARED_MODULES_CATALOG);
  });

  it('falls back when the live catalog is empty', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      } as unknown as Response)
    ) as unknown as typeof fetch;

    const entries = await SharedModuleCatalogService.loadCatalog();
    expect(entries).toBe(SHARED_MODULES_CATALOG);
  });
});
