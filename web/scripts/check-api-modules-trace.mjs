/**
 * Puerta del PESO de la lambda `api/modules`, medida sobre la traza que Turbopack
 * escribe en el build. Corre DESPUÉS de `npm run build` (ver `.github/workflows/ci.yml`).
 *
 * =============================================================================
 * POR QUÉ ESTE SCRIPT Y NO SOLO EL AVISO DEL BUILD
 * =============================================================================
 * El aviso "the whole project was traced unintentionally" es cualitativo: dice que
 * pasó algo, no cuánto. El dato que decide si el despliegue sale es el tamaño, y el
 * límite de Vercel es 250 MB por función sin comprimir. Este script mide los bytes
 * reales de `.next/server/app/api/modules/route.js.nft.json` y falla si se pasan.
 *
 * MEDIDO el 4 de octubre de 2026, Next 16.2.4, este repo:
 *   - `app/api/modules`: 3827 ficheros, 294.07 MB  → la lambda de 264.38 MB que
 *     Vercel rechazaba, con `exports/` (105.81 MB), `src/` (62.96), `public/`
 *     (53.21), `docs/` (48.52) y `wasm-runtime/` (19.68) arrastrados desde fuera
 *     de la raíz de Next.
 *   - `app/api/audio`, su comparable más próximo: 113 ficheros, 26.74 MB.
 *
 * El presupuesto por debajo no es 250 sino 200 MB. 250 es el número donde Vercel
 * dice que no; 200 deja margen para que una subida de assets no vuelva a tumbar el
 * despliegue sin que se note. Es un límite deliberadamente más estricto que el de
 * Vercel, no una medida de lo que hoy pesa.
 */

import fs from 'node:fs';
import path from 'node:path';

/** Presupuesto de la lambda, en bytes. Vercel corta a 250 MB; aquí se corta antes. */
export const MAX_TRACE_BYTES = 200 * 1024 * 1024;

/** Cuántos ficheros fuera de la raíz de Next toleramos colarse en la traza. */
export const MAX_FOREIGN_FILES = 50;

const TRACE_RELATIVE_PATH = path.join('server', 'app', 'api', 'modules', 'route.js.nft.json');

/**
 * Suma los bytes de los ficheros de una traza de NFT.
 *
 * `nftPath` es la ruta del `.nft.json`, y sus entradas son relativas a SU MISMO
 * directorio, no a la raíz del proyecto.
 *
 * @param {{ files: string[] }} trace
 * @param {string} nftPath ruta absoluta del .nft.json, para resolver las relativas
 * @param {string} projectRoot raíz contra la que se decide qué fichero es "foráneo"
 * @returns {{ totalBytes: number, totalFiles: number, foreignFiles: number, missing: number }}
 */
export function measureTrace(trace, nftPath, projectRoot) {
  const baseDir = path.dirname(nftPath);
  let totalBytes = 0;
  let foreignFiles = 0;
  let missing = 0;

  for (const entry of trace.files) {
    const absolute = path.resolve(baseDir, entry);
    const relative = path.relative(projectRoot, absolute);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      foreignFiles += 1;
    }
    try {
      totalBytes += fs.statSync(absolute).size;
    } catch {
      // Una traza puede nombrar ficheros que no existen en este disco (p.ej. los
      // .wasm que el runner no compila). No son bytes de la lambda de este build,
      // así que se cuentan aparte y no se silencian.
      missing += 1;
    }
  }

  return { totalBytes, totalFiles: trace.files.length, foreignFiles, missing };
}

/**
 * Decide si una traza cabe en el presupuesto. Devuelve los motivos en vez de
 * lanzar, para que el llamante decida cómo presentarlos.
 *
 * @param {{ totalBytes: number, foreignFiles: number }} measured
 * @returns {string[]} problemas encontrados; vacío significa que pasa
 */
export function checkBudget(measured) {
  const problems = [];
  if (measured.totalBytes > MAX_TRACE_BYTES) {
    problems.push(
      `la lambda api/modules traza ${formatMb(measured.totalBytes)}, por encima del presupuesto de ${formatMb(
        MAX_TRACE_BYTES
      )} (Vercel corta a 250 MB). Suele significar que Turbopack volvió a trazar el repo entero.`,
    );
  }
  if (measured.foreignFiles > MAX_FOREIGN_FILES) {
    problems.push(
      `la traza incluye ${measured.foreignFiles} ficheros de fuera de la raíz de Next (tolerados: ${MAX_FOREIGN_FILES}). ` +
        `Salen de que route.ts resuelva una ruta con ".." y Turbopack la siga.`,
    );
  }
  return problems;
}

export function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Lee la traza de `api/modules`. Devuelve `null` si el build no está hecho. */
export function readApiModulesTrace(distDir) {
  const nftPath = path.join(distDir, TRACE_RELATIVE_PATH);
  if (!fs.existsSync(nftPath)) return null;
  return { nftPath, trace: JSON.parse(fs.readFileSync(nftPath, 'utf8')) };
}

// Ejecución directa: `node scripts/check-api-modules-trace.mjs`
if (process.argv[1] && path.resolve(process.argv[1]).endsWith('check-api-modules-trace.mjs')) {
  const distDir = path.resolve(process.argv[2] ?? '.next');
  const found = readApiModulesTrace(distDir);
  if (!found) {
    console.error(`No hay traza en ${distDir}: compila antes con \`npm run build\`.`);
    process.exit(1);
  }
  const measured = measureTrace(found.trace, found.nftPath, process.cwd());
  console.log(
    `api/modules: ${measured.totalFiles} ficheros, ${formatMb(measured.totalBytes)}, ` +
      `${measured.foreignFiles} de fuera de la raíz, ${measured.missing} ausentes en disco.`,
  );
  const problems = checkBudget(measured);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`ERROR: ${problem}`);
    process.exit(1);
  }
  console.log(`Dentro del presupuesto de ${formatMb(MAX_TRACE_BYTES)}.`);
}
