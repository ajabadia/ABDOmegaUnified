/**
 * GET /api/modules — el contrato vivo y el arreglo que evita que Turbopack arrastre
 * el repo entero dentro de la lambda.
 *
 * =============================================================================
 * POR QUÉ EXISTE ESTE FICHERO
 * =============================================================================
 * La ruta resuelve `path.join(process.cwd(), "..", "modules")`, es decir, sale de
 * la raíz de Next (`web/`). Al compilar, Turbopack traza las llamadas a `fs` y
 * declara que "the whole project was traced unintentionally":
 *
 *     Import trace:
 *       App Route:
 *         ./next.config.ts
 *         ./app/api/modules/route.ts
 *
 * MEDIDO con `next build` (16.2.4, este repo), `.next/server/app/api/modules/
 * route.js.nft.json`: **3827 ficheros / 294.07 MB** trazados, frente a 113
 * ficheros / 26.74 MB de `app/api/audio`. Se colaban `exports/` (105.81 MB),
 * `src/` (62.96), `public/` (53.21), `docs/` (48.52) y `wasm-runtime/` (19.68),
 * todos por encima de la raíz. En Vercel eso es una lambda de 264.38 MB, por
 * encima del límite de 250 MB, y el despliegue se queda en ERROR.
 *
 * El remedio es la anotación `turbopackIgnore`, pero su COLOCACIÓN no es la que
 * sugiere el propio aviso del build. vercel/next.js#95125 lo medido, en esta
 * misma versión: la anotación solo silencia cuando va sobre una **variable
 * desnuda** pasada directamente a la llamada `fs`. No funciona annotando el
 * `path.join` (la forma que anuncia el aviso), ni sobre un `path.join()` anidado
 * dentro del argumento de `fs`.
 * OJO: en este fichero no se puede escribir la anotación completa dentro de un
 * comentario de bloque —el `*` de cierre lo termina antes de tiempo—, así que
 * aquí va citada sin sus delimitadores.
 *
 * Ese detalle es exactamente lo que este test ata con alambre:
 *   1. La RUTA REAL se ejecuta contra un directorio de módulos de prueba, así que
 *      las rutas de `fs` de `route.ts` quedan probadas de verdad, no de palabra.
 *   2. Cada llamada `fs` de `route.ts` lleva la anotación en su primer argumento.
 *   3. Ninguna llamada `fs` se traga un `path.join(...)` anidado, que es la forma
 *      que vercel/next.js#95125 demuestra que NO se silencia.
 * Si alguien borra un comentario o mete un `path.join` dentro de un `fs`, falla.
 *
 * El peso de la lambda se comprueba aparte, en `scripts/check-api-modules-trace.mjs`,
 * porque necesita un `next build` previo (ver el paso de CI que lo invoca).
 */

import type { NextRequest } from 'next/server';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { GET } from '../route';

const ROUTE_SOURCE = fs.readFileSync(path.join(__dirname, '..', 'route.ts'), 'utf8');

/** Una petición falsa: la ruta no lee nada de ella. */
const fakeRequest = {} as NextRequest;

/**
 * Monta una raíz temporal con la misma forma que el repo real:
 * `<tmp>/root/web` es el cwd y `<tmp>/root/modules` la estantería, que es
 * exactamente `path.join(cwd, "..", "modules")`.
 */
function makeFixture(): { cwd: string; modulesDir: string; cleanup: () => void } {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'api-modules-'));
  const root = path.join(tmp, 'root');
  const cwd = path.join(root, 'web');
  const modulesDir = path.join(root, 'modules');
  fs.mkdirSync(cwd, { recursive: true });
  fs.mkdirSync(modulesDir, { recursive: true });
  return {
    cwd,
    modulesDir,
    cleanup: () => fs.rmSync(tmp, { recursive: true, force: true }),
  };
}

