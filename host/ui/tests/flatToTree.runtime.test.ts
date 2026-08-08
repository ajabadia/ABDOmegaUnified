/**
 * Feed-test: flatToTree adapter against the C++ runtime exporter shape.
 *
 * Purpose: proves the adapter converts the ACTUAL runtime output of
 * ExportUI.cpp / ExportControls.cpp / ExportAttachments.cpp (flat ui.controls /
 * ui.jacks with NO id/role/size on items, string container size.w) into a
 * canonical OmegaNode tree that ManifestRenderer.renderModulePanel and
 * collectBindingsFromTree accept — WITHOUT clobbering prior editor edits.
 *
 * Key regression guarded here: a runtime jack arrives as { type: 'string',
 * component: 'port' } (no role). If the adapter used `type` as cellRef, the
 * jack would land as cellRef:'string' → "NO RENDERER: string" and binding kind
 * 'knob'. The adapter must derive cellRef from the visual component (port) and
 * the role as 'io'.
 */
import { describe, it, expect } from 'vitest';
import { flatToTree } from '../omega-ui-core/uca/converters/flatToTree.js';
import { collectBindingsFromTree } from '../omega-ui-core/types/panelRenderer.js';
import { ManifestRenderer } from '../src/Renderers/ManifestRenderer.js';
import type { OmegaNode, OMEGA_Manifest } from '../omega-ui-core/types/manifest.js';

/**
 * Runtime-shaped fixture mirroring ExportUI.cpp / ExportControls.cpp exactly:
 * - items carry ONLY { bind, type, label, pos:{x,y}, presentation:{...} }
 * - containers carry size.w as a juce::String, size.h as a float
 * - NO id, NO role, NO presentation.size on items
 */
function runtimeManifestFixture(): any {
  return {
    id: 'midi_in',
    metadata: { rack: { hp: 8, units: '3U' } },
    ui: {
      skin: 'industrial',
      dimensions: { width: 60, height: 140 },
      controls: [
        {
          bind: 'led_activity',
          type: 'knob',
          label: 'MIDI ACT',
          pos: { x: 30, y: 45 },
          presentation: {
            tab: 'MAIN',
            container: 'STATUS',
            group: undefined,
            component: 'led',
            variant: 'red_3mm',
            attachments: [
              { type: 'label', position: 'bottom', bind: 'led_activity', text: 'MIDI ACT', variant: 'B_cyan', offset: 0 },
            ],
          },
        },
      ],
      jacks: [
        {
          bind: 'midi_out',
          type: 'string',
          label: 'MIDI OUT',
          pos: { x: 30, y: 65 },
          presentation: {
            tab: 'MAIN',
            container: 'BUS',
            group: undefined,
            component: 'port',
            variant: 'industrial',
            attachments: [],
          },
        },
      ],
      layout: {
        gridSnap: false,
        containers: [
          { id: 'STATUS', label: 'STATUS', pos: { x: 4, y: 4 }, size: { w: '340', h: 120 }, variant: 'industrial', tab: 'MAIN', zIndex: 0, labelPosition: 'top' },
          { id: 'BUS', label: 'BUS', pos: { x: 4, y: 130 }, size: { w: '340', h: 40 }, variant: 'industrial', tab: 'MAIN', zIndex: 0, labelPosition: 'top' },
        ],
      },
    },
  };
}

function findNode(tree: OmegaNode, id: string): OmegaNode | undefined {
  if (tree.id === id) return tree;
  for (const child of tree.children || []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

describe('flatToTree — runtime ACEMM exporter shape', () => {
  it('builds root rack + MAIN_FACE with container children', () => {
    const tree = flatToTree(runtimeManifestFixture());

    expect(tree.kind).toBe('rack');
    expect(tree.role).toBe('root');
    expect(tree.children?.length).toBe(1);

    const face = tree.children?.[0];
    expect(face).toBeDefined();
    expect(face!.id).toBe('MAIN_FACE');
    expect(face!.kind).toBe('face');

    const containers = (face?.children || []).filter((c) => c.kind === 'container');
    expect(containers.map((c) => c.id).sort()).toEqual(['BUS', 'STATUS']);

    const status = containers.find((c) => c.id === 'STATUS');
    expect(status?.layout?.size).toEqual({ width: 340, height: 120 });
    expect(status?.style?.variant).toBe('industrial');
  });

  it('places the led control in its STATUS container with cellRef from component', () => {
    const tree = flatToTree(runtimeManifestFixture());

    const led = findNode(tree, 'led_activity');
    expect(led).toBeDefined();
    expect(led!.kind).toBe('cell');
    expect(led!.cellRef).toBe('led');
    expect(led!.role).toBe('control');
    expect(led!.bind).toBe('led_activity');
    expect(led!.layout?.pos).toEqual({ x: 30, y: 45 });

    // Parentage: parent chain leads to STATUS container under MAIN_FACE.
    const status = findNode(tree, 'STATUS');
    expect(status?.children?.some((c) => c.id === 'led_activity')).toBe(true);
  });

  it('maps a runtime jack { type:string, component:port } to cellRef:port + role:io', () => {
    const tree = flatToTree(runtimeManifestFixture());

    const jack = findNode(tree, 'midi_out');
    expect(jack).toBeDefined();
    expect(jack!.kind).toBe('cell');
    expect(jack!.cellRef).toBe('port');
    expect(jack!.role).toBe('io');
    expect(jack!.bind).toBe('midi_out');

    const bus = findNode(tree, 'BUS');
    expect(bus?.children?.some((c) => c.id === 'midi_out')).toBe(true);
  });

  it('collectBindingsFromTree yields led→knob and port→jack bindings', () => {
    const manifest = runtimeManifestFixture() as OMEGA_Manifest;
    const tree = flatToTree(manifest);
    const bindings = collectBindingsFromTree(tree, manifest);

    const byId = new Map(bindings.map((b) => [b.nodeId, b]));
    expect(byId.get('led_activity')?.kind).toBe('knob');
    expect(byId.get('midi_out')?.kind).toBe('jack');
    expect(byId.get('led_activity')?.name).toBe('MIDI ACT');
    expect(byId.get('midi_out')?.name).toBe('MIDI OUT');
  });

  it('renderModulePanel returns non-empty HTML with NO unsupported-renderer', () => {
    const manifest = runtimeManifestFixture() as OMEGA_Manifest;
    manifest.ui!.tree = flatToTree(manifest);

    const html = ManifestRenderer.renderModulePanel(manifest);
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain('omega-module-chassis');
    expect(html).not.toContain('NO RENDERER');
    expect(html).not.toContain('unsupported-renderer');
  });

  it('preserves editor edits when existingTree is supplied', () => {
    const first = flatToTree(runtimeManifestFixture());

    // Simulate an editor edit: move the led and tag a custom label + zIndex.
    const edited = JSON.parse(JSON.stringify(first)) as OmegaNode;
    const led = findNode(edited, 'led_activity');
    if (!led) throw new Error('led_activity missing');
    led.layout!.pos = { x: 77, y: 12 };
    led.layout!.zIndex = 9;
    led.meta = { label: 'RENAMED LED' };

    const second = flatToTree(runtimeManifestFixture(), edited);
    const led2 = findNode(second, 'led_activity');
    expect(led2?.layout?.pos).toEqual({ x: 77, y: 12 });
    expect(led2?.layout?.zIndex).toBe(9);
    expect(led2?.meta?.label).toBe('RENAMED LED');
    // Fresh nodes without edits still derive from the runtime shape.
    const jack2 = findNode(second, 'midi_out');
    expect(jack2?.cellRef).toBe('port');
  });
});
