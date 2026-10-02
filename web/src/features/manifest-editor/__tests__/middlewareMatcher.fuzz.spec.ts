/**
 * @purpose Fuzza el matcher de `proxy.ts` contra un corpus grande de rutas generadas, para que un matcher degenerado falle ruidosamente en lugar de romper el enrutado en silencio.
 * @purpose_en Fuzzes the `proxy.ts` matcher against a large generated corpus of routes so a degenerate matcher fails loudly instead of silently breaking locale routing.
 *
 * POR QUÉ ESTE TEST, CUANDO YA HAY OTRO DE MATCHER
 * ------------------------------------------------
 * `middlewareMatcher.spec.ts` fija una lista corta de rutas conocidas. Eso
 * detecta el caso OBVIO, pero no el modo de fallo real: un matcher degenerado
 * no lanza error, simplemente casa con menos cosas de las que debería, y una
 * lista de ocho rutas puede no tocar la zona muerta.
 *
 * Aquí la afirmación no es sobre rutas concretas sino sobre una PROPIEDAD
 * evaluada sobre cientos de rutas generadas:
 *
 *   - una ruta con un punto en cualquier segmento NO debe casar (fichero
 *     estático), y
 *   - cualquier otra ruta que no sea `/api` ni `_next` SÍ debe casar.
 *
 * Eso convierte el matcher en una función total: cualquier desviación sobre el
 * corpus es un fallo, sin importar qué ruta concreta la provoque.
 *
 * LA TRAMPA QUE ESTE TEST CIERRA
 * ------------------------------
 * El otro test resuelve los escapes a mano (`.replace(/\\\\/g, '\\')`), lo que
 * reproduce la semántica de `\\` pero NO la de `\.`. En JavaScript `'\.'` es un
 * *identity escape* y evalúa a `'.'`: un solo backslash en el fuente NO produce
 * un backslash en la cadena. Ese test, tal como está, dejaría pasar un matcher
 * escrito con un solo backslash — que es exactamente el bug que ya mordió dos
 * veces en este repo.
 *
 * Aquí el literal se evalúa con la semántica REAL de JavaScript (`eval` del
 * literal tal cual está en el fichero) y se compila con el COMPILADOR REAL de
 * Next (`getMiddlewareMatchers`), no con una reimplementación del prefijo. Si
 * Next cambiara alguna vez la construcción, este test se entera.
 *
 * DETERMINISMO
 * ------------
 * El corpus se genera con un PRNG de semilla fija. Un fallo debe poder
 * reproducirse leyendo la semilla del mensaje, no aceptando "corró verde un
 * martes".
 *
 * NO usa servidor, ni puertos, ni dev server: son cadenas y el compilador de
 * matchers del propio Next, así que corre en la suite de cierre.
 */

import fs from 'fs';
import path from 'path';

/**
 * El compilador real de matchers de Next.
 *
 * `getMiddlewareMatchers` está EXPORTADO en runtime pero no aparece en los
 * `.d.ts` de Next, así que el import tipado no compila. Se usa `require` con
 * el tipo declarado a mano en lugar de `any`: la firma es pequeña y el test
 * depende de ella, así que merece un tipo explícito.
 */
const { getMiddlewareMatchers } = require('next/dist/build/analysis/get-page-static-info') as {
  getMiddlewareMatchers: (
    matchers: string[],
    nextConfig: Record<string, unknown>
  ) => Array<{ originalSource: string; regexp: string }>;
};

/** Raíz del proyecto Next (web/): __tests__ → manifest-editor → features → src → web. */
const PROJECT_ROOT = path.resolve(__dirname, '../../../..');
const PROXY_FILE = path.join(PROJECT_ROOT, 'proxy.ts');

/**
 * Extrae el literal del `matcher` del fuente y lo EVALÚA con la semántica de
 * JavaScript, no con una regla de escapes escrita a mano.
 *
 * Esto es lo que distingue este test del anterior. Devolver el texto tal cual
 * haría que `\\.` llegara al regex con dos caracteres en lugar de uno;_evalar_
 * el literal hace que `\\.` produzca un backslash y que `\.` produzca un punto,
 * que es lo que el runtime real verá.
 */
