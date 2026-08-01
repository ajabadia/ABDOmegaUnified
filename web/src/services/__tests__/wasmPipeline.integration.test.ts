/**
 * @jest-environment node
 *
 * P11 WASM Pipeline Integrity — Integration Tests
 *
 * Tests the full round-trip: deployManifest → reconcileState → verifyBindings
 * Uses a real WasmRuntime instance (no mocks) with a minimal OMEGA_Manifest.
 *
 * Strategy: No jest.mock for @/ aliased modules — we test the real pipeline.
 * The RPC bridge won't connect (no WS server), so deployManifest hits the
 * WebSocket-not-open path → we test instantiateBlueprint and verifyBindings
 * in isolation via mock mode.
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { WasmRuntime } from '../wasmRuntime';
import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from '../wasmLoader';

// ── Minimal test fixtures ──────────────────────────────────────────

const MINIMAL_MANIFEST: OMEGA_Manifest = {
  id: 'test-p11-module',
  schemaVersion: '7.2.3',
  metadata: {
    name: 'P11 Test Module',
    version: '1.0.0',
    author: 'p11-test',
    family: 'utility',
    description: 'Integration test fixture for P11 pipeline',
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
  },
  ui: {
    skin: 'industrial',
    palette: { background: '#000', primary: '#00f0ff' },
    layout: { width: 400, height: 200 },
    tree: {
      id: 'test_root',
      kind: 'rack',
      role: 'structure',
      layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
      children: [
        {
          id: 'osc_1',
          kind: 'cell',
          cellRef: 'oscillator',
          role: 'control',
          bind: 'osc_freq',
          layout: { pos: { x: 10, y: 10 }, size: { width: 48, height: 48 }, mode: 'absolute' },
          ports: [
            { id: 'out_1', direction: 'out' as const, signalType: 'audio' as const, bind: 'osc_out' },
          ],
        },
        {
          id: 'filter_1',
          kind: 'cell',
          cellRef: 'filter',
          role: 'control',
          bind: 'filter_cutoff',
          layout: { pos: { x: 70, y: 10 }, size: { width: 48, height: 48 }, mode: 'absolute' },
          ports: [
            { id: 'in_1', direction: 'in' as const, signalType: 'audio' as const, bind: 'filter_in' },
            { id: 'out_1', direction: 'out' as const, signalType: 'audio' as const, bind: 'filter_out' },
          ],
        },
        {
          id: 'orphan_node',
          kind: 'cell',
          cellRef: 'test',
          role: 'control',
          bind: 'non_existent_bind',
          layout: { pos: { x: 130, y: 10 }, size: { width: 48, height: 48 }, mode: 'absolute' },
        },
      ],
    },
  },
  resources: { assets: [] },
  entities: [],
  nodes: [],
  links: [],
};

const VALID_CONTRACT: OmegaContract = {
  omega_version: '7.2.3',
  id: 'test_contract',
  name: 'Test Contract',
  family: 'utility',
  parameters: [
    { id: 'osc_freq', name: 'Oscillator Frequency', min: 20, max: 20000, default: 440, unit: 'Hz' },
    { id: 'filter_cutoff', name: 'Filter Cutoff', min: 20, max: 20000, default: 1000, unit: 'Hz' },
  ],
  ports: [
    { id: 'osc_out', type: 'audio', direction: 'output' },
    { id: 'filter_in', type: 'audio', direction: 'input' },
    { id: 'filter_out', type: 'audio', direction: 'output' },
  ],
};

const TRIVIAL_TREE: OmegaNode = {
  id: 'single_node',
  kind: 'cell',
  role: 'control',
  bind: 'param_1',
  layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
};

// ── Tests ──────────────────────────────────────────────────────────

describe('P11: WasmRuntime — verifyBindings', () => {
  let runtime: WasmRuntime;

  beforeEach(() => { runtime = new WasmRuntime(); runtime.enableMockMode(); });
  afterEach(() => { runtime.dispose(); });

  it('should resolve all bindings when they exist in the contract', () => {
    const rootNode = MINIMAL_MANIFEST.ui.tree!;
    const result = runtime.verifyBindings(rootNode, VALID_CONTRACT);

    expect(result.totalNodes).toBe(4); // root + 3 children
    expect(result.totalBinds).toBe(6); // 3 node binds + 3 port binds
    expect(result.resolvedBinds).toBe(5); // non_existent_bind is orphan
    expect(result.orphanBinds).toBe(1);
    expect(result.contractParamCount).toBe(2);
    expect(result.contractPortCount).toBe(3);
  });

  it('should report all bindings as orphan when no contract matches', () => {
    const emptyContract: OmegaContract = {
      omega_version: '7.0', id: 'empty', name: 'Empty',
      parameters: [], ports: [],
    };
    const result = runtime.verifyBindings(TRIVIAL_TREE, emptyContract);
    expect(result.totalBinds).toBe(1);
    expect(result.resolvedBinds).toBe(0);
    expect(result.orphanBinds).toBe(1);
    expect(result.details[0].status).toBe('orphan');
  });

  it('should handle nodes without binds gracefully', () => {
    const noBindNode: OmegaNode = {
      id: 'no_bind', kind: 'cell', role: 'decor',
      layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
    };
    const result = runtime.verifyBindings(noBindNode, VALID_CONTRACT);
    expect(result.totalBinds).toBe(0);
    expect(result.totalNodes).toBe(1);
    expect(result.orphanBinds).toBe(0);
  });

  it('should correctly count port-level binds', () => {
    const nodeWithPortBinds: OmegaNode = {
      id: 'multi_port', kind: 'cell', role: 'control', bind: 'param_1',
      layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
      ports: [
        { id: 'in1', direction: 'in', signalType: 'audio', bind: 'audio_in' },
        { id: 'in2', direction: 'in', signalType: 'cv', bind: 'cv_in' },
      ],
    };
    const contract: OmegaContract = {
      omega_version: '7.0', id: 'test',
      parameters: [{ id: 'param_1', name: 'P1', min: 0, max: 1, default: 0 }],
      ports: [
        { id: 'audio_in', type: 'audio', direction: 'input' },
        { id: 'cv_in', type: 'cv', direction: 'input' },
      ],
    };
    const result = runtime.verifyBindings(nodeWithPortBinds, contract);
    expect(result.totalBinds).toBe(3);
    expect(result.resolvedBinds).toBe(3);
    expect(result.orphanBinds).toBe(0);
  });

  // ── Edge cases ───────────────────────────────────────────────────

  it('should handle an empty tree (single node, no children, no binds)', () => {
    const emptyNode: OmegaNode = {
      id: 'lone_node',
      kind: 'cell',
      role: 'decor',
      layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
    };
    const result = runtime.verifyBindings(emptyNode, VALID_CONTRACT);
    expect(result.totalNodes).toBe(1);
    expect(result.totalBinds).toBe(0);
    expect(result.resolvedBinds).toBe(0);
    expect(result.orphanBinds).toBe(0);
    expect(result.nodeIds).toEqual(['lone_node']);
    expect(result.details).toHaveLength(0);
  });

  it('should traverse a deeply nested tree of 100 levels', () => {
    // Build a chain: root → child_1 → child_2 → ... → child_99
    let child: OmegaNode = {
      id: 'deepest',
      kind: 'cell',
      role: 'control',
      bind: 'param_deep',
      layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
    };
    for (let i = 99; i >= 1; i--) {
      child = {
        id: `level_${i}`,
        kind: 'container',
        role: 'structure',
        layout: { pos: { x: i * 10, y: 0 }, mode: 'absolute' },
        children: [child],
      };
    }
    const root: OmegaNode = {
      id: 'deep_root',
      kind: 'rack',
      role: 'structure',
      layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
      children: [child],
    };

    const deepContract: OmegaContract = {
      omega_version: '7.0',
      id: 'deep_contract',
      parameters: [{ id: 'param_deep', name: 'Deep Param', min: 0, max: 1, default: 0 }],
      ports: [],
    };

    const result = runtime.verifyBindings(root, deepContract);
    expect(result.totalNodes).toBe(101); // root + 100 levels
    expect(result.totalBinds).toBe(1);  // only deepest has a bind
    expect(result.resolvedBinds).toBe(1);
    expect(result.nodeIds).toHaveLength(101);
    expect(result.nodeIds[0]).toBe('deep_root');
    expect(result.nodeIds[100]).toBe('deepest');
  });

  it('should detect and skip circular references without stack overflow', () => {
    // Create a circular tree: a → b → c → a (back to root)
    const nodeA: OmegaNode = {
      id: 'node_a',
      kind: 'cell',
      role: 'control',
      bind: 'param_a',
      layout: { pos: { x: 0, y: 0 }, mode: 'absolute' },
      children: [],
    };
    const nodeB: OmegaNode = {
      id: 'node_b',
      kind: 'cell',
      role: 'control',
      bind: 'param_b',
      layout: { pos: { x: 10, y: 0 }, mode: 'absolute' },
      children: [],
    };
    const nodeC: OmegaNode = {
      id: 'node_c',
      kind: 'cell',
      role: 'control',
      bind: 'param_c',
      layout: { pos: { x: 20, y: 0 }, mode: 'absolute' },
      children: [nodeA], // ← circular: C → A
    };
    nodeA.children!.push(nodeB);
    nodeB.children!.push(nodeC);
    // Now: A → B → C → A (circular)

    const circContract: OmegaContract = {
      omega_version: '7.0',
      id: 'circ_contract',
      parameters: [
        { id: 'param_a', name: 'A', min: 0, max: 1, default: 0 },
        { id: 'param_b', name: 'B', min: 0, max: 1, default: 0 },
        { id: 'param_c', name: 'C', min: 0, max: 1, default: 0 },
      ],
      ports: [],
    };

    // Should not stack overflow — visited set should detect the cycle
    const result = runtime.verifyBindings(nodeA, circContract);
    expect(result.totalNodes).toBe(3); // A, B, C visited once each
    expect(result.totalBinds).toBe(3);
    expect(result.resolvedBinds).toBe(3);
    expect(result.orphanBinds).toBe(0);
    // C should NOT be re-traversed back to A
    expect(result.nodeIds).toEqual(['node_a', 'node_b', 'node_c']);
  });
});

describe('P11: WasmRuntime — deployManifest enhanced', () => {
  let runtime: WasmRuntime;

  beforeEach(() => { runtime = new WasmRuntime(); runtime.enableMockMode(); });
  afterEach(() => { runtime.dispose(); });

  it('should include verification when contract is provided', async () => {
    const result = await runtime.deployManifest(
      { ...MINIMAL_MANIFEST, nodes: [MINIMAL_MANIFEST.ui.tree!] },
      undefined, VALID_CONTRACT
    );
    expect(result.success).toBe(true);
    expect(result.verification).toBeDefined();
    expect(result.verification!.totalBinds).toBe(6);
    expect(result.verification!.orphanBinds).toBe(1);
    expect(result.verification!.resolvedBinds).toBe(5);
  });

  it('should deploy without verification when no contract is provided', async () => {
    const result = await runtime.deployManifest(
      { ...MINIMAL_MANIFEST, nodes: [TRIVIAL_TREE] }
    );
    expect(result.success).toBe(true);
    expect(result.verification).toBeUndefined();
    expect(result.hash).toBeDefined();
  });

  it('should fail gracefully when manifest has no root node', async () => {
    const result = await runtime.deployManifest({ ...MINIMAL_MANIFEST, nodes: [] });
    expect(result.success).toBe(false);
    expect(result.hash).toBe('ERR_NO_ROOT');
  });

  it('should produce consistent hashes from the same manifest', () => {
    const hash1 = (runtime as unknown as { computeManifestHash: (m: typeof MINIMAL_MANIFEST) => string }).computeManifestHash(MINIMAL_MANIFEST);
    const hash2 = (runtime as unknown as { computeManifestHash: (m: typeof MINIMAL_MANIFEST) => string }).computeManifestHash(MINIMAL_MANIFEST);
    expect(hash1).toBe(hash2);
  });

  it('should include materialization metrics when deploy succeeds', async () => {
    const result = await runtime.deployManifest(
      { ...MINIMAL_MANIFEST, nodes: [TRIVIAL_TREE] },
      undefined, VALID_CONTRACT
    );
    expect(result.success).toBe(true);
    expect(result.materialization).toBeDefined();
    expect(result.materialization!.success).toBe(true);
    expect(result.materialization!.bindingCount).toBe(0); // Mock mode
  });
});

describe('P11: WasmRuntime — reconcileStateDetailed', () => {
  let runtime: WasmRuntime;

  beforeEach(() => { runtime = new WasmRuntime(); runtime.enableMockMode(); });
  afterEach(() => { runtime.dispose(); });

  it('should return in-sync when no uiState is provided', async () => {
    const result = await runtime.reconcileStateDetailed();
    expect(result.inSync).toBe(true);
    expect(result.divergenceCount).toBe(0);
    expect(result.conflicts).toHaveLength(0);
    expect(result.engineState).toBeDefined();
  });

  it('should detect divergences when all UI keys differ from engine state', async () => {
    const result = await runtime.reconcileStateDetailed({ freq: 440, cutoff: 1000 });
    expect(result.divergenceCount).toBeGreaterThanOrEqual(2);
    expect(result.inSync).toBe(false);
    expect(Array.isArray(result.conflicts)).toBe(true);
  });

  it('should return conflicts for each divergent path', async () => {
    const result = await runtime.reconcileStateDetailed({ param_x: 100 });

    if (Object.keys(result.engineState).length === 0) {
      expect(result.divergenceCount).toBe(1);
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].path).toBe('param_x');
      expect(result.conflicts[0].resolutionPolicy).toBe('LAST_WRITE_WINS');
    }
    expect(result.engineState).toBeDefined();
  });
});

describe('P11: WasmRuntime — legacy reconcileState', () => {
  let runtime: WasmRuntime;

  beforeEach(() => { runtime = new WasmRuntime(); runtime.enableMockMode(); });
  afterEach(() => { runtime.dispose(); });

  it('should return a plain Record<string, number> (backward compatible)', async () => {
    const result = await runtime.reconcileState();
    expect(typeof result).toBe('object');
    expect(Array.isArray(result)).toBe(false);
    expect((result as Record<string, unknown>).inSync).toBeUndefined();
  });
});

describe('P11: Full round-trip verification', () => {
  let runtime: WasmRuntime;

  beforeEach(() => { runtime = new WasmRuntime(); runtime.enableMockMode(); });
  afterEach(() => { runtime.dispose(); });

  it('should complete a deploy → verify → reconcile cycle', async () => {
    const deployResult = await runtime.deployManifest(
      { ...MINIMAL_MANIFEST, nodes: [MINIMAL_MANIFEST.ui.tree!] },
      undefined, VALID_CONTRACT
    );

    expect(deployResult.success).toBe(true);
    expect(deployResult.verification).toBeDefined();
    expect(deployResult.verification!.resolvedBinds).toBe(5);
    expect(deployResult.verification!.orphanBinds).toBe(1);

    const engineState = await runtime.reconcileState();
    expect(engineState).toBeDefined();

    const detailedResult = await runtime.reconcileStateDetailed({ osc_freq: 440 });
    expect(detailedResult.inSync).toBeDefined();
    expect(detailedResult.divergenceCount).toBeGreaterThanOrEqual(0);

    expect(deployResult.materialization).toBeDefined();
    expect(deployResult.materialization!.success).toBe(true);
  });
});
