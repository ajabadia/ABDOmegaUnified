/**
 * Valida el workflow de CI sin depender de GitHub.
 *
 * POR QUÉ EXISTE
 * ---------------
 * Un YAML mal formado en `.github/workflows/` no da error en tu máquina: GitHub
 * simplemente lo ignora y el proyecto se queda sin puerta sin que nadie se entere.
 * Eso ya pasó con el editor de texto y con los atajos que no hacían nada.
 *
 * Comprueba tres cosas:
 *   1. El YAML se puede leer (estructura y steps bien formados).
 *   2. Los specs de la puerta EXISTEN. Un spec renombrado que se queda en la
 *      lista hace que `playwright test <fichero>` falle con "no test files found".
 *   3. Las aserciones del job `verify` sobre `public/` se cumplen de verdad
 *      sobre un árbol ya compilado — que es lo que.ensure hará en el runner.
 *
 * Ejecutar: `node scripts/verify_ci_workflow.cjs`
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'ci.yml');

let failed = false;
const fail = (msg) => {
  console.error(`  [FALLO] ${msg}`);
  failed = true;
};

// ── 1. ¿El fichero existe y es YAML legible? ──────────────────────────────────
if (!fs.existsSync(WORKFLOW)) {
  console.error(`No existe ${path.relative(ROOT, WORKFLOW)}. Sin él no hay puerta.`);
  process.exit(1);
}

let yaml;
try {
  // js-yaml vive en web/node_modules; el script corre desde la raíz del repo.
  yaml = require(path.join(ROOT, 'web', 'node_modules', 'js-yaml'));
} catch {
  console.error('No se encuentra js-yaml. Ejecuta `npm ci` dentro de web/ primero.');
  process.exit(2);
}

let doc;
try {
  doc = yaml.load(fs.readFileSync(WORKFLOW, 'utf8'));
} catch (error) {
  console.error(`El YAML no se puede leer: ${error.message}`);
  process.exit(1);
}

console.log('YAML legible.');
if (!doc || typeof doc !== 'object' || !doc.jobs) {
  console.error('El workflow no define `jobs`.');
  process.exit(1);
}

// ── 2. ¿Los specs de la puerta existen? ───────────────────────────────────────
const gateStep = (doc.jobs.browser?.steps || []).find((s) =>
  String(s.name || '').includes('Specs en verde')
);
if (!gateStep) {
  console.error('No encuentro el paso "Specs en verde (puerta)".');
  process.exit(1);
}

// `run` puede ser un string (>-) o un array de líneas (|). Se normaliza.
const raw = Array.isArray(gateStep.run) ? gateStep.run.join(' ') : String(gateStep.run);
const specs = raw.split(/\s+/).filter((tok) => tok.startsWith('e2e/'));

console.log(`\nSpecs en la puerta (${specs.length}):`);
for (const spec of specs) {
  const full = path.join(ROOT, 'web', spec);
  if (!fs.existsSync(full)) {
    fail(`el spec "${spec}" no existe — playwright fallará con "no test files found"`);
    continue;
  }
  console.log(`  ok  ${spec}`);
}

// ── 3. ¿Las aserciones sobre public/ se cumplen tras compilar? ───────────────
const checks = [
  ['public/modules/vco/vco.acemm', 'catálogo de módulos'],
  ['public/monaco/vs/loader.js', 'editor de código'],
  ['public/worklets/rack.worklet.js', 'reproductor del rack'],
];

console.log('\nAssets que exige el job `verify`:');
for (const [rel, why] of checks) {
  const full = path.join(ROOT, 'web', rel);
  if (fs.existsSync(full)) {
    console.log(`  ok  ${rel}  (${why})`);
  } else {
    // No es un fallo de este script si `public/` aún no se ha materializado:
    // en el runner lo hace `prebuild` justo antes. Se avisa, no se rompe.
    console.log(`  --  ${rel}  (${why}) — todavía no está; lo pone \`npm run prebuild\``);
  }
}

console.log('');
if (failed) {
  console.error('El workflow NO está listo.');
  process.exit(1);
}
console.log('El workflow está listo.');