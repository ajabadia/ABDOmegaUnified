/**
 * POR QUÉ EXISTE ESTE TEST
 *
 * Dos bugs independientesicrobaron que este archivo no puede vivir en `src/`,
 * y ambos son invisibles: no lanzan error, no emiten warning, y el
 * `middleware-manifest.json` generado es CORRECTO. Lo único que miente es el
 * comportamiento observable de las rutas.
 *
 *   1. El matcher con escape. `.*\\..*` llegaba al manifest como `.*..*`
 *      (Next 16.2.4 pierde el backslash al extraer `config.matcher`). Dentro de
 *      una lookahead negativa `.*..*` significa "cualquier carácter, cualquier
 *      carácter, cualquier cosa", así que EXCLUÍA TODA RUTA DE DOS O MÁS
 *      CARACTERES: el regex compilado solo casaba con `/`.
 *
 *   2. La ubicación en `src/`. Con el matcher ya arreglado, `src/middleware.ts`
 *      seguía sin ejecutarse NUNCA en `next dev`: se registraba en el manifest
 *      con su chunk compilado, y todas las rutas las respondía la app
 *      directamente. En `next build` + `next start` ese mismo archivo sí
 *      funcionaba.
 *
 * Por eso este test no solo compila el matcher: además afirma que el archivo de
 * entrada vive en la RAÍZ del proyecto, que es la mitad del arreglo que no se
 * puede ver leyendo un regex.
 *
 * NO usa servidor, ni puertos, ni dev server: son cadenas y el compilador de
 * matchers del propio Next, así que corre en la suite de cierre.
 */

import fs from 'fs';
import path from 'path';
import { tryToParsePath } from 'next/dist/lib/try-to-parse-path';

/**
 * Raíz del proyecto Next (web/).
 *
 * Este test vive en `src/features/manifest-editor/__tests__/`, así que la raíz
 * del proyecto está cuatro niveles arriba: __tests__ → manifest-editor →
 * features → src → web.
 */
const PROJECT_ROOT = path.resolve(__dirname, '../../../..');

/** Dónde debe vivir el archivo de entrada de next-intl. */
const PROXY_FILE = path.join(PROJECT_ROOT, 'proxy.ts');

/**
 * Extrae el array `matcher` del `config` exportado, leyendo el fuente y
 * evaluando solo ese literal.
 *
 * No se importa el módulo: `proxy.ts` importa `next-intl/middleware`, que solo
 * tiene sentido dentro del runtime de Next, y este test corre en Jest con
 * `testEnvironment: node`. Lo que nos interesa es el LITERAL de texto, que es
 * exactamente lo que Next extrae con `extractExportedConstValue`.
 */
function readMatcherSource(): string {
  const source = fs.readFileSync(PROXY_FILE, 'utf8');
  // Se lee la LÍNEA del matcher, no un rango con `[...]`: el propio matcher
  // contiene una clase de caracteres (`[.!]`), así que buscar el cierre del
  // array con `[^]]*` cortaría en el `]` interno y no encontraría nada.
  const line = source.split('\n').find((l) => /^\s*matcher:/.test(l));
  if (!line) {
    throw new Error(
      `No se encontró una línea \`matcher:\` en ${PROXY_FILE}. Si lo moviste o ` +
        `lo borraste, el enrutado por locale deja de funcionar y este test ` +
        `debe fallar en lugar de dejar que se rompa en silencio.`
    );
  }
  const literal = line.match(/'([^']*)'|"([^"]*)"/);
  if (!literal) {
    throw new Error(`La línea \`matcher:\` de ${PROXY_FILE} no contiene ningún literal de cadena.`);
  }
  // El fuente está en TypeScript: `\\.` en el literal es un backslash real.
  // Se resuelve el escape aquí, no antes, porque lo que Next recibe es el
  // literal ya desescapado.
  return (literal[1] ?? literal[2]).replace(/\\\\/g, '\\');
}

/**
 * Compila el matcher exactamente como lo compila Next: le antepone el
 * prefijo `:nextData(...)` y le sufija el grupo `{(.json)}?`, tal cual hace
 * `getMiddlewareMatchers` en `build/analysis/get-page-static-info.js`.
 */
