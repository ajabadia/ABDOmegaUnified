#!/usr/bin/env node
/**
 * @purpose Recupera un fichero de web/_Deprecated y lo deja utilizable, en un paso.
 * @purpose_en Moves a file out of the frozen _Deprecated folder, verifies its imports
 *           resolve in the live tree, and refreshes the typecheck baseline.
 *
 * Que hace, y por que cada parte:
 *
 * 1. MUEVE el fichero de `_Deprecated/<ruta>` a `<ruta>`. Los imports RELATIVOS
 *    se resuelven solos al quitar el prefijo: se midio con ToastContainer.tsx,
 *    cuyo unico error (TS2307 por `../ToastContainer`) desaparecio solo al mover
 *    el fichero, sin tocar una linea. Por eso no se reescribe ningun import.
 *
 * 2. AVISA de los imports con alias `@/`, que NO se autoreparan: `@/x` resuelve
 *    contra `web/src/x` segun tsconfig.json, y lo que sigue archivado esta en
 *    `web/_Deprecated/src/x`. Si al mover, el destino no existe, el fichero
 *    quedara roto y el script lo dice en vez de fingir exito.
 *
 * 3. ACTUALIZA la linea base del typecheck, porque al mover el fichero sus
 *    errores Known dejan de reproducirse.
 *
 * Por defecto NO hace nada: dry-run. Hay que pasar --apply.
 *
 *   node scripts/recover-deprecated-file.mjs <ruta-relativa-a-_Deprecated>
 *   node scripts/recover-deprecated-file.mjs <ruta> --apply
 *
 * Opciones:
 *   --apply        ejecuta de verdad (sin esto, solo informa)
 *   --json         salida parseable
 */

import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, posix, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(HERE, '..');
const requireFromHere = createRequire(import.meta.url);

export const DEPRECATED_DIR = '_Deprecated';
const PREFIX = '[recover-deprecated-file]';

/** Extensiones que se prueban al resolver un import sin sufijo. */
export const RESOLVE_EXTENSIONS = ['', '.ts', '.tsx', '.d.ts', '.js', '.jsx', '/index.ts', '/index.tsx'];

/**
 * Normaliza a barras de "/" y quita el prefijo `_Deprecated/` si lo tiene.
 * Los scripts de este repo ya usan "/" porque lo escriben los errores de tsc.
 */
export function toPosix(p) {
  return p.split('\\').join('/');
}

export function stripDeprecatedPrefix(p) {
  const posix = toPosix(p);
  return posix.startsWith(`${DEPRECATED_DIR}/`) ? posix.slice(DEPRECATED_DIR.length + 1) : posix;
}

/**
 * Ejecuta un git pasando siempre `safe.directory`.
 *
 * En esta maquina git responde "dubious ownership" a cualquier comando que no
 * lo lleve, y eso no es un fallo del comando: es del entorno. Sin esto aqui,
 * el script fallaria por algo que no tiene que ver con lo que hace.
 */
export function git(args, options = {}) {
  return spawnSync('git', ['-c', `safe.directory=${gitTopLevel()}`, ...args], {
    cwd: WEB_ROOT,
    encoding: 'utf8',
    ...options,
  });
}

/**
 * Raiz del repositorio, para `safe.directory`.
 *
 * No se puede preguntar a git con `rev-parse` porque git es justo lo que se
 * niega a responder ("dubious ownership"): faltaria safe.directory para
 * obtenerla. Se deduce subiendo desde web/ hasta encontrar .git, que es lo
 * mismo que hace git.
 */
export function gitTopLevel() {
  let dir = WEB_ROOT;
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return WEB_ROOT;
}

/** Exige una ruta dentro de _Deprecated y devuelve (origen, destino) con "/". */
export function planMove(inputPath) {
  const posix = toPosix(inputPath.trim());
  const from = posix.startsWith(`${DEPRECATED_DIR}/`) ? posix : `${DEPRECATED_DIR}/${posix}`;
  const to = stripDeprecatedPrefix(from);
  if (isAbsolute(inputPath) || toPosix(inputPath).startsWith('..')) {
    throw new Error('la ruta debe ser relativa a web/, sin ".."');
  }
  return { from, to };
}

/** Extrae los especificadores de import de un fichero fuente. */
export function extractImports(source) {
  const specs = [];
  const patterns = [
    /from\s+['"]([^'"]+)['"]/g,
    /\bimport\s+['"]([^'"]+)['"]/g, // imports de efecto secundario
    /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g, // carga dinamica
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of patterns) {
    for (const m of source.matchAll(re)) specs.push(m[1]);
  }
  return specs;
}

function resolvesFrom(candidatePath) {
  return RESOLVE_EXTENSIONS.some((ext) => existsSync(join(WEB_ROOT, candidatePath + ext)));
}

/**
 * Clasifica los imports de un fichero que esta a punto de mudarse a `to`.
 *
 * Solo se revisan los de tipo alias `@/`, porque los relativos se resuelven
 * solos: el prefijo `_Deprecated/` se quita por igual en el fichero y en el
 * destino. Un alias no se autorepara, y hay que decirlo.
 */
