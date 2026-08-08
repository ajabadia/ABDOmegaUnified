#!/usr/bin/env node
/**
 * OMEGA — Guard de defaults canónicos (CLI lint)
 *
 * Escanea los archivos fuente buscando literales canónicos reintroducidos
 * fuera de sus constantes DEFAULT_* (fuente única: omega-ui-core). Es la
 * MISMA regla que ejecutan los pipelines de tests — jest de web
 * (`resolvedRenderOptions.typeContract.spec.ts`) y vitest de host/ui
 * (`tests/canonicalDefaults.test.ts`) — para cubrir también los builds que
 * no corren tests (invocado desde `build_auto.bat` como paso fail-fast).
 *
 * Reglas y listas de archivos: ÚNICA fuente de verdad en
 * `web/src/omega-ui-core/types/__tests__/canonicalDefaults.config.json`.
 *
 * Exit codes:
 *   0 = limpio
 *   1 = violaciones detectadas (literales canónicos fuera de su DEFAULT_*)
 *   2 = error de config/IO (config ausente, archivo listado que no existe)
 *
 * Uso:  node scripts/check_canonical_defaults.mjs
 *       (agnóstico de cwd — resuelve la raíz del repo desde su propia ruta)
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = join(
  REPO_ROOT,
  'web/src/omega-ui-core/types/__tests__/canonicalDefaults.config.json',
);

/** Elimina comentarios preservando el número de líneas (reportes L<n> fiables). */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => '\n'.repeat(m.split('\n').length - 1))
    .replace(/\/\/.*$/gm, '');
}

/** Compila las especificaciones del config JSON a RegExp ejecutables. */
function compileRules(specs) {
  return specs.map((s) => ({
    literal: new RegExp(s.literal),
    constantDecl: s.constantDecl ? new RegExp(s.constantDecl) : undefined,
    label: s.label,
  }));
}

/** Escanea un archivo (ruta relativa al repo) y devuelve las violaciones. */
function scanFile(relPath, rules) {
  const abs = join(REPO_ROOT, relPath);
  if (!existsSync(abs)) {
    throw new Error(`Archivo listado en el config no existe: ${relPath}`);
  }
  const codeOnly = stripComments(readFileSync(abs, 'utf8'));
  const violations = [];
  codeOnly.split(/\r?\n/).forEach((line, i) => {
    for (const { literal, constantDecl, label } of rules) {
      if (literal.test(line) && !(constantDecl && constantDecl.test(line))) {
        violations.push(`  L${i + 1}: ${line.trim()}  <- ${label} (usar la constante DEFAULT_*)`);
      }
    }
  });
  return violations;
}

let config;
try {
  config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
} catch (err) {
  console.error(`[check_canonical_defaults] ERROR: no se pudo leer el config compartido\n  ${CONFIG_PATH}\n  ${err.message}`);
  process.exit(2);
}

const coreRules = compileRules(config.coreRules);
const consumerRules = compileRules(config.consumerRules);

let failed = false;
let checked = 0;

function reportGroup(title, files, rules) {
  for (const f of files) {
    checked += 1;
    let violations;
    try {
      violations = scanFile(f.path, rules);
    } catch (err) {
      console.error(`[check_canonical_defaults] ERROR: ${err.message}`);
      process.exit(2);
    }
    if (violations.length > 0) {
      failed = true;
      console.error(`\n[VIOLACIÓN] ${title} — ${f.name} (${f.path})`);
      for (const v of violations) console.error(v);
    }
  }
}

console.log('[check_canonical_defaults] Escaneando literales canónicos (config: canonicalDefaults.config.json)...');
reportGroup('core (omega-ui-core)', config.coreFiles, coreRules);
reportGroup('consumidores', [...config.consumerFiles.web, ...config.consumerFiles.host], consumerRules);

if (failed) {
  console.error(`\n[check_canonical_defaults] FAIL — ${checked} archivos escaneados, literales canónicos fuera de DEFAULT_*. Abortando.`);
  process.exit(1);
}
console.log(`[check_canonical_defaults] OK — ${checked} archivos escaneados, sin literales canónicos fuera de DEFAULT_*.`);
process.exit(0);
