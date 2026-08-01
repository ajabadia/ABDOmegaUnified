'use client';

/**
 * @purpose Proporciona métricas para la readinidad del módulo basadas en cobertura de vinculación, auditoría de metadatos, densidad de UI, profundidad de anexos y readinidad general del sistema a partir de un manifesto OMEGA.
 * @purpose_en Calculates and returns metrics for module readiness based on binding coverage, metadata audit, UI density, attachment depth, and overall system readiness from an OMEGA manifest.
 * @refactorable false
 * @classification Custom Hook
 * @complexity Medium
 * @fingerprint exports:1,imports:2,sig:15m3ga5
 * @lastUpdated 2026-06-15T13:22:34.705Z
 */

import { useMemo } from 'react';
import type { OMEGA_Manifest, ManifestEntity } from '@/omega-ui-core/types/manifest';

export const useModuleMetrics = (manifest: OMEGA_Manifest) => {
  return useMemo(() => {
    const controls = manifest.ui?.controls || [];
    const jacks = manifest.ui?.jacks || [];
    const allItems = [...controls, ...jacks];

    // 1. Binding Coverage
    const boundCount = allItems.filter((i: ManifestEntity) => i.bind && i.bind !== '').length;
    const bindCoverage = allItems.length > 0 ? (boundCount / allItems.length) * 100 : 0;

    // 2. Metadata Audit
    const meta = manifest.metadata || {};
    const metaFields = [meta.name, meta.family, meta.description, meta.status];
    const metaScore = (metaFields.filter(f => !!f).length / metaFields.length) * 100;

    // 3. UI Density (Optimal 60-80%)
    const hp = meta.rack?.hp || 12;
    const density = Math.min(100, (allItems.length / (hp * 0.8)) * 100);

    // 4. Attachment Depth
    const itemsWithAtt = allItems.filter((i: ManifestEntity) => (i.presentation?.attachments?.length || 0) > 0).length;
    const attScore = allItems.length > 0 ? (itemsWithAtt / allItems.length) * 100 : 0;

    // 5. Overall System Readiness
    const overall = (bindCoverage + metaScore + (100 - Math.abs(70 - density)) + attScore) / 4;

    return {
      metrics: [
        { label: 'BND', value: bindCoverage, color: 'bg-primary' },
        { label: 'MET', value: metaScore, color: 'bg-accent' },
        { label: 'DEN', value: density, color: 'bg-blue-400' },
        { label: 'ATT', value: attScore, color: 'bg-purple-400' },
        { label: 'SYS', value: overall, color: 'bg-green-400' }
      ],
      sysReady: overall > 80
    };
  }, [manifest]);
};
