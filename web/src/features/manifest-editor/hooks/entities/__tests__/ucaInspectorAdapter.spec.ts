/**
 * @jest-environment jsdom
 *
 * Tests for UCA Inspector Adapter & Immutable Mutations
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import type { OmegaNode } from '@/omega-ui-core/types/manifest';
import { findNodeInTree, updateNodeInTree, adaptNodeToManifestEntity } from '../ucaInspectorAdapter';

describe('ucaInspectorAdapter', () => {
  const mockTree: OmegaNode = {
    id: 'rack_master',
    kind: 'rack',
    layout: { pos: { x: 0, y: 0 } },
    children: [
      {
        id: 'main_face',
        kind: 'face',
        layout: { pos: { x: 0, y: 0 } },
        children: [
          {
            id: 'container_vcf',
            kind: 'container',
            layout: { pos: { x: 10, y: 10 }, size: { width: 100, height: 100 } },
            children: [
              {
                id: 'cutoff_knob',
                kind: 'cell',
                cellRef: 'moog_knob_01',
                bind: 'vcf.cutoff',
                role: 'control',
                layout: { pos: { x: 0, y: 0 } },
                style: { color: 'red' },
              },
            ],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    // Clears any memoization between tests
    jest.resetModules();
  });

  it('should find deep nodes in the tree recursively (and memoize them)', () => {
    const node = findNodeInTree(mockTree, 'cutoff_knob');
    expect(node).not.toBeUndefined();
    expect(node?.id).toBe('cutoff_knob');
    expect(node?.cellRef).toBe('moog_knob_01');

    // Test memoization: second call should return same instance
    const nodeAgain = findNodeInTree(mockTree, 'cutoff_knob');
    expect(nodeAgain).toBe(node);
  });

  it('should return undefined for missing nodes', () => {
    const node = findNodeInTree(mockTree, 'ghost_node');
    expect(node).toBeUndefined();
  });

  it('should adapt an OmegaNode to a transient ManifestEntity correctly', () => {
    const node = findNodeInTree(mockTree, 'cutoff_knob');
    expect(node).not.toBeUndefined();
    const entity = adaptNodeToManifestEntity(node!);

    expect(entity.id).toBe('cutoff_knob');
    expect(entity.type).toBe('moog_knob_01'); // fallback to cellRef
    expect(entity.role).toBe('control');
    expect(entity.bind).toBe('vcf.cutoff');
  });

  it('should immutably update a deep node without mutating the original tree', () => {
    // Ensure first find populates memo
    const preNode = findNodeInTree(mockTree, 'cutoff_knob');
    expect(preNode?.style?.color).toBe('red');

    const nextTree = updateNodeInTree(mockTree, 'cutoff_knob', {
      bind: 'vcf.resonance',
      presentation: {
        component: 'moog_knob_01',
        variant: 'moog_knob_02', // maps to cellRef
        tab: 'MAIN',
        offsetX: 0,
        offsetY: 0,
        attachments: [],
        style: { color: 'blue' }, // merges into style
      },
    });

    // Original tree should not be mutated
    const originalNode = findNodeInTree(mockTree, 'cutoff_knob');
    expect(originalNode?.bind).toBe('vcf.cutoff');
    expect(originalNode?.style?.color).toBe('red');

    // New tree should reflect changes
    const updatedNode = findNodeInTree(nextTree, 'cutoff_knob');
    expect(updatedNode).not.toBeUndefined();
    expect(updatedNode?.bind).toBe('vcf.resonance');
    expect(updatedNode?.cellRef).toBe('moog_knob_02');
    expect(updatedNode?.style?.color).toBe('blue');

    // Immutable branch preservation: other nodes should maintain referential equality
    expect(nextTree.children![0]).not.toBe(mockTree.children![0]); // Face changed because child changed
    expect(nextTree.children![0].id).toBe('main_face');
  });
});
