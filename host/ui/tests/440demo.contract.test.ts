/**
 * 440demo — Test del contrato (manifiesto ↔ catálogo generado ↔ contract.json)
 *
 * Cadena que valida:
 *   1. El `.acemm` canónico (modules/440demo/) se parsea y su entrada en el
 *      catálogo generado (`acemmCatalog.generated.ts`) coincide (id, rack 1U/4HP,
 *      dimensiones, controls).
 *   2. Todo `bind` del manifiesto resuelve contra `440demo.contract.json`
 *      (parámetro o puerto real — sin binds colgantes) y, a la inversa, todo
 *      parámetro/puerto del contrato está enlazado por un control del panel.
 *   3. El switch `enabled` es binario 0/1 con DEFAULT 1 (ON — suena nada más
 *      cargarse) y los puertos audio_out/led_activity son output audio/led.
 *
 * El contrato runtime (embebido en el .wasm) se verifica aparte con
 * `scripts/verify_440demo_runtime.mjs` (instanciación del binario real).
 */
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { GENERATED_ACEMM_CATALOG } from '../src/Catalog/acemmCatalog.generated.js';

// Ruta real del directorio del test (vitest ESM: fileURLToPath quita el
// prefijo virtual @fs que vitest inyecta en import.meta.url).
const TEST_DIR = resolve(fileURLToPath(import.meta.url), '..');
// tests → ui → host → raíz del repo (3 niveles).
const REPO_ROOT = resolve(TEST_DIR, '../../..');
const MOD_DIR = resolve(REPO_ROOT, 'modules/440demo');

// js-yaml no es dependencia de host/ui — se resuelve desde web/ (createRequire
// anclado a web/package.json), sin instalar nada nuevo.
const requireFromWeb = createRequire(resolve(REPO_ROOT, 'web/package.json'));
const yaml = requireFromWeb('js-yaml') as { load: (src: string) => any };

type Contract = {
  id: string;
  family?: string;
  parameters: Array<{ id: string; min: number; max: number; default: number; unit?: string }>;
  ports: Array<{ id: string; direction: string; type: string }>;
};

const manifest = yaml.load(readFileSync(resolve(MOD_DIR, '440demo.acemm'), 'utf8'));
const contract = JSON.parse(readFileSync(resolve(MOD_DIR, '440demo.contract.json'), 'utf8')) as Contract;
const catalogEntry = GENERATED_ACEMM_CATALOG['440demo'];

