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
 *     Build Completed in /vercel/output [52s]
 *     Deploying outputs...
 *     status  ● Error
 *     errorCode: "ENOENT"
 *
 * Medido en este repo, uno detras de otro (cada arreglo tapa el siguiente):
 *
 *     /vercel/path0/.next/routes-manifest-deterministic.json
 *     /vercel/path0/node_modules/next/dist/build/adapter/setup-node-env.external.js
 *     /vercel/path0/docs/ADR-009.md
 *
 * Es un fallo de la plataforma, no de este repo: vercel/vercel#15937 ("Next.js
 * 16 post-build validation drops intermediate path segments from multi-segment
 * Root Directory"). Ni `next build` ni los tests lo ven; solo al desplegar.
 *
 * QUE HACE
 * --------
 * Replica en la raiz del repo lo que falta de `web/`, para que las rutas que
 * el validador construye sin el segmento `web` resuelvan:
 *
 *   - Si un nombre de `web/` no existe en la raiz, se enlaza el suyo.
 *   - Si ya existe y es un directorio (p. ej. `docs/`, que el repo tambien
 *     tiene), NO se sustituye: se enlaza dentro lo que falte. Por eso hace
 *     falta mirar `docs/ADR-009.md` y no solo `docs/`.
 *   - Lo que ya existe no se toca nunca. En el contenedor no hay mas que perder
 *     que el propio despliegue, pero en local el script no hace nada.
 *
 * Ademas materializa `.next/routes-manifest-deterministic.json` copiando
 * `routes-manifest.json`: el enlace ya hace que la ruta resuelva, pero
 * Next.js 16.2.4 no escribe ese fichero en ninguna parte (medido con `find`),
 * asi que hay que crearlo. Solo si falta, para que una version futura de Next
 * mande el suyo sin que lo pisen.
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

/** Cuanto se baja en directorios que ya existen en la raiz. Uno basta para lo medido. */
const MAX_DEPTH = 1;

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
 * Pares [origen, destino] que hay que enlazar, en forma RELATIVA a web/ y a la
 * raiz, para poder probar la decision con objetos planos y sin tocar el disco.
 *
 * `tree` es el arbol de web/ en profundidad; `existsInRepo` responde si una
 * ruta (separada por '/') ya existe en la raiz del repo.
 */
export function planLinks(tree, existsInRepo, depth = 0) {
  const links = [];
  for (const entry of tree) {
    if (!existsInRepo(entry.name)) {
      links.push({ from: entry.name, to: entry.name });
      continue;
    }
    if (!entry.children || depth >= MAX_DEPTH) continue;
    for (const child of planLinks(entry.children, (n) => existsInRepo(`${entry.name}/${n}`), depth + 1)) {
      links.push({ from: `${entry.name}/${child.from}`, to: `${entry.name}/${child.to}` });
    }
  }
  return links;
}

/** Lee el arbol de `dir` hasta la profundidad pedida. */
function readTree(dir, depth) {
  return fs.readdirSync(dir, { withFileTypes: true }).map((entry) => ({
    name: entry.name,
    children: entry.isDirectory() && depth > 0 ? readTree(path.join(dir, entry.name), depth - 1) : undefined,
  }));
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

  const links = planLinks(readTree(WEB, MAX_DEPTH), (rel) => fs.existsSync(path.join(REPO, rel)));
  for (const { from, to } of links) {
    fs.symlinkSync(path.join(WEB, from), path.join(REPO, to), 'junction');
  }
  process.stdout.write(
    `link-vercel-root-output: ${links.length} rutas de web/ enlazadas en <repo>/ (p. ej. ${links
      .slice(0, 8)
      .map((l) => l.to)
      .join(', ')}${links.length > 8 ? ', ...' : ''})\n`
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