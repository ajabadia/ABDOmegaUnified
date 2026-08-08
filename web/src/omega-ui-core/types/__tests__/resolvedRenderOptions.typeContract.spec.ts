/**
 * @purpose Test de CONTRATO DE TIPOS para `ResolvedRenderOptions`: garantiza en
 * tiempo de compilación que los campos críticos de render (skin/zoom/runtimeValue/
 * steps) quedan resueltos SIN `| undefined`. Protege contra la regresión del
 * anti-patrón `Required<Pick<...>>`, que NO elimina el `| undefined` de las
 * propiedades opcionales (p.ej. `skin?: string | undefined`).
 * @purpose_en Compile-time TYPE CONTRACT test for `ResolvedRenderOptions`: guarantees
 * the critical render fields (skin/zoom/runtimeValue/steps) resolve WITHOUT
 * `| undefined`. Guards against regression of the `Required<Pick<...>>` anti-pattern,
 * which does NOT strip `| undefined` from optional properties (e.g. `skin?: string | undefined`).
 * @classification Type Contract Test
 * @complexity Low
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  compileRules,
  scanFileForLiteralViolations,
} from './canonicalDefaultsGuard';
import type { CanonicalDefaultsConfig } from './canonicalDefaultsGuard';
import type { RenderPanelOptions, ResolvedRenderOptions } from '../panelRenderer';
import {
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
  DEFAULT_RACK_HP,
  DEFAULT_RUNTIME_VALUE,
  DEFAULT_SKIN,
  DEFAULT_STEPS,
  DEFAULT_ZOOM,
  resolveRenderOptions,
} from '../../uca/panelGeometry';
import { buildCellOptions } from '../../renderers/cellOptions';

/* ─── Helpers de aserción de tipos (compile-time, patrón tsd) ─── */

/**
 * Igualdad estructural ESTRICTA de tipos: distingue `string` de `string | undefined`.
 * (El truco de la función genérica identifica la identidad exacta de la unión.)
 */
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;

/** Falla la compilación si el tipo no es exactamente `true`. */
type Assert<T extends true> = T;

/* ─── Aserciones del contrato (si regresan, tsc --noEmit falla aquí) ─── */

// 1. Los campos críticos resueltos NO llevan `| undefined`.
type skinResolved = Assert<Equal<ResolvedRenderOptions['skin'], string>>;
type zoomResolved = Assert<Equal<ResolvedRenderOptions['zoom'], number>>;
type runtimeValueResolved = Assert<Equal<ResolvedRenderOptions['runtimeValue'], number>>;
type stepsResolved = Assert<Equal<ResolvedRenderOptions['steps'], number>>;

// 2. Contraste: la fuente (RenderPanelOptions) SÍ conserva el `| undefined`
//    explícito — el mapped type + Defined<T> es quien lo erradica.
type skinSourceStillOptional = Assert<Equal<RenderPanelOptions['skin'], string | undefined>>;
type zoomSourceStillOptional = Assert<Equal<RenderPanelOptions['zoom'], number | undefined>>;

// 3. Los campos derivados siguen siendo opcionales (Omit conserva la opcionalidad).
type activeTabStillOptional = Assert<Equal<ResolvedRenderOptions['activeTab'], string | undefined>>;
type forceUpperStillOptional = Assert<Equal<ResolvedRenderOptions['forceUpper'], boolean | undefined>>;

/* ─── Test runtime: referencia las aserciones (las "usa" — noUnusedLocals) y
       verifica en runtime que todas evalúan a `true`. La verificación real es
       compile-time: si una aserción falla, tsc --noEmit aborta en este archivo. ─── */

// Tuple tipada con las 8 aserciones. Cada alias es `true` si su contrato se cumple;
// si una regresara, el error de compilación apuntaría a su línea de declaración.
const typeContract: readonly [
  skinResolved,
  zoomResolved,
  runtimeValueResolved,
  stepsResolved,
  skinSourceStillOptional,
  zoomSourceStillOptional,
  activeTabStillOptional,
  forceUpperStillOptional,
] = [true, true, true, true, true, true, true, true];

describe('ResolvedRenderOptions type contract', () => {
  it('las aserciones de tipos compilan y evalúan a true (tsc --noEmit es el guard real)', () => {
    expect(typeContract.every((v) => v === true)).toBe(true);
  });
});

/* ─── Paridad runtime: los fallbacks de buildCellOptions deben ser EXACTAMENTE
       los defaults canónicos de resolveRenderOptions — sin drift entre ambos.
       Se compara contra las constantes DEFAULT_* (única fuente de verdad): el
       ancla de VALOR LITERAL vive en un ÚNICO sitio, el guard DRY de abajo. ─── */