function readEvaluatedMatcher(): string {
  const source = fs.readFileSync(PROXY_FILE, 'utf8');
  // Se lee la LÍNEA del matcher, no un rango con `[...]`: el propio matcher
  // contiene una clase de caracteres, así que buscar el cierre del array con
  // `[^]]*` cortaría en el `]` interno.
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
  const raw = literal[1] ?? literal[2];
  // Se evalúa el literal EXACTO como está en el fichero: es el punto donde un
  // `\.` mal escrito se convierte en punto sin que nadie lo note.
  return eval(`'${raw}'`); // eslint-disable-line no-eval
}

/** Compila el matcher con el compilador real de Next. */
function compileMatcher(matcherSource: string): RegExp {
  const matchers = getMiddlewareMatchers([matcherSource], {});
  const { regexp } = matchers[0];
  if (!regexp) {
    throw new Error(`El matcher \`${matcherSource}\` no produjo ningún regexp.`);
  }
  return new RegExp(regexp);
}

/**
 * PRNG mulberry32: determinista, sin dependencias y con estado serializable.
 * Un PRNG del módulo global haría los tests no reproducibles entre versiones.
 */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 0x0f1e2d3c;

const pick = <T,>(rng: () => number, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

const LOCALES = ['es', 'en', 'ca', 'de', 'fr'] as const;
const SEGMENTS = [
  'editor', 'player', 'projects', 'library', 'settings', 'about', 'docs',
  'rack', 'workbench', 'plugins', 'sessions', 'share', 'new', 'v2', 'a',
] as const;
const API_PATHS = ['health', 'modules', 'audio', 'contact', 'v1/items'] as const;
const DOTTED_NAMES = [
  'favicon.ico', 'logo.png', 'bundle.js', 'site.webmanifest', 'robots.txt',
  'data.json', 'styles.css', 'app.js.map', 'og-image.png', 'x.min.js',
] as const;

/** Una ruta generada, con la etiqueta de si el matcher DEBERía casar con ella. */
interface Route {
  route: string;
  shouldMatch: boolean;
  /** Por qué se espera ese resultado, para que un fallo sea diagnosticable. */
  reason: string;
}

/**
 * Genera el corpus. La mitad son rutas de la app (deben casar) y la otra mitad
 * son ficheros estáticos o endpoints que no deben pasar por la middleware.
 */
function generateCorpus(count: number, seed: number): Route[] {
  const rng = makeRng(seed);
  const out: Route[] = [];

  for (let i = 0; i < count; i++) {
    const locale = pick(rng, LOCALES);
    const depth = 1 + Math.floor(rng() * 3);
    const chain = Array.from({ length: depth }, () => pick(rng, SEGMENTS)).join('/');

    switch (i % 4) {
      case 0:
        out.push({ route: `/${locale}/${chain}`, shouldMatch: true, reason: 'ruta de la app' });
        break;
      case 1:
        out.push({ route: `/${chain}`, shouldMatch: true, reason: 'ruta sin locale (next-intl redirige)' });
        break;
      case 2:
        out.push({
          route: `/${locale}/${chain}/${pick(rng, DOTTED_NAMES)}`,
          shouldMatch: false,
          reason: 'fichero estático con punto',
        });
        break;
      default:
        out.push({
          route: `/api/${pick(rng, API_PATHS)}`,
          shouldMatch: false,
          reason: 'endpoint de API',
        });
        break;
    }
  }

  // Casos límite que un corpus aleatorio no garantiza y que ya han roto antes.
  out.push(
    { route: '/', shouldMatch: true, reason: 'raíz' },
    { route: '/es', shouldMatch: true, reason: 'locale suelto' },
    { route: '/a', shouldMatch: true, reason: 'un solo carácter: la zona donde muere el matcher degenerado' },
    { route: '/es/editor', shouldMatch: true, reason: 'ruta real de la app' },
    { route: '/favicon.ico', shouldMatch: false, reason: 'estático' },
    { route: '/_next/static/chunks/main.js', shouldMatch: false, reason: 'chunk de Next' },
    { route: '/api/health', shouldMatch: false, reason: 'API' },
    { route: '/v1.0/editor', shouldMatch: false, reason: 'punto en un directorio intermedio' }
  );

  return out;
}

/**
 * La propiedad de la que depende todo el test.
 *
 * En vez de fijar rutas, se afirma que el matcher es una FUNCIÓN TOTAL sobre
 * las rutas del corpus: casa exactamente con las que debe. Un matcher
 * degenerado falla en alguna de las dos mitades, siempre.
 */
function findMismatches(matcher: RegExp, corpus: Route[]): string[] {
  return corpus
    .filter((r) => matcher.test(r.route) !== r.shouldMatch)
    .map(
      (r) =>
        `${r.route} → ${matcher.test(r.route) ? 'CASA' : 'no casa'} ` +
        `(se esperaba ${r.shouldMatch ? 'CASA' : 'no casa'}; ${r.reason})`
    );
}

describe('proxy.ts — el matcher se comporta sobre un corpus grande', () => {
  const CORPUS_SIZE = 600;
  let matcher: RegExp;
  let corpus: Route[];

  beforeAll(() => {
    matcher = compileMatcher(readEvaluatedMatcher());
    corpus = generateCorpus(CORPUS_SIZE, SEED);
  });

  it(`no se degenera en ninguna de las ${CORPUS_SIZE + 8} rutas generadas`, () => {
    const mismatches = findMismatches(matcher, corpus);
    expect(mismatches).toEqual([]);
  });

  it('casa con la mayoría de rutas y descarta la mayoría de estáticos', () => {
    // Defensa en profundidad: si el corpus entero se modificara hasta no
    // distinguir nada, la propiedad de arriba seguiría "pasando". Estas dos
    // aserciones framing obligan a que el corpus siga siendo discriminante.
    const matched = corpus.filter((r) => matcher.test(r.route)).length;
    const unmatched = corpus.length - matched;

    expect(matched).toBeGreaterThan(corpus.length * 0.3);
    expect(unmatched).toBeGreaterThan(corpus.length * 0.3);
  });

  it('el corpus sigue siendo discriminante aunque cambie la semilla', () => {
    // Si el generador tuviera un sesgo que dejara todas las rutas de un lado,
    // el test principal no distinguiría un matcher roto de uno sano.
    const other = generateCorpus(120, SEED + 1);
    expect(new Set(other.map((r) => r.shouldMatch))).toEqual(new Set([true, false]));
  });
});

describe('el fuzzer tiene dientes', () => {
  // Sin esto, el test de arriba podría estar verde por una razón equivocada.
  // Se comprueba que el MISMO corpus, contra el matcher que la historia dice
  // que-was-broken, falla de forma ruidosa.
  const corpus = generateCorpus(200, SEED);

  it('rechaza el matcher degenerado que produjo el bug original', () => {
    const BS = String.fromCharCode(92);
    // `.*\..*` (con backslash) es lo que se quiso escribir; al perder el
    // backslash queda `.*..*`, que dentro de la lookahead negativa descarta
    // cualquier ruta de dos o más caracteres.
    const intended = '/((?!api|_next|.*' + BS + '..*).*)';
    const mangled = intended.split(BS).join('');

    const healthy = compileMatcher(intended);
    const degenerate = compileMatcher(mangled);

    expect(findMismatches(healthy, corpus)).toEqual([]);
    expect(findMismatches(degenerate, corpus).length).toBeGreaterThan(0);
  });

  it('atrapa un identity escape: un solo backslash en el fuente', () => {
    // El hueco que `middlewareMatcher.spec.ts` no cubre: su resolución de
    // escapes a mano deja pasar un `\.` que en JavaScript es un punto.
    // Aquí el literal se evalúa de verdad, así que el punto aparece y el
    // matcher degenera — que es justo lo que hay que detectar.
    const singleBackslash = eval(`'/((?!api|_next|.*\\..*).*)'`); // eslint-disable-line no-eval
    expect(singleBackslash).not.toContain('\\');
    expect(findMismatches(compileMatcher(singleBackslash), corpus).length).toBeGreaterThan(0);
  });

  it('el matcher sano sobrevive a rutas largas y anidadas', () => {
    // Un matcher correcto no solo casa con lo simple: aguanta la cola. Y debe
    // hacerlo rápido; una lookahead negativa con `.*` es un patrón clásico de
    // backtracking catastrófico cuando se combina mal.
    const healthy = compileMatcher(readEvaluatedMatcher());
    const deep = '/' + Array.from({ length: 40 }, (_, i) => `nivel${i}`).join('/');
    const long = '/' + 'segmento'.repeat(60);

    const started = Date.now();
    expect(healthy.test(deep)).toBe(true);
    expect(healthy.test(long)).toBe(true);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});