function compileMatcher(matcherSource: string): RegExp {
  const source = `/:nextData(_next/data/[^/]{1,})?${matcherSource}{(\\.json)}?`;
  const parsed = tryToParsePath(source);
  if (parsed.error || !parsed.regexStr) {
    throw new Error(
      `El matcher \`${matcherSource}\` no se pudo compilar: ` +
        `${parsed.error instanceof Error ? parsed.error.message : 'error desconocido'}`
    );
  }
  return new RegExp(parsed.regexStr);
}

describe('proxy.ts — location', () => {
  it('lives in the project root, not in src/', () => {
    // Este es el test que atrapa el bug que NO se ve leyendo el matcher: en
    // Next 16.2.4 + Turbopack, `src/middleware.ts` (y `src/proxy.ts`) se
    // registran en el manifest pero no se ejecutan en `next dev`. Medido:
    // `/editor` devolvía 404 en vez de redirigir, mientras el manifest era
    // correcto y el build de producción funcionaba bien.
    expect(fs.existsSync(PROXY_FILE)).toBe(true);

    const legacy = [
      path.join(PROJECT_ROOT, 'src', 'middleware.ts'),
      path.join(PROJECT_ROOT, 'src', 'proxy.ts'),
      path.join(PROJECT_ROOT, 'middleware.ts'),
    ];
    const present = legacy.filter((file) => fs.existsSync(file));
    expect(present).toEqual([]);
  });

  it('declares a config with a matcher', () => {
    const source = fs.readFileSync(PROXY_FILE, 'utf8');
    expect(source).toMatch(/export const config/);
  });
});

describe('proxy.ts — matcher matches localized routes', () => {
  const matcher = compileMatcher(readMatcherSource());

  // Rutas que la app declara bajo `app/[locale]/`. Si alguna no casara, la
  // middleware no la vería y next-intl no podría añadirle el locale.
  it.each(['/', '/en', '/es', '/en/editor', '/es/editor', '/en/player', '/editor', '/player'])(
    'matches %s',
    (route) => {
      expect(matcher.test(route)).toBe(true);
    }
  );
});

describe('proxy.ts — matcher excludes non-localized paths', () => {
  const matcher = compileMatcher(readMatcherSource());

  // Las API nunca deben pasar por aquí: una redirección de locale sobre
  // `/api/*` rompería las llamadas del cliente.
  it.each(['/api/health', '/api/modules', '/api/audio'])('does not match %s', (route) => {
    expect(matcher.test(route)).toBe(false);
  });

  it.each(['/favicon.ico', '/logo.png', '/_next/static/chunks/main.js'])(
    'does not match the static asset %s',
    (route) => {
      expect(matcher.test(route)).toBe(false);
    }
  );
});

describe('proxy.ts — matcher has no escape-sensitive constructs', () => {
  const matcherSource = readMatcherSource();

  // El assertion que falla HOY sin el arreglo, y que falla de nuevo si alguien
  // reintroduce el `\.` que Next 16.2.4 descarta.
  it('uses a character class instead of an escaped dot', () => {
    expect(matcherSource).not.toMatch(/\\\./);
    expect(matcherSource).toMatch(/\[.\]/);
  });

  it('would exclude every 2+ character path if the backslash were dropped', () => {
    // Reproduce el bug exacto, para que el motivo de `[.]` quede demostrado y
    // no solo afirmado. `.*\..*` (con backslash) es lo que se quiso escribir;
    // al perder el backslash queda `.*..*`, que en la lookahead negativa
    // descarta cualquier ruta de dos o más caracteres.
    const BS = String.fromCharCode(92);
    const intended = '/((?!api|_next|.*' + BS + '..*).*)';
    const mangled = intended.split(BS).join('');

    const good = compileMatcher(intended);
    const bad = compileMatcher(mangled);

    expect(good.test('/en/editor')).toBe(true);
    expect(bad.test('/en/editor')).toBe(false);
    expect(bad.test('/')).toBe(true); // solo sobrevive la raíz vacía
  });
});
