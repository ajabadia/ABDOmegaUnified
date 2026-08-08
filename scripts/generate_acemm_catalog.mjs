/**
 * generate_acemm_catalog.mjs
 *
 * Convergencia a fuente única: genera los catálogos ACEMM a partir de los
 * manifiestos canónicos de la estantería `modules/`:
 *   - host/ui/src/Catalog/acemmCatalog.generated.ts  (GENERATED_ACEMM_CATALOG)
 *   - web/src/services/acemmCatalog.generated.ts     (GENERATED_ACEMM_CATALOG)
 *
 * El editor web y el rack consumen los MISMOS .acemm — los catálogos inline
 * de host/ui y web ya no son copias manuales: se derivan en build.
 *
 * Uso:  node scripts/generate_acemm_catalog.mjs
 *       node scripts/generate_acemm_catalog.mjs --dry-run   (no escribe, imprime diff)
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'modules');
const OUT_FILES = [
  path.join(ROOT, 'host', 'ui', 'src', 'Catalog', 'acemmCatalog.generated.ts'),
  path.join(ROOT, 'web', 'src', 'services', 'acemmCatalog.generated.ts'),
];

const DRY_RUN = process.argv.includes('--dry-run');

// js-yaml vive en web/node_modules (no hay node_modules en la raíz).
// createRequire resuelve el entry CJS (index.js) — más robusto que importar el .mjs directamente.
import { createRequire } from 'node:module';
let yaml = null;
try {
  const require = createRequire(path.join(ROOT, 'web', 'package.json'));
  yaml = require('js-yaml');
} catch {
  console.error('[generate_acemm_catalog] ERROR: js-yaml no disponible en web/node_modules. Ejecuta `npm install` en web/ primero.');
  process.exit(1);
}

/** Deriva slot/units/hp canónicos desde el rack del .acemm (paridad con RackRouter). */
function resolveRackMeta(manifest) {
  const rack = manifest?.metadata?.rack ?? manifest?.rack ?? {};
  const hp = Number(rack.hp) || 8;
  const heightMode = String(rack.height_mode || rack.units || '').toLowerCase();
  const slotRaw = String(rack.slot || '').toLowerCase();
  const isUpper = slotRaw === 'upper' || slotRaw === 'top' || heightMode === '1u' || heightMode === 'compact';
  return { hp, units: isUpper ? '1U' : '3U', slot: isUpper ? 'upper' : 'lower' };
}

/** Parsea un .acemm (YAML o JSON — js-yaml soporta ambos). */
function parseAcemm(filePath) {
  const raw = readFileSync(filePath, 'utf8');
  return yaml.load(raw);
}

/** Estructura determinista de una entrada del catálogo (mismo shape que el catálogo anterior). */
function buildEntry(moduleId, filePath) {
  const parsed = parseAcemm(filePath) || {};
  const rack = resolveRackMeta(parsed);

  // Precedencia de dimensión: ui.dimensions del .acemm > derivada de hp.
  let dimensions = parsed?.ui?.dimensions
    ? { width: Number(parsed.ui.dimensions.width) || rack.hp * 15, height: Number(parsed.ui.dimensions.height) || (rack.slot === 'upper' ? 144 : 432) }
    : { width: Math.max(rack.hp * 15, 60), height: rack.slot === 'upper' ? 144 : 432 };

  const dir = path.dirname(filePath);

  // Integridad del artefacto: hash SHA-256 + size del binario .wasm cuando existe.
  // Permite al consumidor validar el binario descargado contra el catálogo
  // (cache-busting, pinning de versiones, detección de binario corrupto).
  const wasmPath = path.join(dir, `${moduleId}.wasm`);
  const wasmBytes = existsSync(wasmPath) ? readFileSync(wasmPath) : null;
  const artifact = wasmBytes
    ? {
        sha256: createHash('sha256').update(wasmBytes).digest('hex'),
        size: wasmBytes.length,
      }
    : null;

  return {
    id: moduleId,
    name: parsed?.metadata?.name || parsed?.name || moduleId.toUpperCase(),
    description: parsed?.metadata?.description || parsed?.description || '',
    metadata: {
      name: parsed?.metadata?.name || moduleId.toUpperCase(),
      family: parsed?.metadata?.family || 'utility',
      version: parsed?.metadata?.version || '1.0.0',
      rack,
    },
    rack: { slot: rack.slot, hp: rack.hp },
    assets: {
      source: existsSync(path.join(dir, `${moduleId}.cpp`)),
      wasm: existsSync(path.join(dir, `${moduleId}.wasm`)),
    },
    artifact,
    wasmUrl: wasmBytes ? `modules/${moduleId}/${moduleId}.wasm` : null,
    manifestUrl: `modules/${moduleId}/${moduleId}.acemm`,
    // Spec declarativa de parámetros (bloque `params:` del .acemm). Passthru
    // completo — shape WAM (min/max/default/exponent/units/choices).
    params: parsed?.params || {},
    ui: {
      ...(parsed?.ui || {}),
      dimensions,
    },
  };
}

function main() {
  if (!existsSync(MODULES_DIR)) {
    console.error(`[generate_acemm_catalog] ERROR: no existe ${MODULES_DIR}`);
    process.exit(1);
  }

  const entries = {};
  for (const moduleId of readdirSync(MODULES_DIR).sort()) {
    const dir = path.join(MODULES_DIR, moduleId);
    if (!existsSync(dir)) continue;
    // Solo directorios que contienen <id>.acemm (la estantería canónica).
    const acemmPath = path.join(dir, `${moduleId}.acemm`);
    if (existsSync(acemmPath)) {
      entries[moduleId] = buildEntry(moduleId, acemmPath);
    }
  }

  const sortedEntries = Object.fromEntries(Object.keys(entries).sort().map((k) => [k, entries[k]]));
  const body = JSON.stringify(sortedEntries, null, 2);

  /** Cabecera idéntica en ambos consumidores; sólo cambia la ruta relativa que se anuncia. */
  function renderCatalog(relativePath) {
    return `/**
 * ACEMM CATALOG — GENERADO AUTOMÁTICAMENTE desde modules/ (estantería canónica).
 * NO EDITAR: regenera con \`node scripts/generate_acemm_catalog.mjs\`.
 * La fuente de la verdad de los manifiestos es modules/<id>/<id>.acemm.
 * Destino: ${relativePath}
 */
export const GENERATED_ACEMM_CATALOG: Record<string, any> = ${body};
`;
  }

  const rendered = OUT_FILES.map((outFile) => ({
    file: outFile,
    content: renderCatalog(path.relative(ROOT, outFile)),
  }));

  if (DRY_RUN) {
    let drift = false;
    for (const { file, content } of rendered) {
      const rel = path.relative(ROOT, file);
      if (existsSync(file)) {
        if (readFileSync(file, 'utf8') === content) {
          console.log(`[generate_acemm_catalog] OK — ${rel} al día.`);
        } else {
          console.log(`[generate_acemm_catalog] DRIFT DETECTADO — ${rel} difiere del commit.`);
          drift = true;
        }
      } else {
        console.log(`[generate_acemm_catalog] NO EXISTE ${rel} (falta generarlo).`);
        drift = true;
      }
    }
    if (drift) process.exit(2);
    return;
  }

  for (const { file, content } of rendered) {
    writeFileSync(file, content);
    console.log(`[generate_acemm_catalog] OK — ${Object.keys(entries).length} módulos → ${path.relative(ROOT, file)}`);
  }
}

main();
