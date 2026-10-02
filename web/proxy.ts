/**
 * @purpose Gestiona la internacionalización de rutas (next-intl) en OMEGA. Es la única pieza que decide el locale de cada URL.
 * @purpose_en Manages route internationalization (next-intl) for OMEGA. It is the only piece deciding the locale of every URL.
 * @refactorable false
 * @classification Business Service
 * @complexity Low
 * @lastUpdated 2026-10-02T00:00:00.000Z
 */

import createMiddleware from 'next-intl/middleware';
import {routing} from './src/i18n/routing';

/**
 * OMEGA ERA 7 PROXY
 *
 * POR QUÉ ESTO ESTÁ EN LA RAÍZ Y NO EN `src/`
 *
 * Este archivo se movió tres veces en la misma sesión, y las tres veces
 * "funcionaba" en apariencia. Documentado aquí para que nadie lo mueva de
 * vuelta a `src/` creyendo que es cosmético.
 *
 * En Next 16.2.4 + Turbopack, una middleware en `src/middleware.ts` se
 * REGISTRA en `.next/dev/server/middleware-manifest.json` —con su matcher
 * compilado y su chunk compilados— y aun así **no se llega a ejecutar nunca**:
 * toda ruta que no sea `/` la responde la app directamente. En `next build` +
 * `next start` ese mismo archivo SÍ funciona. El fallo es de desarrollo, y es
 * completamente silencioso: no hay warning, no hay error, el manifest es
 * correcto. Medido:
 *
 *   src/middleware.ts, dev  →  /en/editor 200 · /editor 404 · sin ejecutar
 *   src/middleware.ts, prod →  /editor 307 → /en/editor       (funciona)
 *   proxy.ts en la raíz, dev → /editor 307 → /en/editor       (funciona)
 *
 * El segundo aviso de Next ("The middleware file convention is deprecated. Use
 * proxy instead") apareció durante esa investigación, pero NO era la causa:
 * el mismo `proxy.ts` en `src/` tampoco se ejecutaba en dev. Lo que lo arregla
 * es la UBICACIÓN, y `proxy.ts` es además la convención que Next 16 quiere,
 * así que se resuelve la deprecación de paso.
 *
 * El test `middlewareMatcher.spec.ts` fija el matcher. Este comentario fija la
 * ubicación: si alguien lo devuelve a `src/`, el comentario está aquí.
 */
export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames.
  //
  // POR QUÉ `[.]` Y NO UN BACKSLASH — CORREGIDO 2026-10-02
  //
  // ATENCIÓN: este comentario antes afirmaba que Next 16.2.4 "perdía el
  // backslash" al extraer `config.matcher`. **Eso era falso y se ha
  // retractado.** Se investigó a fondo porque el síntoma era real: el
  // manifest llegó a contener `.*..*`. La causa no era Next, era el propio
  // literal en el fichero.
  //
  // En un literal de JavaScript/TypeScript, `\.` es un *identity escape*:
  // `'\.'` evalúa a `'.'`, un punto y nada más. Un solo backslash en el
  // código fuente NO produce un backslash en la cadena, produce un punto.
  // Para obtener un backslash hay que escribir DOS: `'\\.'`.
  //
  // MEDIDO con el código histórico (7c15114), que lleva dos backslashes:
  //   next build (Turbopack) → manifest `originalSource` conserva `\\.`  OK
  //   next build --webpack   → manifest `originalSource` conserva `\\.`  OK
  //   next dev              → el chunk conserva `\\.`                    OK
  // Next 16.2.4 no pierde backslashes en ninguna de las tres rutas.
  //
  // El matcher se queda con `[.]` de todas formas, y por una razón mejor que
  // la original: no depende de recordar una regla de escapado. `[.]` es una
  // clase de caracteres que significa exactamente lo mismo que `\.`, no
  // contiene ningún backslash y por tanto no puede ser devorada por un
  // doble escapado accidental al editar el fichero.
  //
  // POR QUÉ IMPORTA QUE NO SEA UN DETALLE ESTÉTICO
  //
  // `.*..*` no significa "algo, un punto, algo": significa "cualquier
  // carácter, cualquier carácter, cualquier cosa", así que dentro de una
  // lookahead negativa EXCLUYE TODA RUTA DE DOS O MÁS CARACTERES, y el regex
  // degenerado solo acaba casando con `/`. El modo de fallo es invisible por
  // naturaleza — un matcher degenerado no lanza error, simplemente nunca casa
  // — y el síntoma aparece muy lejos de su causa: un 404 en `/editor` que
  // parece un problema de rutas y no de middlewares.
  //
  // Por eso la comprobación de abajo no es superstición: `.*\\..*` written a
  // mano con un solo backslash reintroduce el fallo sin avisar.
  //
  //   scripts/next-matcher-backslash-repro.cjs  — mide las dos formas
  //   middlewareMatcher.spec.ts                — fija esta semántica
  matcher: ['/((?!api|_next|.*[.]..*).*)']
};
