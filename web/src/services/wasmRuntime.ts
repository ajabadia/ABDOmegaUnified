/**
 * @purpose Gestiona actualizaciones de parámetros en tiempo real y ejecución a través de un puente WASM en el editor de manifesto OMEGA.
 * @purpose_en Manages real-time parameter updates and execution through a WASM bridge in the OMEGA manifest editor.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:2,imports:6,sig:new
 * @lastUpdated 2026-06-22
 */

/**
 * OMEGA WASM BRIDGE - ERA 7.2.3
 * Sovereign Adapter for real-time DSP execution via UCA Tree.
 */

import type { OMEGA_Manifest, OmegaNode } from '@/omega-ui-core/types/manifest';
import type { OmegaContract } from './wasmLoader';
import { OmegaRPCBridge } from './rpc/omegaRPCBridge';
import type { 
  SyncStatus, 
  MaterializationResult, 
  ReconciliationResult, 
  BindingVerification,
  DeploymentResult
} from './rpc/rpcTypes';
import type { IEventBus } from '@/omega-ui-core/di/EventBus';
import { emitEvent } from './globalEventBus';
import { reconciliationService as legacyReconciliationService } from './reconciliationService';

export class WasmRuntime {
  private rpc: OmegaRPCBridge;
  private isMock: boolean = false;
  private mockValues: Record<string, number> = {};
  
  // Phase 20.8: Delta Batching Buffer
  private deltaBuffer: Map<string, number> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_WINDOW_MS = 16; // 60Hz Target

  private reconciliationSvc: typeof legacyReconciliationService;

  constructor(private eventBus?: IEventBus, reconciliationService?: typeof legacyReconciliationService) {
    // Initialize RPC bridge for industrial DSP communication
    this.rpc = new OmegaRPCBridge();
    this.reconciliationSvc = reconciliationService ?? legacyReconciliationService;
    this.startBatchTimer();
  }

  private startBatchTimer() {
    if (this.batchTimer) return;
    this.batchTimer = setInterval(() => this.flushDeltas(), this.BATCH_WINDOW_MS);
  }

  /**
   * connect
   * Establishes the link to the external audio engine (WASM Worker or Native Host).
   */
  connect(onStatusChange?: (status: SyncStatus) => void) {
    this.rpc.connect(onStatusChange);
    emitEvent(this.eventBus, 'wasm:connected', { transport: 'RPC' });
  }

  /**
   * setParameter
   * Fast-path for real-time parameter deltas.
   * Uses hierarchical UCA paths for deterministic binding.
   */
  setParameter(id: string, value: number) {
    if (this.isMock) {
      this.mockValues[id] = value;
      return;
    }

    // Industrial Validation: Ensure we are using Hierarchical Path Addressing (HPA)
    if (!id.includes('/')) {
      console.warn(`[WASM-BRIDGE] Received non-hierarchical ID: ${id}. HPA is required for Era 7.2.3.`);
    }

    // Phase 20.8: Buffer delta instead of immediate transmission
    this.deltaBuffer.set(id, value);
  }

  /**
   * flushDeltas
   * Aggregates and sends all buffered deltas to the bridge.
   */
  private flushDeltas() {
    if (this.deltaBuffer.size === 0) return;

    const startTime = Date.now();
    const batchSize = this.deltaBuffer.size;
    const deltas = Array.from(this.deltaBuffer.entries()).map(([targetId, value]) => ({
      targetId,
      value
    }));

    // Clear buffer BEFORE sending to avoid race conditions with high-frequency updates
    this.deltaBuffer.clear();

    this.rpc.applyDeltaBatch(deltas);

    const durationMs = Date.now() - startTime;
    emitEvent(this.eventBus, 'wasm:delta:applied', { count: batchSize, latency: durationMs });
  }
  /**
   * reconcileState (Phase 20.9)
   * Triggers a full state comparison and reconciliation.
   * Legacy mode: returns raw engine state as a flat record.
   * Returns empty state in mock mode (no RPC bridge required).
   */
  async reconcileState(): Promise<Record<string, number>> {
    if (this.isMock) return {};
    return this.rpc.requestEngineState();
  }

  /**
   * reconcileStateDetailed (Phase 20.9) — P11 Enhanced
   * Full reconciliation cycle: compares UI state against engine state,
   * detects divergences, and resolves using the reconciliation service.
   * In mock mode, returns simulated results without RPC bridge.
   */
  async reconcileStateDetailed(uiState?: Record<string, number>): Promise<ReconciliationResult> {
    if (this.isMock) {
      if (!uiState || Object.keys(uiState).length === 0) {
        return {
          inSync: true,
          divergenceCount: 0,
          divergences: [],
          conflicts: [],
          engineState: {}
        };
      }
      // Simulate divergence: all UI keys are absent from empty engine state
      const divergences = Object.keys(uiState);
      const conflicts = divergences.map(path =>
        this.reconciliationSvc.resolveConflict(
          path,
          uiState[path],
          0,
          'LAST_WRITE_WINS'
        )
      );
      return {
        inSync: false,
        divergenceCount: divergences.length,
        divergences,
        conflicts,
        engineState: {}
      };
    }

    const engineState = await this.rpc.requestEngineState();
    
    if (!uiState || Object.keys(uiState).length === 0) {
      return {
        inSync: true,
        divergenceCount: 0,
        divergences: [],
        conflicts: [],
        engineState
      };
    }

    const divergences = this.reconciliationSvc.detectDivergence(
      uiState as unknown as Record<string, unknown>,
      engineState as unknown as Record<string, unknown>
    );

    const conflicts = divergences.map(path =>
      this.reconciliationSvc.resolveConflict(
        path,
        uiState[path],
        engineState[path],
        'LAST_WRITE_WINS'
      )
    );

    return {
      inSync: divergences.length === 0,
      divergenceCount: divergences.length,
      divergences,
      conflicts,
      engineState
    };
  }

