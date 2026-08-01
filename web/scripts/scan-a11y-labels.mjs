/**
 * Accessibility label scanner.
 * Finds <button> and <input> elements in .tsx/.ts files
 * that lack both aria-label and title attributes.
 *
 * Usage: node scripts/scan-a11y-labels.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const EXCLUDE_DIRS = new Set([
  'node_modules', '.next', 'e2e', '__tests__', 'legacy',
  'playwright-report', 'test-results', '.git', 'scratch',
  'public', 'scripts',
]);

const EXCLUDE_PATTERNS = [
  /\.spec\.tsx?$/, /\.test\.tsx?$/, /\.d\.ts$/, /jest\.config/,
  /playwright\.config/, /next\.config/, /postcss\.config/, /eslint\.config/,
];

let totalFiles = 0;
let totalButtons = 0;
let totalInputs = 0;
let unlabeledButtons = [];
let unlabeledInputs = [];

/**
 * Check if an element block (from <tag to >) has aria-label or title.
 */
export function hasAccessibleName(block) {
  // Check for aria-label (including dynamic expressions like ternaries and template literals)
  if (/aria-label\s*=/i.test(block)) return true;
  // Check for title attribute (including template literals and JSX expressions)
  if (/title\s*=/i.test(block)) return true;
  // Check for aria-labelledby
  if (/aria-labelledby\s*=/i.test(block)) return true;
  return false;
}

/**
 * Find the index of the first real `>` that closes a JSX tag,
 * properly skipping `>` inside { } expressions (e.g. arrow functions).
 * If startChar is provided, skip characters before that position on the first line.
 * Returns { lineIdx, charIdx } or null if not found.
 */
export function findClosingBrace(lines, startIdx, startChar = 0) {
  let braceDepth = 0;
  let inTemplateLiteral = false;
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    const startJ = (i === startIdx) ? startChar : 0;
    for (let j = startJ; j < line.length; j++) {
      const ch = line[j];
      // Track template literal backticks — > inside template literals
      // at braceDepth 0 is NOT a JSX tag close
      if (ch === '`') {
        inTemplateLiteral = !inTemplateLiteral;
        continue;
      }
      if (inTemplateLiteral) continue;
      if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
      else if (ch === '>' && braceDepth === 0) {
        // Skip arrow functions `=>` — the > is part of =>, not a JSX closing tag
        if (j > 0 && line[j - 1] === '=') continue;
        return { lineIdx: i, charIdx: j };
      }
    }
  }
  return null;
}

/**
 * Collect the full element block from startLine to the real closing `>`.
 * Handles multi-line JSX attributes with arrow functions.
 */
export function collectElementBlock(lines, startLine, tagPrefix = '<') {
  const firstLine = lines[startLine];
  // Find the position of the actual tag on the first line (to skip `>` from previous sibling elements like `</div>`)
  const tagStart = firstLine.indexOf(tagPrefix);
  const startChar = tagStart >= 0 ? tagStart : 0;

  // If this line already has the real closing `>`, no multi-line collection needed
  const firstCheck = findClosingBrace(lines, startLine, startChar);
  if (firstCheck && firstCheck.lineIdx === startLine) {
    return firstLine;
  }
  // Collect from startLine until real `>` is found
  let block = '';
  for (let i = startLine; i < lines.length; i++) {
    if (block) block += '\n';
    block += lines[i];
    const check = findClosingBrace(lines, i, (i === startLine) ? startChar : 0);
    // Stop if the `>` is actually on this line
    if (check && check.lineIdx === i) {
      break;
    }
  }
  return block;
}

/**
 * Check if the element has visible text content (buttons with text are OK).
 */
