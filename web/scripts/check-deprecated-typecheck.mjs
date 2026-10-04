#!/usr/bin/env node
/**
 * @purpose Compara el typecheck de web/_Deprecated contra una linea base conocida.
 * @purpose_en Typechecks the frozen _Deprecated folder and reports only errors
 *           that are NOT already part of the known, accepted breakage.
 *
 * Por que una linea base y no un typecheck normal: mover los ficheros a
 * _Deprecated rompio sus imports relativos a los ficheros que se quedaron en
 * src/. Eso son 25 errores TS2307 y 9 TS7006 en cascada, siempre, y no son bugs:
 * son la consecuencia de congelar el codigo. Un typecheck normal ahi seria ruido
 * que nadie va a leer.
 *
 * Uso (bajo demanda, nunca en CI):
 *   node scripts/check-deprecated-typecheck.mjs            # exit 1 si hay errores NUEVOS
 *   node scripts/check-deprecated-typecheck.mjs --update   # regenera la linea base
 *   node scripts/check-deprecated-typecheck.mjs --json     # salida parseable
 *
 * Tras recuperar un fichero (movido fuera de _Deprecated) hay que pasar --update:
 * es el paso que acepta que ese error ya no se reproduce.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(HERE, '..');
// Este fichero es ESM, donde require no existe; createRequire lo trae de vuelta.
const requireFromHere = createRequire(import.meta.url);

export const PROJECT_CONFIG_NAME = 'tsconfig.deprecated.json';
export const BASELINE_PATH = join(WEB_ROOT, 'scripts', 'deprecated-typecheck-baseline.json');

/** Carpetas que el typecheck debe mirar. Si desaparecen, algo va mal y hay que decirlo. */
export const EXPECTED_TARGETS = ['_Deprecated'];

/** Prefijo de todos los mensajes, para que se distingan en un log de CI. */
const PREFIX = '[check-deprecated-typecheck]';

/**
 * Cada error de tsc es `ruta(linia,col): error TSxxxx: mensaje`.
 *
 * La identidad guarda ruta + codigo + mensaje, y NO el numero de linea: recuperar
 * un fichero mueve lineas sin que eso sea un error nuevo. Sin esa distincion,
 * cada recuperacion saldria con falsos positivos.
 */
export function parseErrors(text) {
  const errors = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const match = rawLine.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/);
    if (!match) continue;
    const [, file, line, col, code, message] = match;
    const normalized = file.replace(/\\/g, '/');
    errors.push({
      file: normalized,
      line: Number(line),
      col: Number(col),
      code,
      message,
      identity: `${normalized}|${code}|${message}`,
    });
  }
  return errors;
}

/**
 * Descarta los `implicit any` que son consecuencia de un import sin resolver.
 *
 * Cuando un import falla, todo lo que viene de el es `any`, asi que el fichero
 * entero se llena de TS7006 que no dicen nada. Medido: al arreglar el import de
 * `CalibrationPanel.tsx` desaparecieron sus 5 TS7006 junto con el TS2307.
 *
 * El filtro es deliberadamente estrecho: solo se aplica a TS7006 Y solo en
 * ficheros que ademas tienen un TS2307. Un `implicit any` en un fichero sin
 * imports rotos se conserva, porque ese si puede ser un bug real.
 */
export function suppressCascadeNoise(errors) {
  const filesWithUnresolvedImport = new Set(
    errors.filter((e) => e.code === 'TS2307').map((e) => e.file),
  );
  const kept = [];
  const suppressed = [];
  for (const e of errors) {
    if (e.code === 'TS7006' && filesWithUnresolvedImport.has(e.file)) {
      suppressed.push(e);
    } else {
      kept.push(e);
    }
  }
  return { kept, suppressed };
}

/**
 * Reparte los errores actuales respecto a la linea base.
 *
 * `newErrors` es lo que debe hacer fallar la puerta: un error que no estaba
 * significa que alguien toco el codigo-archivo. `fixed` es informacion para
 * cuando se recupera un fichero; no falla, solo pide actualizar la linea base.
 */
export function compareToBaseline(errors, baseline) {
  const currentIds = new Set(errors.map((e) => e.identity));
  const knownIds = new Set(baseline);
  return {
    totalErrors: errors.length,
    knownErrors: errors.filter((e) => knownIds.has(e.identity)).length,
    newErrors: errors.filter((e) => !knownIds.has(e.identity)),
    fixed: baseline.filter((id) => !currentIds.has(id)),
  };
}

/** Resumen legible: "2x TS2307, 1x TS7006". */
export function formatCodes(errors) {
  const counts = new Map();
  for (const e of errors) counts.set(e.code, (counts.get(e.code) || 0) + 1);
  return [...counts.entries()].map(([code, n]) => `${n}x ${code}`).join(', ');
}

/** Linea base tal y como se escribe en disco. Se ordena para que el diff sea legible. */
export function buildBaseline(errors) {
  return {
    $comment:
      'Errores del typecheck de _Deprecated que se aceptan a proposito. Se generan con ' +
      '`npm run typecheck:deprecated:update`. Ver el README de _Deprecated.',
    known: [...new Set(errors.map((e) => e.identity))].sort(),
  };
}