  /**
   * deployManifest — P11 Enhanced
   * High-fidelity structural synchronization.
   * Sends the full canonical OmegaNode tree to the engine.
   * Optionally validates bindings against an OmegaContract.
   * In mock mode, performs verification + materialization without RPC bridge.
   */
  async deployManifest(
    manifest: OMEGA_Manifest, 
    options?: { isHotReload?: boolean },
    contract?: OmegaContract
  ): Promise<DeploymentResult> {
    const mode = options?.isHotReload ? '[HOT-RELOAD]' : '[MANUAL]';
    const rootNode = manifest.nodes?.[0];

    if (!rootNode) {
      console.error('WASM-BRIDGE: Cannot deploy manifest without root OmegaNode.');
      emitEvent(this.eventBus, 'wasm:deploy', { status: 'ERR_NO_ROOT' });
      return { success: false, hash: 'ERR_NO_ROOT' };
    }

    console.log(`OMEGA HIL: ${mode} Deploying UCA Tree for '${manifest.id}'...`);

    // Pre-deployment binding verification (P11) — no RPC needed
    const verification = contract ? this.verifyBindings(rootNode, contract) : undefined;
    
    if (verification && verification.orphanBinds > 0) {
      console.warn(
        `WASM-BRIDGE: ${verification.orphanBinds} orphan bind(s) detected. ` +
        `Deploying with ${verification.resolvedBinds}/${verification.totalBinds} valid bindings.`
      );
    }

    // Materialization (no RPC needed — uses verifyBindings internally)
    const instance = this.instantiateBlueprint(rootNode, contract);

    if (this.isMock) {
      // Skip RPC bridge entirely in mock mode
      const hash = this.computeManifestHash(manifest);
      emitEvent(this.eventBus, 'wasm:deploy', { status: 'MOCK_SUCCESS' });
      return { success: true, hash, materialization: instance, verification };
    }

    try {
      // Resolve and Validate via Bridge (Phase 20.4)
      const result = await this.rpc.syncSnapshot({
        manifestVersion: manifest.schemaVersion || '7.2.3',
        documentId: manifest.id || 'anonymous',
        graph: rootNode,
        modulations: manifest.links || manifest.modulations || []
      }, manifest);

      if (!result.success) {
        throw new Error(result.error || 'Engine rejected snapshot or timed out');
      }

      const hash = this.computeManifestHash(manifest);
      emitEvent(this.eventBus, 'wasm:deploy', { status: 'SUCCESS' });
      return { success: true, hash, materialization: instance, verification };
    } catch (err) {
      console.error('WASM-BRIDGE: Deployment failed:', err);
      emitEvent(this.eventBus, 'wasm:deploy', { status: 'DEPLOY_FAIL' });
      return { success: false, hash: 'ERR_DEPLOY_FAIL' };
    }
  }

  /**
   * verifyBindings — P11
   * Public method to validate all bindings in an OmegaNode tree against an OmegaContract.
   * Returns a structured verification report.
   */
  verifyBindings(graph: OmegaNode, contract: OmegaContract): BindingVerification {
    const contractParamIds = new Set(contract.parameters.map(p => p.id));
    const contractPortIds = new Set(contract.ports.map(p => p.id));
    const allContractIds = new Set([...contractParamIds, ...contractPortIds]);
    
    const details: BindingVerification['details'] = [];
    const nodeIds: string[] = [];
    const visited = new Set<string>();
    let totalNodes = 0;
    let totalBinds = 0;
    let resolvedBinds = 0;
    let orphanBinds = 0;

    const walk = (node: OmegaNode) => {
      // Circular reference detection — skip if already visited
      if (visited.has(node.id)) {
        console.warn(`[WASM-BRIDGE] Circular reference detected: node '${node.id}' already visited. Skipping.`);
        return;
      }
      visited.add(node.id);

      totalNodes++;
      nodeIds.push(node.id);

      // Check node-level bind
      if (node.bind) {
        totalBinds++;
        if (allContractIds.has(node.bind)) {
          resolvedBinds++;
          details.push({ nodeId: node.id, bind: node.bind, status: 'resolved' });
        } else {
          orphanBinds++;
          details.push({ nodeId: node.id, bind: node.bind, status: 'orphan' });
        }
      }

      // Check port-level binds
      if (node.ports) {
        for (const port of node.ports) {
          if (port.bind) {
            totalBinds++;
            const portNodeId = `${node.id}/${port.id}`;
            if (allContractIds.has(port.bind)) {
              resolvedBinds++;
              details.push({ nodeId: portNodeId, bind: port.bind, status: 'resolved' });
            } else {
              orphanBinds++;
              details.push({ nodeId: portNodeId, bind: port.bind, status: 'orphan' });
            }
          }
        }
      }

      // Recurse into children
      if (node.children) {
        for (const child of node.children) {
          walk(child);
        }
      }
    };

    walk(graph);

    return {
      totalNodes,
      totalBinds,
      resolvedBinds,
      orphanBinds,
      contractParamCount: contract.parameters.length,
      contractPortCount: contract.ports.length,
      nodeIds,
      details
    };
  }

