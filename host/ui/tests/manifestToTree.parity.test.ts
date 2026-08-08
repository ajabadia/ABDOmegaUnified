/**
 * Feed-test: manifestToTree parity with flatToTree.
 *
 * Purpose: proves the editor-side legacy migrator (manifestToTree) applies the
 * SAME cellRef derivation rules as the runtime adapter (flatToTree):
 *   - jacks (role:'io', type:*jack*, or component:'port') → cellRef:'port'
 *   - controls → cellRef from the VISUAL component (component-first),
 *     falling back to type
 *   - containers propagate their variant into node.style.variant
 *
 * Key regression guarded here: a midi_trigger-style jack arrives as
 * { type:'knob', component:'port' }. If the migrator used `type` as cellRef it
 * would render a knob instead of a port. Both converters must agree so that
 * editing a runtime-imported module never silently re-derives a different tree.
 */
import { describe, it, expect } from 'vitest';
import { manifestToTree } from '../omega-ui-core/uca/converters/manifestToTree.js';
import { flatToTree } from '../omega-ui-core/uca/converters/flatToTree.js';
import { treeToManifest } from '../omega-ui-core/uca/converters/treeToManifest.js';
import type { OmegaNode, OMEGA_Manifest } from '../omega-ui-core/types/manifest.js';

/**
 * Canonical editor-shaped fixture (Phase 18 canonical ACEMM): entities carry
 * id + role + presentation.component; containers carry numeric size.width.
 * Mirrors the runtime shape's midi_trigger counter-evidence (type:'knob' with
 * component:'port') to prove jack detection survives canonical input too.
 */
function canonicalManifestFixture(): any {
  return {
    id: 'midi_trigger',
    metadata: { rack: { hp: 8, units: '3U' } },
    ui: {
      skin: 'industrial',
      dimensions: { width: 60, height: 140 },
      controls: [
        {
          id: 'led_activity',
          type: 'knob',
          role: 'control',
          label: 'MIDI ACT',
          bind: 'led_activity',
          pos: { x: 30, y: 45 },
          size: { width: 12, height: 12 },
          presentation: {
            tab: 'MAIN',
            container: 'STATUS',
            component: 'led',
            variant: 'red_3mm',
          },
        },
      ],
      jacks: [
        {
          id: 'midi_out',
          type: 'knob',
          role: 'io',
          label: 'MIDI OUT',
          bind: 'midi_out',
          pos: { x: 30, y: 65 },
          size: { width: 12, height: 12 },
          presentation: {
            tab: 'MAIN',
            container: 'BUS',
            component: 'port',
            variant: 'industrial',
          },
        },
      ],
      layout: {
        containers: [
          {
            id: 'STATUS',
            label: 'STATUS',
            pos: { x: 4, y: 4 },
            size: { width: 340, height: 120 },
            variant: 'industrial',
            tab: 'MAIN',
            zIndex: 0,
          },
          {
            id: 'BUS',
            label: 'BUS',
            pos: { x: 4, y: 130 },
            size: { width: 340, height: 40 },
            variant: 'glass',
            tab: 'MAIN',
            zIndex: 0,
          },
        ],
      },
    },
  } as OMEGA_Manifest;
}

function findNode(tree: OmegaNode, id: string): OmegaNode | undefined {
  if (tree.id === id) return tree;
  for (const child of tree.children || []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

describe('manifestToTree — parity with flatToTree cellRef derivation', () => {
  it('builds root rack + MAIN_FACE with containers and propagates variant', () => {
    const tree = manifestToTree(canonicalManifestFixture());

    expect(tree.kind).toBe('rack');
    expect(tree.role).toBe('root');
    expect(tree.children?.length).toBe(1);

    const face = tree.children?.[0];
    expect(face?.id).toBe('MAIN_FACE');
    expect(face?.kind).toBe('face');

    const status = findNode(tree, 'STATUS');
    expect(status?.kind).toBe('container');
    expect(status?.layout?.size).toEqual({ width: 340, height: 120 });
    expect(status?.style?.variant).toBe('industrial');

    const bus = findNode(tree, 'BUS');
    expect(bus?.style?.variant).toBe('glass');
  });

  it('maps a canonical jack (role:io + type:knob + component:port) to cellRef:port', () => {
    const tree = manifestToTree(canonicalManifestFixture());

    const jack = findNode(tree, 'midi_out');
    expect(jack).toBeDefined();
    expect(jack!.kind).toBe('cell');
    expect(jack!.cellRef).toBe('port');
    expect(jack!.role).toBe('io');
    expect(jack!.bind).toBe('midi_out');

    const bus = findNode(tree, 'BUS');
    expect(bus?.children?.some((c) => c.id === 'midi_out')).toBe(true);
  });

  it('maps a control (type:knob + component:led) to cellRef:led from the visual component', () => {
    const tree = manifestToTree(canonicalManifestFixture());

    const led = findNode(tree, 'led_activity');
    expect(led).toBeDefined();
    expect(led!.kind).toBe('cell');
    expect(led!.cellRef).toBe('led');
    expect(led!.role).toBe('control');
    expect(led!.layout?.pos).toEqual({ x: 30, y: 45 });

    const status = findNode(tree, 'STATUS');
    expect(status?.children?.some((c) => c.id === 'led_activity')).toBe(true);
  });

  it('preserves editor edits when existingTree is supplied', () => {
    const first = manifestToTree(canonicalManifestFixture());

    const edited = JSON.parse(JSON.stringify(first)) as OmegaNode;
    const led = findNode(edited, 'led_activity');
    if (!led) throw new Error('led_activity missing');
    led.layout!.pos = { x: 77, y: 12 };
    led.layout!.zIndex = 9;
    led.meta = { label: 'RENAMED LED' };

    const second = manifestToTree(canonicalManifestFixture(), edited);
    const led2 = findNode(second, 'led_activity');
    expect(led2?.layout?.pos).toEqual({ x: 77, y: 12 });
    expect(led2?.layout?.zIndex).toBe(9);
    expect(led2?.meta?.label).toBe('RENAMED LED');

    const jack2 = findNode(second, 'midi_out');
    expect(jack2?.cellRef).toBe('port');
  });

  it('round-trips through flatToTree with identical cellRef derivation', () => {
    // A canonical manifest migrated to a tree and then fed back through
    // flatToTree (existingTree) must keep cellRef/role stable — no drift.
    const first = manifestToTree(canonicalManifestFixture());

    const round = flatToTree(canonicalManifestFixture(), first);
    expect(findNode(round, 'midi_out')?.cellRef).toBe('port');
    expect(findNode(round, 'led_activity')?.cellRef).toBe('led');
    expect(findNode(round, 'led_activity')?.role).toBe('control');
  });

  it('treeToManifest preserves container and cell variants on round-trip', () => {
    // Editor saves a tree back to legacy arrays: variant must survive on both
    // the container and the cell's presentation — never hardcoded to 'default'.
    const tree = manifestToTree(canonicalManifestFixture());

    const ui = treeToManifest(tree);
    const bus = ui.jacks?.[0];
    const status = ui.layout?.containers?.find(c => c.id === 'STATUS');
    const busContainer = ui.layout?.containers?.find(c => c.id === 'BUS');

    expect(bus?.presentation?.component).toBe('port');
    expect(bus?.presentation?.variant).toBe('industrial');

    expect(status?.variant).toBe('industrial');
    expect(busContainer?.variant).toBe('glass');
  });
});
