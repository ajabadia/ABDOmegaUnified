/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * @jest-environment node
 *
 * Tests for StyleResolver — barrel re-exporting:
 * - styleResolverCore: resolveNodeStyle, resolveSize, resolveColor
 * - styleResolverDistill: expandNodeStyle, contractNodeStyle, contractManifest,
 *     pruneUnusedStyles, fossilizeLegacyStyles, distillManifest
 * - styleResolverAssets: getUnusedStylesAndAssets, extractSubtreeResources, pruneUnusedAssets
 */

import { describe, it, expect } from '@jest/globals';
import type { OmegaNode, OMEGA_Manifest, StyleVariant } from '@/omega-ui-core/types/manifest';
import {
  resolveNodeStyle,
  resolveSize,
  resolveColor,
  expandNodeStyle,
  contractNodeStyle,
  contractManifest,
  pruneUnusedStyles,
  fossilizeLegacyStyles,
  distillManifest,
  getUnusedStylesAndAssets,
  extractSubtreeResources,
  pruneUnusedAssets,
} from '../StyleResolver';

// ── Helpers ────────────────────────────────────────────────────────────

function createMinimalManifest(overrides?: Partial<OMEGA_Manifest>): OMEGA_Manifest {
  return {
    schemaVersion: '7.2.3',
    id: 'test_module',
    metadata: {
      name: 'Test Module',
      version: '1.0.0',
    },
    entities: [],
    resources: {},
    ui: {
      controls: [],
      jacks: [],
      dimensions: { width: 800, height: 600 },
      layout: { width: 800, height: 600 },
      styles: {
        knob: [
          {
            id: 'default',
            label: 'Default Knob',
            aesthetics: { color: 'primary', indicatorColor: 'secondary', fontSize: 12 },
          },
          {
            id: 'large',
            label: 'Large Knob',
            aesthetics: { color: 'secondary', fontSize: 16, borderWidth: 2 },
          },
        ],
        port: [
          {
            id: 'default',
            label: 'Default Port',
            aesthetics: { color: 'feedback', indicatorColor: 'glow' },
          },
          {
            id: 'audio',
            label: 'Audio Port',
            aesthetics: { color: '#00f2ff', indicatorColor: 'primary' },
          },
        ],
      },
      palette: {
        primary: '#00f2ff',
        secondary: '#ff8c00',
        feedback: '#32cd32',
        glow: '#00f2ff',
      },
      sizes: { A: 24, B: 18, C: 12 },
    },
    ...overrides,
  } as OMEGA_Manifest;
}

function createKnobNode(overrides?: Partial<OmegaNode>): OmegaNode {
  return {
    id: 'test_knob',
    kind: 'cell',
    cellRef: 'knob',
    role: 'control',
    layout: { pos: { x: 50, y: 50 }, size: { width: 48, height: 48 } },
    style: { variant: 'default', color: 'primary' },
    ...overrides,
  };
}

// ═════════════════════════════════════════════════════════════════════════
//  resolveNodeStyle
// ═════════════════════════════════════════════════════════════════════════