export function hasTextContent(block) {
  // Look for text between > and </button> or between > and < (next sibling)
  // Iterate through ALL text matches, not just the first (which is often whitespace)
  // Note: we do NOT check for self-closing (/>) here because the scanner's main loop
  // already handles self-closing buttons via `isSelfClosing`. The /> pattern can appear
  // in child elements (e.g. <Icon />) which don't mean the button lacks text.
  const textRegex = />([^<]+)</g;
  let textMatch;
  while ((textMatch = textRegex.exec(block)) !== null) {
    const text = textMatch[1].trim();
    // Ignore whitespace-only, newlines, or template expressions
    if (text.length > 0 && !/^\s*$/.test(text) && !text.startsWith('{') && !text.startsWith('/*')) {
      return true;
    }
  }
  return false;
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

    // Only .tsx and .ts files
    if (!entry.name.endsWith('.tsx') && !entry.name.endsWith('.ts')) continue;
    if (EXCLUDE_PATTERNS.some(p => p.test(relPath))) continue;

    totalFiles++;
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');

    // Find button elements
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for <button or <Button (React component)
      const btnMatch = line.match(/<([bB]utton)\b/);
      if (!btnMatch) continue;

      totalButtons++;
      const isSelfClosing = line.includes('/>') && !line.includes('</');
      const isComponent = btnMatch[1] === 'Button';

      // Collect the full element block (may span multiple lines)
      let block = collectElementBlock(lines, i, btnMatch[0]);
      // If it's not self-closing, also collect until </button> or </Button>
      if (!isSelfClosing && !block.includes('/>') && !block.includes('</')) {
        let j = i + block.split('\n').length;
        for (; j < lines.length; j++) {
          const nextLine = lines[j];
          const isClose = nextLine.includes(`</${btnMatch[1]}>`);
          block += '\n' + nextLine;
          if (isClose) break;
        }
      }

      const hasName = hasAccessibleName(block);
      const hasText = !isComponent && hasTextContent(block); // Only check text for native <button>

      if (!hasName && !hasText) {
        unlabeledButtons.push({
          file: relPath,
          line: i + 1,
          snippet: block.trim().slice(0, 150),
        });
      }
    }

    // Find input elements  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for <input (NOT <Input component — components may handle labels differently)
      const inputMatch = line.match(/<input\b/);
      if (!inputMatch) continue;

      totalInputs++;

      // Collect full element block (brace-depth aware)
      let block = collectElementBlock(lines, i, '<input');

      const hasName = hasAccessibleName(block);
      // Inputs need accessible names. Check for associated <label> nearby.
      const hasLabelBefore = i > 0 && /<label\b/.test(lines[i - 1]);
      const hasLabelAfter = i + 1 < lines.length && /<label\b/.test(lines[i + 1]);

      // Check if this input has type="hidden" (doesn't need label)
      const isHidden = /type\s*=\s*["']hidden["']/i.test(block);

      // Non-WCAG heuristic: inputs with placeholder provide visual context,
      // though placeholder is not a substitute for a proper accessible label.
      const hasPlaceholder = /placeholder\s*=/i.test(block);

      if (!hasName && !isHidden && !hasLabelBefore && !hasLabelAfter && !hasPlaceholder) {
        unlabeledInputs.push({
          file: relPath,
          line: i + 1,
          snippet: block.trim().slice(0, 150),
        });
      }
    }
  }
}

// ── Main execution (only when run directly) ─────────────────────────
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  console.log('Scanning project for accessibility issues...\n');
  walkDir(ROOT);

  console.log('═'.repeat(60));
  console.log('  ACCESSIBILITY LABEL SCAN RESULTS');
  console.log('═'.repeat(60));
  console.log(`\nFiles scanned:      ${totalFiles}`);
  console.log(`Total <button> elements: ${totalButtons}`);
  console.log(`Total <input> elements:  ${totalInputs}`);
  console.log(`\nUnlabeled <button> elements: ${unlabeledButtons.length}`);
  console.log(`Unlabeled <input> elements:  ${unlabeledInputs.length}`);

  if (unlabeledButtons.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('  BUTTONS WITHOUT ARIA-LABEL OR TITLE');
    console.log('─'.repeat(60));
    for (const btn of unlabeledButtons) {
      console.log(`\n  📁 ${btn.file}:${btn.line}`);
      console.log(`  └ ${btn.snippet.replace(/\n/g, '\\n')}`);
    }
  }

  if (unlabeledInputs.length > 0) {
    console.log('\n' + '─'.repeat(60));
    console.log('  INPUTS WITHOUT ARIA-LABEL OR TITLE');
    console.log('─'.repeat(60));
    for (const inp of unlabeledInputs) {
      console.log(`\n  📁 ${inp.file}:${inp.line}`);
      console.log(`  └ ${inp.snippet.replace(/\n/g, '\\n')}`);
    }
  }

  if (unlabeledButtons.length === 0 && unlabeledInputs.length === 0) {
    console.log('\n✅ No unlabeled buttons or inputs found!');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('  Note: Buttons with visible text content are excluded (WCAG 4.1.2).');
  console.log('  Inputs with adjacent <label> are excluded.');  
  console.log('  Inputs with placeholder are excluded (non-WCAG heuristic).');  
  console.log('  React <Button> components are flagged — check their prop API.');
  console.log('═'.repeat(60) + '\n');
}
