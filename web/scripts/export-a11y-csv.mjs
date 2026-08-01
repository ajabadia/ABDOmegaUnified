/**
 * Accessibility CSV exporter.
 * Scans .tsx/.ts files for unlabeled <button> and <input> elements,
 * then writes a structured CSV report for systematic tracking.
 *
 * Usage: node scripts/export-a11y-csv.mjs
 * Output: a11y-unlabeled-report.csv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.resolve(ROOT, 'a11y-unlabeled-report.csv');

const EXCLUDE_DIRS = new Set([
  'node_modules', '.next', 'e2e', '__tests__', 'legacy',
  'playwright-report', 'test-results', '.git', 'scratch',
  'public', 'scripts',
]);

const EXCLUDE_PATTERNS = [
  /\.spec\.tsx?$/, /\.test\.tsx?$/, /\.d\.ts$/, /jest\.config/,
  /playwright\.config/, /next\.config/, /postcss\.config/, /eslint\.config/,
];

const rows = [];

/**
 * Check if an element block has aria-label or title.
 */
function hasAccessibleName(block) {
  if (/aria-label\s*=/i.test(block)) return true;
  if (/title\s*=\s*["']/i.test(block)) return true;
  if (/aria-labelledby\s*=/i.test(block)) return true;
  return false;
}

/**
 * Check if a button has visible text content.
 */
function hasTextContent(block) {
  if (/\/\s*>/.test(block.replace(/\n/g, '').trim())) return false;
  const textMatch = block.match(/>([^<]+)</);
  if (textMatch) {
    const text = textMatch[1].trim();
    if (text.length > 0 && !/^\s*$/.test(text) && !text.startsWith('{') && !text.startsWith('/*')) {
      return true;
    }
  }
  return false;
}

function escapeCsv(val) {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function appendRow(elementType, file, line, snippet, context) {
  rows.push({
    element_type: elementType,
    file: file,
    line: line,
    snippet: snippet.replace(/\n/g, '\\n').slice(0, 200),
    context: (context || '').slice(0, 120),
  });
}

function walkDir(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(ROOT, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      const dirName = path.basename(fullPath);
      if (EXCLUDE_DIRS.has(dirName) || dirName.startsWith('.')) continue;
      walkDir(fullPath);
      continue;
    }

    if (!entry.name.endsWith('.tsx') && !entry.name.endsWith('.ts')) continue;
    if (EXCLUDE_PATTERNS.some(p => p.test(relPath))) continue;

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    // ── Scan for <button> elements ──────────────────────────────────
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const btnMatch = line.match(/<([bB]utton)\b/);
      if (!btnMatch) continue;

      const isComponent = btnMatch[1] === 'Button';
      const isSelfClosing = line.includes('/>') && !line.includes('</');

      let block = line;
      if (!isSelfClosing && !line.includes('</')) {
        let j = i + 1;
        while (j < lines.length && !block.includes('>')) {
          block += '\n' + lines[j];
          j++;
        }
        if (!block.includes('/>') && !block.includes('</')) {
          while (j < lines.length && !block.includes(`</${btnMatch[1]}>`)) {
            const nextLine = lines[j];
            if (nextLine.includes(`</${btnMatch[1]}>`) || nextLine.includes('/>')) {
              block += '\n' + nextLine;
              break;
            }
            block += '\n' + nextLine;
            j++;
          }
        }
      }

      const hasName = hasAccessibleName(block);
      const hasText = !isComponent && hasTextContent(block);

      if (!hasName && !hasText) {
        // Try to extract a contextual label from nearby lines
        let context = '';
        for (let k = Math.max(0, i - 3); k < i; k++) {
          const cl = lines[k].trim();
          if (cl && !cl.startsWith('//') && !cl.startsWith('/*') && !cl.startsWith('*')) {
            context += cl + ' ';
          }
        }
        appendRow('button', relPath, i + 1, block.trim(), context.trim());
      }
    }

    // ── Scan for <input> elements ───────────────────────────────────
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const inputMatch = line.match(/<input\b/);
      if (!inputMatch) continue;

      let block = line;
      if (!line.includes('>') && !line.includes('/>')) {
        let j = i + 1;
        while (j < lines.length && !block.includes('>')) {
          block += '\n' + lines[j];
          j++;
        }
      }

      const hasName = hasAccessibleName(block);
      const isHidden = /type\s*=\s*["']hidden["']/i.test(block);

      if (hasName || isHidden) continue;

      // Check for adjacent <label>
      const hasLabelBefore = i > 0 && /<label\b/.test(lines[i - 1]);
      const hasLabelAfter = i + 1 < lines.length && /<label\b/.test(lines[i + 1]);
      if (hasLabelBefore || hasLabelAfter) continue;

      // Try to extract input type for better context
      const typeMatch = block.match(/type\s*=\s*["']([^"']+)["']/i);
      const inputType = typeMatch ? typeMatch[1] : 'text';

      let context = '';
      for (let k = Math.max(0, i - 3); k < i; k++) {
        const cl = lines[k].trim();
        if (cl && !cl.startsWith('//') && !cl.startsWith('/*') && !cl.startsWith('*')) {
          context += cl + ' ';
        }
      }

      appendRow(`input[type="${inputType}"]`, relPath, i + 1, block.trim(), context.trim());
    }
  }
}

// ── Run ────────────────────────────────────────────────────────────────
console.log('Scanning project for unlabeled elements...');
walkDir(ROOT);

// ── Write CSV ──────────────────────────────────────────────────────────
const header = 'element_type,file,line,snippet,context';
const csvLines = [header];

for (const r of rows) {
  csvLines.push(`${escapeCsv(r.element_type)},${escapeCsv(r.file)},${r.line},${escapeCsv(r.snippet)},${escapeCsv(r.context)}`);
}

fs.writeFileSync(OUTPUT, csvLines.join('\n') + '\n', 'utf-8');

console.log(`\n📍 Report written to: ${OUTPUT}`);
console.log(`   Total unlabeled elements: ${rows.length}`);
console.log(`   • Buttons: ${rows.filter(r => r.element_type === 'button').length}`);
console.log(`   • Inputs:  ${rows.filter(r => r.element_type !== 'button').length}`);
console.log(`\nOpen in Excel/Google Sheets: add a filter and sort by file or element_type.`);
