/* =================================================================
   DO NOT EDIT - Synced from ABDOmegaEditor/omega-ui-core
   Any changes here will be OVERWRITTEN by sync_omega_ui.bat
   Edit the source at: ABDOmegaEditor/src/omega-ui-core/
   Sync Timestamp: 2026-06-25 12:16:06
   ================================================================= */

/**
 * Recursive Hierarchy Tests (Phase 17.3 - Extended)
 */
import { blueprintToTree } from './ucaBridge';
import type { BlueprintDefinition, OmegaBlueprintNode } from '../types/manifest';

describe('recursivePath — blueprintToTree', () => {
  const nestedBlueprint: BlueprintDefinition = {
    blueprintId: 'voice_module',
    version: '1.0.0',
    name: 'Voice Module',
    origin: 'system',
    rootNode: {
      id: 'voice_1',
      kind: 'container',
      role: 'logic-group',
      layout: { pos: { x: 0, y: 0 } },
      children: [
        {
          id: 'osc_1',
          kind: 'container',
          role: 'logic-group',
          layout: { pos: { x: 0, y: 0 } },
          children: [
            {
              id: 'frequency_cell',
              kind: 'cell',
              role: 'control',
              layout: { pos: { x: 0, y: 0 } },
              ports: [
                { id: 'freq_in', direction: 'in', signalType: 'cv', label: 'Frequency In' },
              ],
              modulationTargets: ['freq_in'],
            } as OmegaBlueprintNode,
          ],
        } as OmegaBlueprintNode,
      ],
    } as OmegaBlueprintNode,
    placeholders: [],
    compatibility: {},
  };

  it('should prefix hierarchical IDs correctly', () => {
    const result = blueprintToTree(nestedBlueprint, {});
    const root = result.tree;
    const mid = root.children?.[0];
    const leaf = mid?.children?.[0];

    expect(root.id).toBe('voice_1');
    expect(mid?.id).toBe('voice_1/osc_1');
    expect(leaf?.id).toBe('voice_1/osc_1/frequency_cell');
  });

  it('should prefix deep port IDs correctly', () => {
    const result = blueprintToTree(nestedBlueprint, {});
    const leaf = result.tree.children?.[0]?.children?.[0];
    const portId = leaf?.ports?.[0]?.id;
    expect(portId).toBe('voice_1/osc_1/frequency_cell/freq_in');
  });

  it('should prefix modulation targets correctly', () => {
    const result = blueprintToTree(nestedBlueprint, {});
    const leaf = result.tree.children?.[0]?.children?.[0];
    const target = leaf?.modulationTargets?.[0];
    expect(target).toBe('voice_1/osc_1/frequency_cell/freq_in');
  });

  it('should preserve absolute root IDs', () => {
    const absoluteBlueprint: BlueprintDefinition = {
      ...nestedBlueprint,
      rootNode: { ...nestedBlueprint.rootNode, id: '/global/voice_0' },
    };
    const result = blueprintToTree(absoluteBlueprint, {});
    expect(result.tree.id).toBe('/global/voice_0');
  });

  it('should preserve absolute child IDs', () => {
    const childAbsBlueprint: BlueprintDefinition = {
      ...nestedBlueprint,
      rootNode: {
        ...nestedBlueprint.rootNode,
        children: [
          { ...nestedBlueprint.rootNode.children![0], id: '/shared/osc_common' },
        ],
      },
    };
    const result = blueprintToTree(childAbsBlueprint, {});
    const absChild = result.tree.children?.[0];
    expect(absChild?.id).toBe('/shared/osc_common');
  });
});
