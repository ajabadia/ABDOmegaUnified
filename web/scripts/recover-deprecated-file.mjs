#!/usr/bin/env node
/**
 * @purpose Recupera un fichero de web/_Deprecated y lo deja utilizable, en un paso.
 * @purpose_en Moves a file out of the frozen _Deprecated folder together with every
 *           archived sibling it needs, and refreshes the typecheck baseline.
 *
 * Que hace, y por que cada parte:
 *
 * 1. MUEVE el fichero de `_Deprecated/<ruta>` a `<ruta>`. Los imports RELATIVOS
 *    se resuelven solos al quitar el prefijo: se midio con ToastContainer.tsx,
 *    cuyo unico error (TS2307 por `../ToastContainer`) desaparecio solo al mover
 *    el fichero, sin tocar una linea. Por eso no se reescribe ningun import.
 *
 * 2. DICE CUALES HERMANOS TIENE que moverse con el, y los mueve con el. Un
 *    fichero archivado suele necesitar a otros archivados, y no solo por los
 *    alias: tambien por los imports RELATIVOS, que solo quedan resueltos si el
 *    destino se mueve con el. Medido en el archivado: de 69 ficheros, 14 forman
 *    grupos de 2 o mas, el mayor de 7. Antes de esto, el script decia "se
 *    resuelve solo" sobre AudioShowcase.tsx y lo dejaba con 6 errores.
 *
 * 3. AVISA de los alias `@/` que NO tienen contraparte ni viva ni archivada,
 *    porque esos no los arregla ni el grupo entero.
 *
 * 4. ACTUALIZA la linea base del typecheck, porque al mover los ficheros sus
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
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
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
 * Rutas que TypeScript prueba para un alias `@/*`, en orden.
 *
 * tsconfig.json declara `"@/*": ["./src/*", "./*"]`: los DOS. Se prueban los dos
 * porque un modulo archivado puede estar en cualquiera de los dos sitios, y
 * mirar solo uno daria falsos positivos.
 */
export const ALIAS_PREFIXES = ['src/', ''];

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

function defaultExists(candidatePath) {
  return existsSync(join(WEB_ROOT, candidatePath));
}

/**
 * Busca la primera combinacion `ruta + extension` que exista.
 *
 * Devuelve la ruta EXACTA con su extension, o `null` si no hay ninguna.
 *
 * OJO con el valor devuelto: puede ser la propia ruta sin sufijo, cuando lo que
 * existe es un DIRECTORIO con `index.ts` dentro. Por eso el que llama compara
 * contra `null` y no contra su verdad: en JavaScript el string vacio es falsy,
 * y al medir el archivado eso dio dos falsos positivos (se dio por inexistente
 * `primitives/`, que si resuelve por su index.ts).
 */
export function resolveFirstMatch(candidatePath, exists = defaultExists) {
  for (const ext of RESOLVE_EXTENSIONS) {
    if (exists(candidatePath + ext)) return candidatePath + ext;
  }
  return null;
}

/**
 * Clasifica los imports de un fichero que esta a punto de mudarse a `to`.
 *
 * Solo se revisan los de tipo alias `@/`, porque los relativos se resuelven
 * solos al quitar el prefijo: `_Deprecated/a/b.ts` y `a/b.ts` guardan la misma
 * distancia al destino. Un alias no se autorepara, y hay que decirlo.
 *
 * NOTA: que el relativo se resuelva "solo" habla de la ruta del propio fichero,
 * no del destino. Si `./audio/useAudioPlayer` sigue archivado, mover solo quien
 * lo importa lo deja roto: de eso se encarga `resolveRecoveryGroup`.
 */
export function classifyImports(to, specs, exists = defaultExists) {
  const aliases = specs.filter((s) => s.startsWith('@/'));
  const ok = [];
  const broken = [];
  for (const spec of aliases) {
    const match = resolveAliasTarget(spec, exists);
    if (match !== null) ok.push({ spec, target: match });
    else broken.push({ spec, target: posix.join('src', spec.slice(2)) });
  }
  return { aliases: aliases.length, ok, broken };
}

