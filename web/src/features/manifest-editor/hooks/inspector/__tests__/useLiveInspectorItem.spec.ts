/**
 * @jest-environment jsdom
 *
 * Tests for useLiveInspectorItem hook — live item rehydration
 * from UCA tree, legacy fallback, and enriched manifest with extra resources.
 *
 * Strategy: no mocking — uses real findNodeInTree/findLegacyItem with
 * carefully constructed test trees to exercise each code path.
 */
import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import type { OMEGA_Manifest, OmegaNode, ExtraResource } from '@/omega-ui-core/types/manifest';
import { useLiveInspectorItem } from '../useLiveInspectorItem';
import type { UseLiveInspectorItemOptions } from '../useLiveInspectorItem';

// ── Helpers ────────────────────────────────────────────────────────────

function makeNode(id: string, label?: string, children?: OmegaNode[]): OmegaNode {
  return {
    id,
    kind: 'cell',
    role: 'control' as const,
    meta: { label: label || id },
    layout: { pos: { x: 0, y: 0 }, mode: 'absolute' as const },
    children,
  } as OmegaNode;
}

function makeManifest(overrides?: Partial<OMEGA_Manifest>): OMEGA_Manifest {
  return {
    id: 'test-manifest',
    metadata: { name: 'Test', version: '1.0.0', author: 'tester' },
    ui: {
      layout: { width: 800, height: 600 },
      tree: makeNode('root', 'Root', [
        makeNode('child-1', 'Child 1'),
        makeNode('child-2', 'Child 2'),
        makeNode('nested-parent', 'Parent', [
          makeNode('nested-child', 'Nested'),
        ]),
      ]),
      controls: [],
      jacks: [],
      palette: {},
    },
    resources: { assets: [] },
    entities: [],
    ...overrides,
  } as unknown as OMEGA_Manifest;
}

