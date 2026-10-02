/**
 * Convierte el informe de Jest en anotaciones de GitHub Actions.
 *
 * =============================================================================
 * POR QUÉ ESTE SCRIPT EXISTE
 * =============================================================================
 * Los logs de un workflow de GitHub **exigen iniciar sesión** para poderolos
 * leer (ni siquiera desde la API pública: devuelve 403). Así que un job rojo
 * puede ser un misterio: se sabe que falló, pero no por qué.
 *
 * Las ANOTACIONES, en cambio, son datos abiertos. Si un paso escribe líneas
 *
 *     ::error file=...::mensaje
 *
 * aparecen en `check-runs/{id}/annotations`, que sí se puede leer sin cuenta.
 * Este script traduce el informe de Jest a ese formato, de modo que un fallo
 * de pruebas se puede diagnosticar desde una URL sin depender de que nadie
 * entre a la web de GitHub.
 *
 * Uso (el paso del workflow pone el código de salida original):
 *     npx jest ... --json --outputFile=informe.json
 *     node scripts/report_jest_failures.cjs informe.json
 *
 * Si el fichero no existe es que Jest no llegó a escribirlo (se cayó antes de
 * empezar). Entonces el script lo dice en vez de callarse: un crash global es
 * justo el caso más difícil de diagnosticar.
 */

const fs = require('node:fs');
const path = require('node:path');

const reportPath = process.argv[2] || 'jest-report.json';

function escapeData(text) {
  // Las anotaciones de GitHub son líneas `%0A`, no saltos de línea reales.
  return String(text).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

/** Primer mensaje útil de un fallo, sin volcar el snapshot entero. */
function firstLine(message) {
  const line = String(message || '').split('\n').find((l) => l.trim().length > 0) || '(sin mensaje)';
  return line.trim().slice(0, 300);
}

if (!fs.existsSync(reportPath)) {
  console.log(
    `::error title=Jest no llegó a escribir el informe::` +
      `No existe ${path.basename(reportPath)}. Suele significar que Jest se cayó antes de empezar ` +
      `(configuración, import roto o falta una dependencia). Mira las primeras líneas del log.`
  );
  process.exit(0);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
} catch (error) {
  console.log(`::error title=Informe de Jest ilegible::${escapeData(error.message)}`);
  process.exit(0);
}

const failedSuites = (report.testResults || []).filter((suite) => suite.status === 'failed');

if (failedSuites.length === 0) {
  const { numPassedTests = 0, numFailedTests = 0, numPassedTestSuites = 0, numFailedTestSuites = 0 } = report;
  console.log(`Jest: ${numPassedTestSuites} suites y ${numPassedTests} pruebas en verde, ${numFailedTests} fallos.`);
  process.exit(0);
}

console.log(`Jest: ${failedSuites.length} suite(s) en rojo.\n`);

for (const suite of failedSuites) {
  const relative = path.relative(process.cwd(), suite.name || suite.testFilePath || '?');
  const failedTests = (suite.assertionResults || []).filter((t) => t.status === 'failed');

  console.log(`\n=== ${relative} (${failedTests.length} prueba(s)) ===`);
  for (const test of failedTests) {
    const title = [...(test.ancestorTitles || []), test.title].join(' › ');
    console.log(`  ✗ ${title}`);
    for (const message of test.failureMessages || []) {
      console.log(`      ${firstLine(message)}`);
    }
  }

  // Una anotación por suite: es lo que se ve desde la API.
  const resumen = failedTests.map((t) => t.title).join(' | ') || '(la suite no llegó a ejecutar pruebas)';
  console.log(`::error file=${escapeData(relative)} title=${escapeData(relative)}::${escapeData(resumen.slice(0, 500))}`);

  // Si la suite ni siquiera pudo cargar (import roto), el mensaje vive en
  // `message`, no en las pruebas: sin esto, un crash de import no diría nada.
  if (failedTests.length === 0 && suite.message) {
    console.log(`::error title=${escapeData(relative)} no cargó::${escapeData(firstLine(suite.message))}`);
  }
}

process.exit(0);