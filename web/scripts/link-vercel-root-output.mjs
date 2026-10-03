#!/usr/bin/env node
/**
 * Deja el build de `web/` donde el validador de Vercel lo busca. SOLO en Vercel.
 * =============================================================================
 * POR QUE ESTE SCRIPT EXISTE
 * --------------------------
 * El proyecto de Vercel `abd-omega-editor` tiene Root Directory = `web`. Al
 * terminar el build, Vercel ejecuta la validacion post-build de Next.js 16 y
 * hace `lstat` de este fichero:
 *
 *     /vercel/path0/.next/routes-manifest-deterministic.json
 *
 * Si no esta, el despliegue entero se cae justo despues de compilar:
 *
 *     Build Completed in /vercel/output [53s]
 *     Deploying outputs...
 *     status  ● Error
 *     errorCode: "ENOENT"
 *
 * Son DOS problemas distintos y hacen falta DOS arreglos:
 *
 *   1. La RUTA. El validador construye la ruta con la raiz del repo en vez de
 *      con la del Root Directory, asi que se salta el segmento `web`
 *      (vercel/vercel#15937). Se arregla con un enlace `<repo>/.next` ->
 *      `web/.next`.
 *
 *   2. El FICHERO. Next.js 16.2.4 no escribe `routes-manifest-deterministic.json`
 *      en ningun sitio del arbol de build (medido: `find . -name
 *      routes-manifest-deterministic.json` no devuelve nada y `.next/` solo
 *      tiene `routes-manifest.json` y `app-path-routes-manifest.json`). Se
 *      arregla materializando una copia del manifiesto que si existe.
 *
 * El rodeo es el que propone ese issue: hacer que la ruta equivocada resuelva.
 * `postbuild` corre justo despues de `next build` y antes de que Vercel recoja
 * la salida, que es la ventana correcta.
 *
 * POR QUE SOLO EN VERCEL
 * ----------------------
 * En local no debe existir `<repo>/.next`: Jest, el typecheck y las rutas de
 * Next.js buscan hacia arriba ese directorio, y un enlace en la raiz hace que
 * los modulos se puedan leer dos veces. Sin la variable `VERCEL` el script no
 * hace nada y sale 0.
 *
 * Decisiones que conviene no deshacer sin pensarlo:
 *   - Si `<repo>/.next` ya existe de verdad, el script NO lo sustituye (no es
 *     suyo); avisa y sale 0, para no comerse el trabajo de nadie.
 *   - El manifiesto solo se copia si falta. Si una version futura de Next si lo
 *     escribe, este script no lo pisa.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..');
const REPO = path.resolve(WEB, '..');

const MANIFEST = 'routes-manifest.json';
const DETERMINISTIC = 'routes-manifest-deterministic.json';

/**
 * Que hacer, separado del disco para poder probarlo sin desplegar.
 *   'skip'  — nada que hacer (no estamos en Vercel, o el build no llego).
 *   'link'  — crear el enlace que el validador espera encontrar.
 *   'ready' — el enlace ya estaba; solo queda materializar el manifiesto.
 */
export function plan({ onVercel, buildDirExists, linkExists }) {
  if (!onVercel) return { action: 'skip', reason: 'no es un despliegue de Vercel' };
  if (!buildDirExists) return { action: 'skip', reason: 'web/.next no existe' };
  if (linkExists) return { action: 'ready', reason: 'el enlace ya existe' };
  return { action: 'link', reason: 'el validador de Vercel busca web/ en la ruta' };
}

function main() {
  const build = path.join(WEB, '.next');
  const decision = plan({
    onVercel: Boolean(process.env.VERCEL),
    buildDirExists: fs.existsSync(build),
    linkExists: fs.existsSync(path.join(REPO, '.next')),
  });

  if (decision.action === 'skip') {
    process.stdout.write(`link-vercel-root-output: ${decision.reason}; no se toca nada.\n`);
    return 0;
  }

  if (decision.action === 'link') {
    fs.symlinkSync(build, path.join(REPO, '.next'), 'junction');
    process.stdout.write('link-vercel-root-output: creado <repo>/.next -> web/.next\n');
  } else {
    process.stdout.write(`link-vercel-root-output: ${decision.reason}\n`);
  }

  const source = path.join(build, MANIFEST);
  const target = path.join(build, DETERMINISTIC);
  if (fs.existsSync(target)) {
    process.stdout.write(`link-vercel-root-output: ${DETERMINISTIC} ya estaba; no se toca.\n`);
    return 0;
  }
  if (!fs.existsSync(source)) {
    // Sin manifiesto de origen no hay nada que copiar. No es motivo para
    // tumbar el build: el validador de Vercel dira ENOENT si lo necesita.
    process.stdout.write(`link-vercel-root-output: no encuentro ${MANIFEST}; no se copia nada.\n`);
    return 0;
  }
  fs.copyFileSync(source, target);
  process.stdout.write(`link-vercel-root-output: copiado ${MANIFEST} -> ${DETERMINISTIC}\n`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exit(main());
}