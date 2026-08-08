/**
 * review_module_contracts.mjs
 *
 * Auditoría "parámetro por parámetro" más profunda: cruza los `bind` de cada
 * modules/<id>/<id>.acemm contra el contrato OMEGA_PARAM/OMEGA_PORT declarado
 * en modules/<id>/<id>.cpp.
 *
 * Uso: node scripts/review_module_contracts.mjs
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'modules');

const require = createRequire(path.join(ROOT, 'web', 'package.json'));
const yaml = require('js-yaml');

let failures = 0;
const fail = (msg) => { console.log(`  ✗ ${msg}`); failures++; };
const pass = (msg) => console.log(`  ✓ ${msg}`);

const modules = readdirSync(MODULES_DIR).filter((id) =>
  existsSync(path.join(MODULES_DIR, id, `${id}.acemm`))
).sort();

for (const id of modules) {
  console.log(`\n=== ${id} ===`);
  const acemmPath = path.join(MODULES_DIR, id, `${id}.acemm`);
  const cppPath = path.join(MODULES_DIR, id, `${id}.cpp`);
  if (!existsSync(cppPath)) {
    console.log('  (sin .cpp — módulo visual de referencia, se omite cruce de contrato)');
    continue;
  }

  const manifest = yaml.load(readFileSync(acemmPath, 'utf8'));
  const cpp = readFileSync(cppPath, 'utf8');

  // 1) Binds declarados en el acemm (únicos)
  const binds = [...new Set((manifest.ui?.controls || []).map((c) => c.bind))].sort();
  console.log(`  -- binds acemm (${binds.length}): ${binds.join(', ')}`);

  // 2) Parámetros + puertos declarados en el cpp (OMEGA_PARAM / OMEGA_PORT)
  const paramIds = [];
  const portIds = [];
  const idRe = /^[A-Za-z_][A-Za-z0-9_]*/;
  for (const line of cpp.split('\n')) {
    const t = line.trim();
    let m;
    if ((m = t.match(/^OMEGA_PARAM\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/))) paramIds.push(m[1]);
    else if ((m = t.match(/^OMEGA_PORT\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/))) portIds.push(m[1]);
    else if ((m = t.match(/^BEGIN_OMEGA_PORTS\s*\(/))) { /* marker */ }
  }
  console.log(`  -- OMEGA_PARAM (${paramIds.length}): ${paramIds.join(', ')}`);
  console.log(`  -- OMEGA_PORT  (${portIds.length}): ${portIds.join(', ')}`);

  const known = new Set([...paramIds, ...portIds]);
  for (const b of binds) {
    if (known.has(b)) pass(`bind "${b}" existe en el contrato del módulo`);
    else fail(`bind "${b}" NO existe en el contrato (OMEGA_PARAM/OMEGA_PORT) del módulo`);
  }

  // 3) Todo parámetro del contrato con representación visual (port/led/knob/...) debería tener bind
  const bindSet = new Set(binds);
  const orphanParams = paramIds.filter((p) => !bindSet.has(p));
  if (orphanParams.length) fail(`parámetros del contrato sin bind en acemm: ${orphanParams.join(', ')}`);
  else pass(`todos los OMEGA_PARAM tienen bind`);

  const orphanPorts = portIds.filter((p) => !bindSet.has(p));
  if (orphanPorts.length) fail(`puertos del contrato sin bind en acemm: ${orphanPorts.join(', ')}`);
  else pass(`todos los OMEGA_PORT tienen bind`);
}

console.log(`\n========================================`);
console.log(failures === 0 ? 'RESULTADO: CONTRATOS ALINEADOS ✓' : `RESULTADO: ${failures} INCIDENCIAS ✗`);
process.exit(failures === 0 ? 0 : 1);
