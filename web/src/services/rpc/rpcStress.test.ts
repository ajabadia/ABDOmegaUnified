/**
 * OMEGA Phase 20.3 Stress Test
 * Validates ACK synchronization, delta buffering, and heartbeat health.
 */
import { OmegaRPCBridge } from './omegaRPCBridge';
import type { OmegaNode, OMEGA_Manifest } from '../../omega-ui-core/types/manifest';
import type { SnapshotParams, DeltaPatch } from './rpcTypes';

// Mock BlueprintValidator and BlueprintResolver to accept minimal test graphs
jest.mock('../../omega-ui-core/utils/blueprintValidator', () => ({
  BlueprintValidator: { validate: jest.fn() },
}));

jest.mock('../../omega-ui-core/utils/blueprintResolver', () => ({
  BlueprintResolver: { resolve: (g: unknown) => g },
}));

class OmegaTestBridge extends OmegaRPCBridge {
  public get mockWS(): MockWebSocket {
    return this.ws as unknown as MockWebSocket;
  }
  public get currentDeltaBuffer(): DeltaPatch[] {
    return this.deltaBuffer;
  }
  public get currentSessionId(): string {
    return this.sessionId;
  }
}

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public onopen: (() => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onclose: (() => void) | null = null;
  public readyState = MockWebSocket.OPEN;
  public messagesSent: string[] = [];
  public autoAck = true;
  public ackDelay = 50;

  close() {
    this.readyState = MockWebSocket.CLOSED;
  }

  send(data: string) {
    this.messagesSent.push(data);
    const parsed = JSON.parse(data);

    if (this.autoAck) {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage({
            data: JSON.stringify({
              jsonrpc: '2.0',
              id: parsed.id,
              sessionId: parsed.sessionId,
              result: { success: true, hash: 'STABLE_HASH' },
            }),
          });
        }
      }, this.ackDelay);
    }
  }

  simulateHeartbeat(sessionId: string) {
    if (this.onmessage) {
      this.onmessage({
        data: JSON.stringify({
          jsonrpc: '2.0',
          sessionId: sessionId,
          method: 'engine.heartbeat',
          params: { cpu: 0.1 },
        }),
      });
    }
  }
}

Object.defineProperty(globalThis, 'WebSocket', {
  value: MockWebSocket,
  writable: true,
});

describe('OmegaRPCBridge — Stress Tests', () => {
  let bridge: OmegaTestBridge;

  beforeEach(() => {
    bridge = new OmegaTestBridge('ws://stress-test');
    bridge.connect(() => {});
    const ws = bridge.mockWS;
    ws.onopen!();
  });

  afterEach(() => {
    bridge.disconnect();
  });

  it('should buffer deltas during slow snapshot sync', async () => {
    const ws = bridge.mockWS;
    ws.ackDelay = 500;

    const snapshot: SnapshotParams = {
      manifestVersion: '7.2.3',
      documentId: 'stress-doc',
      graph: { id: 'root' } as OmegaNode,
      modulations: [],
    };

    const dummyManifest = {
      id: 'stress-doc',
      ui: { tree: { id: 'root', kind: 'rack', layout: { pos: { x: 0, y: 0 } } } },
    } as unknown as OMEGA_Manifest;

    // Start sync (async) — don't await yet
    const syncPromise = bridge.syncSnapshot(snapshot, dummyManifest);

    // Push deltas while syncing
    bridge.applyDelta({ targetId: 'osc/freq', value: 100, type: 'parameter' });
    bridge.applyDelta({ targetId: 'osc/freq', value: 200, type: 'parameter' });

    // Deltas should be buffered during sync
    expect(bridge.currentDeltaBuffer.length).toBe(2);

    // Wait for ACK
    await syncPromise;

    // After sync, deltas should be flushed
    expect(bridge.currentDeltaBuffer.length).toBe(0);
    expect(ws.messagesSent.length).toBeGreaterThanOrEqual(3);
  });

  it('should detect heartbeat timeout and recover', async () => {
    jest.useFakeTimers();

    // Reconnect with fake timers so the heartbeat monitor's setInterval
    // uses the mocked timer (beforeEach created it with real timers)
    bridge.disconnect();
    bridge.connect(() => {});
    const ws = bridge.mockWS;
    ws.onopen!();

    // After connection it should be in-sync or syncing
    const initialStatus = bridge.getStatus();
    expect(initialStatus).toMatch(/syncing|in-sync/);

    // Fast-forward past 4 seconds (threshold is 3s)
    jest.advanceTimersByTime(4000);
    expect(bridge.getStatus()).toBe('degraded');

    // Simulate heartbeat to restore sync
    ws.simulateHeartbeat(bridge.currentSessionId);
    expect(bridge.getStatus()).toBe('in-sync');

    jest.useRealTimers();
  });
});
