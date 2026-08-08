/* =================================================================
   OMEGA UI CORE - CANONICAL SOURCE (ABDOmegaUnified)
   GUARD DRY COMPARTIDO — escanea archivos fuente buscando literales
   canónicos reintroducidos fuera de sus constantes DEFAULT_*.
   Framework-agnóstico (sin imports de jest/vitest) y SIN IO: las
   REGLAS y LISTAS DE ARCHIVOS viven en `canonicalDefaults.config.json`
   (única fuente de verdad), que cada consumidor lee con su propio
   mecanismo de ruta — jest de web, vitest de host/ui y el CLI de lint
   `scripts/check_canonical_defaults.mjs`.
   ================================================================= */

/** Regla compilada: regex lista para ejecutar. */
export interface CanonicalLiteralRule {
  literal: RegExp;
  /** Opcional: patrón de la declaración `const DEFAULT_*` que exime el literal (solo archivos core). */
  constantDecl?: RegExp;
  label: string;
}

/** Especificación de regla tal como vive en el config JSON (regex en forma de string). */
export interface RuleSpec {
  literal: string;
  constantDecl?: string;
  label: string;
}

/** Estructura del config JSON compartido (canonicalDefaults.config.json). */
export interface CanonicalDefaultsConfig {
  coreFiles: Array<{ name: string; path: string }>;
  coreRules: RuleSpec[];
  consumerFiles: {
    web: Array<{ name: string; path: string }>;
    host: Array<{ name: string; path: string }>;
  };
  consumerRules: RuleSpec[];
}

/** Compila las especificaciones del config JSON a reglas ejecutables. */
export function compileRules(specs: ReadonlyArray<RuleSpec>): CanonicalLiteralRule[] {
  return specs.map((s) => ({
    literal: new RegExp(s.literal),
    // Spread condicional: con exactOptionalPropertyTypes, asignar `undefined`
    // explícito a la propiedad opcional es un error — solo se incluye si existe.
    ...(s.constantDecl ? { constantDecl: new RegExp(s.constantDecl) } : {}),
    label: s.label,
  }));
}

/** Elimina comentarios preservando el número de líneas (los reportes L<n> siguen apuntando al archivo real). */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => '\n'.repeat(m.split('\n').length - 1))
    .replace(/\/\/.*$/gm, '');
}

/** Escanea un archivo y devuelve las violaciones (L<n> + fragmento). Array vacío = limpio. */
export function scanFileForLiteralViolations(
  source: string,
  rules: ReadonlyArray<CanonicalLiteralRule>,
): string[] {
  const codeOnly = stripComments(source);
  const violations: string[] = [];
  codeOnly.split(/\r?\n/).forEach((line, i) => {
    for (const { literal, constantDecl, label } of rules) {
      if (literal.test(line) && !(constantDecl && constantDecl.test(line))) {
        violations.push(`  L${i + 1}: ${line.trim()}  ← ${label} (usar la constante DEFAULT_*)`);
      }
    }
  });
  return violations;
}
