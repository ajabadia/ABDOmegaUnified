#!/usr/bin/env node
/**
 * Enlaza `<repo>/.next` con `web/.next` SOLO en Vercel.
 * =============================================================================
 * POR QUE ESTE SCRIPT EXISTE
 * --------------------------
 * El proyecto de Vercel `abd-omega-editor` tiene Root Directory = `web`. Al
 * terminar el build, Vercel ejecuta la validacion post-build de Next.js 16 y
 * busca este fichero:
 *
 *     /vercel/path0/.next/routes-manifest-deterministic.json
 *
 * es decir, en la RAIZ del repo, cuando el build lo ha dejado en
 * `/vercel/path0/web/.next/`. La comprobacion se salta el segmento `web` y
 * aborta el despliegue entero:
 *
 *     Build Completed in /vercel/output [57s]
 *     Deploying outputs...
 *     status  ● Error
 *     errorCode: "ENOENT"
 *
 * El fallo es de la plataforma, no de este repo: vercel/vercel#15937
 * ("Next.js 16 post-build validation drops intermediate path segments from
 * multi-segment Root Directory"). Ocurre al terminar el build, asi que ni
 * `next build` ni los tests lo ven; solo se manifiesta al desplegar.
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
 * Decision que conviene no deshacer: si `<repo>/.next` ya existe de verdad, el
 * script NO lo sustituye (no es suyo); avisa por stdout y sale 0, para no
 * comerse el trabajo de nadie.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(HERE, '..');
const REPO = path.resolve(WEB, '..');

/**
 * Que hacer, separado del disco para poder probarlo sin desplegar.
 *   'skip' — nada que hacer (o no estamos en Vercel).
 *   'link' — crear el enlace que el validador de Vercel espera encontrar.
 */
export function plan({ onVercel, buildDirExists, linkExists }) {
  if (!onVercel) return { action: 'skip', reason: 'no es un despliegue de Vercel' };
  if (!buildDirExists) return { action: 'skip', reason: 'web/.next no existe' };
  if (linkExists) return { action: 'skip', reason: 'la raiz ya tiene un .next real' };
  return { action: 'link', reason: 'el validador de Vercel busca web/ en la ruta' };
}

function main() {
  const decision = plan({
    onVercel: Boolean(process.env.VERCEL),
    buildDirExists: fs.existsSync(path.join(WEB, '.next')),
    linkExists: fs.existsSync(path.join(REPO, '.next')),
  });

  if (decision.action !== 'link') {
    process.stdout.write(`link-vercel-root-output: ${decision.reason}; no se toca nada.\n`);
    return 0;
  }

  fs.symlinkSync(path.join(WEB, '.next'), path.join(REPO, '.next'), 'junction');
  process.stdout.write('link-vercel-root-output: creado <repo>/.next -> web/.next\n');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exit(main());
}