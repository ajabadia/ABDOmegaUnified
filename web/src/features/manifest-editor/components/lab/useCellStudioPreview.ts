/**
 * @purpose Gestiona la lógica de previsualización del Cell Studio, incluyendo el manifiesto mock, la derivación de testValue, la resolución de comportamiento y la generación de HTML de previsualización.
 * @purpose_en Manages the Cell Studio preview pipeline, including mock manifest state, testValue derivation, behavior resolution, and preview HTML generation.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:2,imports:6,sig:7k9cw3
 * @lastUpdated 2026-06-20T14:44:48.641Z
 */

import { useState, useMemo, useCallback } from 'react';
import type { ManifestEntity, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import type { AssetBehavior, LayerRecipe } from '@/omega-ui-core/types/assetBehavior';
import { CellRenderer } from '@/omega-ui-core/renderers/CellRenderer';
import { entityToNode } from '@/omega-ui-core/utils/entityToNode';
import { BehaviorResolver } from '@/omega-ui-core/utils/behaviorResolver';

/** Default mock manifest used as a fallback when no real manifest is provided */
const DEFAULT_MOCK_MANIFEST: OMEGA_Manifest = {
  schemaVersion: '1.0.0',
  id: 'laboratory',
  metadata: { name: 'Laboratory', family: 'Internal', version: '1.0.0', author: 'OMEGA' },
  ui: {
    dimensions: { width: 100, height: 100 },
    controls: [],
    jacks: [],
    layout: { width: 100, height: 100, containers: [], planes: ['MAIN'], tabStyles: {} },
    styles: {},
    skinMode: 'custom',
    palette: {
      primary: '#00f2ff', secondary: '#ff8c00', utility: '#a0a0a0', feedback: '#32cd32',
      hardware: '#777777', chassis: '#1a1a1a', glow: '#00f2ff', glass: 'rgba(255,255,255,0.05)',
      warning: '#ff3300', highlight: '#ffffff',
    },
    colors: { accent: '#00f2ff', surface: '#121416', text: '#ffffff', weak: '#555555' },
  },
  resources: { wasm: 'internal', assets: [] },
  entities: [],
};

/** Resolved behavior result type from BehaviorResolver */
export interface ResolvedBehavior {
  frame: number;
  value: number;
  label: string;
}

interface UseCellStudioPreviewInput {
  cellData: ManifestEntity;
  behavior: AssetBehavior;
  recipe: LayerRecipe;
  soloLayerId: string | null;
  manifest?: OMEGA_Manifest | undefined;
  resolveAsset?: ((id: string | undefined) => string | undefined) | undefined;
}

interface UseCellStudioPreviewOutput {
  /** Generated preview HTML string */
  previewHTML: string;
  /** Resolved behavior (frame, value, label) */
  resolved: ResolvedBehavior;
  /** Current test value for behavior preview */
  testValue: number;
  /** Mock manifest used for aesthetic previewing */
  mockManifest: OMEGA_Manifest;
  /** Update handler for mock manifest UI properties */
  handleManifestUpdate: (updates: { ui?: Partial<OMEGA_Manifest['ui']> }) => void;
}

/**
 * Hook that encapsulates the Cell Studio preview pipeline:
 * - Manages a mock manifest for local previewing
 * - Derives testValue from cellData or state
 * - Resolves behavior via BehaviorResolver
 * - Generates preview HTML via CellRenderer
 */
export function useCellStudioPreview({
  cellData,
  behavior,
  recipe,
  soloLayerId,
  manifest: propManifest,
  resolveAsset,
}: UseCellStudioPreviewInput): UseCellStudioPreviewOutput {
  // ── Mock manifest state (fallback when no real manifest provided) ────
  const [mockManifest, setMockManifest] = useState<OMEGA_Manifest>(
    () => propManifest || DEFAULT_MOCK_MANIFEST,
  );

  // ── Derived test value ──────────────────────────────────────────────
  const testValue =
    ((cellData.presentation?.style as Record<string, unknown>)?.testValue as number) ??
    0.75;

  // ── Resolved behavior ───────────────────────────────────────────────
  const resolved = useMemo<ResolvedBehavior>(() => {
    return BehaviorResolver.resolve(testValue, {
      ...behavior,
      frameCount:
        ((behavior.mapping?.frameRange?.end || 0) -
          (behavior.mapping?.frameRange?.start || 0)) +
        1,
    }) as ResolvedBehavior;
  }, [testValue, behavior]);

  // ── Preview HTML ────────────────────────────────────────────────────
  const previewHTML = useMemo<string>(() => {
    try {
      return CellRenderer.renderCellHTML(entityToNode(cellData), {
        zoom: 2.5,
        runtimeValue: testValue,
        forceFrame: resolved.frame,
        steps: 128,
        skin:
          ((mockManifest.ui as OMEGA_Manifest['ui'] & { skin?: string })?.skin) ||
          'standard',
        manifest: mockManifest,
        resolveAsset: resolveAsset || ((id: string | undefined) => id),
        recipe: soloLayerId
          ? { ...recipe, layers: recipe.layers.filter((l) => l.id === soloLayerId) }
          : recipe,
      });
    } catch (e) {
      return `<div class="p-4 text-[8px] text-red-500 font-mono">RENDER_ERROR: ${e}</div>`;
    }
  }, [cellData, mockManifest, resolveAsset, recipe, soloLayerId, testValue, resolved.frame]);

  // ── Manifest update handler ─────────────────────────────────────────
  const handleManifestUpdate = useCallback(
    (updates: { ui?: Partial<OMEGA_Manifest['ui']> }) => {
      setMockManifest((prev) => ({
        ...prev,
        ui: { ...prev.ui, ...updates.ui },
      }));
    },
    [],
  );

  return {
    previewHTML,
    resolved,
    testValue,
    mockManifest,
    handleManifestUpdate,
  };
}
