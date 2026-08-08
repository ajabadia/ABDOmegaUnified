/**
 * Regression: ACEMM_CATALOG fallback → flatToTree → renderable chassis.
 *
 * Purpose: proves the host rack renders controls + jacks (not a bare chassis)
 * when schemaStore has no live schema for a module (early boot / RPC down).
 * getOrFetchManifest normalizes the flat catalog entry into a ui-block
 * manifest (enriched pos + presentation.component/size) that flatToTree can
 * turn into knob + port cells with real positions.
 *
 * Key regression guarded here: without the enrichment, flatToTree sees an
 * empty ui block → empty tree → bare chassis; and jacks with no component
 * hint would fall back to cellRef from their type (never 'port').
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACEMM_CATALOG, getOrFetchManifest, normalizeCatalogManifest } from '../src/Catalog/AcemmCatalog.js';
import { GENERATED_ACEMM_CATALOG } from '../src/Catalog/acemmCatalog.generated.js';
import { flatToTree } from '../omega-ui-core/uca/converters/flatToTree.js';
import { ManifestRenderer } from '../src/Renderers/ManifestRenderer.js';
import { ModuleRenderer } from '../src/Renderers/ModuleRenderer.js';
import type { OmegaNode } from '../omega-ui-core/types/manifest.js';

function findNode(tree: OmegaNode, id: string): OmegaNode | undefined {
  if (tree.id === id) return tree;
  for (const child of tree.children || []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

function collectCells(tree: OmegaNode): OmegaNode[] {
  const out: OmegaNode[] = [];
  if (tree.kind === 'cell') out.push(tree);
  for (const child of tree.children || []) out.push(...collectCells(child));
  return out;
}

describe('ACEMM catalog fallback → runtime rack render', () => {
  it('preserves the design ACEMM shape for catalog entries with a ui block', () => {
    const m = normalizeCatalogManifest(ACEMM_CATALOG['midi_trigger']);

    expect(m.ui).toBeDefined();
    // Design controls (2 displays, 1 button, 1 port, 1 slider). The ACEMM puts
    // every item (ports included) in `ui.controls`, so `ui.jacks` stays empty.
    expect(m.ui.controls).toHaveLength(5);
    expect(m.ui.jacks ?? []).toHaveLength(0);
    expect(m.metadata.rack).toEqual({ hp: 12, units: '1U', slot: 'upper' });
    expect(m.ui.dimensions).toEqual({ width: 180, height: 140 });

    // Controls carry design component hints, container + position (from ACEMM).
    const components = m.ui.controls.map((c: any) => c.presentation.component);
    expect(components).toEqual(
      expect.arrayContaining(['display', 'display', 'button', 'port', 'slider-v'])
    );
    for (const c of m.ui.controls) {
      expect(c.presentation.container).toBeDefined();
      expect(c.pos.x).toBeGreaterThan(0);
      expect(c.pos.y).toBeGreaterThan(0);
    }
  });

  it('getOrFetchManifest fallback yields design cells with real positions', async () => {
    const m = await getOrFetchManifest('midi_trigger');
    const tree = flatToTree(m);

    const cells = collectCells(tree);
    const cellRefs = cells.map((c) => c.cellRef);

    expect(cellRefs).toContain('display');
    expect(cellRefs).toContain('button');
    expect(cellRefs).toContain('slider-v');
    expect(cellRefs).toContain('port');

    const displays = cells.filter((c) => c.cellRef === 'display');
    expect(displays).toHaveLength(2);
    for (const d of displays) {
      expect(d.role).toBe('control');
      expect(d.layout?.pos?.x).toBeGreaterThan(0);
      expect(d.layout?.pos?.y).toBeGreaterThan(0);
    }

    const ports = cells.filter((c) => c.cellRef === 'port');
    expect(ports).toHaveLength(1);
    for (const p of ports) {
      expect(p.role).toBe('io');
      expect(p.layout?.pos?.x).toBeGreaterThan(0);
      expect(p.layout?.pos?.y).toBeGreaterThan(0);
    }

    // Sanity: positions actually differ across controls (single-point stacking
    // would put everything at one origin).
    const posXs = cells.map((c) => c.layout!.pos!.x);
    expect(new Set(posXs).size).toBeGreaterThan(2);
  });

  it('renderModulePanel renders controls/ports with NO unsupported-renderer', async () => {
    const m = await getOrFetchManifest('midi_trigger');
    m.ui!.tree = flatToTree(m);

    const html = ManifestRenderer.renderModulePanel(m);
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('omega-module-chassis');
    expect(html).not.toContain('NO RENDERER');
    expect(html).not.toContain('unsupported-renderer');
  });

  it('injects the canonical palette so the chassis has a real background', async () => {
    const m = await getOrFetchManifest('midi_2_cv');
    // The ACEMM carries no ui.palette; normalization must inject the canonical
    // tokens so ColorResolver.resolve('chassis') is NOT transparent.
    expect(m.ui.palette.chassis).toBe('#1a1a1a');

    m.ui!.tree = flatToTree(m);
    const html = ManifestRenderer.renderModulePanel(m);
    const chassisStyle = html.match(/class="industrial-rack-chassis"[^>]*style="[^"]*background-color: ([^;]+);/);
    expect(chassisStyle?.[1]).toBe('#1a1a1a');
  });

  it('normalizeCatalogManifest is idempotent on already-normalized manifests', () => {
    const once = normalizeCatalogManifest(ACEMM_CATALOG['midi_trigger']);
    const twice = normalizeCatalogManifest(once);
    expect(twice).toBe(once);
  });

  it('lower-slot entries resolve as 3U with hp from rack', () => {
    const m = normalizeCatalogManifest(ACEMM_CATALOG['test_parity']);
    expect(m.metadata.rack).toEqual({ hp: 24, units: '3U', slot: 'lower' });
    expect(m.ui.dimensions).toEqual({ width: 360, height: 420 });
  });

  it('getOrFetchManifest normalizes a TRUTHY bare schema from schemaStore (real C++ host path)', async () => {
    const bare = {
      id: 'bare_mod',
      name: 'Bare Mod',
      controls: [{ id: 'cutoff', name: 'Cutoff', type: 'knob' }],
      jacks: [{ id: 'in', name: 'In', dataType: 'audio', direction: 'input' }],
    };
    let registered: any = null;
    (globalThis as any).schemaStore = {
      getSchema: () => bare,
      registerSchema: (id: string, m: any) => { registered = { id, m }; },
    };

    try {
      const m = await getOrFetchManifest('bare_mod');
      expect(m.ui).toBeDefined();
      expect(m.ui.controls).toHaveLength(1);
      expect(m.ui.jacks).toHaveLength(1);
      expect(m.ui.controls[0].presentation.component).toBe('knob');
      expect(m.ui.jacks[0].presentation.component).toBe('port');
      expect(m.ui.jacks[0].role).toBe('io');
      // Re-registered so ModuleManager / Registry see the enriched manifest.
      expect(registered).not.toBeNull();
      expect(registered.id).toBe('bare_mod');
      expect(registered.m).toBe(m);
    } finally {
      delete (globalThis as any).schemaStore;
    }
  });

  it('ModuleRenderer defensively normalizes a bare manifest (ModuleManager instantiation path)', () => {
    const bare = {
      id: 'bare_mod',
      name: 'Bare Mod',
      controls: [{ id: 'cutoff', name: 'Cutoff', type: 'knob' }],
      jacks: [{ id: 'in', name: 'In', dataType: 'audio', direction: 'input' }],
    };
    const content = document.createElement('div');
    const renderer = new ModuleRenderer(content, { manifest: bare });

    const descriptor = (renderer as any).descriptor;
    expect(descriptor.ui.controls).toHaveLength(1);
    expect(descriptor.ui.jacks).toHaveLength(1);
    expect(descriptor.ui.controls[0].presentation.component).toBe('knob');

    // render() must always take the ManifestRenderer (SOT) branch: the bare
    // manifest is normalized via flatToTree, producing the chassis panel.
    renderer.render();
    expect(content.innerHTML.length).toBeGreaterThan(0);
    expect(content.innerHTML).toContain('omega-module-chassis');
  });
});

describe('ACEMM catalog artifact integrity (generated hashes)', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const modulesRoot = path.join(root, '..', '..', 'modules');

  it('emits artifact + wasmUrl only for modules that actually ship a .wasm', () => {
    for (const [id, entry] of Object.entries(GENERATED_ACEMM_CATALOG) as [string, any][]) {
      const wasmExists = existsSync(path.join(modulesRoot, id, `${id}.wasm`));
      if (wasmExists) {
        expect(entry.artifact, `${id} debe tener artifact`).toBeTruthy();
        expect(entry.artifact.sha256, `${id} sha256`).toMatch(/^[0-9a-f]{64}$/);
        expect(entry.artifact.size, `${id} size`).toBeGreaterThan(0);
        expect(entry.wasmUrl, `${id} wasmUrl`).toBe(`modules/${id}/${id}.wasm`);
      } else {
        expect(entry.artifact, `${id} sin wasm → artifact null`).toBeNull();
        expect(entry.wasmUrl, `${id} sin wasm → wasmUrl null`).toBeNull();
      }
      expect(entry.manifestUrl, `${id} manifestUrl`).toBe(`modules/${id}/${id}.acemm`);
    }
  });

  it('sha256 del catálogo coincide con el binario real (integridad de la estantería)', () => {
    for (const [id, entry] of Object.entries(GENERATED_ACEMM_CATALOG) as [string, any][]) {
      const wasmPath = path.join(modulesRoot, id, `${id}.wasm`);
      if (!existsSync(wasmPath)) continue;
      const actual = createHash('sha256').update(readFileSync(wasmPath)).digest('hex');
      expect(actual, `${id}: hash real vs catálogo`).toBe(entry.artifact.sha256);
      expect(readFileSync(wasmPath).length, `${id}: size real`).toBe(entry.artifact.size);
    }
  });

  it('no rompe la paridad web: normalizeCatalogManifest sigue idempotente tras añadir artifact', () => {
    const once = normalizeCatalogManifest(ACEMM_CATALOG['midi_2_cv']);
    const twice = normalizeCatalogManifest(once);
    expect(twice).toBe(once);
    expect(once.artifact.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});
