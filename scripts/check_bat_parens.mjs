/**
 * Diagnostic scanner: scans .bat files for the build_wasm.bat paren bug and the
 * `::`-inside-block footgun.
 *
 * Bug 1 (paren, #714): an unescaped ')' inside a multi-line `if (...)`/
 * `for ... do (...)`/`else (` block closes the block early; trailing text on the
 * same line then breaks cmd.exe ("No se esperaba X en este momento").
 *
 * Bug 2 (colond comment, #717): a `::` comment line INSIDE a multi-line block is
 * a documented footgun (interaction with `goto`/label re-parsing by cmd.exe). The
 * canonical safe form inside blocks is `REM`. Top-level `::` section headers are
 * safe and NOT flagged; single-colon labels (`:label`) are also safe.
 *
 * The scanner simulates cmd.exe's paren balancing:
 *  - `%...%` variable regions do NOT contribute parens (cmd.exe skips them)
 *  - `^x` escapes the next char (so ^( and ^) are inert)
 *  - a '(' pushes the line number; a ')' pops it
 *  - a ')' inside a block opened on a PREVIOUS line and followed by
 *    non-whitespace content (other than the legitimate `) else (` / `) do (`
 *    continuations) is the bug signature
 *  - a '::' line while the paren stack holds an open paren from a PREVIOUS
 *    line is the #717 footgun (use REM instead)
 *
 * Usage: node scripts/check_bat_parens.mjs [file...]  (defaults to all project .bat)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

function collectBats(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'JUCE' || entry === 'build' || entry === '.next' || entry === '.git' || entry === 'CMake' || entry === '_bat_test') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) collectBats(full, out);
    else if (full.toLowerCase().endsWith('.bat')) out.push(full);
  }
  return out;
}

function scan(file) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  const issues = [];
  const stack = []; // line numbers of open parens
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;
    // #717: '::' comment inside a multi-line block -> footgun, use REM.
    // Top-level '::' (stack has no open paren from a previous line) is a safe
    // section header. Single-colon labels (':label') are also safe.
    if (line.startsWith('::')) {
      const insideMultiLineBlock = stack.some((l) => l < i + 1);
      if (insideMultiLineBlock) {
        issues.push(`L${i + 1}: '::' comment inside multi-line block - use REM (#717) -> ${raw.trim()}`);
      }
      continue;
    }
    if (/^REM\b/i.test(line)) continue;
    // strip %...% regions (parens inside variable refs are inert in cmd.exe)
    const s = line.replace(/%.*?%/g, '').replace(/\^./g, '');
    for (let idx = 0; idx < s.length; idx++) {
      const ch = s[idx];
      if (ch === '(') { stack.push(i + 1); continue; }
      if (ch === ')') {
        if (stack.length === 0) {
          issues.push(`L${i + 1}: EXCESS ')' (no open paren) -> ${raw.trim()}`);
          continue;
        }
        // Empirically, ANY unescaped ')' inside a multi-line block is dangerous:
        // cmd.exe treats it as the block terminator and chokes on trailing text
        // (build_wasm.bat's (emsdk). bug). Same-line balanced pairs at top level
        // (stack only holds current-line opens) are safe.
        const insideMultiLineBlock = stack.some((l) => l < i + 1);
        stack.pop();
        if (insideMultiLineBlock) {
          const after = s.slice(idx + 1).trim();
          // `) else (` reopens a block and `) do (` closes a FOR set `in (...)` —
          // both are legitimate syntax, not the bug. Any OTHER trailing content
          // (e.g. `(emsdk).`) is the build_wasm.bat signature.
          if (after && !/^(?:do\b|else\b)/i.test(after)) {
            issues.push(`L${i + 1}: unescaped ')' inside multi-line block (trailing "${after}") -> ${raw.trim()}`);
          }
        }
        continue;
      }
    }
  }
  if (stack.length > 0) {
    issues.push(`UNCLOSED '(' opened at line(s): ${[...new Set(stack)].join(', ')}`);
  }
  return issues;
}

const files = process.argv.slice(2).length ? process.argv.slice(2) : collectBats(ROOT).filter((f) => !/Squish/.test(f));

let totalIssues = 0;
for (const f of files) {
  const rel = path.relative(ROOT, f);
  const issues = scan(f);
  if (issues.length) {
    totalIssues += issues.length;
    console.log(`--- ${rel} ---`);
    issues.forEach((i) => console.log(`  ${i}`));
  }
}
console.log(`\nScanned ${files.length} files. Issues: ${totalIssues}`);
process.exit(totalIssues ? 1 : 0);