describe('440demo — contrato (manifiesto ↔ catálogo generado ↔ contract.json)', () => {
  it('el catálogo generado incluye el 440demo y coincide con el manifiesto', () => {
    expect(catalogEntry).toBeDefined();
    expect(catalogEntry.id).toBe(manifest.id);
    expect(catalogEntry.id).toBe('440demo');

    // Rack: 1U de alto, 4HP de ancho (mínimo con switch + LED + port).
    expect(manifest.metadata.rack).toEqual({ hp: 4, height_mode: '1U' });
    expect(catalogEntry.metadata.rack.hp).toBe(4);
    expect(catalogEntry.metadata.rack.units).toBe('1U');
    expect(catalogEntry.rack.hp).toBe(4);

    // Dimensiones y skin derivados del manifiesto.
    expect(manifest.ui.dimensions).toEqual({ width: 60, height: 140 });
    expect(catalogEntry.ui.dimensions).toEqual({ width: 60, height: 140 });
    expect(catalogEntry.ui.skin).toBe('industrial');

    // El .wasm referenciado existe en la estantería canónica.
    expect(manifest.resources.wasm).toBe('440demo.wasm');
    expect(existsSync(resolve(MOD_DIR, '440demo.wasm'))).toBe(true);
  });

  it('todo bind del panel (switch/led/port + params hidden) resuelve contra el contrato — sin binds colgantes', () => {
    const paramIds = new Set(contract.parameters.map((p) => p.id));
    const portIds = new Set(contract.ports.map((p) => p.id));
    const contractIds = new Set([...paramIds, ...portIds]);

    const bindTargets = [
      ...manifest.ui.controls.map((c: any) => c.bind),
      ...(manifest.ui.jacks ?? []).map((j: any) => j.bind),
    ];
    expect(bindTargets).toHaveLength(5);
    expect(bindTargets.sort()).toEqual(['amplitude', 'audio_out', 'enabled', 'led_activity', 'led_rate']);

    for (const bind of bindTargets) {
      expect(contractIds.has(bind), `bind colgante: ${bind}`).toBe(true);
    }
  });

  it('el contrato declara el switch ON por defecto (enabled binario 0/1, default 1)', () => {
    expect(contract.id).toBe('440demo');
    expect(contract.family).toBe('utility');

    const enabled = contract.parameters.find((p) => p.id === 'enabled');
    expect(enabled).toBeDefined();
    expect(enabled!.min).toBe(0);
    expect(enabled!.max).toBe(1);
    expect(enabled!.default).toBe(1); // ON por defecto: suena nada más cargarse
    expect(enabled!.unit).toBe('bin');
  });

  it('el contrato expone los params de configuración (amplitud + cadencia LED) como parte del manifiesto', () => {
    const byId = new Map(contract.parameters.map((p) => [p.id, p]));

    const amplitude = byId.get('amplitude');
    expect(amplitude).toBeDefined();
    expect(amplitude!.min).toBe(0);
    expect(amplitude!.max).toBe(1);
    expect(amplitude!.default).toBe(0.5); // == TONE_AMPLITUDE_DEFAULT del SDK
    expect(amplitude!.unit).toBe('amp');

    const ledRate = byId.get('led_rate');
    expect(ledRate).toBeDefined();
    expect(ledRate!.min).toBe(1);
    expect(ledRate!.max).toBe(30);
    expect(ledRate!.default).toBe(8); // == LED_HOLD_RATE_HZ_DEFAULT del SDK
    expect(ledRate!.unit).toBe('hz');

    // Nodos lógicos del panel (componente hidden): presentes en el manifiesto
    // sin ocupar el panel — editables desde el frontal vía inspector/RPC.
    const hiddenBinds = manifest.ui.controls
      .filter((c: any) => c.presentation?.component === 'hidden')
      .map((c: any) => c.bind);
    expect(hiddenBinds.sort()).toEqual(['amplitude', 'led_rate']);
  });

  it('los puertos del contrato son output audio/led y están enlazados en el panel', () => {
    const byId = new Map(contract.ports.map((p) => [p.id, p]));
    expect(byId.get('audio_out')).toMatchObject({ direction: 'output', type: 'audio' });
    expect(byId.get('led_activity')).toMatchObject({ direction: 'output', type: 'led' });

    const binds = new Set(manifest.ui.controls.map((c: any) => c.bind));
    for (const p of contract.ports) {
      expect(binds.has(p.id), `puerto ${p.id} sin control en el panel`).toBe(true);
    }
  });

  it('el catálogo coincide con contract.json: componentes por bind (switch/led/port)', () => {
    const componentByBind = new Map(
      catalogEntry.ui.controls.map((c: any) => [c.bind, c.presentation.component]),
    );
    expect(componentByBind.get('enabled')).toBe('switch');
    expect(componentByBind.get('led_activity')).toBe('led');
    expect(componentByBind.get('audio_out')).toBe('port');

    // Los 5 controles del catálogo tienen posición y container (renderizables;
    // los hidden renderizan nada — nodos lógicos del contrato).
    for (const c of catalogEntry.ui.controls) {
      expect(c.pos.x).toBeGreaterThan(0);
      expect(c.pos.y).toBeGreaterThan(0);
      expect(c.presentation.container).toBeDefined();
    }
    expect(componentByBind.get('amplitude')).toBe('hidden');
    expect(componentByBind.get('led_rate')).toBe('hidden');
  });
});