/**
 * Resuelve un alias `@/x` contra el arbol vivo, probando las dos rutas de
 * `paths`. Devuelve la ruta viva concreta, o `null` si no resuelve.
 */
export function resolveAliasTarget(spec, exists = defaultExists) {
  const rest = spec.slice(2);
  for (const prefix of ALIAS_PREFIXES) {
    const match = resolveFirstMatch(posix.join(prefix, rest), exists);
    if (match !== null) return match;
  }
  return null;
}

/**
 * Busca la contraparte archivada de una ruta viva: el mismo fichero dentro de
 * `_Deprecated/`. Devuelve la ruta archivada, ya sin prefijo, o `null`.
 */
export function resolveArchivedCounterpart(targetPath, exists = defaultExists) {
  const archived = resolveFirstMatch(`${DEPRECATED_DIR}/${targetPath}`, exists);
  return archived === null ? null : stripDeprecatedPrefix(archived);
}

/**
 * Clasifica UN import de un fichero que va a mudarse, segun donde resuelva.
 *
 * El destino se calcula DESDE LA RUTA VIVA, no desde la archivada: al mover, el
 * fichero pasa a `fromPath`, y un relativo apunta desde ahi. Este detalle es el
 * que hace que el grupo salga bien; calcularlo desde dentro de `_Deprecated/` dio
 * 24 imports "imposibles" que si tenian destino.
 *
 * - `ok`        existe ya en el arbol vivo: se resuelve solo.
 * - `sibling`   solo existe archivado: hay que moverlo con este fichero.
 * - `missing`   no existe ni vivo ni archivado: no hay nada que mover.
 * - `external`  no es una ruta (paquete de npm, builtin): se ignora.
 */
export function classifyDependency(fromPath, spec, exists = defaultExists) {
  if (spec.startsWith('@/')) {
    if (resolveAliasTarget(spec, exists) !== null) {
      return { kind: 'ok', spec, target: resolveAliasTarget(spec, exists) };
    }
    // `@/x` apunta a `src/x` y tambien a `x`, en ese orden. La contraparte
    // archivada se busca con el mismo orden, y devuelve la ruta viva equivalente.
    for (const prefix of ALIAS_PREFIXES) {
      const target = posix.join(prefix, spec.slice(2));
      const sibling = resolveArchivedCounterpart(target, exists);
      if (sibling !== null) return { kind: 'sibling', spec, target, sibling };
    }
    return { kind: 'missing', spec, target: posix.join('src', spec.slice(2)) };
  }
  if (!spec.startsWith('.')) return { kind: 'external', spec };

  const base = posix.normalize(posix.join(posix.dirname(fromPath), spec));
  const live = resolveFirstMatch(base, exists);
  if (live !== null) return { kind: 'ok', spec, target: live };
  const sibling = resolveArchivedCounterpart(base, exists);
  if (sibling !== null) return { kind: 'sibling', spec, target: base, sibling };
  return { kind: 'missing', spec, target: base };
}

/**
 * Calcula el GRUPO CERRADO de ficheros que hay que mover juntos.
 *
 * Se empieza por `seed` y se siguen uniendo hermanos hasta que no aparezca
 * ninguno nuevo, asi que el grupo es transitivo: si A necesita a B y B necesita
 * a C, el grupo es {A, B, C}. Un grupo cerrado es el unico estado en el que
 * compila; mover solo una parte deja imports rotos.
 *
 * `readFile` se recibe aparte de `exists` para que esto siga siendo una funcion
 * pura y se pueda probar sin disco, contra un arbol de mentira.
 *
 * Devuelve:
 *   files       rutas de destino, la primera es la semilla, sin repetir
 *   edges       por que entra cada uno: de quien a quien y por que import
 *   unresolved  imports `missing`: no hay hermano que los arregle, y con ellos
 *               el grupo NO compila aunque se mueva entero
 *   siblings    cuantos ficheros hay mas alla de la semilla
 */