/** Create an options object, merging item/manifest with defaults */
function opts(
  item: UseLiveInspectorItemOptions['item'] | undefined,
  overrides?: Partial<UseLiveInspectorItemOptions>,
): UseLiveInspectorItemOptions {
  return {
    item: item ?? null,
    manifest: makeManifest(),
    extraResources: undefined,
    ...overrides,
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Live item rehydration ──────────────────────────────────────────────

describe('useLiveInspectorItem — live rehydration', () => {
  it('should find node in tree via findNodeInTree', () => {
    // child-1 IS in the tree → findNodeInTree returns the tree node
    const item = makeNode('child-1', 'Stale Child');
    const manifest = makeManifest();

    const { result } = renderHook(() =>
      useLiveInspectorItem(opts(item, { manifest })),
    );

    // The liveItem should be the tree node, not the stale reference
    expect(result.current.liveItem).not.toBe(item);
    expect(result.current.liveItem).toBeDefined();
    expect((result.current.liveItem as OmegaNode)?.id).toBe('child-1');
  });

  it('should find nested node deep in tree', () => {
    const item = makeNode('nested-child', 'Stale Nested');
    const manifest = makeManifest();

    const { result } = renderHook(() =>
      useLiveInspectorItem(opts(item, { manifest })),
    );

    expect(result.current.liveItem).toBeDefined();
    expect((result.current.liveItem as OmegaNode)?.id).toBe('nested-child');
  });

  it('should return original item when item is not in tree and not in legacy arrays', () => {
    const item = makeNode('unknown-id', 'Not in Tree');
    const manifest = makeManifest();

    const { result } = renderHook(() =>
      useLiveInspectorItem(opts(item, { manifest })),
    );

    // Not found anywhere → returns original item unchanged
    expect(result.current.liveItem).toBe(item);
  });

  it('should return original item when root tree is undefined', () => {
    const item = makeNode('child-1');
    const manifest = makeManifest({ ui: undefined as unknown as OMEGA_Manifest['ui'] });

    const { result } = renderHook(() =>
      useLiveInspectorItem(opts(item, { manifest })),
    );

    expect(result.current.liveItem).toBe(item);
  });

  it('should return null when item is null', () => {
    const { result } = renderHook(() =>
      useLiveInspectorItem(opts(null)),
    );

    expect(result.current.liveItem).toBeNull();
  });

  it('should return manifest item unchanged when used as module-level item', () => {
    const manifest = makeManifest();
    const item: OMEGA_Manifest = { ...manifest, id: 'module-id' };

    const { result } = renderHook(() =>
      useLiveInspectorItem(opts(item, { manifest })),
    );

    // findNodeInTree is called with module id, fails; findLegacyItem fails; returns item
    expect(result.current.liveItem).toBe(item);
  });
});

// ── Enriched manifest ──────────────────────────────────────────────────

describe('useLiveInspectorItem — enriched manifest', () => {
  it('should inject extra resources as assets into enrichedManifest', () => {
    const manifest = makeManifest();
    const extraResources: ExtraResource[] = [
      { name: 'bg.png', type: 'image/png', data: new ArrayBuffer(0) },
      { name: 'icon.svg', type: 'image/svg+xml', data: new ArrayBuffer(0) },
    ];

    const { result } = renderHook(() =>
      useLiveInspectorItem(opts(null, { manifest, extraResources })),
    );

    const assets = result.current.enrichedManifest.resources?.assets || [];
    expect(assets).toHaveLength(2);
    expect(assets[0]).toMatchObject({ id: 'resources/bg.png', url: 'resources/bg.png', type: 'image' });
    expect(assets[1]).toMatchObject({ id: 'resources/icon.svg', url: 'resources/icon.svg', type: 'svg' });
  });

  it('should preserve original manifest assets when no extraResources', () => {
    const manifest = makeManifest({
      resources: { assets: [{ id: 'orig-asset', url: 'orig.png', type: 'image' as const }] },
    });

    const { result } = renderHook(() =>
      useLiveInspectorItem(opts(null, { manifest })),
    );

    const assets = result.current.enrichedManifest.resources?.assets || [];
    expect(assets).toHaveLength(1);
    expect(assets[0].id).toBe('orig-asset');
  });

  it('should replace original assets when extraResources are provided', () => {
    const manifest = makeManifest({
      resources: { assets: [{ id: 'orig-asset', url: 'orig.png', type: 'image' as const }] },
    });
    const extraResources: ExtraResource[] = [
      { name: 'override.svg', type: 'image/svg+xml', data: new ArrayBuffer(0) },
    ];

    const { result } = renderHook(() =>
      useLiveInspectorItem(opts(null, { manifest, extraResources })),
    );

    const assets = result.current.enrichedManifest.resources?.assets || [];
    expect(assets).toHaveLength(1);
    expect(assets[0].id).toBe('resources/override.svg');
  });

  it('should preserve original manifest metadata', () => {
    const manifest = makeManifest({ metadata: { name: 'Keep-Name', version: '3.0.0', author: 'keep' } });

    const { result } = renderHook(() =>
      useLiveInspectorItem(opts(null, { manifest })),
    );

    expect(result.current.enrichedManifest.metadata.name).toBe('Keep-Name');
    expect(result.current.enrichedManifest.metadata.version).toBe('3.0.0');
  });
});

// ── Root tree ──────────────────────────────────────────────────────────

describe('useLiveInspectorItem — root tree', () => {
  it('should return root tree from manifest', () => {
    const tree = makeNode('my-root');
    const manifest = makeManifest({ ui: { layout: { width: 800, height: 600 }, tree, controls: [], jacks: [], palette: {} } });

    const { result } = renderHook(() =>
      useLiveInspectorItem(opts(null, { manifest })),
    );

    expect(result.current.rootTree).toBe(tree);
  });

  it('should return undefined when manifest has no ui', () => {
    const manifest = makeManifest({ ui: undefined as unknown as OMEGA_Manifest['ui'] });

    const { result } = renderHook(() =>
      useLiveInspectorItem(opts(null, { manifest })),
    );

    expect(result.current.rootTree).toBeUndefined();
  });

  it('should return null when ui.tree is explicitly null', () => {
    const manifest = makeManifest({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ui: { layout: { width: 800, height: 600 }, tree: null as any, controls: [], jacks: [], palette: {} },
    });

    const { result } = renderHook(() =>
      useLiveInspectorItem(opts(null, { manifest })),
    );

    expect(result.current.rootTree).toBeNull();
  });
});

// ── Return shape ───────────────────────────────────────────────────────

describe('useLiveInspectorItem — return shape', () => {
  it('should return liveItem, enrichedManifest, and rootTree', () => {
    const { result } = renderHook(() =>
      useLiveInspectorItem(opts(null)),
    );

    expect(result.current).toHaveProperty('liveItem');
    expect(result.current).toHaveProperty('enrichedManifest');
    expect(result.current).toHaveProperty('rootTree');
  });
});
