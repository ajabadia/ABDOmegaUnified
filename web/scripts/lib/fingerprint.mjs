/**
 * Structural fingerprinting for OMEGA documentation drift detection.
 *
 * Generates a lightweight signature of a file's public API surface.
 * Used by both document-codebase.mjs (to inject @fingerprint) and
 * audit-docs.mjs (to compare and detect drift).
 *
 * The fingerprint captures:
 *   - Number of export declarations (public API surface)
 *   - Number of import statements (external dependencies)
 *   - A DJB2 hash of the structurally normalized code
 *
 * Returns a string like: "exports:4,imports:12,sig:a1b2c3"
 */
export function calculateFingerprint(content) {
  // Strip the existing JSDoc header to avoid self-reference
  const clean = content.replace(/\/\*\*[\s\S]*?\*\/\s*/, '');

  // Count export declarations
  const exportCount = (
    clean.match(
      /\bexport\s+(default\s+)?(function|const|class|interface|type|enum|async\s+function|default\s+function)\b/g,
    ) || []
  ).length;

  // Count top-level import statements
  const importCount = (clean.match(/^import\s/gm) || []).length;

  // Normalize code for hashing:
  //   - Remove line comments
  //   - Collapse whitespace
  //   - Normalize string literals (so label/text changes don't trigger drift)
  const normalized = clean
    .replace(/\/\/.*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/['"`][^'"`]*['"`]/g, '"s"')
    .trim();

  // DJB2 hash of the normalized content (first 8000 chars for performance)
  let hash = 5381;
  const maxChars = Math.min(normalized.length, 8000);
  for (let i = 0; i < maxChars; i++) {
    hash = ((hash << 5) + hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  const hashStr = (hash >>> 0).toString(36).padStart(6, '0');

  return `exports:${exportCount},imports:${importCount},sig:${hashStr}`;
}