export function resolveRecoveryGroup(seed, io) {
  const { readFile, exists = defaultExists } = typeof io === 'function' ? { readFile: io } : io;
  const files = [];
  const seen = new Set();
  const edges = [];
  const unresolved = [];
  const queue = [toPosix(seed)];

  while (queue.length > 0) {
    const current = queue.shift();
    if (seen.has(current)) continue; // los ciclos son normales entre hermanos
    seen.add(current);
    files.push(current);

    const source = readFile(current);
    if (source === null || source === undefined) continue; // io incompleto: no inventar
    for (const spec of extractImports(source)) {
      const dep = classifyDependency(current, spec, exists);
      if (dep.kind === 'sibling') {
        edges.push({ from: current, spec, to: dep.sibling });
        if (!seen.has(dep.sibling)) queue.push(dep.sibling);
      } else if (dep.kind === 'missing') {
        unresolved.push({ from: current, spec, target: dep.target });
      }
    }
  }

  return { files, edges, unresolved, siblings: files.length - 1 };
}

/**
 * Ficheros VIVOS que importan a alguno de los que se recuperan.
 *
 * Hay que avisar porque se quedan apuntando a un sitio donde ya no vive nadie.
 * Cuando se mueve un grupo se pregunta por cada miembro, y basta con que uno
 * tenga importadores para que salga el aviso.
 */
export function findImporters(targets) {
  const list = Array.isArray(targets) ? targets : [targets];
  const found = new Set();
  for (const to of list) {
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
      continue;
    }
    for (const line of out.split(/\r?\n/)) {
      const file = toPosix(line.trim());
      if (!file) continue;
      if (list.includes(file)) continue;
      if (file.startsWith(`${DEPRECATED_DIR}/`)) continue;
      found.add(file);
    }
  }
  return [...found];
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

/**
 * Mueve un grupo entero, o nada.
 *
 * `git mv` NO crea el directorio de destino: si el destino no existe, falla con
 * "destination directory does not exist". Por eso se crean los directorios antes
 * de mover nada, y por eso se comprueba ANTES que estan todos los origenes: si
 * uno falta, se aborta antes del primer movimiento, porque un grupo movido a
 * medias es peor que un grupo entero sin mover.
 */
export function moveGroup(targets) {
  for (const target of targets) {
    mkdirSync(dirname(join(WEB_ROOT, target)), { recursive: true });
  }
  const moved = [];
  for (const target of targets) {
    const res = git(['mv', `${DEPRECATED_DIR}/${target}`, target]);
    if (res.status !== 0) return { moved, failed: { target, error: (res.stderr || '').trim() } };
    moved.push(target);
  }
  return { moved, failed: null };
}

/**
 * Decide si un grupo se puede mover tal cual, o si hay que pararse antes.
 *
 * Es una funcion pura a proposito: la regla "un grupo con imports sin destino no
 * se mueve ni a medias" es la que evita dejar medio grupo en el sitio nuevo, y
 * una regla asi no puede depender solo de que nadie mire el codigo de salida.
 *
 * - `blockers` son los origenes que no estan en `_Deprecated/`.
 * - `unresolved` son los imports sin destino, ni vivo ni archivado.
 */
