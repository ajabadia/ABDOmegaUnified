/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:07
   ================================================================= */

/**
 * @purpose Gestiona el proceso de destilación de un manifest OMEGA, incluyendo la expansión y contracción de estilos de nodos, la fijación de estilos legados, la eliminación de activos no utilizados y ajustes tipográficos.
 * @purpose_en ** Manages the distillation process of an OMEGA manifest, including expanding and contracting node styles, fossilizing legacy styles, pruning unused assets, and typography adjustments.
 * @refactorable ** true (contains multiple functions with distinct responsibilities)
 * @classification ** Helper Utility
 * @complexity ** Medium
 * @fingerprint exports:6,imports:3,sig:1ec30wc
 * @lastUpdated 2026-06-19T18:57:52.913Z
 */

import type { OmegaNode, OMEGA_Manifest, OmegaStyleNode, StyleVariant } from '../types/manifest';
import { ColorResolver } from './ColorResolver';
import { pruneUnusedAssets } from './styleResolverAssets';

// ─── Canonical palette keys ─────────────────────────────────────────
const CANONICAL_PALETTE_KEYS: Record<string, string> = {
  primary: '#00f2ff',
  secondary: '#ff8c00',
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
};

const DEFAULT_TYPOGRAPHY = {
  defaultFont: 'Inter',
  definitions: [
    { id: 'default', label: 'Default', family: 'Inter' },
    { id: 'technical', label: 'Technical', family: 'JetBrains Mono' },
  ],
};

// ═════════════════════════════════════════════════════════════════════
//  EXPANSION & CONTRACTION
// ═════════════════════════════════════════════════════════════════════

/**
 * Expand a node's style: ensures style.variant is set (defaults to "default").
 */
export function expandNodeStyle(
  node: OmegaNode,
  _manifest?: OMEGA_Manifest,
): OmegaNode {
  if (!node.style) {
    return { ...node, style: { variant: 'default' } };
  }
  if (!node.style.variant) {
    return { ...node, style: { ...node.style, variant: 'default' } };
  }
  return node;
}

/**
 * Contract a node's style: removes the `style` field if its values
 * match the default variant for that component type.
 */
export function contractNodeStyle(
  node: OmegaNode,
  manifest?: OMEGA_Manifest,
): OmegaNode {
  if (!node.style) return node;

  const cellRef = node.cellRef || node.kind || 'knob';
  const stylesByType = manifest?.ui?.styles?.[cellRef] || [];
  const defaultAesthetics = stylesByType.find((s: StyleVariant) => s.id === 'default')?.aesthetics;

  if (!defaultAesthetics) return node;

  const { variant: _variant, ...nodeStyleValues } = node.style;

  if (Object.keys(nodeStyleValues).length === 0) {
    const { style: _removed, ...rest } = node;
    return rest as OmegaNode;
  }

  for (const [key, value] of Object.entries(nodeStyleValues)) {
    if (!(key in defaultAesthetics)) return node;
    if ((defaultAesthetics as Record<string, unknown>)[key] !== value) return node;
  }

  const { style: _removed, ...rest } = node;
  return rest as OmegaNode;
}

function walkAndContract(
  nodes: OmegaNode[],
  manifest?: OMEGA_Manifest,
): OmegaNode[] {
  return nodes.map((node) => {
    const contracted = contractNodeStyle(node, manifest);
    if (contracted.children && contracted.children.length > 0) {
      return {
        ...contracted,
        children: walkAndContract(contracted.children, manifest),
      };
    }
    return contracted;
  });
}

/**
 * Contract an entire manifest: traverses nodes[] and ui.tree,
 * applying contractNodeStyle to every node.
 */
export function contractManifest(manifest: OMEGA_Manifest): OMEGA_Manifest {
  const nodes = manifest.nodes
    ? walkAndContract(manifest.nodes, manifest)
    : undefined;

  const tree = manifest.ui?.tree
    ? contractNodeStyle(manifest.ui.tree, manifest)
    : undefined;

  const finalTree = tree && tree.children
    ? { ...tree, children: walkAndContract(tree.children, manifest) }
    : tree;

  return {
    ...manifest,
    ...(nodes ? { nodes } : {}),
    ...(finalTree ? { ui: { ...manifest.ui, tree: finalTree } } : {}),
  };
}

// ═════════════════════════════════════════════════════════════════════
//  PRUNING
// ═════════════════════════════════════════════════════════════════════

function collectStyleUsage(nodes: OmegaNode[]): Map<string, Set<string>> {
  const usage = new Map<string, Set<string>>();

  function walk(node: OmegaNode) {
    const cellRef = node.cellRef || node.kind || 'knob';
    const variant = node.style?.variant || 'default';

    if (!usage.has(cellRef)) {
      usage.set(cellRef, new Set());
    }
    usage.get(cellRef)!.add(variant);

    if (node.children) node.children.forEach(walk);
  }

  nodes.forEach(walk);
  return usage;
}

/**
 * Prune unused styles from a manifest.
 * Always keeps the "default" variant (resolution fallback).
 */