  /**
   * instantiateBlueprint (Phase 20.4) — P11 Enhanced
   * Atomic construction of runtime objects from canonical graph.
   * Delegates tree traversal to verifyBindings and wraps results as MaterializationResult.
   */
  private instantiateBlueprint(
    graph: OmegaNode,
    contract?: OmegaContract
  ): MaterializationResult {
    if (this.isMock) {
      return { 
        success: true, 
        nodeCount: 0, 
        bindingCount: 0, 
        orphanBindings: [], 
        boundNodes: [],
        materializedNodeIds: [] 
      };
    }

    // Reuse verifyBindings for tree traversal — no duplicate walk
    const verification = contract ? this.verifyBindings(graph, contract) : undefined;

    if (!verification) {
      // No contract — just report node count without binding details
      let nodeCount = 0;
      const materializedNodeIds: string[] = [];
      const visited = new Set<string>();
      const walk = (node: OmegaNode) => {
        if (visited.has(node.id)) return;
        visited.add(node.id);
        nodeCount++;
        materializedNodeIds.push(node.id);
        if (node.children) node.children.forEach(walk);
      };
      walk(graph);
      return { success: true, nodeCount, bindingCount: 0, orphanBindings: [], boundNodes: [], materializedNodeIds };
    }

    return {
      success: true,
      nodeCount: verification.totalNodes,
      bindingCount: verification.totalBinds,
      orphanBindings: verification.details
        .filter(d => d.status === 'orphan')
        .map(d => ({ nodeId: d.nodeId, bind: d.bind })),
      boundNodes: verification.details.map(d => ({
        nodeId: d.nodeId,
        bind: d.bind,
        resolved: d.status === 'resolved'
      })),
      materializedNodeIds: verification.nodeIds // All node IDs, including nodes without binds
    };
  }

  private computeManifestHash(manifest: OMEGA_Manifest): string {
    // Simple deterministic hash for UI/Audit tracking
    const str = JSON.stringify(manifest.ui?.tree || {});
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).toUpperCase();
  }

  /**
   * enableMockMode
   * Diagnostic bypass for offline testing.
   */
  enableMockMode() {
    this.isMock = true;
    console.warn('WASM-BRIDGE: Mock mode enabled. DSP execution is simulated.');
  }

  /**
   * dispose
   * Cleanup — stops the batch timer so Node.js can exit cleanly in tests.
   */
  dispose() {
    if (this.batchTimer !== null) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    this.rpc.disconnect();
  }

  /**
   * loadWasm
   * Binary ingestion for self-descriptive modules.
   */
  async loadWasm(buffer: ArrayBuffer): Promise<boolean> {
    if (this.isMock) return true;
    
    try {
      // In Industrial RPC (Phase 20.3), the binary is often sent separately or bundled.
      // Here we simulate the ACK from the engine for the binary stream.
      console.log(`WASM-BRIDGE: Uploading binary payload (${buffer.byteLength} bytes)...`);
      
      // In a real scenario, this would use a dedicated RPC message:
      // await this.rpc.sendBinary(buffer);
      
      return true;
    } catch (err) {
      console.error('WASM-BRIDGE: Binary load failed:', err);
      return false;
    }
  }

  getStatus() {
    return this.rpc.getStatus();
  }

  /**
   * getTelemetry
   * Real-time signal polling for HUD rendering.
   */
  getTelemetry(_nodeId: string): number {
    if (this.isMock) return Math.random(); // Simulation mode
    return 0; // Runtime value placeholder
  }
}

/**
 * Lazy singleton — creates the WasmRuntime instance on first access, not on module import.
 * This avoids timers (setInterval) being created during module evaluation in tests.
 */
let _wasmRuntime: WasmRuntime | null = null;

function getWasmRuntimeSingleton(): WasmRuntime {
  if (!_wasmRuntime) {
    _wasmRuntime = new WasmRuntime();
  }
  return _wasmRuntime;
}

/**
 * Proxy-based singleton that defers instance creation until first property access.
 * Backward compatible: existing callers using `import { wasmRuntime }` work unchanged.
 */
export const wasmRuntime: WasmRuntime = new Proxy({} as WasmRuntime, {
  get(_target, prop: string | symbol) {
    return (getWasmRuntimeSingleton() as unknown as Record<string | symbol, unknown>)[prop];
  }
});