export function planRecovery({ files, siblings, unresolved, blockers = [] }) {
  if (blockers.length > 0) return { move: false, reason: 'missing-source', blockers, unresolved };
  if (unresolved.length > 0) return { move: false, reason: 'unresolved', blockers: [], unresolved };
  return { move: true, reason: 'closed', blockers: [], unresolved: [], siblings, count: files.length };
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

  // El grupo se calcula sobre rutas VIVAS de destino; para leer cada miembro se
  // busca su copia dentro de `_Deprecated/`, que es donde esta ahora.
  const group = resolveRecoveryGroup(plan.to, {
    readFile: (livePath) => {
      const archived = join(WEB_ROOT, DEPRECATED_DIR, livePath);
      return existsSync(archived) ? readFileSync(archived, 'utf8') : null;
    },
  });
  const { aliases, ok, broken } = classifyImports(plan.to, extractImports(readFileSync(srcPath, 'utf8')));
  // Un alias que `classifyImports` da por roto puede estar resuelto igual: si el
  // hermano estaba archivado, el grupo lo mueve y el alias queda bien. Separar
  // los dos evita decir "no tiene contraparte" de algo que si la tiene y va en
  // la lista de cinco lineas mas abajo.
  // Solo los edges de ALIAS: los relativos nunca salen en `broken`, asi que
  // contarlos aqui daria "de sus 1 alias rotos, 2 los arregla el grupo".
  const resolvedByGroup = new Set(
    group.edges.filter((e) => e.from === plan.to && e.spec.startsWith('@/')).map((e) => e.spec),
  );
  const unsatisfiable = broken.filter((b) => !resolvedByGroup.has(b.spec));
  const importers = findImporters(group.files);

  if (AS_JSON) {
    console.log(
      JSON.stringify(
        {
          from: plan.from,
          to: plan.to,
          aliases,
          ok,
          broken,
          group: group.files,
          edges: group.edges,
          unresolved: group.unresolved,
          importers,
          applied: false,
        },
        null,
        2,
      ),
    );
    return group.unresolved.length > 0 ? 1 : 0;
  }

  out(`${plan.from}  ->  ${plan.to}`);
  out(`imports con alias @/: ${aliases} (${ok.length} resuelven, ${broken.length} no)`);

  if (group.siblings > 0) {
    out(`este fichero necesita a sus hermanos: hay que mover ${group.files.length} ficheros, no 1.`);
    for (const edge of group.edges) out(`  ${edge.from}  --[${edge.spec}]-->  ${edge.to}`);
    out('mover solo uno de ellos deja imports rotos: por eso se propone el grupo entero.');
  } else {
    out('no necesita hermanos: se puede mover solo.');
  }

  if (resolvedByGroup.size > 0) {
    out(`de sus ${broken.length} alias rotos, ${resolvedByGroup.size} los arregla el grupo al moverlo:`);
    for (const spec of resolvedByGroup) out(`  ${spec}  ->  se resuelve al mover su hermano`);
  }
  if (unsatisfiable.length > 0) {
    out(`estos alias no tienen contraparte ni viva ni archivada (${unsatisfiable.length}):`);
    for (const b of unsatisfiable) out(`  ${b.spec}  ->  no existe ${b.target}`);
  }
  if (group.unresolved.length > 0) {
    out(`y ${group.unresolved.length} imports no tienen destino ni vivo ni archivado:`);
    for (const u of group.unresolved) out(`  ${u.from}  ->  ${u.spec}  (no existe ${u.target})`);
  }
  if (importers.length > 0) {
    out(`ficheros vivos que los importan: ${importers.length}`);
    for (const f of importers.slice(0, 6)) out(`  ${f}`);
    if (importers.length > 6) out(`  ... y ${importers.length - 6} mas`);
  }

  // Un grupo con imports sin destino no se mueve ni a medias: la mitad del grupo
  // en su sitio nuevo es peor que el grupo entero en el viejo.
  const blockers = group.files.filter((t) => !existsSync(join(WEB_ROOT, DEPRECATED_DIR, t)));
  const decision = planRecovery({ ...group, blockers });
  if (!decision.move) {
    if (decision.reason === 'unresolved') {
      out(
        APPLY
          ? 'NO se mueve nada: el grupo no cerraria. Arregla esos imports primero.'
          : 'DRY-RUN: no se ha movido nada. Ademas, el grupo no cerraria.',
      );
    } else {
      out('NO se mueve nada: faltan estos ficheros en _Deprecated:');
      for (const m of decision.blockers) out(`  ${DEPRECATED_DIR}/${m}`);
    }
    return 1;
  }

  if (!APPLY) {
    out('DRY-RUN: no se ha movido nada. Repite con --apply cuando lo revises.');
    return 0;
  }

  const result = moveGroup(group.files);
  if (result.failed) {
    out(`git mv fallo moviendo ${DEPRECATED_DIR}/${result.failed.target}: ${result.failed.error}`);
    out(`  ya habian movido ${result.moved.length} ficheros. Deshazlo con: git checkout -- ${result.moved.join(' ')}`);
    return 2;
  }
  out(`grupo movido entero: ${result.moved.length} ficheros. Los imports quedan resueltos.`);

  // La linea base hay que regenerarla: los errores Known de los ficheros movidos
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

  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}