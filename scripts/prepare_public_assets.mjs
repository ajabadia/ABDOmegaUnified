#!/usr/bin/env node
/**
 * Materializa `web/public/*` desde las rutas CANÓNICAS del repo.
 * =============================================================================
 * POR QUÉ ESTE SCRIPT EXISTE
 * --------------------------
 * `web/public/` tiene cuatro carpetas que la app sirve por HTTP y que, en la
 * máquina de desarrollo, son **junctions NTFS a rutas absolutas**:
 *
 *     web/public/modules      -> <repo>/modules
 *     web/public/fonts        -> <repo>/web/src/omega-ui-core/typography/fonts
 *     web/public/host-ui      -> <repo>/host/ui
 *     web/public/omega-ui-core-> <repo>/web/src/omega-ui-core
 *
 * Funcionan en Windows y NO existen en ninguna máquina que no sea esta: al
 * desplegar, Next no encuentra `package.json` de esos assets o los sirve como
 * 404, y el síntoma aparece lejos de la causa (catálogo vacío, `/host-ui/`
 * inexistente). Un junction es además una entrada que git no versiona (por eso
 * están en `.gitignore`), así que "subir el fichero" no es una opción.
 *
 * QUÉ HACE
 * --------
 * Copia el contenido canónico a `web/public/`, **materializando los junctions
 * que encuentre por el camino** (p. ej. `host/ui/omega-ui-core/`, que también es
 * un junction). Es exactamente lo que el junction hacía, pero con bytes reales.
 *
 * El destino `monaco` no viene de una ruta canónica del repo sino de
 * `node_modules`: es el editor de la vista de código, que sin esto se
 * descargaría de un CDN. Ver `web/src/lib/monaco/configureMonacoLoader.ts`.
 *
 * CÓMO SE USA
 * -----------
 *     node scripts/prepare_public_assets.mjs              # materializa todo
 *     node scripts/prepare_public_assets.mjs --check      # solo diagnostica
 *     node scripts/prepare_public_assets.mjs --only=modules,fonts
 *     node scripts/prepare_public_assets.mjs --skip=host-ui
 *
 * Sale por `prebuild` de `web/package.json`, así que `npm run build` (y Vercel)
 * lo ejecutan solos. `--check` sale 1 si falta un destino obligatorio, y por eso
 * sirve como guard en CI.
 *
 * En un despliegue la diferencia la marcau el repo entero o solo `web/`: si
 * Vercel construye con Root Directory = `web`, ni `../scripts/` ni `../modules/`
 * existen en el contenedor y este script no puede hacer su trabajo. Falla con un
 * error legible en vez de copiar medio árbol — es intencional.
 *
 * Decisiones que conviene no deshacer sin pensarlo:
 *   - Si el destino YA es un junction que apunta a la fuente, no se toca: en la
 *     máquina de desarrollo eso es correcto y `rm -r` a través de un junction
 *     alcanzaría el árbol canónico (`modules/`).
 *   - Guardia de ciclos por realpath: un junction que se apunta a sí mismo (o un
 *     anillo de junctions) cortaría el copiado con ELOOP infinito.
 *   - Las carpetas pesadas (`host-ui`, ~78 MB) se pueden saltar; el catálogo de
 *     módulos, Monaco y las fuentes NO, sin ellos la app arranca y luego falla
 *     al abrir, o se queda cargando sin decir nada.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Raíz del repo, resuelta desde la ruta del propio script (agnóstico de cwd). */
export function repoRoot() {
  return path.resolve(HERE, '..');
}

/**
 * Los cuatro destinos, con su fuente canónica y por qué existen.
 * `required: true` significa que la app funciona pero falla al abrir un módulo
 * si no están; `required: false` son slatedoras/standalone que solo afectan a
 * páginas concretas.
 */
export const TARGETS = [
  {
    name: 'modules',
    dest: 'web/public/modules',
    sources: ['modules'],
    required: true,
    why: 'GET /modules/<id>/<id>.acemm y /api/modules; sin esto el catálogo vacío y fetchManifest da 404.',
  },
  {
    name: 'omega-ui-core',
    dest: 'web/public/omega-ui-core',
    sources: ['web/src/omega-ui-core'],
    required: false,
    why: 'CSS/fuentes servidos por /host-ui/index.html y por consumidores que cargan la hoja desde public/.',
  },
  {
    name: 'fonts',
    dest: 'web/public/fonts',
    sources: ['web/src/omega-ui-core/typography/fonts'],
    required: false,
    why: 'Ficheros de tipografía que las hojas de omega-ui-core piden por ruta absoluta.',
  },
  {
    name: 'host-ui',
    dest: 'web/public/host-ui',
    sources: ['host/ui'],
    required: false,
    why: 'La página standalone enlazada desde el portal; 78 MB, se puede --skip=.',
  },
  {
    name: 'monaco',
    dest: 'web/public/monaco',
    sources: ['web/node_modules/monaco-editor/min'],
    required: true,
    why:
      'La build AMD de Monaco (loader.js + workers). Sin ella la vista de código se queda en ' +
      '"Loading..." para siempre, en silencio, porque @monaco-editor/loader descarga de jsDelivr.',
  },
];