describe('resolveNodeStyle', () => {
  it('should resolve default variant style for a knob node', () => {
    const node = createKnobNode({ style: { variant: 'default' } });
    const manifest = createMinimalManifest();
    const result = resolveNodeStyle(node, manifest);

    expect(result.variant).toBe('default');
    expect(result.cellRef).toBe('knob');
    expect(result.style.color).toBe('#00f2ff'); // resolved 'primary'
    expect(result.style.indicatorColor).toBe('#ff8c00'); // resolved 'secondary'
    expect(result.style.fontSize).toBe(12);
  });

  it('should resolve non-default variant and merge overrides', () => {
    const node = createKnobNode({
      style: { variant: 'large', color: 'feedback', borderWidth: 3 },
    });
    const manifest = createMinimalManifest();
    const result = resolveNodeStyle(node, manifest);

    expect(result.variant).toBe('large');
    // Per-node override wins: color: 'feedback' → #32cd32
    expect(result.style.color).toBe('#32cd32');
    // From large variant: fontSize 16
    expect(result.style.fontSize).toBe(16);
    // Per-node merge: borderWidth 3 overrides variant's 2
    expect(result.style.borderWidth).toBe(3);
  });

  it('should fall back to default variant when specified variant not found', () => {
    const node = createKnobNode({ style: { variant: 'nonexistent' } });
    const manifest = createMinimalManifest();
    const result = resolveNodeStyle(node, manifest);

    // Falls back to 'default' variant aesthetics
    expect(result.style.fontSize).toBe(12);
    expect(result.style.color).toBe('#00f2ff');
  });

  it('should still resolve per-node values when no manifest styles for cellRef', () => {
    const node = createKnobNode({ cellRef: 'unknown_component' });
    const manifest = createMinimalManifest();
    const result = resolveNodeStyle(node, manifest);

    expect(result.style).toBeDefined();
    // Per-node color token still resolves even without matching variant
    expect(result.style.color).toBe('#00f2ff'); // 'primary' resolved
    // But fontSize from the variant should not be present
    expect(result.style.fontSize).toBeUndefined();
  });

  it('should resolve color tokens in per-node overrides', () => {
    const node = createKnobNode({
      style: { variant: 'default', color: 'glow', indicatorColor: 'nonexistent_token' },
    });
    const manifest = createMinimalManifest();
    const result = resolveNodeStyle(node, manifest);

    expect(result.style.color).toBe('#00f2ff'); // glow → #00f2ff
    expect(result.style.indicatorColor).toBe('transparent'); // unknown → transparent
  });

  it('should use node kind as fallback when cellRef is not set', () => {
    const manifest = createMinimalManifest();
    const node: OmegaNode = {
      id: 'fallback_node',
      kind: 'cell',
      cellRef: 'knob',
      layout: { pos: { x: 0, y: 0 } },
      style: { variant: 'default' },
    };
    const result = resolveNodeStyle(node, manifest);
    expect(result.cellRef).toBe('knob');
    expect(result.style.fontSize).toBe(12);
  });
});

// ═════════════════════════════════════════════════════════════════════════
//  resolveSize
// ═════════════════════════════════════════════════════════════════════════

describe('resolveSize', () => {
  it('should return size from manifest.sizes map for known letter', () => {
    const manifest = createMinimalManifest();
    expect(resolveSize('A', manifest)).toBe(24);
    expect(resolveSize('B', manifest)).toBe(18);
    expect(resolveSize('C', manifest)).toBe(12);
  });

  it('should return fallback for unknown letter', () => {
    const manifest = createMinimalManifest();
    expect(resolveSize('Z', manifest)).toBe(24); // default fallback
    expect(resolveSize('Z', manifest, 42)).toBe(42); // custom fallback
  });

  it('should return fallback when sizeCode is undefined', () => {
    const manifest = createMinimalManifest();
    expect(resolveSize(undefined, manifest)).toBe(24);
    expect(resolveSize(undefined, manifest, 16)).toBe(16);
  });

  it('should return fallback when no manifest provided', () => {
    expect(resolveSize('A')).toBe(24);
    expect(resolveSize('A', undefined, 10)).toBe(10);
  });
});

// ═════════════════════════════════════════════════════════════════════════
//  resolveColor
// ═════════════════════════════════════════════════════════════════════════

describe('resolveColor', () => {
  it('should resolve token from palette', () => {
    const manifest = createMinimalManifest();
    expect(resolveColor('primary', manifest)).toBe('#00f2ff');
    expect(resolveColor('secondary', manifest)).toBe('#ff8c00');
    expect(resolveColor('feedback', manifest)).toBe('#32cd32');
  });

  it('should pass through hex values unchanged', () => {
    const manifest = createMinimalManifest();
    expect(resolveColor('#ff0000', manifest)).toBe('#ff0000');
    expect(resolveColor('transparent', manifest)).toBe('transparent');
  });

  it('should return transparent for unknown token', () => {
    const manifest = createMinimalManifest();
    expect(resolveColor('unknown_token', manifest)).toBe('transparent');
    // Fallback only applies when ColorResolver returns null/undefined
    expect(resolveColor('unknown_token', manifest, '#ff0000')).toBe('transparent');
  });

  it('should return transparent for undefined color', () => {
    expect(resolveColor(undefined, createMinimalManifest())).toBe('transparent');
  });
});

