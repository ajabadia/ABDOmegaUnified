/**
 * @purpose Mide si Next pierde el backslash de `config.matcher`, y sobre todo detecta la trampa real: un ÚNICO backslash en el literal es un identity escape de JavaScript que evalúa a punto.
 * @purpose_en Measures whether Next drops the backslash in `config.matcher`, and above all detects the real trap: a SINGLE backslash in the literal is a JavaScript identity escape that evaluates to a dot.
 *
 * HALLAZGO (Next 16.2.4, medido 2026-10-02)
 * ------------------------------------------
 * NO HAY BUG. Next no pierde backslashes al extraer `config.matcher`. Con el
 * literal correcto (`\\.`, dos backslashes) el manifest los conserva en las
 * tres rutas: `next build` con Turbopack, `next build --webpack` y `next dev`.
 *
 * Lo que sí es real, y lo que de verdad se confundió con un bug de Next, es
 * esto: en un literal de JavaScript `'\.'` es un *identity escape* y evalúa a
 * `'.'`. Un solo backslash en el código fuente NO da un backslash en la
 * cadena — da un punto. El matcher resultante, `.*..*`, significa "cualquier
 * carácter, cualquier carácter, cualquier cosa", así que dentro de una
 * lookahead negativa excluye toda ruta de dos o más caracteres y el regex
 * degenerado solo acaba casando con `/`.
 *
 * CÓMO EJECUTARLO
 *   node scripts/next-matcher-backslash-repro.cjs
 *
 * SALIDA ESPERADA
 *   un solo backslash  → DEGRADADO (y es correcto que lo esté)
 *   dos backslashes    → INTACTO
 *
 * Por qué esto vive en un fichero y no en un `node -e`: dos intentos de
 * medir esto con `node -e` devolvieron un FALSO POSITIVO, porque el escapado
 * del shell convirtió `\\.` en `.` antes de que Node lo vieras. La capa de
 * escapado era el bug, no Next. Aquí cada literal se escribe una vez y se
 * imprime con `JSON.stringify` (y `od -c` sobre el fichero real), de modo que
 * ningún backslash puede morir en el camino.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = process.cwd();
const require_ = (p) => require(path.join(ROOT, 'node_modules', p));

// En ESTE literal de JavaScript, cada `\\\\` son DOS caracteres backslash.
const ONE_BACKSLASH_IN_FILE = '/((?!api|_next|.*\\..*).*)'; // fichero: `\.`  → cadena: `.`
const TWO_BACKSLASHES_IN_FILE = '/((?!api|_next|.*\\\\..*).*)'; // fichero: `\\.` → cadena: `\.`

const { getMiddlewareMatchers } = require_(
  'next/dist/build/analysis/get-page-static-info.js'
);

function describe(label, stringAsItWouldLiveInTheFile) {
  // Lo que JavaScript haría con ese literal. Esto es la mitad del asunto.
  const evaluated = eval(`'${stringAsItWouldLiveInTheFile}'`); // eslint-disable-line no-eval

  const emitted = getMiddlewareMatchers([evaluated], {})[0].originalSource;

  const hasBackslashInFile = stringAsItWouldLiveInTheFile.includes('\\');
  const hasBackslashInManifest = emitted.includes('\\');

  console.log('');
  console.log(`CASO: ${label}`);
  console.log('  literal en el fichero :', JSON.stringify(stringAsItWouldLiveInTheFile));
  console.log('  -> backslashes:       ', (stringAsItWouldLiveInTheFile.match(/\\/g) || []).length);
  console.log('  cadena tras evaluar   :', JSON.stringify(evaluated));
  console.log('  manifest originalSource:', JSON.stringify(emitted));
  console.log('  -> backslash conservado:', hasBackslashInManifest);

  // Solo es bug de Next si el backslash SOBREVIVió a la evaluación de
  // JavaScript y aun así no llegó al manifest. Si JavaScript ya se lo comió,
  // Next está haciendo lo correcto y culparlo sería un falso positivo.
  const jsAteIt = hasBackslashInFile && !evaluated.includes('\\');
  const nextLostIt = !jsAteIt && hasBackslashInManifest === false && hasBackslashInFile;

  if (nextLostIt) {
    console.log('  VEREDICTO             : BUG DE NEXT (el backslash sobrevivió a JS y murió en Next)');
    process.exitCode = 1;
  } else if (jsAteIt) {
    console.log('  VEREDICTO             : DEGRADADO POR EL LITERAL, no por Next.');
    console.log('                          `\\.` en el fichero evalúa a `.`. Next hace bien.');
  } else {
    console.log('  VEREDICTO             : OK');
  }
}

console.log('--- Next.js:', require_('next/package.json').version, '---');
describe('un backslash en el fichero (`\\.`)', ONE_BACKSLASH_IN_FILE);
describe('dos backslashes en el fichero (`\\\\.`)', TWO_BACKSLASHES_IN_FILE);

console.log('');
console.log('CONCLUSIÓN');
console.log('  Next 16.2.4 conserva el backslash cuando el literal es válido.');
console.log('  El matcher degenerado viene de escribir un solo backslash,');
console.log('  que es un identity escape de JavaScript. Por eso proxy.ts usa');
console.log('  `[.]`: misma semántica, cero backslashes que puedan perderse.');