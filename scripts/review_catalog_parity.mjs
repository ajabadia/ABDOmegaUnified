/**
 * review_catalog_parity.mjs
 *
 * Auditoría control-por-control: cruza cada modules/<id>/<id>.acemm contra el
 * catálogo generado (host/ui) y reporta:
 *   - controles presentes/ausentes
 *   - bind presentes/ausentes
 *   - diferencias en component / variant / pos / size / container
 *   - integridad del artefacto (sha256 real vs catálogo)
 *
 * Uso: node scripts/review_catalog_parity.mjs
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'modules');
const CATALOG_FILE = path.join(ROOT, 'host', 'ui', 'src', 'Catalog', 'acemmCatalog.generated.ts');

const require = createRequire(path.join(ROOT, 'web', 'package.json'));
const yaml = require('js-yaml');

// Carga el catálogo generado (extrae el objeto TS)
const catalogSrc = readFileSync(CATALOG_FILE, 'utf8');
const objMatch = catalogSrc.match(/= ({[\s\S]*});\s*$/);
const catalog = JSON.parse(objMatch[1]);

let failures = 0;
const fail = (msg) => { console.log(`  ✗ ${msg}`); failures++; };
const pass = (msg) => console.log(`  ✓ ${msg}`);

/** Normaliza un control del .acemm a un "fingerprint" comparable. */
function normControl(c) {
  const p = c.presentation || {};
  return {
    id: c.id ?? null,
    bind: c.bind ?? null,
    component: p.component ?? null,
    variant: p.variant ?? null,
    container: p.container ?? null,
    pos: c.pos ? { x: c.pos.x, y: c.pos.y } : null,
    size: p.size ? { w: p.size.w, h: p.size.h } : null,
  };
}

const modules = readdirSync(MODULES_DIR).filter((id) =>
  existsSync(path.join(MODULES_DIR, id, `${id}.acemm`))
).sort();

let totalControls = 0;
let checkedBindings = 0;