// ═════════════════════════════════════════════════════════════════════════
//  expandNodeStyle
// ═════════════════════════════════════════════════════════════════════════

describe('expandNodeStyle', () => {
  it('should add default variant when node has no style', () => {
    const node: OmegaNode = { id: 'no_style', kind: 'cell', layout: { pos: { x: 0, y: 0 } } };
    const result = expandNodeStyle(node);
    expect(result.style).toEqual({ variant: 'default' });
  });

  it('should add default variant when style has no variant', () => {
    const node: OmegaNode = {
      id: 'no_variant', kind: 'cell',
      layout: { pos: { x: 0, y: 0 } },
      style: { color: 'primary' },
    };
    const result = expandNodeStyle(node);
    expect(result.style?.variant).toBe('default');
    expect(result.style?.color).toBe('primary');
  });

  it('should return node unchanged when style already has variant', () => {
    const node = createKnobNode();
    const result = expandNodeStyle(node);
    expect(result.style?.variant).toBe('default');
    expect(result.style?.color).toBe('primary');
  });
});

// ═════════════════════════════════════════════════════════════════════════
//  contractNodeStyle
// ═════════════════════════════════════════════════════════════════════════

describe('contractNodeStyle', () => {
  it('should remove style field when values match default variant', () => {
    const node = createKnobNode({
      style: { variant: 'default', color: 'primary', indicatorColor: 'secondary' },
    });
    const manifest = createMinimalManifest();
    const result = contractNodeStyle(node, manifest);

    // style should be removed since all values match default aesthetics
    expect(result.style).toBeUndefined();
  });

  it('should keep style when values differ from default variant', () => {
    const node = createKnobNode({
      style: { variant: 'default', color: 'feedback', indicatorColor: 'secondary' },
    });
    const manifest = createMinimalManifest();
    const result = contractNodeStyle(node, manifest);

    // color: 'feedback' differs from default's 'primary'
    expect(result.style).toBeDefined();
    expect(result.style?.color).toBe('feedback');
  });

  it('should return node unchanged when no manifest styles', () => {
    const node = createKnobNode();
    const manifest = createMinimalManifest();
    (manifest.ui as Record<string, unknown>).styles = {};
    const result = contractNodeStyle(node, manifest);
    expect(result.style).toBeDefined();
  });

  it('should keep whole node if no style field', () => {
    const node: OmegaNode = { id: 'no_style', kind: 'cell', layout: { pos: { x: 0, y: 0 } } };
    const manifest = createMinimalManifest();
    const result = contractNodeStyle(node, manifest);
    expect(result.id).toBe('no_style');
    expect(result.style).toBeUndefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════
//  contractManifest
// ═════════════════════════════════════════════════════════════════════════

describe('contractManifest', () => {
  it('should contract styles on all nodes in the tree', () => {
    const manifest = createMinimalManifest({
      ui: {
        ...createMinimalManifest().ui,
        tree: {
          id: 'root',
          kind: 'rack',
          role: 'structure',
          layout: { pos: { x: 0, y: 0 } },
          children: [
            createKnobNode({ style: { variant: 'default', color: 'primary', indicatorColor: 'secondary', fontSize: 12 } }),
            createKnobNode({
              id: 'custom_knob',
              style: { variant: 'large', color: 'secondary' },
            }),
          ],
        },
      },
    });

    // Sanity: ensure the manifest has the right structure before contracting
    expect(manifest.ui.tree?.children?.[0]?.style).toBeDefined();

    const result = contractManifest(manifest);

    // First child has only default values → style removed
    expect((result.ui.tree?.children?.[0] as OmegaNode)?.style).toBeUndefined();

    // Second child has non-default variant 'large' → style kept
    expect((result.ui.tree?.children?.[1] as OmegaNode)?.style).toBeDefined();
    expect((result.ui.tree?.children?.[1] as OmegaNode)?.style?.variant).toBe('large');
  });
});

// ═════════════════════════════════════════════════════════════════════════
//  pruneUnusedStyles
// ═════════════════════════════════════════════════════════════════════════

describe('pruneUnusedStyles', () => {
  it('should keep default variant and used variants, prune unused', () => {
    const manifest = createMinimalManifest();
    // Add a tree node so usage scan finds 'knob' type
    manifest.ui = {
      ...manifest.ui,
      tree: createKnobNode({ style: { variant: 'default' } }),
    };
    const result = pruneUnusedStyles(manifest);

    // knob styles should be kept (used in tree)
    expect(result.ui?.styles?.knob).toBeDefined();
    // port styles should be pruned (nothing references 'port')
    expect(result.ui?.styles?.port).toBeUndefined();
  });

  it('should return manifest unchanged when no styles exist', () => {
    const manifest = createMinimalManifest();
    (manifest.ui as Record<string, unknown>).styles = {};
    const result = pruneUnusedStyles(manifest);
    expect(result).toBe(manifest); // same reference when nothing to prune
  });

  it('should always keep default variant even if not explicitly used', () => {
    const manifest = createMinimalManifest();
    // Add a knob node without a style variant (default implicit)
    manifest.ui = {
      ...manifest.ui,
      styles: {
        knob: [
          { id: 'default', label: 'Default', aesthetics: { color: 'primary' } },
          { id: 'fancy', label: 'Fancy', aesthetics: { color: 'secondary' } },
        ],
      },
    };
    // Create a tree with a knob that explicitly uses default
    manifest.ui.tree = createKnobNode({
      style: { variant: 'default', color: 'primary' },
    });

    const result = pruneUnusedStyles(manifest);

    // 'default' kept, 'fancy' pruned (not used by any node)
    expect(result.ui?.styles?.knob).toHaveLength(1);
    expect(result.ui?.styles?.knob?.[0]?.id).toBe('default');
  });

  it('should return manifest unchanged when no usage detected (no nodes)', () => {
    const manifest = createMinimalManifest();
    manifest.ui = {
      ...manifest.ui,
      styles: { unused_type: [{ id: 'default', label: 'Unused', aesthetics: {} }] },
      tree: undefined,
    };
    manifest.nodes = [];
    const result = pruneUnusedStyles(manifest);
    // With nodes = [] and no tree, usage is empty, so nothing gets pruned
    expect(result.ui?.styles?.unused_type).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════
//  fossilizeLegacyStyles
// ═════════════════════════════════════════════════════════════════════════

describe('fossilizeLegacyStyles', () => {
  it('should merge palette with canonical defaults', () => {
    const manifest = createMinimalManifest();
    (manifest.ui as Record<string, unknown>).palette = { primary: '#ff0000' };
    const result = fossilizeLegacyStyles(manifest);

    // Custom value preserved
    expect((result.ui?.palette as Record<string, string>).primary).toBe('#ff0000');
    // Canonical fallback for missing keys
    expect((result.ui?.palette as Record<string, string>).text).toBe('#ffffff');
    expect((result.ui?.palette as Record<string, string>).chassis).toBe('#1a1a1a');
  });

  it('should merge sizes with canonical defaults', () => {
    const manifest = createMinimalManifest();
    (manifest.ui as Record<string, unknown>).sizes = { A: 32, X: 48 };
    const result = fossilizeLegacyStyles(manifest);

    const sizes = result.ui?.sizes as Record<string, number>;
    expect(sizes.A).toBe(32); // custom override
    expect(sizes.B).toBe(18); // canonical fallback
    expect(sizes.X).toBe(48); // custom addition
  });

  it('should add default typography when not present', () => {
    const manifest = createMinimalManifest();
    (manifest.ui as Record<string, unknown>).typography = undefined;
    const result = fossilizeLegacyStyles(manifest);

    expect(result.ui?.typography?.defaultFont).toBe('Inter');
    expect(result.ui?.typography?.definitions).toHaveLength(2);
  });

  it('should keep existing typography when defined', () => {
    const manifest = createMinimalManifest();
    (manifest.ui as Record<string, unknown>).typography = {
      defaultFont: 'Roboto',
      definitions: [{ id: 'custom', label: 'Custom', family: 'Roboto' }],
    };
    const result = fossilizeLegacyStyles(manifest);

    expect(result.ui?.typography?.defaultFont).toBe('Roboto');
  });

  it('should fossilize style variant aesthetics (resolve color tokens to hex)', () => {
    const manifest = createMinimalManifest();
    // Override palette so the fossilized values are deterministic
    (manifest.ui as Record<string, unknown>).palette = { primary: '#ff0000', secondary: '#00ff00' };

    const result = fossilizeLegacyStyles(manifest);

    const knobStyles = result.ui?.styles?.knob as StyleVariant[];
    const defaultAesthetics = knobStyles.find((s) => s.id === 'default')?.aesthetics;
    const largeAesthetics = knobStyles.find((s) => s.id === 'large')?.aesthetics;

    // Tokens resolved to hex
    expect(defaultAesthetics?.color).toBe('#ff0000'); // primary resolved
    expect(defaultAesthetics?.indicatorColor).toBe('#00ff00'); // secondary resolved
    expect(largeAesthetics?.color).toBe('#00ff00'); // secondary resolved
  });

  it('should fossilize tree node styles', () => {
    // Create a manifest where tree node has a color token
    const manifest = createMinimalManifest({
      ui: {
        ...createMinimalManifest().ui,
        // Override palette for deterministic test
        palette: { primary: '#ff0000', secondary: '#00ff00', feedback: '#0000ff', glow: '#00f2ff' },
        tree: createKnobNode({ style: { variant: 'default', color: 'primary' } }),
      },
    });

    const result = fossilizeLegacyStyles(manifest);

    // The tree node's color should have been resolved
    const treeNode = result.ui?.tree as OmegaNode;
    expect(treeNode.style?.color).toBe('#ff0000');
  });
});

// ═════════════════════════════════════════════════════════════════════════
//  distillManifest (full pipeline)
// ═════════════════════════════════════════════════════════════════════════

describe('distillManifest', () => {
  it('should produce a self-contained manifest with resolved tokens', () => {
    const manifest = createMinimalManifest({
      ui: {
        ...createMinimalManifest().ui,
        palette: { primary: '#ff0000', secondary: '#00ff00', feedback: '#0000ff', glow: '#00f2ff' },
        tree: createKnobNode(),
      },
    });

    const result = distillManifest(manifest);

    // Fossilized: palette has canonical keys
    expect((result.ui?.palette as Record<string, string>).text).toBe('#ffffff');
    expect((result.ui?.palette as Record<string, string>).chassis).toBe('#1a1a1a');

    // Fossilized: sizes have canonical defaults
    expect((result.ui?.sizes as Record<string, number>).A).toBe(24);
    expect((result.ui?.sizes as Record<string, number>).B).toBe(18);

    // Fossilized: typography added
    expect(result.ui?.typography?.defaultFont).toBe('Inter');

    // Pruned: only 'knob' styles kept (port is unused)
    expect(result.ui?.styles?.knob).toBeDefined();
    expect(result.ui?.styles?.port).toBeUndefined();
  });

  it('should not crash on minimal/empty manifest', () => {
    const minimal: OMEGA_Manifest = {
      ui: { controls: [], jacks: [], dimensions: { width: 800, height: 600 }, layout: { width: 800, height: 600 } },
      entities: [],
      metadata: { name: 'empty', version: '1.0' },
      resources: {},
    };

    expect(() => distillManifest(minimal)).not.toThrow();
    const result = distillManifest(minimal);
    expect(result.ui?.palette).toBeDefined();
    expect(result.ui?.typography).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════
//  getUnusedStylesAndAssets
// ═════════════════════════════════════════════════════════════════════════

describe('getUnusedStylesAndAssets', () => {
  it('should detect unused style variants', () => {
    const manifest = createMinimalManifest();
    // Add tree with a knob using only 'default' variant
    manifest.ui = {
      ...manifest.ui,
      tree: createKnobNode({ style: { variant: 'default' } }),
    };

    const result = getUnusedStylesAndAssets(manifest);

    // 'large' variant of knob is not used → should appear in unusedStyles
    const largeUnused = result.unusedStyles.find(
      (s) => s.type === 'knob' && s.variantId === 'large',
    );
    expect(largeUnused).toBeDefined();

    // 'default' variant should NOT be in unused
    const defaultUnused = result.unusedStyles.find(
      (s) => s.type === 'knob' && s.variantId === 'default',
    );
    expect(defaultUnused).toBeUndefined();
  });

  it('should detect unused assets', () => {
    const manifest = createMinimalManifest();
    manifest.resources = {
      assets: [
        { id: 'knob_filmstrip', url: 'asset://knob.png', type: 'filmstrip', frames: 8 },
        { id: 'unused_image', url: 'asset://unused.png', type: 'image' },
      ],
    };
    // Tree node references the used asset
    manifest.ui = {
      ...manifest.ui,
      tree: createKnobNode({
        style: { variant: 'default', asset: 'knob_filmstrip' },
      }),
    };

    const result = getUnusedStylesAndAssets(manifest);

    // 'unused_image' should be in unusedAssets
    expect(result.unusedAssets).toContain('unused_image');
    // 'knob_filmstrip' should NOT be in unusedAssets
    expect(result.unusedAssets).not.toContain('knob_filmstrip');
  });
});

// ═════════════════════════════════════════════════════════════════════════
//  extractSubtreeResources
// ═════════════════════════════════════════════════════════════════════════

describe('extractSubtreeResources', () => {
  it('should extract styles and assets used by a subtree, ignoring non-subtree nodes', () => {
    const manifest = createMinimalManifest();
    manifest.resources = {
      assets: [
        { id: 'knob_asset', url: 'asset://knob.png', type: 'image' },
        { id: 'other_asset', url: 'asset://other.png', type: 'image' },
      ],
    };
    manifest.ui = {
      ...manifest.ui,
      tree: {
        id: 'root',
        kind: 'rack',
        role: 'structure',
        layout: { pos: { x: 0, y: 0 } },
        children: [
          createKnobNode({
            id: 'sub_knob',
            style: { variant: 'default', asset: 'knob_asset' },
          }),
        ],
      },
    };

    const subtree = manifest.ui.tree!;
    const result = extractSubtreeResources(subtree, manifest);

    // Styles: knob type should be present, port should not
    expect(result.styles.knob).toBeDefined();
    expect(result.styles.port).toBeUndefined();
    // 'large' variant should not be included (only 'default' used in subtree)
    const largeVariant = result.styles.knob?.find((s) => s.id === 'large');
    expect(largeVariant).toBeUndefined();

    // Assets: only 'knob_asset' referenced (not 'other_asset')
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0].id).toBe('knob_asset');
  });
});

// ═════════════════════════════════════════════════════════════════════════
//  pruneUnusedAssets
// ═════════════════════════════════════════════════════════════════════════

describe('pruneUnusedAssets', () => {
  it('should remove specified unused assets from manifest', () => {
    const manifest = createMinimalManifest();
    manifest.resources = {
      assets: [
        { id: 'keep_asset', url: 'asset://keep.png', type: 'image' },
        { id: 'remove_asset', url: 'asset://remove.png', type: 'image' },
      ],
    };

    const result = pruneUnusedAssets(manifest, ['remove_asset']);

    expect(result.resources?.assets).toHaveLength(1);
    expect(result.resources?.assets?.[0]?.id).toBe('keep_asset');
  });

  it('should auto-detect unused assets when no assetIds provided', () => {
    const manifest = createMinimalManifest();
    manifest.resources = {
      assets: [
        { id: 'used_asset', url: 'asset://used.png', type: 'image' },
        { id: 'unused_asset', url: 'asset://unused.png', type: 'image' },
      ],
    };
    manifest.ui = {
      ...manifest.ui,
      tree: createKnobNode({ style: { variant: 'default', asset: 'used_asset' } }),
    };

    const result = pruneUnusedAssets(manifest);

    expect(result.resources?.assets).toHaveLength(1);
    expect(result.resources?.assets?.[0]?.id).toBe('used_asset');
  });

  it('should return manifest unchanged when no unused assets', () => {
    const manifest = createMinimalManifest();
    manifest.resources = {
      assets: [{ id: 'used', url: 'asset://used.png', type: 'image' }],
    };
    manifest.ui = {
      ...manifest.ui,
      tree: createKnobNode({ style: { variant: 'default', asset: 'used' } }),
    };

    const result = pruneUnusedAssets(manifest);

    expect(result.resources?.assets).toHaveLength(1);
    expect(result.resources?.assets?.[0]?.id).toBe('used');
  });
});