/** ¿Es un enlace (junction NTFS o symlink) y no un directorio real? */
export function isLink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/** Ruta real que sigue enlaces; null si no existe. */
function realpathOrNull(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return null;
  }
}

/**
 * Clave de comparación de rutas: realpath normalizado y en minúsculas.
 *
 * POR QUÉ NO BASTA COMPARAR LOS STRING
 * ------------------------------------
 * En Windows la ruta NO distingue mayúsculas, pero `realpathSync` no la
 * normaliza: el mismo junction puede devolver `d:\desarrollos\...` y su fuente
 * `D:\desarrollos\...`. Comparados en crudo salen distintos, el script cree que
 * el destino es un directorio real materializado y lo BORRA — que era
 * exactamente lo que este script promete no hacer. Medido con
 * `scripts/probe-public-link-kinds.mjs` (3 de 4 junctions con `d:` minúscula).
 */
function pathKey(p) {
  const real = realpathOrNull(p);
  return real === null ? null : path.resolve(real).replace(/[\\/]+$/, '').toLowerCase();
}

/** ¿Son `a` y `b` la misma ruta en disco? Case-insensitive en Windows. */
export function samePath(a, b) {
  const ka = pathKey(a);
  return ka !== null && ka === pathKey(b);
}

/** Cuenta ficheros regulares de un árbol, sin seguir enlaces. */
export function countFiles(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) stack.push(full);
      else total += 1;
    }
  }
  return total;
}

/**
 * Estado de un destino respecto a su fuente.
 *   'junction'  — ya es un enlace a la fuente: correcto en local, no se toca.
 *   'materialized' — directorio real con contenido.
 *   'missing'   — no existe, o existe vacío.
 */
export function targetStatus(target, root = repoRoot()) {
  const dest = path.join(root, target.dest);
  if (!fs.existsSync(dest)) return 'missing';
  const source = path.join(root, target.sources[0]);
  if (isLink(dest) && samePath(dest, source)) return 'junction';
  return countFiles(dest) > 0 ? 'materialized' : 'missing';
}

/**
 * Copia `src` a `dest` resolviendo junctions a contenido real.
 * `seen` lleva los realpath ya copiados en esta pasada: sin él, un junction
 * que apunta a un ancestro se come la pila hasta reventar con ELOOP.
 * Devuelve el número de ficheros escritos y los enlaces que se saltaron.
 */
export function materialize(src, dest, seen = new Set()) {
  const realSrc = realpathOrNull(src);
  if (realSrc && seen.has(realSrc)) return { files: 0, skipped: [] };
  if (realSrc) seen.add(realSrc);

  fs.mkdirSync(dest, { recursive: true });
  const skipped = [];
  let files = 0;

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    const isLinkEntry = entry.isSymbolicLink();
    let isDir = entry.isDirectory();

    if (isLinkEntry) {
      // `statSync` sigue el enlace: si está roto, LANZA (ENOENT). Hay que
      // separarlo, o un único junction roto tumba el copiado entero.
      let target;
      try {
        target = fs.statSync(from);
      } catch {
        skipped.push(from);
        continue;
      }
      isDir = target.isDirectory();
    }

    if (isDir) {
      if (isLinkEntry && seen.has(pathKey(from))) {
        // El junction apunta a algo que ya se está copiando: es un anillo
        // (host/ui/self -> host/ui). Copiarlo otra vez no termina nunca.
        skipped.push(from);
        continue;
      }
      const sub = materialize(from, to, seen);
      files += sub.files;
      skipped.push(...sub.skipped);
      continue;
    }

    fs.copyFileSync(from, to);
    files += 1;
  }

  return { files, skipped };
}

/** ¿Están presentes todas las fuentes canónicas de un destino? */
export function sourcesPresent(target, root = repoRoot()) {
  return target.sources.every((rel) => fs.existsSync(path.join(root, rel)));
}