export function classifyImports(to, specs) {
  const aliases = specs.filter((s) => s.startsWith('@/'));
  const ok = [];
  const broken = [];
  for (const spec of aliases) {
    // `@/x` resuelve contra web/src/x (ver tsconfig.json paths).
    const target = posix.join('src', spec.slice(2));
    if (resolvesFrom(target)) ok.push({ spec, target });
    else broken.push({ spec, target });
  }
  return { aliases: aliases.length, ok, broken };
}

/** Ficheros que importan al que se recupera; hay que avisar porque rompen. */
export function findImporters(to) {
  const needle = to.replace(/\.(tsx?|jsx?)$/, '');
  let out = '';
  try {
    out = execFileSync(
      'git',
      [
        '-c',
        `safe.directory=${gitTopLevel()}`,
        'grep',
        '-l',
        '--fixed-strings',
        needle,
        '--',
        '*.ts',
        '*.tsx',
      ],
      { cwd: WEB_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
  } catch (err) {
    // git grep sale 1 cuando no encuentra nada, y execFileSync lanza. Aqui
    // "nadie lo importa" es una respuesta valida, no un fallo. Cualquier otro
    // estado es un error de verdad y no se debe silenciar.
    if (err.status !== 1) throw new Error(`git grep fallo (exit ${err.status})`);
    return [];
  }
  return out
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map(toPosix)
    .filter((f) => f !== to && !f.startsWith(`${DEPRECATED_DIR}/`));
}

/** Lanza el typecheck de _Deprecated y devuelve los codigos de salida reales. */
export function refreshBaseline() {
  const tscBin = requireFromHere.resolve('typescript/bin/tsc');
  const res = spawnSync(process.execPath, [tscBin, '-p', 'tsconfig.deprecated.json'], {
    cwd: WEB_ROOT,
    encoding: 'utf8',
  });
  const errors = `${res.stdout || ''}${res.stderr || ''}`;
  const ids = new Set();
  for (const line of errors.split(/\r?\n/)) {
    const m = line.match(/^(.+?)\(\d+,\d+\): error (TS\d+): (.*)$/);
    if (m) ids.add(`${toPosix(m[1])}|${m[2]}|${m[3]}`);
  }
  return { ids, exitCode: res.status, raw: errors };
}

function main(argv) {
  const args = argv.filter((a) => !a.startsWith('--'));
  const APPLY = argv.includes('--apply');
  const AS_JSON = argv.includes('--json');
  const out = (line) => console.log(`${PREFIX} ${line}`);

  if (args.length !== 1) {
    out('uso: node scripts/recover-deprecated-file.mjs <ruta-relativa-a-_Deprecated> [--apply]');
    return 2;
  }

  let plan;
  try {
    plan = planMove(args[0]);
  } catch (err) {
    out(`ruta invalida: ${err.message}`);
    return 2;
  }

  const srcPath = join(WEB_ROOT, plan.from);
  if (!existsSync(srcPath)) {
    out(`no existe ${plan.from}`);
    return 2;
  }
  if (existsSync(join(WEB_ROOT, plan.to))) {
    out(`${plan.to} ya existe en el arbol vivo. No se toca nada.`);
    return 2;
  }

  const source = readFileSync(srcPath, 'utf8');
  const specs = extractImports(source);
  const { aliases, ok, broken } = classifyImports(plan.to, specs);
  const importers = findImporters(plan.to);

  if (AS_JSON) {
    console.log(JSON.stringify({ from: plan.from, to: plan.to, aliases, ok, broken, importers, applied: false }, null, 2));
    return 0;
  }

  out(`${plan.from}  ->  ${plan.to}`);
  out(`imports con alias @/: ${aliases} (${ok.length} resuelven, ${broken.length} no)`);
  if (broken.length > 0) {
    out('estos NO se arreglan solos al mover:');
    for (const b of broken) out(`  ${b.spec}  ->  no existe ${b.target}`);
    out('el fichero quedara roto hasta que aparezcan esos modulos.');
  }
  if (importers.length > 0) {
    out(`ficheros vivos que lo importan: ${importers.length}`);
    for (const f of importers.slice(0, 6)) out(`  ${f}`);
    if (importers.length > 6) out(`  ... y ${importers.length - 6} mas`);
  }
  if (!APPLY) {
    out('DRY-RUN: no se ha movido nada. Repite con --apply cuando lo revises.');
    return broken.length > 0 ? 1 : 0;
  }

  const res = git(['mv', plan.from, plan.to]);
  if (res.status !== 0) {
    out(`git mv fallo: ${(res.stderr || '').trim()}`);
    return 2;
  }
  out('movido. Los imports relativos se han resuelto solos.');

  // La linea base hay que regenerarla: los errores Known del fichero movido
  // dejan de reproducirse y, sin este paso, la puerta avisaria en falso.
  const check = spawnSync(process.execPath, [join(HERE, 'check-deprecated-typecheck.mjs'), '--update'], {
    cwd: WEB_ROOT,
    encoding: 'utf8',
  });
  if (check.status === 0) {
    out((check.stdout || '').trim());
  } else {
    out(`no pude actualizar la linea base (exit ${check.status}).`);
    out(`  ${(check.stderr || '').trim()}`);
    out('  ejecuta a mano: npm run typecheck:deprecated:update');
  }

  if (broken.length > 0) {
    out(`${broken.length} alias siguen sin resolver: el fichero no compila todavia.`);
    out('  despues, comprueba con: npx tsc --noEmit');
  }
  return broken.length > 0 ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}