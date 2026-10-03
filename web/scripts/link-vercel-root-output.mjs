#!/usr/bin/env node
/**
 * Deja el build de `web/` donde el validador de Vercel lo busca. SOLO en Vercel.
 * =============================================================================
 * POR QUE ESTE SCRIPT EXISTE
 * --------------------------
 * El proyecto de Vercel `abd-omega-editor` tiene Root Directory = `web`. Al
 * terminar el build, Vercel ejecuta la validacion post-build de Next.js 16 y
 * hace `lstat` de rutas que empieza por la RAIZ del repo, saltandose el
 * segmento `web`. Si alguna no existe, el despliegue entero se cae justo
 * despues de compilar:
 *
 *     Build Completed in /vercel/output [49s]
 *     Deploying outputs...
 *     status  ● Error
 *     errorCode: "ENOENT"
 *
 * Medido en este repo, en este orden (cada arreglo tapa el siguiente error):
 *
 *     /vercel/path0/.next/routes-manifest-deterministic.json
 *     /vercel/path0/node_modules/next/dist/build/adapter/setup-node-env.external.js
 *
 * Es un fallo de la plataforma, no de este repo: vercel/vercel#15937 ("Next.js
 * 16 post-build validation drops intermediate path segments from multi-segment
 * Root Directory"). Ni `next build` ni los tests lo ven; solo al desplegar.
 *
 * QUE HACE, Y POR QUE HAY DOS COSAS
 * ---------------------------------
 *   1. Enlaza en la raiz del repo cada entrada de `web/` que alli no exista,
 *      para que las rutas que el validador construye sin el segmento `web`
 *      resuelvan. Es el rodeo que propone el issue. Lo que ya existe en la raiz
 *      (`docs/`, `scripts/`, `modules/`, ...) NO se toca: son del repo.
 *   2. Materializa `.next/routes-manifest-deterministic.json` copiando
 *      `routes-manifest.json`. El enlace del punto 1 ya hace que la ruta
 *      resuelva, pero Next.js 16.2.4 no escribe ese fichero en ninguna parte
 *      (medido: `find . -name routes-manifest-deterministic.json` no devuelve
 *      nada), asi que hace falta crearlo. Solo se crea si falta, para que una
 *      version futura de Next mande el suyo sin que lo pisen.
 *
 * `postbuild` corre justo despues de `next build` y antes de que Vercel recoja
 * la salida, que es la ventana correcta.
 *
 * POR QUE SOLO EN VERCEL
 * ----------------------
 * En local no debe existir nada de esto: Jest, el typecheck y las rutas de
 * Next.js buscan hacia arriba `.next` y `node_modules`, y un enlace en la raiz
 * hace que los modulos se puedan leer dos veces. Sin la variable `VERCEL` el
 * script no hace nada y sale 0.
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
 *   'skip' — nada que hacer: no estamos en Vercel, o el build no llego.
 *   'link' — hay que replicar `web/` en la raiz.
 */
export function plan({ onVercel, buildDirExists }) {
  if (!onVercel) return { action: 'skip', reason: 'no es un despliegue de Vercel' };
  if (!buildDirExists) return { action: 'skip', reason: 'web/.next no existe' };
  return { action: 'link', reason: 'el validador de Vercel busca web/ en la ruta' };
}

/**
 * Entradas de `web/` que hay que enlazar en la raiz del repo. Devuelve solo
 * nombres, para poder probarlo con arrays y sin tocar el disco.
 */
export function entriesToLink(entriesInWeb, existsInRepo) {
  return entriesInWeb.filter((name) => !existsInRepo(name));
}

function main() {
  const build = path.join(WEB, '.next');
  const decision = plan({
    onVercel: Boolean(process.env.VERCEL),
    buildDirExists: fs.existsSync(build),
  });

  if (decision.action === 'skip') {
    process.stdout.write(`link-vercel-root-output: ${decision.reason}; no se toca nada.\n`);
    return 0;
  }

  const toLink = entriesToLink(
    fs.readdirSync(WEB),
    (name) => fs.existsSync(path.join(REPO, name))
  );
  for (const name of toLink) {
    fs.symlinkSync(path.join(WEB, name), path.join(REPO, name), 'junction');
  }
  process.stdout.write(
    `link-vercel-root-output: enlazados en <repo>/ ${toLink.length} entradas de web/: ${toLink.join(', ')}\n`
  );

  const source = path.join(build, MANIFEST);
  const target = path.join(build, DETERMINISTIC);
  if (fs.existsSync(target)) {
    process.stdout.write(`link-vercel-root-output: ${DETERMINISTIC} ya estaba; no se toca.\n`);
  } else if (fs.existsSync(source)) {
    fs.copyFileSync(source, target);
    process.stdout.write(`link-vercel-root-output: copiado ${MANIFEST} -> ${DETERMINISTIC}\n`);
  } else {
    // Sin manifiesto de origen no hay nada que copiar. No es motivo para tumbar
    // el build: el validador de Vercel dira ENOENT si lo necesita de verdad.
    process.stdout.write(`link-vercel-root-output: no encuentro ${MANIFEST}; no se copia nada.\n`);
  }

  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exit(main());
}