function writeModule(modulesDir: string, id: string, manifest: string, extra: Record<string, string> = {}) {
  const dir = path.join(modulesDir, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.acemm`), manifest, 'utf8');
  for (const [name, contents] of Object.entries(extra)) {
    fs.writeFileSync(path.join(dir, name), contents);
  }
}

let realCwd: () => string;

beforeEach(() => {
  realCwd = process.cwd;
});

afterEach(() => {
  process.cwd = realCwd;
});

/** Cambia el cwd que ve la ruta durante la llamada. */
function runFrom(cwd: string) {
  process.cwd = () => cwd;
  return GET(fakeRequest);
}

describe('GET /api/modules: contrato', () => {
  it('devuelve una entrada por módulo, con el mismo shape que el catálogo generado', async () => {
    const fixture = makeFixture();
    try {
      writeModule(
        fixture.modulesDir,
        'vco',
        [
          'metadata:',
          '  name: VCO',
          '  family: source',
          '  version: 2.1.0',
          '  description: Oscilador',
          'rack:',
          '  hp: 12',
          '  slot: upper',
          'params:',
          '  freq:',
          '    default: 440',
          'ui:',
          '  dimensions:',
          '    width: 180',
          '    height: 144',
        ].join('\n'),
      );

      const res = await runFrom(fixture.cwd);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toBe('no-store');
      expect(Object.keys(body)).toEqual(['vco']);
      expect(body.vco).toMatchObject({
        id: 'vco',
        name: 'VCO',
        description: 'Oscilador',
        metadata: { name: 'VCO', family: 'source', version: '2.1.0' },
        rack: { slot: 'upper', hp: 12 },
        manifestUrl: 'modules/vco/vco.acemm',
        params: { freq: { default: 440 } },
        ui: { dimensions: { width: 180, height: 144 } },
      });
    } finally {
      fixture.cleanup();
    }
  });

  it('parchea JSON igual que YAML y calcula el sha256 del .wasm', async () => {
    const fixture = makeFixture();
    const wasm = 'contenido-wasm';
    try {
      writeModule(fixture.modulesDir, 'adc', JSON.stringify({ metadata: { name: 'ADC' }, rack: { hp: 6 } }), {
        'adc.wasm': wasm,
      });

      const res = await runFrom(fixture.cwd);
      const body = await res.json();

      expect(body.adc.metadata.name).toBe('ADC');
      expect(body.adc.assets.wasm).toBe(true);
      expect(body.adc.wasmUrl).toBe('modules/adc/adc.wasm');
      expect(body.adc.artifact).toEqual({
        sha256: createHash('sha256').update(Buffer.from(wasm)).digest('hex'),
        size: wasm.length,
      });
    } finally {
      fixture.cleanup();
    }
  });

  it('ignora directorios sin .acemm y ficheros sueltos', async () => {
    const fixture = makeFixture();
    try {
      writeModule(fixture.modulesDir, 'vca', 'metadata:\n  name: VCA\n');
      fs.mkdirSync(path.join(fixture.modulesDir, 'sin-manifiesto'), { recursive: true });
      fs.writeFileSync(path.join(fixture.modulesDir, 'README.md'), '# no soy un modulo\n');

      const res = await runFrom(fixture.cwd);
      const body = await res.json();

      expect(Object.keys(body)).toEqual(['vca']);
    } finally {
      fixture.cleanup();
    }
  });

  it('devuelve 500 si no encuentra la estantería, en vez de reventar', async () => {
    const fixture = makeFixture();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      // Una raíz sin `modules/` al lado: es lo que ve un despliegue donde la
      // estantería no existe. `SharedModuleCatalogService` cae al catálogo
      // generado; lo que importa aquí es que la ruta no lance.
      const res = await runFrom(path.join(fixture.cwd, 'a', 'b', 'c', 'd'));

      expect(res.status).toBe(500);
      await expect(res.json()).resolves.toHaveProperty('error');
    } finally {
      consoleError.mockRestore();
      fixture.cleanup();
    }
  });
});

describe('GET /api/modules: la lambda no debe arrastrar el repo', () => {
  /**
   * Cada llamada `fs` con una ruta dinámica tiene que llevar la anotación en el
   * primer argumento (la única colocación que vercel/next.js#95125 demuestra que
   * silencia el aviso).
   */
  it('anota el primer argumento de TODAS las llamadas fs', () => {
    // Sin `\\s*` antes del lookahead: un cuantificador que puede retroceder haria
    // matchear la llamada igual, y el test pasaria en verde sin anotacion.
    const unannotated = [...ROUTE_SOURCE.matchAll(/\bfs\.\w+\((?!\s*\/\*\s*turbopackIgnore)/g)].map((m) => m[0]);
    expect(unannotated).toEqual([]);
  });

  it('no esconde un path.join dentro de una llamada fs (esa forma no se silencia)', () => {
    const nested = [...ROUTE_SOURCE.matchAll(/\bfs\.\w+\((?:\s*\/\*[^]*?\*\/)?\s*path\./g)].map((m) => m[0]);
    expect(nested).toEqual([]);
  });

  it('mantiene la anotación que el aviso del build recomienda, aunque sola no baste', () => {
    // El aviso de Turbopack sugiere annotar el `path.join`. Se deja constancia de
    // que esa forma es la que aparece en route.ts a propósito y NO es lo que
    // silencia el trace (vercel/next.js#95125); lo que silencia son los argumentos
    // desnudos que comprueba el test de arriba. Si algún día Next arregla la
    // colocación, este test avisa: habría que quitar las anotaciones de `fs`.
    expect(ROUTE_SOURCE).toContain('turbopackIgnore: true');
  });
});
