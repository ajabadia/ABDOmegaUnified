#!/usr/bin/env node
/**
 * OMEGA ARCHITECTURAL GUARD (Era 7.2.3) - Industrial Reporting Version
 * ---------------------------------------------------------------------------
 * This script enforces ADR-014: Architectural Precedence.
 * Pure JS implementation for maximum compatibility.
 * Lists detailed findings and generates a JSON report.
 * ---------------------------------------------------------------------------
 */

import fs from 'node:fs';
import path from 'node:path';

const patterns = [
  'allowedFragments',
  'ElementCatalog',
  'elementCatalog',
  'throw new Error',
  'throw Error',
  'validate',
  'reject',
  'forbid',
  'deny'
];

const roots = ['src', 'docs', 'scripts'];
const findings = { HIGH: [], MEDIUM: [], LOW: [] };

console.log(`\n[OMEGA ARCH-GUARD] Auditing architectural precedence (ADR-014)...`);

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      const normalizedPath = fullPath.replace(/\\/g, '/');
      if (file !== 'node_modules' && file !== '.git' && file !== '.next' && !normalizedPath.includes('/docs/grafos')) {
        scanDir(fullPath);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(file);
      if (['.ts', '.tsx', '.js', '.mjs', '.md'].includes(ext)) {
        // Skip test files — they always contain legitimate uses of these patterns
        if (file.endsWith('.spec.ts') || file.endsWith('.spec.tsx') || file.endsWith('.test.ts')) return;
        scanFile(fullPath);
      }
    }
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');
  const relativePath = path.relative(process.cwd(), filePath);
  
  patterns.forEach(pattern => {
    lines.forEach((line, index) => {
      // ── Pattern-specific matching logic ──────────────────────────────
      // 'validate' uses `validate(` or `.validate(` to catch real function/method calls
      // while ignoring variable names (validated, validation), props (validate: true),
      // import statements, and log strings.
      const matchesPattern = pattern === 'validate'
        ? /\bvalidate\w*\(/.test(line)
        : line.includes(pattern);
      if (matchesPattern) {
        // Skip self and policy to avoid meta-hits
        if (normalizedPath.includes('arch-guard.mjs') || normalizedPath.includes('architectural_precedence_policy.md')) {
          return;
        }

        // ── False positive exclusions for 'validate' pattern ──────────
        if (pattern === 'validate') {
          // Exclude addLog() calls containing any form of validate
          if (/\baddLog\s*\(/.test(line) && line.includes('validate')) return;
          // Exclude log() calls containing any form of validate
          if (/\blog\s*\(/.test(line) && line.includes('validate')) return;
        }

        // ── False positive exclusions for 'reject' pattern ────────────
        if (pattern === 'reject') {
          // Exclude Promise constructor callbacks: new Promise((resolve, reject) => ...)
          if (line.includes('new Promise') && line.includes('reject')) return;
          // Exclude reject as a callback assignment: .onerror = reject, .catch(reject), etc.
          if (/=\s*reject\b/.test(line)) return;
        }

        const finding = {
          file: relativePath,
          line: index + 1,
          content: line.trim(),
          pattern
        };

        // --- SEVERITY CLASSIFICATION ---
        
        // HIGH: Hard logic (Validators, Builders, Serializers, Services)
        const isHigh = (pattern === 'allowedFragments' || pattern === 'elementCatalog') && 
                       (normalizedPath.includes('validator') || 
                        normalizedPath.includes('builder') || 
                        normalizedPath.includes('serializer') ||
                        normalizedPath.includes('service'));

        // MEDIUM: UI & Rendering (Filtering, presentation hints)
        // Downgrade ElementCatalog imports in UI code to LOW — they're by-design, the catalog is meant to be imported
        const uiComponent = normalizedPath.includes('src/components') || 
                            normalizedPath.includes('src/features') ||
                            normalizedPath.includes('renderers');
        const isMedium = !isHigh && uiComponent && !(pattern === 'ElementCatalog' || pattern === 'elementCatalog');

        // LOW: Everything else, including ElementCatalog imports in UI code
        if (isHigh) {
          findings.HIGH.push(finding);
        } else if (isMedium) {
          findings.MEDIUM.push(finding);
        } else {
          findings.LOW.push(finding);
        }
      }
    });
  });
}

// EXECUTE SCAN
roots.forEach(root => scanDir(path.resolve(root)));

// PRINT DETAILED REPORT
['HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
  if (findings[severity].length === 0) return;
  
  const icon = severity === 'HIGH' ? '❌' : (severity === 'MEDIUM' ? '⚠️' : '✅');
  console.log(`\n=== ${icon} ${severity} RISK HALLUCINATIONS (${findings[severity].length}) ===`);
  
  findings[severity].slice(0, 15).forEach(f => {
    console.log(`[${f.pattern}] ${f.file}:${f.line} -> ${f.content.substring(0, 80)}${f.content.length > 80 ? '...' : ''}`);
  });
  
  if (findings[severity].length > 15) {
    console.log(`... and ${findings[severity].length - 15} more in this category.`);
  }
});

// GENERATE JSON & CSV REPORTS
const reportDir = path.resolve('docs');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);

const summary = {
  timestamp: new Date().toISOString(),
  counts: {
    high: findings.HIGH.length,
    medium: findings.MEDIUM.length,
    low: findings.LOW.length,
    total: findings.HIGH.length + findings.MEDIUM.length + findings.LOW.length
  },
  details: findings
};

// Write JSON
fs.writeFileSync(path.join(reportDir, 'arch-audit-report.json'), JSON.stringify(summary, null, 2));

// Write CSV
const csvRows = ['Severity,File,Line,Pattern,Content'];
['HIGH', 'MEDIUM', 'LOW'].forEach(severity => {
  findings[severity].forEach(f => {
    // Sanitize content for CSV
    const cleanContent = f.content.replace(/"/g, '""').replace(/,/g, ';');
    csvRows.push(`${severity},"${f.file}",${f.line},"${f.pattern}","${cleanContent}"`);
  });
});
fs.writeFileSync(path.join(reportDir, 'arch-audit-report.csv'), csvRows.join('\n'));

console.log(`\n[SUMMARY] Audit complete.`);
console.log(`- High-risk:   ${findings.HIGH.length}`);
console.log(`- Medium-risk: ${findings.MEDIUM.length}`);
console.log(`- Low-risk:    ${findings.LOW.length}`);
console.log(`- JSON Report: docs/arch-audit-report.json`);
console.log(`- CSV Report:  docs/arch-audit-report.csv`);

if (findings.HIGH.length > 0) {
  console.log(`\n❌ ARCHITECTURAL BREACH: ADR-014 Violation.`);
  console.log(`PROGRESS:Structural Audit:COMPLETE:${findings.HIGH.length}:${findings.MEDIUM.length + findings.LOW.length}`);
  process.exit(2);
} else {
  console.log(`\n✅ ARCHITECTURAL INTEGRITY VERIFIED.`);
  console.log(`PROGRESS:Structural Audit:COMPLETE:0:${findings.MEDIUM.length + findings.LOW.length}`);
  process.exit(0);
}
