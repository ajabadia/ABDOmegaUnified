/**
 * OMEGA RPC Sequence Test - Phase 17.4
 * Validates the transport layer's integrity and anti-crosstalk logic.
 */
import { OmegaRPCBridge } from './omegaRPCBridge';
import type { OmegaNode, OMEGA_Manifest } from '@/omega-ui-core/types/manifest';
import type { SnapshotParams, DeltaPatch } from './rpcTypes';

// Mock validators to accept minimal test graphs
jest.mock('../../omega-ui-core/utils/blueprintValidator', () => ({
  BlueprintValidator: { validate: jest.fn() },
}));

jest.mock('../../omega-ui-core/utils/blueprintResolver', () => ({
  BlueprintResolver: { resolve: (g: unknown) => g },
}));

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public onopen: (() => void) | null = null;
  public onmessage: ((event: { data: string }) => void) | null = null;
  public onclose: (() => void) | null = null;
  public readyState = MockWebSocket.OPEN;
  public lastSentMessage: string | null = null;

  send(data: string) {
    this.lastSentMessage = data;
    const parsed = JSON.parse(data);

    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: JSON.stringify({
            jsonrpc: '2.0',
            id: parsed.id,
            sessionId: parsed.sessionId,
            seq: parsed.seq,
            timestamp: Date.now(),
            result: 'ack',
          }),
        });
      }
    }, 10);
  }
}

Object.defineProperty(globalThis, 'WebSocket', {
  value: MockWebSocket,
  writable: true,
});

describe('OmegaRPCBridge — Sequence Tracking', () => {
  let bridge: OmegaRPCBridge;
  let ws: MockWebSocket;

  beforeEach(() => {
    jest.useFakeTimers();
    bridge = new OmegaRPCBridge('ws://mock');
    bridge.connect(() => {});

    // The bridge stores ws internally; access via cast
    ws = (bridge as unknown as { ws: MockWebSocket }).ws;
    ws.onopen!();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should send snapshot sync with seq 1', () => {
    const snapshot: SnapshotParams = {
      manifestVersion: '7.2.3',
      documentId: 'primary',
      graph: {
        id: 'root',
        kind: 'rack',
        layout: { pos: { x: 0, y: 0 }, size: { width: 400, height: 400 } },
      } as OmegaNode,
      modulations: [],
    };
    const dummyManifest = {
      id: 'primary',
      ui: { tree: { id: 'root', kind: 'rack', layout: { pos: { x: 0, y: 0 } } } },
    } as unknown as OMEGA_Manifest;

    bridge.syncSnapshot(snapshot, dummyManifest);
    const sentMsg = JSON.parse(ws.lastSentMessage!);

    expect(sentMsg.method).toBe('bridge.syncSnapshot');
    expect(sentMsg.seq).toBe(1);
  });

  it('should track incremental delta sequence numbers', async () => {
    // First call to trigger seq init
    const snapshot: SnapshotParams = {
      manifestVersion: '7.2.3',
      documentId: 'primary',
      graph: { id: 'root', kind: 'rack', layout: { pos: { x: 0, y: 0 }, size: { width: 400, height: 400 } } } as OmegaNode,
      modulations: [],
    };
    const dummyManifest = {
      id: 'primary',
      ui: { tree: { id: 'root', kind: 'rack', layout: { pos: { x: 0, y: 0 } } } },
    } as unknown as OMEGA_Manifest;
    bridge.syncSnapshot(snapshot, dummyManifest);
    // Advance timers to fire the ACK setTimeout, then flush microtasks
    // so syncSnapshot completes and isSyncingSnapshot becomes false
    jest.advanceTimersByTime(20);
    await Promise.resolve();

    const patch1: DeltaPatch = { targetId: 'osc_1/freq', value: 440, type: 'parameter' };
    const patch2: DeltaPatch = { targetId: 'osc_1/pwm', value: 0.5, type: 'parameter' };

    bridge.applyDelta(patch1);
    const msg1 = JSON.parse(ws.lastSentMessage!);
    bridge.applyDelta(patch2);
    const msg2 = JSON.parse(ws.lastSentMessage!);

    expect(msg1.seq).toBe(2);
    expect(msg2.seq).toBe(3);
  });

  it('should generate a unique session identifier', () => {
    const snapshot: SnapshotParams = {
      manifestVersion: '7.2.3',
      documentId: 'primary',
      graph: { id: 'root', kind: 'rack', layout: { pos: { x: 0, y: 0 }, size: { width: 400, height: 400 } } } as OmegaNode,
      modulations: [],
    };
    const dummyManifest = {
      id: 'primary',
      ui: { tree: { id: 'root', kind: 'rack', layout: { pos: { x: 0, y: 0 } } } },
    } as unknown as OMEGA_Manifest;
    bridge.syncSnapshot(snapshot, dummyManifest);
    const sentMsg = JSON.parse(ws.lastSentMessage!);

    expect(sentMsg.sessionId).toBeDefined();
    expect(typeof sentMsg.sessionId).toBe('string');
    expect(sentMsg.sessionId.length).toBeGreaterThan(0);
  });
});