/** Materializa un destino completo. Lanza si falta la fuente canónica. */
export function materializeTarget(target, root = repoRoot()) {
  const dest = path.join(root, target.dest);
  for (const rel of target.sources) {
    const source = path.join(root, rel);
    if (!fs.existsSync(source)) {
      throw new Error(`Falta la fuente canónica "${rel}" (la necesita ${target.name}).`);
    }
  }

  // Destino real de una pasada anterior: se borra para no arrastrar ficheros
  // que ya no existen en la fuente. Nunca un junction (se comprueba antes).
  if (fs.existsSync(dest) && !isLink(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }

  const totals = target.sources.reduce(
    (acc, rel) => {
      const sub = materialize(path.join(root, rel), dest);
      acc.files += sub.files;
      acc.skipped.push(...sub.skipped);
      return acc;
    },
    { files: 0, skipped: [] }
  );

  return { ...target, files: totals.files, skipped: totals.skipped };
}

/** Filtra la lista de destinos con --only / --skip. */
export function selectTargets(argv, targets = TARGETS) {
  const valueOf = (flag) => {
    const hit = argv.find((a) => a.startsWith(`--${flag}=`));
    return hit ? hit.slice(flag.length + 3).split(',').map((s) => s.trim()).filter(Boolean) : [];
  };
  const only = valueOf('only');
  const skip = valueOf('skip');
  let selected = targets;
  if (only.length) selected = selected.filter((t) => only.includes(t.name));
  if (skip.length) selected = selected.filter((t) => !skip.includes(t.name));
  return selected;
}

function parseArgv(argv) {
  return {
    check: argv.includes('--check'),
    only: selectTargets(argv),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

const USAGE = `Uso: node scripts/prepare_public_assets.mjs [--check] [--only=a,b] [--skip=a,b]

  (sin flags)  materializa web/public/{modules,fonts,host-ui,omega-ui-core,monaco}
  --check      solo diagnostica; sale 1 si falta un destino obligatorio
  --only=...   limita a los destinos indicados (${TARGETS.map((t) => t.name).join(', ')})
  --skip=...   excluye destinos (útil para no copiar host-ui: 78 MB)
`;

function main(argv) {
  const { check, only, help } = parseArgv(argv);
  if (help) {
    process.stdout.write(USAGE);
    return 0;
  }

  const root = repoRoot();
  const rows = [];
  let failed = false;

  for (const target of only) {
    const status = targetStatus(target, root);
    if (check) {
      if (!sourcesPresent(target, root)) {
        rows.push({ target, status: `sin fuente canónica (${target.sources.join(', ')})`, files: '-' });
        if (target.required) failed = true;
        continue;
      }
      rows.push({ target, status, files: status === 'junction' ? '-' : countFiles(path.join(root, target.dest)) });
      if (target.required && status === 'missing') failed = true;
      continue;
    }
    if (status === 'junction') {
      rows.push({ target, status: 'junction (intacto)', files: '-' });
      continue;
    }
    if (!sourcesPresent(target, root)) {
      // Un destino opcional cuya fuente no está (p. ej. un checkout parcial,
      // o un despliegue donde `host/` no se sube) no puede tumbar el build;
      // uno obligatorio sí, porque su ausencia rompe la app en silencio.
      if (target.required) failed = true;
      rows.push({
        target,
        status: `sin fuente canónica (${target.sources.join(', ')})`,
        files: '-',
      });
      continue;
    }
    try {
      const result = materializeTarget(target, root);
      rows.push({ target, status: 'materializado', files: result.files });
      for (const link of result.skipped) {
        process.stdout.write(`  [aviso] ${target.name}: enlace no copiado -> ${link}\n`);
      }
    } catch (error) {
      failed = true;
      rows.push({ target, status: `ERROR: ${error.message}`, files: '-' });
    }
  }

  const width = Math.max(...rows.map((r) => r.target.name.length), 8);
  process.stdout.write(`${check ? 'Comprobando' : 'Materializando'} public/ desde las rutas canónicas:\n`);
  for (const row of rows) {
    process.stdout.write(`  ${row.target.name.padEnd(width)}  ${row.status.padEnd(20)} ${row.files}\n`);
  }
  if (!check) {
    process.stdout.write(
      `\n${rows.filter((r) => r.status === 'junction (intacto)').length} destino(s) eran junctions de esta ` +
        'máquina y se han dejado intactos.\n'
    );
  } else if (!failed) {
    process.stdout.write('\nTodo lo obligatorio está disponible.\n');
  }

  return failed ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exit(main(process.argv.slice(2)));
}