/**
 * Lanza tsc contra el proyecto de _Deprecated y devuelve su salida.
 *
 * Se invoca el binario de TypeScript con el propio node en vez de `npx tsc`:
 * `npx.cmd` con shell:true dispara DEP0190, y sin shell da EINVAL en Windows.
 * Los argumentos son fijos, nunca vienen de la entrada del usuario.
 */
export function runTsc() {
  let tscBin;
  try {
    tscBin = requireFromHere.resolve('typescript/bin/tsc');
  } catch {
    return { spawnError: 'no encuentro typescript; ejecuta `npm install` en web/' };
  }
  const res = spawnSync(process.execPath, [tscBin, '-p', PROJECT_CONFIG_NAME], {
    cwd: WEB_ROOT,
    encoding: 'utf8',
  });
  if (res.error) return { spawnError: `no se pudo lanzar tsc: ${res.error.message}` };
  if (res.status === null) return { spawnError: `tsc termino por senal ${res.signal}` };
  return { status: res.status, output: `${res.stdout || ''}${res.stderr || ''}` };
}

function readBaseline() {
  if (!existsSync(BASELINE_PATH)) return { known: [] };
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch (err) {
    throw new Error(`la linea base ${relative(WEB_ROOT, BASELINE_PATH)} no es JSON valido: ${err.message}`);
  }
}

function main(argv) {
  const UPDATE = argv.includes('--update');
  const AS_JSON = argv.includes('--json');

  const projectConfig = join(WEB_ROOT, PROJECT_CONFIG_NAME);
  if (!existsSync(projectConfig)) {
    console.error(`${PREFIX} falta ${PROJECT_CONFIG_NAME}`);
    return 2;
  }

  const missing = EXPECTED_TARGETS.filter((dir) => !existsSync(join(WEB_ROOT, dir)));
  if (missing.length > 0) {
    console.error(`${PREFIX} faltan carpetas que deberian revisarse: ${missing.join(', ')}`);
    return 2;
  }

  const tsc = runTsc();
  if (tsc.spawnError) {
    console.error(`${PREFIX} ${tsc.spawnError}`);
    return 2;
  }

  const errors = parseErrors(tsc.output);
  const { kept: relevant, suppressed } = suppressCascadeNoise(errors);

  // tsc sale con 2 tanto si hay errores de codigo como si el proyecto esta roto.
  // Si no hay ni un error reconocible y aun asi fallo, algo no va bien: no se
  // puede decir "sin errores nuevos" cuando en realidad no se ha leido nada.
  if (errors.length === 0 && tsc.status !== 0) {
    console.error(`${PREFIX} tsc fallo sin emitir errores reconocibles (exit ${tsc.status}):`);
    console.error(tsc.output.trim());
    return 2;
  }

  let baseline;
  try {
    baseline = readBaseline();
  } catch (err) {
    console.error(`${PREFIX} ${err.message}`);
    return 2;
  }
  if (!Array.isArray(baseline.known)) {
    console.error(`${PREFIX} la linea base debe tener una lista "known"`);
    return 2;
  }

  const result = compareToBaseline(relevant, baseline.known);

  if (UPDATE) {
    const payload = buildBaseline(relevant);
    writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`${PREFIX} linea base actualizada: ${payload.known.length} errores conocidos.`);
    if (result.newErrors.length > 0) {
      console.log(`${PREFIX} ${result.newErrors.length} quedaron como aceptados.`);
    }
    if (result.fixed.length > 0) {
      console.log(`${PREFIX} ${result.fixed.length} ya no se reproducen.`);
    }
    return 0;
  }

  if (AS_JSON) {
    console.log(JSON.stringify({ ...result, suppressedCascadeNoise: suppressed.length }, null, 2));
    return result.newErrors.length > 0 ? 1 : 0;
  }

  console.log(
    `${PREFIX} ${result.totalErrors} errores relevantes, ` +
      `${result.knownErrors} ya conocidos (consecuencia de congelar el codigo), ` +
      `${result.newErrors.length} nuevos.`,
  );
  if (suppressed.length > 0) {
    console.log(
      `${PREFIX} ${suppressed.length} "implicit any" omitidos: son cascada de imports ` +
        'sin resolver y no aportan nada.',
    );
  }

  if (result.fixed.length > 0) {
    console.log(`${PREFIX} ${result.fixed.length} errores conocidos ya no se reproducen:`);
    for (const id of result.fixed) console.log(`  - ${id}`);
    console.log(`${PREFIX} ejecuta con --update para aceptar el cambio.`);
  }

  if (result.newErrors.length > 0) {
    console.log(`${PREFIX} ERRORES NUEVOS (${formatCodes(result.newErrors)}):`);
    for (const e of result.newErrors) {
      console.log(`  ${e.file}(${e.line},${e.col}): ${e.code}: ${e.message}`);
    }
    console.log(`${PREFIX} un error nuevo aqui significa que el codigo archivado`);
    console.log('  se ha tocado, o que tsc ahora lo mira con otras reglas.');
    return 1;
  }

  if (relevant.length === 0) {
    console.log(`${PREFIX} _Deprecated compila sin errores. Puedes pasar --update.`);
  } else {
    console.log(`${PREFIX} OK — sin errores nuevos.`);
  }
  return 0;
}

// Solo se ejecuta el CLI cuando el fichero se invoca directamente, no al
// importarlo desde un test.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}