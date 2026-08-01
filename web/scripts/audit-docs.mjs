#!/usr/bin/env node
/**
 * OMEGA DOCUMENTATION DRIFT AUDITOR
 * Scans all source files and classifies them:
 *   - OK: File has @purpose and fingerprint matches
 *   - DRIFT: Fingerprint changed since last documentation
 *   - STALE: Has @purpose but no @fingerprint (legacy)
 *   - MISSING: No @purpose at all
 *
 * Usage: node scripts/audit-docs.mjs
 * Output: docs/drift_report.md (and console summary)
 */

import fs from 'node:fs';
import path from 'node:path';
import { calculateFingerprint } from './lib/fingerprint.mjs';

const PROJECT_ROOT = process.cwd();
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const APP_DIR = path.join(PROJECT_ROOT, 'app');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'docs');

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git' && file !== 'dist' && file !== 'docs') {
        walk(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext) &&
          !file.endsWith('.test.ts') && !file.endsWith('.test.tsx') &&
          !file.endsWith('.spec.ts') && !file.endsWith('.spec.tsx') &&
          !file.endsWith('.d.ts')) {
        fileList.push(filePath);
      }
    }
  }
  return fileList;
}

// --- Parse @purpose, @purpose_en and @fingerprint from existing JSDoc ---
function parseExistingDoc(content) {
  const purposeMatch = content.match(/@purpose\s+(.+)/);
  const purposeEnMatch = content.match(/@purpose_en\s+(.+)/);
  const fingerprintMatch = content.match(/@fingerprint\s+(.+)/);
  const lastUpdatedMatch = content.match(/@lastUpdated\s+(.+)/);

  return {
    purpose: purposeMatch ? purposeMatch[1].trim() : null,
    purposeEn: purposeEnMatch ? purposeEnMatch[1].trim() : null,
    fingerprint: fingerprintMatch ? fingerprintMatch[1].trim() : null,
    lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1].trim() : null,
  };
}

// --- Main ---
console.log('=== OMEGA DOCUMENTATION DRIFT AUDITOR ===\n');

const allFiles = [...walk(SRC_DIR), ...walk(APP_DIR)];
const relativeFiles = allFiles.map(f => path.relative(PROJECT_ROOT, f).replace(/\\/g, '/'));

const results = {
  ok: [],
  drift: [],
  stale: [],
  missing: [],
  error: [],
};

for (let i = 0; i < relativeFiles.length; i++) {
  const filePath = relativeFiles[i];
  const fullPath = allFiles[i];

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const doc = parseExistingDoc(content);
    const currentFingerprint = calculateFingerprint(content);

    if (!doc.purpose || !doc.purposeEn) {
      results.missing.push({ file: filePath, missingEs: !doc.purpose, missingEn: !doc.purposeEn });
    } else if (!doc.fingerprint) {
      results.stale.push({ file: filePath, purpose: doc.purpose, purposeEn: doc.purposeEn, lastUpdated: doc.lastUpdated });
    } else if (doc.fingerprint !== currentFingerprint) {
      results.drift.push({
        file: filePath,
        purpose: doc.purpose,
        purposeEn: doc.purposeEn,
        oldFingerprint: doc.fingerprint,
        newFingerprint: currentFingerprint,
        lastUpdated: doc.lastUpdated,
      });
    } else {
      results.ok.push({ file: filePath, purpose: doc.purpose, purposeEn: doc.purposeEn, lastUpdated: doc.lastUpdated });
    }
  } catch (err) {
    results.error.push({ file: filePath, error: err.message });
  }
}

// --- Console summary ---
const total = relativeFiles.length;
console.log(`Total files scanned: ${total}`);
console.log(`  [OK]      Up to date:      ${results.ok.length}`);
console.log(`  [DRIFT]   Changed:         ${results.drift.length}`);
console.log(`  [STALE]   No fingerprint:  ${results.stale.length}`);
console.log(`  [MISSING] No ES or EN:     ${results.missing.length}`);
if (results.error.length > 0) {
  console.log(`  [ERROR]   Read errors:     ${results.error.length}`);
}
console.log('');

