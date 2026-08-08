/**
 * check_manifest_parity.mjs — Guard de convergencia de manifiestos (fuente única).
 *
 * Verifica que la estantería canónica `modules/` es la ÚNICA fuente de los
 * manifiestos .acemm:
 *   1. web/public/modules      → debe ser junction NTFS a modules/ (no copia)
 *   2. host/Resources/modules  → debe ser junction NTFS a modules/ (no copia)
 *   3. ACEMM_CATALOG generado   → debe estar al día con modules/ (dry-run del generador)
 *
 * Uso:  node scripts/check_manifest_parity.mjs
 * Exit 0 = OK · 1 = error de junction · 2 = catálogo desincronizado
 */
import { readdirSync, existsSync, readlinkSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'modules');

const JUNCTIONS = [
  { name: 'web/public/modules', expected: MODULES_DIR },
  { name: 'host/Resources/modules', expected: MODULES_DIR },
];

let failures = 0;

function fail(msg) {
  console.error(`[check_manifest_parity] FAIL: ${msg}`);
  failures++;
}

console.log('[check_manifest_parity] Verificando convergencia de manifiestos (fuente única: modules/)...');

// 1) Junctions
for (const j of JUNCTIONS) {
  const full = path.join(ROOT, j.name);
  if (!existsSync(full)) {
    fail(`${j.name} NO existe (falta junction a modules/)`);
    continue;
  }
  try {
    const target = readlinkSync(full);
    if (path.resolve(target) !== path.resolve(j.expected)) {
      fail(`${j.name} apunta a ${target} (esperado: ${j.expected})`);
    } else {
      console.log(`  OK ${j.name} -> junction a modules/`);
    }
  } catch (e) {
    // No es symlink/junction: es una copia real → drift inminente
    const st = statSync(full);
    if (st.isDirectory()) {
      fail(`${j.name} es un DIRECTORIO REAL (copia), no una junction — reemplazar por junction a modules/`);
    } else {
      fail(`${j.name} no es junction: ${e.message}`);
    }
  }
}

// 2) Estantería canónica presente
if (!existsSync(MODULES_DIR)) {
  fail(`no existe la estantería canónica ${MODULES_DIR}`);
} else {
  const count = readdirSync(MODULES_DIR).filter((d) => existsSync(path.join(MODULES_DIR, d, `${d}.acemm`))).length;
  console.log(`  OK estantería canónica: ${count} módulos con .acemm`);
}

// 3) Catálogo generado al día
const gen = path.join(ROOT, 'scripts', 'generate_acemm_catalog.mjs');
const dry = spawnSync('node', [gen, '--dry-run'], { cwd: ROOT, encoding: 'utf8' });
if (dry.status !== 0) {
  fail(`ACEMM_CATALOG desincronizado (generador exit ${dry.status}): ${(dry.stdout + dry.stderr).trim()}`);
} else {
  console.log('  OK ACEMM_CATALOG generado al día con modules/');
}

if (failures > 0) {
  console.error(`[check_manifest_parity] ${failures} problema(s) detectado(s).`);
  process.exit(1);
}
console.log('[check_manifest_parity] OK — convergencia a fuente única verificada.');
