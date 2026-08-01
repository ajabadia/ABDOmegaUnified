/**
 * @purpose Gestiona conexiones WebSocket para comunicación RPC de alta fidelidad con validación de ACK, monitoreo de pulso y bufferización del delta en el editor de manifesto OMEGA.
 * @purpose_en Manages WebSocket connections for high-fidelity RPC communication with ACK validation, heartbeat monitoring, and delta buffering in the OMEGA manifest editor.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:7,sig:new
 * @lastUpdated 2026-06-22
 */

import type { 
  SyncStatus, 
  RPCRequest, 
  RPCResponse, 
  SnapshotParams, 
  DeltaPatch
} from './rpcTypes';
import { RPCErrors } from './rpcTypes';
import type { IEventBus } from '@/omega-ui-core/di/EventBus';
import { emitEvent } from '../globalEventBus';
import { persistenceService as legacyPersistenceService } from '../persistenceService';
import { BlueprintResolver } from '@/omega-ui-core/utils/blueprintResolver';
import { BlueprintValidator } from '@/omega-ui-core/utils/blueprintValidator';
import type { OMEGA_Manifest } from '@/omega-ui-core/types/manifest';

/**
 * OmegaRPCBridge - Era 7.2.3
 * Sovereign transport with ACK validation, Heartbeat, and Delta Buffering.
 */
export class OmegaRPCBridge {
  protected ws: WebSocket | null = null;
  protected sessionId: string;
  private seq = 0;
  private status: SyncStatus = 'disconnected';
  private url: string;
  private onStatusChange?: ((status: SyncStatus) => void) | undefined;
  
  // Phase 20.3: Live Orchestration State
  private pendingAcks = new Map<number, { resolve: (val: unknown) => void, reject: (err: unknown) => void, timeout: ReturnType<typeof setTimeout> }>();
  protected deltaBuffer: DeltaPatch[] = [];
  private isSyncingSnapshot = false;
  private lastHeartbeatAt = 0;
  private heartbeatInterval: ReturnType<typeof setTimeout> | null = null;
  private readonly HEARTBEAT_TIMEOUT = 3000; // 3 seconds threshold
  private _wasEverConnected = false;
  protected eventBus: IEventBus | undefined;
  protected persistenceSvc: typeof legacyPersistenceService;