// --- Generate markdown report ---
const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
let report = `# OMEGA Documentation Drift Report\n\n`;
report += `**Generated:** ${timestamp}\n`;
report += `**Files scanned:** ${total}\n\n`;

report += `## Summary\n\n`;
report += `| Status | Count |\n`;
report += `|--------|-------|\n`;
report += `| OK (Up to date) | ${results.ok.length} |\n`;
report += `| DRIFT (Fingerprint changed) | ${results.drift.length} |\n`;
report += `| STALE (No fingerprint baseline) | ${results.stale.length} |\n`;
report += `| MISSING (No Spanish/English) | ${results.missing.length} |\n`;
if (results.error.length > 0) {
  report += `| ERROR (Read failed) | ${results.error.length} |\n`;
}
report += `\n---\n\n`;

// --- DRIFT section ---
if (results.drift.length > 0) {
  report += `## DRIFT - Files with changed fingerprint\n\n`;
  report += `These files have been modified since they were last documented. The @purpose may need updating.\n\n`;
  report += `| File | Old Fingerprint | New Fingerprint | Last Updated |\n`;
  report += `|------|----------------|-----------------|--------------|\n`;
  for (const d of results.drift) {
    report += `| \`${d.file}\` | \`${d.oldFingerprint}\` | \`${d.newFingerprint}\` | ${d.lastUpdated || 'N/A'} |\n`;
  }
  report += `\n---\n\n`;
}

// --- STALE section ---
if (results.stale.length > 0) {
  report += `## STALE - Documented but missing fingerprint\n\n`;
  report += `These files have a @purpose tag but were documented before fingerprinting was implemented.\n`;
  report += `Re-run document-codebase.mjs to add fingerprints.\n\n`;
  report += `| File | @purpose | Last Updated |\n`;
  report += `|------|----------|--------------|\n`;
  for (const s of results.stale) {
    const purposeShort = s.purpose.length > 80 ? s.purpose.slice(0, 80) + '...' : s.purpose;
    report += `| \`${s.file}\` | ${purposeShort} | ${s.lastUpdated || 'N/A'} |\n`;
  }
  report += `\n---\n\n`;
}

// --- MISSING section ---
if (results.missing.length > 0) {
  report += `## MISSING - Files without Spanish (@purpose) or English (@purpose_en)\n\n`;
  report += `These files have no documentation or are missing a translation. Run document-codebase.mjs to document them.\n\n`;
  for (const m of results.missing) {
    const missingLangs = [];
    if (m.missingEs) missingLangs.push('Spanish');
    if (m.missingEn) missingLangs.push('English');
    report += `- \`${m.file}\` (missing: ${missingLangs.join(', ')})\n`;
  }
  report += `\n---\n\n`;
}

// --- ERROR section ---
if (results.error.length > 0) {
  report += `## ERRORS - Files that could not be read\n\n`;
  for (const e of results.error) {
    report += `- \`${e.file}\`: ${e.error}\n`;
  }
  report += `\n---\n\n`;
}

// --- OK section (summary only) ---
report += `## OK - Files with matching fingerprint (${results.ok.length})\n\n`;
report += `These files are up to date. No action needed.\n\n`;
report += `<details>\n<summary>Show list</summary>\n\n`;
for (const o of results.ok) {
  const purposeShort = o.purpose.length > 80 ? o.purpose.slice(0, 80) + '...' : o.purpose;
  report += `- \`${o.file}\` — ${purposeShort}\n`;
}
report += `\n</details>\n`;

// --- Write report ---
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
const reportPath = path.join(OUTPUT_DIR, 'drift_report.md');
fs.writeFileSync(reportPath, report, 'utf8');

console.log(`Report generated: ${reportPath}`);
console.log('Done.');
