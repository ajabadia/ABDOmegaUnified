'use client';

/**
 * @purpose Gestiona benchmarks de rendimiento para hashing, agregación diagnóstica, latencia del auditor estructural y retraso de interacción en el editor de manifestos OMEGA.
 * @purpose_en ** Runs performance benchmarks for hashing, diagnostic aggregation, structural auditor latency, and interaction delay in the OMEGA manifest editor.
 * @refactorable ** true (contains too many state variables and UI parts)
 * @classification ** UI Component
 * @complexity ** Medium
 * @fingerprint exports:1,imports:5,sig:q1py1r
 * @lastUpdated 2026-06-15T17:04:23.461Z
 */

import { useState, useEffect } from 'react';
import { IntegrityService } from '@/services/integrityService';
import { mergeDiagnostics } from '@/features/manifest-editor/utils/diagnosticUtils';
import { structuralAuditor } from '@/features/manifest-editor/services/StructuralAuditor';
import type { OMEGA_Manifest, ManifestEntity } from '@/omega-ui-core/types/manifest';

/**
 * Helper to generate a large manifest for stress testing.
 */
function generateTestManifest(controlCount: number): OMEGA_Manifest {
  const controls: ManifestEntity[] = [];
  for (let i = 0; i < controlCount; i++) {
    controls.push({
      id: `cell-${i}`,
      type: 'knob',
      label: `Knob ${i}`,
      role: 'control',
      bind: `param-${i}`,
      pos: { x: (i % 10) * 80, y: Math.floor(i / 10) * 80 },
      size: { width: 60, height: 60 },
      presentation: {
        tab: 'MAIN',
        component: 'knob',
        variant: 'cyan',
        offsetX: 0,
        offsetY: 0,
        attachments: []
      }
    });
  }

  return {
    schemaVersion: '7.1',
    id: 'perf-test',
    metadata: {
      name: 'Performance Test',
      family: 'test',
      author: 'system'
    },
    ui: {
      dimensions: { width: 800, height: 800 },
      controls,
      jacks: [],
      layout: {
        width: 800,
        height: 800,
        containers: []
      }
    },
    resources: {
      assets: [],
      styles: {}
    },
    entities: controls,
    modulations: []
  } as unknown as OMEGA_Manifest;
}

export default function PerfPage() {
  const [report, setReport] = useState<string>('Running benchmarks...');

  useEffect(() => {
    async function runBenchmarks() {
      const results: string[] = [];
      results.push('# Performance Report (Stable Metrics)');
      results.push(`Date: ${new Date().toLocaleString()}`);
      results.push('');

      const ITERATIONS = 20;
      const WARMUP = 5;

      // Helper to run benchmark and return median
      async function benchmark(fn: () => Promise<void> | void) {
        // Warmup
        for (let i = 0; i < WARMUP; i++) await fn();
        
        const durations: number[] = [];
        for (let i = 0; i < ITERATIONS; i++) {
          const start = performance.now();
          await fn();
          durations.push(performance.now() - start);
        }
        
        durations.sort((a, b) => a - b);
        const median = durations[Math.floor(ITERATIONS / 2)];
        const avg = durations.reduce((a, b) => a + b, 0) / ITERATIONS;
        const max = Math.max(...durations);
        const min = Math.min(...durations);
        
        return { median, avg, max, min };
      }

      // 1. Hashing Overhead
      results.push('## 1. Hashing Overhead (IntegrityService.generateHash)');
      const sizes = [50, 100, 200, 500];
      for (const size of sizes) {
        const manifest = generateTestManifest(size);
        const stats = await benchmark(async () => {
          await IntegrityService.generateHash(manifest as unknown as Record<string, unknown>);
        });
        
        const status = stats.median < 30 ? '✅ PASS' : stats.median < 100 ? '⚠️ WATCH' : '❌ OPTIMIZE';
        results.push(`- **${size} controls**: Median: ${stats.median.toFixed(2)}ms (Avg: ${stats.avg.toFixed(2)}ms, Max: ${stats.max.toFixed(2)}ms) ${status}`);
      }
      results.push('');

      // 2. Diagnostics Aggregation
      results.push('## 2. Diagnostics Aggregation (mergeDiagnostics)');
      const diagSizes = [0, 10, 50, 100];
      for (const errorCount of diagSizes) {
        const dummyDiags = {
          errors: Array(errorCount).fill(0).map((_, i) => ({ id: `err_${i}`, source: 'Monaco', message: 'Test error', severity: 'error' as const })),
          warnings: [],
          infos: [],
          errorCount,
          warningCount: 0,
          infoCount: 0
        };
        
        const manifest = generateTestManifest(100);
        const structural = structuralAuditor.extractDiagnostics(manifest, { contract: null });
        
        const stats = await benchmark(() => {
          mergeDiagnostics([dummyDiags, structural]);
        });
        
        const status = stats.median < 5 ? '✅ PASS' : stats.median < 20 ? '⚠️ WATCH' : '❌ OPTIMIZE';
        results.push(`- **${errorCount} items**: Median: ${stats.median.toFixed(2)}ms (Avg: ${stats.avg.toFixed(2)}ms) ${status}`);
      }
      results.push('');

      // 3. Structural Auditor Latency
      results.push('## 3. Structural Auditor (extractDiagnostics)');
      for (const size of sizes) {
        const manifest = generateTestManifest(size);
        const stats = await benchmark(() => {
          structuralAuditor.extractDiagnostics(manifest, { contract: null });
        });
        results.push(`- **${size} controls**: Median: ${stats.median.toFixed(2)}ms (Max: ${stats.max.toFixed(2)}ms)`);
      }

      // 4. Long Task Monitoring (Interaction Lag)
      results.push('## 4. Interaction Lag (Long Tasks > 50ms)');
      results.push('Monitor active for 5 seconds. Please interact with the page (scroll/type) if this were a live editor.');
      
      const longTasks: PerformanceEntry[] = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTasks.push(entry);
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
      
      await new Promise(r => setTimeout(r, 5000));
      observer.disconnect();
      
      if (longTasks.length === 0) {
        results.push('- **No long tasks detected** ✅ PASS');
      } else {
        results.push(`- **${longTasks.length} long tasks detected** ⚠️ WATCH`);
        longTasks.forEach((t, i) => {
          results.push(`  - Task ${i + 1}: ${t.duration.toFixed(2)}ms`);
        });
      }

      setReport(results.join('\n'));
    }

    runBenchmarks();
  }, []);

  return (
    <div className="p-8 font-mono whitespace-pre bg-black text-green-400 min-h-screen">
      {report}
    </div>
  );
}