for (const id of modules) {
  console.log(`\n=== ${id} ===`);
  const acemmPath = path.join(MODULES_DIR, id, `${id}.acemm`);
  const manifest = yaml.load(readFileSync(acemmPath, 'utf8'));
  const entry = catalog[id];

  // 1) Entrada en catálogo
  if (!entry) { fail('no existe en el catálogo generado'); continue; }
  pass('presente en el catálogo');

  // 2) Integridad del artefacto
  const wasmPath = path.join(MODULES_DIR, id, `${id}.wasm`);
  if (existsSync(wasmPath)) {
    const buf = readFileSync(wasmPath);
    const actual = createHash('sha256').update(buf).digest('hex');
    if (!entry.artifact) { fail('catálogo sin artifact pero el .wasm existe'); }
    else {
      if (entry.artifact.sha256 === actual) pass('sha256 coincide con el binario real');
      else fail(`sha256 NO coincide (catálogo=${entry.artifact.sha256?.slice(0,12)}… real=${actual.slice(0,12)}…)`);
      if (entry.artifact.size === buf.length) pass(`size coincide (${buf.length})`);
      else fail(`size NO coincide (catálogo=${entry.artifact.size} real=${buf.length})`);
    }
    if (entry.wasmUrl === `modules/${id}/${id}.wasm`) pass(`wasmUrl correcto: ${entry.wasmUrl}`);
    else fail(`wasmUrl mal: ${entry.wasmUrl}`);
  } else {
    if (entry.artifact === null && entry.wasmUrl === null) pass('sin wasm → artifact/wasmUrl null (correcto)');
    else fail('sin wasm pero artifact/wasmUrl no null');
  }

  // 3) metadata
  const meta = manifest.metadata || {};
  const emeta = entry.metadata || {};
  if ((emeta.name ?? entry.name) === (meta.name ?? id.toUpperCase())) pass(`name: ${meta.name ?? id.toUpperCase()}`);
  else fail(`name difiere: catálogo="${emeta.name ?? entry.name}" vs acemm="${meta.name}"`);
  if (emeta.family === (meta.family || 'utility')) pass(`family: ${meta.family || 'utility'}`);
  else fail(`family difiere: catálogo="${emeta.family}" vs acemm="${meta.family}"`);
  if (emeta.version === (meta.version || '1.0.0')) pass(`version: ${meta.version || '1.0.0'}`);
  else fail(`version difiere: catálogo="${emeta.version}" vs acemm="${meta.version}"`);

  // 4) rack
  const rackA = manifest.metadata?.rack ?? manifest.rack ?? {};
  const hpA = Number(rackA.hp) || 8;
  if (entry.rack?.hp === hpA) pass(`hp: ${hpA}`);
  else fail(`hp difiere: catálogo=${entry.rack?.hp} vs acemm=${hpA}`);

  // 5) ui.dimensions
  const dimsA = manifest.ui?.dimensions;
  if (dimsA) {
    if (entry.ui?.dimensions?.width === Number(dimsA.width) && entry.ui?.dimensions?.height === Number(dimsA.height))
      pass(`dimensions: ${dimsA.width}x${dimsA.height}`);
    else fail(`dimensions difieren: catálogo=${entry.ui?.dimensions?.width}x${entry.ui?.dimensions?.height} vs acemm=${dimsA.width}x${dimsA.height}`);
  } else {
    pass(`dimensions derivadas de hp (sin ui.dimensions en acemm): ${entry.ui?.dimensions?.width}x${entry.ui?.dimensions?.height}`);
  }

  // 6) controles — control por control
  const aControls = (manifest.ui?.controls || []).map(normControl);
  const cControls = (entry.ui?.controls || [])
    .map((c) => normControl({ ...c, presentation: c.presentation }))
    .filter((c) => c.component !== null); // catálogo puede llevar controls ya enrich

  console.log(`  -- controles: ${aControls.length} en acemm / ${cControls.length} en catálogo`);
  totalControls += aControls.length;

  for (const ac of aControls) {
    const cc = cControls.find((x) => x.id === ac.id) ?? cControls.find((x) => x.bind === ac.bind);
    if (!cc) {
      fail(`control "${ac.id || ac.bind}" no encontrado en catálogo (bind=${ac.bind})`);
      continue;
    }
    checkedBindings++;
    const issues = [];
    if (cc.id && ac.id && cc.id !== ac.id) issues.push(`id ${cc.id}!=${ac.id}`);
    if (cc.component !== ac.component) issues.push(`component ${cc.component}!=${ac.component}`);
    if (ac.variant && cc.variant !== ac.variant) issues.push(`variant ${cc.variant}!=${ac.variant}`);
    if (ac.container && cc.container !== ac.container) issues.push(`container ${cc.container}!=${ac.container}`);
    if (ac.pos && cc.pos && (cc.pos.x !== ac.pos.x || cc.pos.y !== ac.pos.y)) issues.push(`pos (${cc.pos.x},${cc.pos.y})!=(${ac.pos.x},${ac.pos.y})`);
    if (ac.size && cc.size && (cc.size.w !== ac.size.w || cc.size.h !== ac.size.h)) issues.push(`size ${cc.size.w}x${cc.size.h}!=${ac.size.w}x${ac.size.h}`);
    if (issues.length) fail(`control "${ac.id || ac.bind}": ${issues.join('; ')}`);
    else pass(`control "${ac.id}" (bind=${ac.bind}, ${ac.component}${ac.variant ? '/' + ac.variant : ''}) OK`);
  }

  // 7) layout containers
  const aContainers = (manifest.ui?.layout?.containers || []).length;
  const cContainers = (entry.ui?.layout?.containers || []).length;
  if (aContainers === cContainers) pass(`containers: ${aContainers}`);
  else fail(`containers difieren: catálogo=${cContainers} vs acemm=${aContainers}`);
}

console.log(`\n========================================`);
console.log(`Módulos: ${modules.length} | Controles revisados: ${totalControls} | Binds verificados: ${checkedBindings}`);
console.log(failures === 0 ? 'RESULTADO: PARIDAD COMPLETA ✓' : `RESULTADO: ${failures} INCIDENCIAS ✗`);
process.exit(failures === 0 ? 0 : 1);
