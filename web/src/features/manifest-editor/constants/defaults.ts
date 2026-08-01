/**
 * @purpose Gestiona valores por defecto del manifest y normaliza los manifests cargados para asegurar la integridad estructural.
 * @purpose_en Manages default manifest values and normalizes loaded manifests to ensure structural integrity.
 * @refactorable false
 * @classification Data/Constants
 * @complexity Low
 * @fingerprint exports:2,imports:1,sig:ecz3so
 * @lastUpdated 2026-06-15T13:02:42.421Z
 */

import type { OMEGA_Manifest } from '../types/document';

/**
 * Default palette injected into manifests that lack ui.palette.
 * Covers all canonical tokens consumed by ColorResolver, useRackTokens,
 * useDesignTokens, and primitive renderers.
 */
export const DEFAULT_PALETTE: Record<string, string> = {
  primary: '#00f2ff',
  secondary: '#ff8c00',
  accent: '#ff8c00',
  utility: '#a0a0a0',
  feedback: '#32cd32',
  surface: '#121416',
  hardware: '#777777',
  chassis: '#1a1a1a',
  text: '#ffffff',
  glow: '#00f2ff',
  glass: 'rgba(255,255,255,0.05)',
  warning: '#ff3300',
  highlight: '#ffffff',
  weak: '#555555',
  background: '#0d0d0d',
  muted: '#808080',
  error: '#ff4444',
  success: '#44ff44',
  border: '#333333',
  knob: '#00f2ff',
  slider: '#00f2ff',
  led_off: '#333333',
  led_on: '#00f2ff',
};

/**
 * Default size tokens injected into manifests that lack ui.sizes.
 */
export const DEFAULT_SIZES: Record<string, number> = {
  A: 24,
  B: 36,
  C: 48,
  D: 64,
};

export const DEFAULT_MANIFEST: OMEGA_Manifest = {
  id: 'new-module',
  schemaVersion: '7.2.3',
  metadata: {
    name: 'New OMEGA Module',
    author: 'Sovereign User',
    version: '1.0.0'
  },
  nodes: [],
  resources: {},
  entities: [],
  ui: {
    tree: {
      id: 'root',
      kind: 'container',
      role: 'structure',
      layout: {
        pos: { x: 0, y: 0 },
        size: { width: 400, height: 400 }
      },
      children: []
    }
  }
};

/**
 * normalizeManifest — Defensive schema migration layer.
 *
 * Called on every manifest loaded from localStorage, file import, or
 * session recovery. Guarantees that ALL required top-level properties
 * exist and have correct shapes, regardless of what schema version they
 * were saved with.
 *
 * This is the single source of truth for manifest integrity at the
 * application boundary. Components must NOT defensively patch missing
 * fields — they can assume the manifest is always normalized after this.
 */
export function normalizeManifest(raw: unknown): OMEGA_Manifest {
  const m = (raw || {}) as Partial<OMEGA_Manifest>;

  return {
    ...DEFAULT_MANIFEST,
    ...m,

    // Ensure metadata always exists with required fields
    metadata: {
      name:    'Untitled Module',
      version: '1.0.0',
      ...(m.metadata || {}),
    },

    // Ensure resources always exists
    resources: m.resources || {},

    // Ensure entities always exists
    entities: m.entities || [],

    // Ensure nodes always exists
    nodes: m.nodes || [],

    // Ensure ui always exists with a valid tree and self-contained palette/sizes
    ui: {
      ...(m.ui || {}),
      palette: { ...DEFAULT_PALETTE, ...(m.ui?.palette || {}) },
      sizes: { ...DEFAULT_SIZES, ...(m.ui?.sizes || {}) },
      tree: m.ui?.tree || DEFAULT_MANIFEST.ui.tree,
    },
  };
}
