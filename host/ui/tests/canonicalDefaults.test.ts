/**
 * Canonical Defaults DRY Guard — host/ui consumers (vitest)
 *
 * Extiende el source-scan de literales canónicos al pipeline de host/ui: los
 * consumidores del runtime que importan constantes de `panelGeometry` deben
 * usar DEFAULT_* en sus fallbacks de dimensiones — nunca literales `|| 120`,
 * `?? 420`, `: 420`, etc.
 *
 * Reglas y listas de archivos viven en la ÚNICA fuente de verdad
 * `omega-ui-core/types/__tests__/canonicalDefaults.config.json` (consumida
 * también por el guard jest de web y por el CLI `scripts/check_canonical_defaults.mjs`),
 * y la mecánica de escaneo en `canonicalDefaultsGuard.ts` — sin duplicación de
 * regex ni de listas entre pipelines.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  compileRules,
  scanFileForLiteralViolations,
} from '../omega-ui-core/types/__tests__/canonicalDefaultsGuard.js';
import type { CanonicalDefaultsConfig } from '../omega-ui-core/types/__tests__/canonicalDefaultsGuard.js';

// Ruta real del directorio del test (vitest ESM: fileURLToPath quita el
// prefijo virtual @fs que vitest inyecta en import.meta.url).
const TEST_DIR = resolve(fileURLToPath(import.meta.url), '..');
// tests → ui → host → raíz del repo (3 niveles).
const REPO_ROOT = resolve(TEST_DIR, '../../..');

const CONFIG = JSON.parse(
  readFileSync(
    resolve(REPO_ROOT, 'web/src/omega-ui-core/types/__tests__/canonicalDefaults.config.json'),
    'utf8',
  ),
) as CanonicalDefaultsConfig;

const consumerRules = compileRules(CONFIG.consumerRules);

// Consumidores de host/ui (definidos en el config JSON). `acemmCatalog.generated.ts`
// queda EXCLUIDO a propósito: es un archivo GENERADO con datos de catálogo
// (`"height": 420`, `"w": 340`) — valores, no lógica de fallback.
const CONSUMER_FILES: ReadonlyArray<[string, string]> = CONFIG.consumerFiles.host.map((f) => [
  f.name,
  resolve(REPO_ROOT, f.path),
]);

describe('Canonical defaults DRY guard — host/ui consumers', () => {
  it.each(CONSUMER_FILES)(
    '%s — sin defaults de dimensiones literales (usar DEFAULT_*)',
    (_name, file) => {
      const source = readFileSync(file, 'utf8');
      expect(scanFileForLiteralViolations(source, consumerRules)).toEqual([]);
    },
  );
});