  constructor(url?: string, eventBus?: IEventBus, persistenceService?: typeof legacyPersistenceService) {
    // Lazy connection — only connect when explicitly called via connect().
    // This avoids ERR_CONNECTION_REFUSED when no engine is running.
    this.url = url || 'ws://localhost:8081';
    this.sessionId = `session_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    this.eventBus = eventBus;
    this.persistenceSvc = persistenceService ?? legacyPersistenceService;
  }

  public connect(onStatusChange?: (status: SyncStatus) => void) {
    this.onStatusChange = onStatusChange;
    this.updateStatus('syncing');

    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        this._wasEverConnected = true;
        this.updateStatus('in-sync');
        this.lastHeartbeatAt = Date.now();
        this.startHeartbeatMonitor();
        console.log(`[OMEGA RPC] Connected. Session: ${this.sessionId}`);
      };

      this.ws.onmessage = (event) => this.handleMessage(event);
      
      this.ws.onclose = () => {
        this.stopHeartbeatMonitor();
        this.updateStatus('disconnected');
        if (this._wasEverConnected) {
          setTimeout(() => this.connect(onStatusChange), 5000);
        }
      };

      this.ws.onerror = (err) => {
        const currentStatus = this.status;
        // Silent on first connection failure (no engine running) — expected error.
        // Only warn if we lose an established connection.
        if (currentStatus === 'disconnected' || currentStatus === 'syncing') {
          this.updateStatus('disconnected');
          return;
        }
        
        console.warn('[OMEGA RPC] Connection Error:', err);
        this.updateStatus('error');
      };
    } catch {
      // Silent catch — no engine running is a valid state
      this.updateStatus('disconnected');
    }
  }

  public disconnect() {
    this.stopHeartbeatMonitor();
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.close();
      this.ws = null;
    }
    this.updateStatus('disconnected');
  }

  /**
   * syncSnapshot
   * High-fidelity full state transmission with mandatory ACK.
   */
  public async syncSnapshot(params: SnapshotParams, manifest: OMEGA_Manifest): Promise<{ success: boolean; hash: string; error?: string }> {
    this.isSyncingSnapshot = true;
    this.updateStatus('syncing');

    try {
      // Phase 20.4: Blueprint Runtime Instantiation
      // 1. Resolution
      const canonicalGraph = BlueprintResolver.resolve(params.graph, manifest);
      
      // 2. Validation (Blocking)
      BlueprintValidator.validate(canonicalGraph, manifest);

      // 3. Materialization (RPC Transmission)
      const response = await this.sendWithAck('bridge.syncSnapshot', { ...params, graph: canonicalGraph }) as { hash?: string };
      
      this.isSyncingSnapshot = false;
      this.updateStatus('in-sync');

      emitEvent(this.eventBus, 'wasm:deploy', { status: 'RPC_SYNC_SUCCESS' });

      // Phase 20.6: Persistence & Recovery
      this.persistenceSvc.saveCanonicalState(
        params.documentId || manifest.id || 'anonymous',
        canonicalGraph,
        `sync_${Date.now()}`,
        response.hash || 'ACK',
        manifest.schemaVersion || '7.2.3'
      );

      // Flush delta buffer upon successful structural sync
      this.flushDeltaBuffer();
      
      return { success: true, hash: response.hash || 'ACK' };
    } catch (err: unknown) {
      const error = err as Error;
      emitEvent(this.eventBus, 'system:error', {
        source: 'RPC_BRIDGE',
        message: `Snapshot sync failed: ${error.message}`,
      });

      this.isSyncingSnapshot = false;
      this.updateStatus('error');
      return { success: false, hash: 'ERR', error: error.message };
    }
  }

  /**
   * applyDeltaBatch (Phase 20.8)
   * High-priority batch transmission for aggregated parameter deltas.
   */
  public applyDeltaBatch(deltas: { targetId: string; value: number }[]) {
    if (deltas.length === 0) return;
    
    // We use fire-and-forget for batches to prioritize latency
    this.send('bridge.applyDeltaBatch', { deltas });
  }

  /**
   * requestEngineState (Phase 20.9)
   * Fetches the current authoritative control state from the runtime.
   */
  public async requestEngineState(): Promise<Record<string, number>> {
    const response = await this.sendWithAck('bridge.requestState', {}) as { state: Record<string, number> };
    return response.state || {};
  }

  /**
   * applyDelta
   * Minimal parameter updates. Buffered if a structural sync is in progress.
   */
  public applyDelta(patch: DeltaPatch) {
    if (this.status === 'disconnected' || this.status === 'error') return;

    if (this.isSyncingSnapshot) {
      this.deltaBuffer.push(patch);
      return;
    }

    this.send('bridge.applyDelta', patch);
  }

  private send(method: string, params: unknown): number {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return -1;

    const id = ++this.seq;
    const message: RPCRequest = {
      jsonrpc: '2.0',
      id,
      sessionId: this.sessionId,
      seq: id,
      timestamp: Date.now(),
      method,
      params
    };

    this.ws.send(JSON.stringify(message));
    return id;
  }

  private sendWithAck(method: string, params: unknown, timeoutMs = 5000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.send(method, params);
      if (id === -1) return reject(new Error('WebSocket not open'));

      const timeout = setTimeout(() => {
        this.pendingAcks.delete(id);
        reject(new Error(`Timeout waiting for ACK for ${method} (${id})`));
      }, timeoutMs);

      this.pendingAcks.set(id, { resolve, reject, timeout });
    });
  }

  private handleMessage(event: MessageEvent) {
    try {
      const response: RPCResponse = JSON.parse(event.data);
      
      // Heartbeat Detection (Can be a specific method or any valid response)
      this.lastHeartbeatAt = Date.now();
      if (this.status === 'degraded') this.updateStatus('in-sync');

      // Safety: Session validation
      if (response.sessionId !== this.sessionId) {
        return;
      }

      // Handle ACKs
      if (response.id && this.pendingAcks.has(response.id as number)) {
        const ack = this.pendingAcks.get(response.id as number)!;
        clearTimeout(ack.timeout);
        this.pendingAcks.delete(response.id as number);
        
        if (response.error) ack.reject(response.error);
        else ack.resolve(response.result);
        return;
      }

      if (response.error) {
        console.error(`[OMEGA RPC] Engine Error [${response.error.code}]: ${response.error.message}`);
        if (response.error.code === RPCErrors.OUT_OF_SEQUENCE) {
          this.updateStatus('degraded');
        }
      }
    } catch {
      console.error('[OMEGA RPC] Failed to parse message');
    }
  }

  private flushDeltaBuffer() {
    if (this.deltaBuffer.length === 0) return;
    console.log(`[OMEGA RPC] Flushing ${this.deltaBuffer.length} buffered deltas.`);
    
    while (this.deltaBuffer.length > 0) {
      const patch = this.deltaBuffer.shift();
      if (patch) this.send('bridge.applyDelta', patch);
    }
  }

  private startHeartbeatMonitor() {
    this.stopHeartbeatMonitor();
    this.heartbeatInterval = setInterval(() => {
      const elapsed = Date.now() - this.lastHeartbeatAt;
      if (elapsed > this.HEARTBEAT_TIMEOUT && this.status === 'in-sync') {
        this.updateStatus('degraded');
        console.warn('[OMEGA RPC] Engine health DEGRADED (Heartbeat timeout)');
      }
    }, 1000);
  }

  private stopHeartbeatMonitor() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private updateStatus(newStatus: SyncStatus) {
    if (this.status === newStatus) return;
    this.status = newStatus;
    if (this.onStatusChange) this.onStatusChange(newStatus);
  }

  public getStatus(): SyncStatus {
    return this.status;
  }
}