describe('ResolvedRenderOptions defaults parity (runtime)', () => {
  it('resolveRenderOptions sin manifiesto ni opciones devuelve los defaults canónicos', () => {
    const base = resolveRenderOptions(undefined);
    expect(base.skin).toBe(DEFAULT_SKIN);
    expect(base.zoom).toBe(DEFAULT_ZOOM);
    expect(base.runtimeValue).toBe(DEFAULT_RUNTIME_VALUE);
    expect(base.steps).toBe(DEFAULT_STEPS);
  });

  it('buildCellOptions aplica los mismos defaults que resolveRenderOptions (sin drift)', () => {
    const base = resolveRenderOptions(undefined);
    const cell = buildCellOptions(undefined);
    // Paridad campo a campo: el fallback ?? de buildCellOptions == default de resolveRenderOptions.
    expect(cell.skin).toBe(base.skin);
    expect(cell.zoom).toBe(base.zoom);
    expect(cell.runtimeValue).toBe(base.runtimeValue);
    expect(cell.steps).toBe(base.steps);
    // Y anclados a las mismas constantes canónicas (el valor literal solo vive
    // en el ancla única del guard DRY: `DEFAULT_SKIN === 'industrial'`, etc.).
    expect(cell.skin).toBe(DEFAULT_SKIN);
    expect(cell.zoom).toBe(DEFAULT_ZOOM);
    expect(cell.runtimeValue).toBe(DEFAULT_RUNTIME_VALUE);
    expect(cell.steps).toBe(DEFAULT_STEPS);
  });

  it('buildCellOptions propaga los overrides de opciones a CellOptions (no solo defaults)', () => {
    const cell = buildCellOptions(undefined, {
      skin: 'amber',
      zoom: 2,
      runtimeValue: 0.25,
      steps: 50,
    });
    expect(cell.skin).toBe('amber');
    expect(cell.zoom).toBe(2);
    expect(cell.runtimeValue).toBe(0.25);
    expect(cell.steps).toBe(50);
  });
});

/* ─── Guard de regresión DRY (source scan): los literales canónicos
       ('industrial', 1, 0.5, 100, 120, 420, 12) SOLO pueden vivir en las
       declaraciones DEFAULT_* de panelGeometry.ts. Reglas y listas de archivos
       viven en canonicalDefaults.config.json (única fuente, compartida con el
       pipeline vitest de host/ui y el CLI scripts/check_canonical_defaults.mjs);
       la mecánica de escaneo en canonicalDefaultsGuard.ts — si un literal
       reaparece como fallback, el test falla: la pipeline detecta el drift. ─── */

describe('Canonical defaults DRY guard (no-literal source scan)', () => {
  const REPO_ROOT = path.resolve(__dirname, '../../../../..');
  const CONFIG = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'canonicalDefaults.config.json'), 'utf8'),
  ) as CanonicalDefaultsConfig;

  const coreRules = compileRules(CONFIG.coreRules);
  const consumerRules = compileRules(CONFIG.consumerRules);
  const CORE_FILES: ReadonlyArray<[string, string]> = CONFIG.coreFiles.map((f) => [
    f.name,
    path.resolve(REPO_ROOT, f.path),
  ]);
  // El pipeline de web escanea TODOS los consumidores (web + host/ui) — cobertura
  // autocontenida; el pipeline de host/ui escanea solo su lista (ver
  // host/ui/tests/canonicalDefaults.test.ts).
  const CONSUMER_FILES: ReadonlyArray<[string, string]> = [
    ...CONFIG.consumerFiles.web,
    ...CONFIG.consumerFiles.host,
  ].map((f) => [f.name, path.resolve(REPO_ROOT, f.path)]);

  it.each(CORE_FILES)('%s — ningún literal canónico fuera de su declaración DEFAULT_*', (_name, file) => {
    const source = fs.readFileSync(file, 'utf8');
    expect(scanFileForLiteralViolations(source, coreRules)).toEqual([]);
  });

  it('las constantes DEFAULT_* siguen ancladas a los valores canónicos (industrial / 1 / 0.5 / 100 / 120 / 420 / 12)', () => {
    expect(DEFAULT_SKIN).toBe('industrial');
    expect(DEFAULT_ZOOM).toBe(1);
    expect(DEFAULT_RUNTIME_VALUE).toBe(0.5);
    expect(DEFAULT_STEPS).toBe(100);
    expect(DEFAULT_PANEL_WIDTH).toBe(120);
    expect(DEFAULT_PANEL_HEIGHT).toBe(420);
    expect(DEFAULT_RACK_HP).toBe(12);
  });

  /* ─── Escaneo de CONSUMIDORES: los fallbacks de dimensiones (120/420/12) deben
       importar DEFAULT_* — ningún literal en posición ?? / || / : en archivos que
       consumen panelGeometry. El resto de literales canónicos NO se escanean aquí
       porque en consumidores aparecen como datos legítimos (p.ej. `Math.min(100, ...)`, `|| 1`). ─── */

  it.each(CONSUMER_FILES)('%s — sin defaults de dimensiones literales (usar DEFAULT_*)', (_name, file) => {
    const source = fs.readFileSync(file, 'utf8');
    expect(scanFileForLiteralViolations(source, consumerRules)).toEqual([]);
  });
});
