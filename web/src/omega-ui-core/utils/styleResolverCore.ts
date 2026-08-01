/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:07
   ================================================================= */

/**
 * @purpose Gestiona el manejo de estilos visuales para nodos en un manifesto OMEGA, incluyendo resolución de tokens de color y tamaño.
 * @purpose_en Manages the resolution of visual styles for nodes in an OMEGA manifest, including color and size token resolution.
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:3,imports:3,sig:18js33c
 * @lastUpdated 2026-06-19T18:57:35.445Z
 */

import type { OmegaNode, OMEGA_Manifest, OmegaStyleNode, StyleVariant } from '../types/manifest';
import { ColorResolver } from './ColorResolver';
import type { ResolvedNodeStyle } from './styleResolverTypes';

/**
 * Resolve a node's visual style following the 3-level chain:
 * 
 * 1. Look up node.style.variant in manifest.ui.styles[cellRef]
 * 2. Merge per-node style overrides on top
 * 3. Resolve all color tokens against manifest.ui.palette
 * 4. Resolve size letters against manifest.ui.sizes
 * 
 * @returns A fully resolved style object with hex colors and pixel sizes
 */
export function resolveNodeStyle(
  node: OmegaNode,
  manifest?: OMEGA_Manifest,
): ResolvedNodeStyle {
  const cellRef = node.cellRef || node.kind || 'knob';
  const variant = node.style?.variant || 'default';

  // Level 1: Get global styles for this component type + variant
  const stylesByType = manifest?.ui?.styles?.[cellRef] || [];

  // Look up exact variant first, fall back to "default" variant
  const baseStyle: Partial<OmegaStyleNode> =
    stylesByType.find((s: StyleVariant) => s.id === variant)?.aesthetics ||
    stylesByType.find((s: StyleVariant) => s.id === 'default')?.aesthetics ||
    {};

  // Level 2: Merge per-node style on top of global style
  const mergedStyle: Partial<OmegaStyleNode> = {
    ...baseStyle,
    ...(node.style || {}),
  };

  // Level 3: Resolve color tokens against palette
  const resolvedStyle = ColorResolver.resolveStyle(mergedStyle, manifest);

  return {
    style: resolvedStyle,
    variant,
    cellRef,
  };
}

/**
 * Resolve a single size letter (A, B, C, D) to pixel value from manifest.ui.sizes.
 * Falls back to provided default if letter not found in sizes map.
 */
export function resolveSize(
  sizeCode: string | undefined,
  manifest?: OMEGA_Manifest,
  fallback = 24,
): number {
  if (!sizeCode) return fallback;
  const sizes = (manifest?.ui?.sizes || {}) as Record<string, number | undefined>;
  return sizes[sizeCode] ?? fallback;
}

/**
 * Convenience: get the resolved color for a token from the manifest palette.
 */
export function resolveColor(
  color: string | undefined,
  manifest?: OMEGA_Manifest,
  fallback = 'transparent',
): string {
  return ColorResolver.resolve(color, manifest) || fallback;
}