export function pruneUnusedStyles(manifest: OMEGA_Manifest): OMEGA_Manifest {
  const styles = manifest.ui?.styles;
  if (!styles || Object.keys(styles).length === 0) return manifest;

  const usage = new Map<string, Set<string>>();

  if (manifest.nodes) {
    const fromNodes = collectStyleUsage(manifest.nodes);
    for (const [type, variants] of fromNodes) {
      if (!usage.has(type)) usage.set(type, new Set());
      variants.forEach((v) => usage.get(type)!.add(v));
    }
  }
  if (manifest.ui?.tree) {
    const fromTree = collectStyleUsage([manifest.ui.tree]);
    for (const [type, variants] of fromTree) {
      if (!usage.has(type)) usage.set(type, new Set());
      variants.forEach((v) => usage.get(type)!.add(v));
    }
  }

  if (usage.size === 0) return manifest;

  const prunedStyles: Record<string, StyleVariant[]> = {};

  for (const [type, variants] of Object.entries(styles)) {
    if (!usage.has(type)) continue;

    const usedVariants = usage.get(type)!;
    const keep = variants.filter(
      (v) => v.id === 'default' || usedVariants.has(v.id),
    );

    if (keep.length > 0) prunedStyles[type] = keep;
  }

  return { ...manifest, ui: { ...manifest.ui, styles: prunedStyles } };
}

// ═════════════════════════════════════════════════════════════════════
//  FOSSILIZATION
// ═════════════════════════════════════════════════════════════════════

function fossilizeNode(
  node: OmegaNode,
  resolveManifest: OMEGA_Manifest,
): OmegaNode {
  if (!node.style) {
    return node.children
      ? { ...node, children: node.children.map((c) => fossilizeNode(c, resolveManifest)) }
      : node;
  }
  const fossilized = ColorResolver.resolveStyle(
    node.style as Record<string, unknown>,
    resolveManifest,
  ) as Partial<OmegaStyleNode>;
  return {
    ...node,
    style: fossilized,
    ...(node.children
      ? { children: node.children.map((c) => fossilizeNode(c, resolveManifest)) }
      : {}),
  };
}

/**
 * Fossilize legacy style fallbacks into the manifest so that
 * the output is fully self-contained.
 */
export function fossilizeLegacyStyles(manifest: OMEGA_Manifest): OMEGA_Manifest {
  // 1. Palette
  const existingPalette = (manifest.ui?.palette || {}) as Record<string, string | undefined>;
  const existingColors = (manifest.ui?.colors || {}) as Record<string, string | undefined>;
  const mergedPalette: Record<string, string> = { ...CANONICAL_PALETTE_KEYS };

  for (const [key, value] of Object.entries(existingPalette)) {
    if (value) mergedPalette[key] = value;
  }
  for (const [key, value] of Object.entries(existingColors)) {
    if (value) mergedPalette[key] = value;
  }

  const resolveManifest: OMEGA_Manifest = {
    ...manifest,
    ui: { ...manifest.ui, palette: mergedPalette },
  };

  // 2. Fossilize style variant aesthetics
  const styles = manifest.ui?.styles;
  let fossilizedStyles: Record<string, StyleVariant[]> | undefined;

  if (styles && Object.keys(styles).length > 0) {
    fossilizedStyles = {};
    for (const [type, variants] of Object.entries(styles)) {
      if (!variants || variants.length === 0) continue;
      fossilizedStyles[type] = variants.map((v: StyleVariant) => ({
        ...v,
        aesthetics: ColorResolver.resolveStyle(
          v.aesthetics as Record<string, unknown>,
          resolveManifest,
        ) as Partial<OmegaStyleNode>,
      }));
    }
  }

  // 3. Fossilize node styles
  const nodes = manifest.nodes
    ? manifest.nodes.map((n) => fossilizeNode(n, resolveManifest))
    : undefined;

  // 4. Sizes
  const existingSizes = (manifest.ui?.sizes || {}) as Record<string, number | undefined>;
  const mergedSizes: Record<string, number> = { A: 24, B: 18, C: 12, D: 9, ...existingSizes };

  // 5. Typography
  const existingTypo = manifest.ui?.typography;
  const finalTypography = existingTypo?.defaultFont ? existingTypo : DEFAULT_TYPOGRAPHY;

  const uiUpdates: Record<string, unknown> = {
    palette: mergedPalette,
    sizes: mergedSizes,
    typography: finalTypography,
  };
  if (fossilizedStyles) uiUpdates.styles = fossilizedStyles;

  const result: OMEGA_Manifest = {
    ...manifest,
    ...(nodes ? { nodes } : {}),
    ui: { ...manifest.ui, ...uiUpdates },
  };

  if (manifest.ui?.tree) {
    result.ui = { ...result.ui, tree: fossilizeNode(manifest.ui.tree, resolveManifest) };
  }

  return result;
}

// ═════════════════════════════════════════════════════════════════════
//  DISTILL PIPELINE
// ═════════════════════════════════════════════════════════════════════

/**
 * Distill a manifest: chains fossilizeLegacyStyles -> contractManifest -> pruneUnusedStyles.
 * Note: pruneUnusedAssets is called separately by the caller when asset IDs are known.
 */
export function distillManifest(manifest: OMEGA_Manifest): OMEGA_Manifest {
  return pruneUnusedAssets(
    pruneUnusedStyles(contractManifest(fossilizeLegacyStyles(manifest))),
  );
}

export { CANONICAL_PALETTE_KEYS, DEFAULT_TYPOGRAPHY };
